import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import croquettes from "@/assets/croquettes.jpg.asset.json";
import bissap from "@/assets/bissap.jpg.asset.json";
import gnamakoudji from "@/assets/gnamakoudji.jpg.asset.json";

const IMAGES: Record<string, string> = {
  croquettes: croquettes.url,
  bissap: bissap.url,
  gnamakoudji: gnamakoudji.url,
};

export function imageProduit(p: { slug: string; image_url: string | null }): string | null {
  return p.image_url || IMAGES[p.slug] || null;
}

export const produitsQuery = queryOptions({
  queryKey: ["produits"],
  queryFn: async () => {
    const { data, error } = await supabase.from("produits").select("*").eq("masque", false).order("ordre");
    if (error) throw error;
    return data;
  },
});

export const zonesQuery = queryOptions({
  queryKey: ["zones"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("zones_livraison")
      .select("*")
      .eq("actif", true)
      .order("ordre");
    if (error) throw error;
    return data;
  },
});
