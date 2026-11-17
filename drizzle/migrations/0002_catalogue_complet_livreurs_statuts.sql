-- ===== Produits : colonnes du catalogue complet =====
alter table public.produits
  add column if not exists description_courte text not null default '',
  add column if not exists categorie text not null default 'Autre',
  add column if not exists sous_categorie text not null default '',
  add column if not exists prix integer not null default 500 check (prix >= 0),
  add column if not exists prix_promo integer check (prix_promo is null or prix_promo >= 0),
  add column if not exists stock integer not null default 0 check (stock >= 0),
  add column if not exists seuil_alerte integer not null default 5 check (seuil_alerte >= 0),
  add column if not exists masque boolean not null default false,
  add column if not exists populaire boolean not null default false,
  add column if not exists nouveau boolean not null default false,
  add column if not exists recommande boolean not null default false,
  add column if not exists sku text not null default '',
  add column if not exists images jsonb not null default '[]'::jsonb,
  add column if not exists variantes jsonb not null default '[]'::jsonb,
  add column if not exists updated_at timestamptz not null default now();

-- Backfill : produits existants
update public.produits set
  categorie = case when slug in ('bissap', 'gnamakoudji') then 'Jus naturels' else 'Croquettes' end,
  description_courte = left(btrim(split_part(description, '<!-- META:', 1)), 120),
  prix = case when slug in ('bissap', 'gnamakoudji') then 500 else 500 end,
  stock = 25,
  sku = upper(slug);

-- Backfill : métadonnées précédemment rangées dans la description
update public.produits p set
  description_courte = coalesce(m.meta->>'descriptionCourte', p.description_courte),
  categorie = coalesce(nullif(m.meta->>'categorie', ''), p.categorie),
  sous_categorie = coalesce(m.meta->>'sousCategorie', ''),
  prix = coalesce((m.meta->>'prix')::integer, p.prix),
  prix_promo = (m.meta->>'prixPromo')::integer,
  stock = greatest(coalesce((m.meta->>'stock')::integer, p.stock), 0),
  seuil_alerte = greatest(coalesce((m.meta->>'seuilAlerte')::integer, 5), 0),
  masque = coalesce((m.meta->>'masque')::boolean, false),
  populaire = coalesce((m.meta->>'populaire')::boolean, false),
  nouveau = coalesce((m.meta->>'nouveau')::boolean, false),
  recommande = coalesce((m.meta->>'recommande')::boolean, false),
  sku = coalesce(nullif(m.meta->>'sku', ''), p.sku),
  images = coalesce(m.meta->'images', '[]'::jsonb),
  variantes = coalesce(m.meta->'variantes', '[]'::jsonb),
  description = btrim(coalesce(m.meta->>'descriptionDetaillee', split_part(p.description, '<!-- META:', 1)))
from (
  select id, ((regexp_match(description, '<!-- META:(.*) -->'))[1])::jsonb as meta
  from public.produits
  where description like '%<!-- META:%'
) m
where p.id = m.id;

-- ===== Livreurs =====
create table public.livreurs (
  id uuid primary key default gen_random_uuid(),
  nom text not null check (char_length(btrim(nom)) between 2 and 80),
  telephone text not null default '',
  actif boolean not null default true,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.livreurs to authenticated;
grant all on public.livreurs to service_role;
alter table public.livreurs enable row level security;

create policy "Admin voit les livreurs" on public.livreurs
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admin ajoute des livreurs" on public.livreurs
  for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "Admin modifie les livreurs" on public.livreurs
  for update to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Admin supprime des livreurs" on public.livreurs
  for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

-- ===== Commandes : nouvelles étapes + livreur =====
alter table public.commandes drop constraint if exists commandes_statut_check;
alter table public.commandes add constraint commandes_statut_check
  check (statut in ('en_attente', 'confirmee', 'en_preparation', 'prete', 'en_livraison', 'livree', 'annulee'));
alter table public.commandes
  add column if not exists livreur_id uuid references public.livreurs(id) on delete set null;

-- ===== Photos des articles (bucket produits-images) =====
create policy "Photos articles visibles par tous" on storage.objects
  for select to anon, authenticated using (bucket_id = 'produits-images');
create policy "Admin envoie des photos articles" on storage.objects
  for insert to authenticated with check (bucket_id = 'produits-images' and public.has_role(auth.uid(), 'admin'));
create policy "Admin remplace des photos articles" on storage.objects
  for update to authenticated using (bucket_id = 'produits-images' and public.has_role(auth.uid(), 'admin'))
  with check (bucket_id = 'produits-images' and public.has_role(auth.uid(), 'admin'));
create policy "Admin supprime des photos articles" on storage.objects
  for delete to authenticated using (bucket_id = 'produits-images' and public.has_role(auth.uid(), 'admin'));

-- ===== Commande client : refuse les articles masqués, en rupture, variantes épuisées =====
create or replace function public.passer_commande(p_nom text, p_telephone text, p_zone_id uuid, p_repere text, p_note text, p_articles jsonb)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_zone public.zones_livraison;
  v_item jsonb;
  v_prod public.produits;
  v_montant integer;
  v_format text;
  v_variante jsonb;
  v_lignes jsonb := '[]'::jsonb;
  v_sous_total integer := 0;
  v_cmd public.commandes;
  v_nom text := btrim(coalesce(p_nom, ''));
  v_tel text := regexp_replace(coalesce(p_telephone, ''), '[\s.\-]', '', 'g');
  v_repere text := btrim(coalesce(p_repere, ''));
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if char_length(v_nom) < 2 or char_length(v_nom) > 80 then
    raise exception 'Nom invalide';
  end if;
  if v_tel !~ '^\+?[0-9]{8,15}$' then
    raise exception 'Numéro de téléphone invalide';
  end if;
  if char_length(v_repere) < 2 or char_length(v_repere) > 200 then
    raise exception 'Point de repère invalide';
  end if;
  if v_note is not null and char_length(v_note) > 300 then
    raise exception 'Note trop longue';
  end if;

  select * into v_zone from public.zones_livraison where id = p_zone_id and actif;
  if not found then
    raise exception 'Zone de livraison invalide';
  end if;

  if p_articles is null or jsonb_typeof(p_articles) <> 'array'
     or jsonb_array_length(p_articles) = 0 or jsonb_array_length(p_articles) > 30 then
    raise exception 'Panier invalide';
  end if;

  for v_item in select * from jsonb_array_elements(p_articles) loop
    select * into v_prod from public.produits where id = (v_item->>'produit_id')::uuid;
    if not found or v_prod.masque then
      raise exception 'Produit introuvable';
    end if;
    if not v_prod.disponible or v_prod.stock <= 0 then
      raise exception '% est épuisé', v_prod.nom;
    end if;
    v_montant := (v_item->>'montant')::integer;
    if v_montant is null or v_montant < 500 or v_montant > 100000 then
      raise exception 'Montant minimum 500 FCFA par article';
    end if;
    v_format := nullif(btrim(coalesce(v_item->>'format', '')), '');
    if array_length(v_prod.formats, 1) > 0 and (v_format is null or not (v_format = any(v_prod.formats))) then
      raise exception 'Format invalide pour %', v_prod.nom;
    end if;
    if jsonb_typeof(v_prod.variantes) = 'array' and jsonb_array_length(v_prod.variantes) > 0 then
      select v into v_variante from jsonb_array_elements(v_prod.variantes) v where v->>'nom' = v_format limit 1;
      if v_variante is null then
        raise exception 'Format invalide pour %', v_prod.nom;
      end if;
      if coalesce((v_variante->>'disponible')::boolean, true) = false
         or coalesce((v_variante->>'stock')::integer, 1) <= 0 then
        raise exception '% (%) est épuisé', v_prod.nom, v_format;
      end if;
    end if;
    v_sous_total := v_sous_total + v_montant;
    v_lignes := v_lignes || jsonb_build_array(jsonb_build_object(
      'produit_id', v_prod.id, 'nom', v_prod.nom, 'format', v_format, 'montant', v_montant));
  end loop;

  insert into public.commandes (client_nom, client_telephone, zone_id, zone_nom, repere, note,
    articles, sous_total, frais_livraison, total)
  values (v_nom, v_tel, v_zone.id, v_zone.nom, v_repere, v_note,
    v_lignes, v_sous_total, v_zone.frais, v_sous_total + v_zone.frais)
  returning * into v_cmd;

  return jsonb_build_object(
    'numero', v_cmd.numero,
    'articles', v_cmd.articles,
    'sous_total', v_cmd.sous_total,
    'frais_livraison', v_cmd.frais_livraison,
    'total', v_cmd.total,
    'zone_nom', v_cmd.zone_nom
  );
end $function$;