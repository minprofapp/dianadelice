update public.produits set description = 'Ça croque dans bouche ! Faites maison, bien dorées, c''est doux même.' where slug = 'croquettes';
update public.produits set description = 'Bissap bien glacé, sucré comme il faut. Ça enlève soif direct !' where slug = 'bissap';
update public.produits set description = 'Gnamakoudji qui pique bien, gingembre frais. Ça te réveille hein !' where slug = 'gnamakoudji';

-- Suivi de commande par le client (numéro + téléphone), sans exposer les autres commandes
create or replace function public.suivre_commande(p_numero text, p_telephone text)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_cmd public.commandes;
  v_tel text := regexp_replace(coalesce(p_telephone, ''), '[\s.\-()]', '', 'g');
begin
  select * into v_cmd from public.commandes
   where numero = upper(btrim(coalesce(p_numero, '')))
     and client_telephone = v_tel
   limit 1;
  if not found then
    return null;
  end if;
  return jsonb_build_object(
    'numero', v_cmd.numero,
    'statut', v_cmd.statut,
    'articles', v_cmd.articles,
    'sous_total', v_cmd.sous_total,
    'frais_livraison', v_cmd.frais_livraison,
    'total', v_cmd.total,
    'zone_nom', v_cmd.zone_nom,
    'created_at', v_cmd.created_at
  );
end $$;

revoke all on function public.suivre_commande(text, text) from public;
grant execute on function public.suivre_commande(text, text) to anon, authenticated;