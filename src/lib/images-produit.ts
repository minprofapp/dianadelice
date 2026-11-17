import { supabase } from "@/integrations/supabase/client";

const BUCKET = "produits-images";
// Lien d'affichage longue durée : le dossier photos est privé (l'espace de travail bloque les dossiers publics)
const DUREE_LIEN_SECONDES = 60 * 60 * 24 * 365 * 10;

/** Envoie une photo optimisée et renvoie son lien d'affichage + son emplacement */
export async function envoyerPhotoArticle(blob: Blob, nomBase: string): Promise<{ url: string; chemin: string }> {
  const ext = blob.type === "image/webp" ? "webp" : "jpg";
  const propre = nomBase.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "photo";
  const chemin = `articles/${propre}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(chemin, blob, {
    contentType: blob.type,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw new Error("Envoi de la photo impossible, réessayez.");
  const { data, error: errLien } = await supabase.storage.from(BUCKET).createSignedUrl(chemin, DUREE_LIEN_SECONDES);
  if (errLien || !data) throw new Error("Photo envoyée mais lien indisponible, réessayez.");
  return { url: data.signedUrl, chemin };
}
