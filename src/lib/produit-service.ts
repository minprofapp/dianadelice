import type { Json, Tables, TablesInsert } from "@/integrations/supabase/types";
import type { ImageArticle, ProduitEnrichi, VarianteProduit } from "./types-produit";
import croquettes from "@/assets/croquettes.jpg.asset.json";
import bissap from "@/assets/bissap.jpg.asset.json";
import gnamakoudji from "@/assets/gnamakoudji.jpg.asset.json";

const IMAGES_DEFAUT: Record<string, string> = {
  croquettes: croquettes.url,
  bissap: bissap.url,
  gnamakoudji: gnamakoudji.url,
};

export const PRIX_MINIMUM_ARTICLE = 500;
export const FORMATS_IMAGE_ACCEPTES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
export const TAILLE_IMAGE_MAX = 15 * 1024 * 1024; // avant compression

export type RowProduit = Tables<"produits">;

function estObjet(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function lireImages(brut: Json): ImageArticle[] {
  if (!Array.isArray(brut)) return [];
  const images: ImageArticle[] = [];
  brut.forEach((item, i) => {
    if (!estObjet(item) || typeof item.url !== "string" || !item.url) return;
    images.push({
      id: typeof item.id === "string" ? item.id : `img-${i}`,
      url: item.url,
      principale: item.principale === true,
      ordre: typeof item.ordre === "number" ? item.ordre : i + 1,
      nomFichier: typeof item.nomFichier === "string" ? item.nomFichier : undefined,
      chemin: typeof item.chemin === "string" ? item.chemin : undefined,
    });
  });
  images.sort((a, b) => a.ordre - b.ordre);
  return images;
}

function lireVariantes(brut: Json): VarianteProduit[] {
  if (!Array.isArray(brut)) return [];
  const variantes: VarianteProduit[] = [];
  brut.forEach((item, i) => {
    if (!estObjet(item) || typeof item.nom !== "string" || !item.nom.trim()) return;
    variantes.push({
      id: typeof item.id === "string" ? item.id : `var-${i}`,
      nom: item.nom,
      prix: typeof item.prix === "number" ? item.prix : 0,
      stock: typeof item.stock === "number" ? item.stock : 0,
      sku: typeof item.sku === "string" ? item.sku : "",
      disponible: item.disponible !== false,
      image: typeof item.image === "string" ? item.image : null,
    });
  });
  return variantes;
}

/** Transforme une ligne de la base en article complet */
export function decoderProduit(row: RowProduit): ProduitEnrichi {
  let images = lireImages(row.images);
  if (images.length === 0) {
    const url = row.image_url || IMAGES_DEFAUT[row.slug] || null;
    if (url) images = [{ id: `img-${row.id}-1`, url, principale: true, ordre: 1 }];
  }
  if (images.length > 0 && !images.some((img) => img.principale)) {
    images = images.map((img, i) => ({ ...img, principale: i === 0 }));
  }

  return {
    id: row.id,
    slug: row.slug,
    nom: row.nom,
    descriptionCourte: row.description_courte || row.description.slice(0, 120),
    descriptionDetaillee: row.description,
    categorie: row.categorie,
    sousCategorie: row.sous_categorie,
    prix: row.prix,
    prixPromo: row.prix_promo,
    stock: row.stock,
    seuilAlerte: row.seuil_alerte,
    disponible: row.disponible,
    masque: row.masque,
    populaire: row.populaire,
    nouveau: row.nouveau,
    recommande: row.recommande,
    sku: row.sku,
    images,
    variantes: lireVariantes(row.variantes),
    formats: row.formats ?? [],
    ordre: row.ordre,
    created_at: row.created_at,
  };
}

/** Prépare un article pour l'enregistrement en base */
export function encoderProduit(p: ProduitEnrichi): Omit<TablesInsert<"produits">, "id" | "created_at"> {
  const images = [...p.images]
    .sort((a, b) => a.ordre - b.ordre)
    .map((img, i) => ({ ...img, ordre: i + 1 }));
  const principale = images.find((img) => img.principale) ?? images[0];
  const formats = p.variantes.length > 0 ? p.variantes.map((v) => v.nom.trim()) : p.formats;

  return {
    nom: p.nom.trim(),
    slug: p.slug.trim(),
    description: (p.descriptionDetaillee || p.descriptionCourte || p.nom).trim(),
    description_courte: p.descriptionCourte.trim(),
    categorie: p.categorie.trim() || "Autre",
    sous_categorie: p.sousCategorie.trim(),
    prix: Math.max(0, Math.round(p.prix)),
    prix_promo: p.prixPromo != null && p.prixPromo > 0 ? Math.round(p.prixPromo) : null,
    stock: Math.max(0, Math.round(p.stock)),
    seuil_alerte: Math.max(0, Math.round(p.seuilAlerte)),
    disponible: p.disponible,
    masque: p.masque,
    populaire: p.populaire,
    nouveau: p.nouveau,
    recommande: p.recommande,
    sku: p.sku.trim(),
    images: images.map((img) => ({
      id: img.id,
      url: img.url,
      principale: principale ? img.id === principale.id : false,
      ordre: img.ordre,
      ...(img.nomFichier ? { nomFichier: img.nomFichier } : {}),
      ...(img.chemin ? { chemin: img.chemin } : {}),
    })),
    variantes: p.variantes.map((v) => ({
      id: v.id,
      nom: v.nom.trim(),
      prix: Math.max(0, Math.round(v.prix)),
      stock: Math.max(0, Math.round(v.stock)),
      sku: v.sku.trim(),
      disponible: v.disponible,
      image: v.image ?? null,
    })),
    formats,
    image_url: principale?.url ?? null,
    ordre: p.ordre,
    updated_at: new Date().toISOString(),
  };
}

/** Vérifie un article avant enregistrement ; renvoie un message d'erreur ou null */
export function verifierProduit(p: ProduitEnrichi): string | null {
  if (p.nom.trim().length < 2) return "Le nom de l'article doit comporter au moins 2 caractères.";
  if (!Number.isFinite(p.prix) || p.prix < PRIX_MINIMUM_ARTICLE)
    return `Le prix doit être d'au moins ${PRIX_MINIMUM_ARTICLE} FCFA.`;
  if (p.prixPromo != null && (p.prixPromo < PRIX_MINIMUM_ARTICLE || p.prixPromo >= p.prix))
    return `Le prix promo doit être entre ${PRIX_MINIMUM_ARTICLE} FCFA et le prix normal.`;
  if (p.stock < 0 || p.seuilAlerte < 0) return "Le stock et le seuil d'alerte ne peuvent pas être négatifs.";
  const noms = new Set<string>();
  for (const v of p.variantes) {
    const nom = v.nom.trim().toLowerCase();
    if (!nom) return "Chaque variante doit avoir un nom.";
    if (noms.has(nom)) return `La variante « ${v.nom} » existe deux fois.`;
    noms.add(nom);
    if (v.prix < PRIX_MINIMUM_ARTICLE) return `La variante « ${v.nom} » doit coûter au moins ${PRIX_MINIMUM_ARTICLE} FCFA.`;
    if (v.stock < 0) return `Le stock de « ${v.nom} » ne peut pas être négatif.`;
  }
  return null;
}

/** Prix réellement payé (promo si présente) */
export function prixAffiche(p: Pick<ProduitEnrichi, "prix" | "prixPromo">): number {
  return p.prixPromo != null && p.prixPromo > 0 && p.prixPromo < p.prix ? p.prixPromo : p.prix;
}

/** Plus petit prix affichable pour l'article (variantes comprises) */
export function prixDepart(p: ProduitEnrichi): number {
  const dispo = p.variantes.filter((v) => v.disponible && v.stock > 0);
  if (dispo.length > 0) return Math.min(...dispo.map((v) => v.prix));
  return prixAffiche(p);
}

export type EtatStock = "rupture" | "faible" | "ok";
export function etatStock(p: Pick<ProduitEnrichi, "stock" | "seuilAlerte" | "disponible">): EtatStock {
  if (!p.disponible || p.stock <= 0) return "rupture";
  if (p.stock <= p.seuilAlerte) return "faible";
  return "ok";
}

/** Génère un slug propre à partir d'un nom */
export function genererSlug(nom: string): string {
  return (
    nom
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "produit"
  );
}

function suffixe(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
}

/** Crée une copie complète et indépendante d'un article (jamais le même identifiant) */
export function dupliquerProduit(original: ProduitEnrichi): ProduitEnrichi {
  const s = suffixe();
  const nouveauNom = `Copie de ${original.nom}`;
  return {
    ...original,
    id: "",
    nom: nouveauNom,
    slug: `${genererSlug(nouveauNom)}-${s}`,
    sku: original.sku ? `${original.sku}-COPIE` : `SKU-${s.toUpperCase()}`,
    disponible: false,
    masque: true,
    images: original.images.map((img, i) => ({ ...img, id: `img-${s}-${i}` })),
    variantes: original.variantes.map((v, i) => ({
      ...v,
      id: `var-${s}-${i}`,
      sku: v.sku ? `${v.sku}-COPIE` : "",
    })),
    formats: [...original.formats],
    created_at: undefined,
  };
}

/** Compresse et redimensionne une photo dans le navigateur (WebP, sinon JPEG) */
export async function optimiserImage(
  fichier: File,
  options: { maxDim?: number; qualite?: number } = {},
): Promise<{ blob: Blob; type: string; largeur: number; hauteur: number; tailleAvant: number; tailleApres: number }> {
  const { maxDim = 1200, qualite = 0.82 } = options;
  if (!FORMATS_IMAGE_ACCEPTES.includes(fichier.type.toLowerCase())) {
    throw new Error("Format non accepté. Utilisez JPG, JPEG, PNG ou WEBP.");
  }
  if (fichier.size > TAILLE_IMAGE_MAX) {
    throw new Error("La photo dépasse 15 Mo.");
  }

  const bitmap = await createImageBitmap(fichier).catch(() => {
    throw new Error("Impossible de lire cette photo.");
  });
  let { width, height } = bitmap;
  if (width > maxDim || height > maxDim) {
    const ratio = Math.min(maxDim / width, maxDim / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Impossible de préparer la photo.");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const versBlob = (type: string) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), type, qualite));
  let blob = await versBlob("image/webp");
  if (!blob || blob.type !== "image/webp") blob = await versBlob("image/jpeg");
  if (!blob) throw new Error("Compression impossible.");

  return { blob, type: blob.type, largeur: width, hauteur: height, tailleAvant: fichier.size, tailleApres: blob.size };
}

export function formaterTaille(octets: number): string {
  if (octets < 1024) return `${octets} o`;
  if (octets < 1024 * 1024) return `${Math.round(octets / 1024)} Ko`;
  return `${(octets / (1024 * 1024)).toFixed(1)} Mo`;
}
