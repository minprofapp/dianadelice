-- ===== Rôles (admin) =====
create type public.app_role as enum ('admin', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "Chacun lit ses propres rôles" on public.user_roles
  for select to authenticated using (auth.uid() = user_id);

-- Le tout premier compte créé devient automatiquement vendeur (admin)
create or replace function public.attribuer_premier_admin()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  end if;
  return new;
end $$;

create trigger on_auth_user_created_admin
  after insert on auth.users
  for each row execute function public.attribuer_premier_admin();

-- ===== Produits =====
create table public.produits (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  nom text not null,
  description text not null default '',
  formats text[] not null default '{}',
  image_url text,
  disponible boolean not null default true,
  ordre integer not null default 0,
  created_at timestamptz not null default now()
);
grant select on public.produits to anon, authenticated;
grant insert, update, delete on public.produits to authenticated;
grant all on public.produits to service_role;
alter table public.produits enable row level security;

create policy "Tout le monde voit les produits" on public.produits
  for select to anon, authenticated using (true);
create policy "Admin ajoute des produits" on public.produits
  for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "Admin modifie les produits" on public.produits
  for update to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Admin supprime des produits" on public.produits
  for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

insert into public.produits (slug, nom, description, formats, ordre) values
  ('croquettes', 'Croquettes', 'Croustillantes et dorées, faites maison.', array['Sachet'], 1),
  ('bissap', 'Jus de Bissap', 'Fleurs d''hibiscus, bien frais.', array['Sachet', 'Bouteille'], 2),
  ('gnamakoudji', 'Jus de Gnamakoudji', 'Gingembre frais, citron, ça pique !', array['Sachet', 'Bouteille'], 3);

-- ===== Zones de livraison =====
create table public.zones_livraison (
  id uuid primary key default gen_random_uuid(),
  nom text not null unique,
  description text not null default '',
  frais integer not null default 0 check (frais >= 0),
  actif boolean not null default true,
  ordre integer not null default 0
);
grant select on public.zones_livraison to anon, authenticated;
grant insert, update, delete on public.zones_livraison to authenticated;
grant all on public.zones_livraison to service_role;
alter table public.zones_livraison enable row level security;

create policy "Tout le monde voit les zones" on public.zones_livraison
  for select to anon, authenticated using (true);
create policy "Admin ajoute des zones" on public.zones_livraison
  for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "Admin modifie les zones" on public.zones_livraison
  for update to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Admin supprime des zones" on public.zones_livraison
  for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

insert into public.zones_livraison (nom, description, frais, ordre) values
  ('Anyama', 'Livraison dans Anyama', 500, 1),
  ('CAFOP Abobo', 'Livraison au CAFOP d''Abobo', 500, 2),
  ('Retrait sur place', 'Je passe récupérer ma commande', 0, 3);

-- ===== Commandes =====
create sequence public.commande_numero_seq start 1;

create table public.commandes (
  id uuid primary key default gen_random_uuid(),
  numero text not null unique default ('CMD-' || lpad(nextval('public.commande_numero_seq')::text, 5, '0')),
  client_nom text not null,
  client_telephone text not null,
  zone_id uuid references public.zones_livraison(id) on delete set null,
  zone_nom text not null,
  repere text not null,
  note text,
  articles jsonb not null,
  sous_total integer not null,
  frais_livraison integer not null default 0,
  total integer not null,
  statut text not null default 'en_attente'
    check (statut in ('en_attente', 'confirmee', 'en_livraison', 'livree', 'annulee')),
  created_at timestamptz not null default now()
);
grant select, update, delete on public.commandes to authenticated;
grant all on public.commandes to service_role;
alter table public.commandes enable row level security;

create policy "Admin voit les commandes" on public.commandes
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admin modifie les commandes" on public.commandes
  for update to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Admin supprime les commandes" on public.commandes
  for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

create index commandes_created_at_idx on public.commandes (created_at desc);

-- Enregistrement d'une commande par n'importe quel visiteur, avec contrôle strict
create or replace function public.passer_commande(
  p_nom text,
  p_telephone text,
  p_zone_id uuid,
  p_repere text,
  p_note text,
  p_articles jsonb
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_zone public.zones_livraison;
  v_item jsonb;
  v_prod public.produits;
  v_montant integer;
  v_format text;
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
    if not found then
      raise exception 'Produit introuvable';
    end if;
    if not v_prod.disponible then
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
end $$;

revoke all on function public.passer_commande(text, text, uuid, text, text, jsonb) from public;
grant execute on function public.passer_commande(text, text, uuid, text, text, jsonb) to anon, authenticated;

-- Temps réel pour l'espace vendeur
alter publication supabase_realtime add table public.commandes;