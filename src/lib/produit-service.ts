import type { ImageArticle, ProduitEnrichi, VarianteProduit } from "./types-produit";
import croquettes from "@/assets/croquettes.jpg.asset.json";
import bissap from "@/assets/bissap.jpg.asset.json";
import gnamakoudji from "@/assets/gnamakoudji.jpg.asset.json";

const IMAGES_DEFAUT: Record<string, string> = {
  croquettes: croquettes.url,
  bissap: bissap.url,
  gnamakoudji: gnamakoudji.url,
};

type RowProduit = {
  id: string;
  slug: string;
  nom: string;
  description: string;
  formats: string[];
  image_url: string | null;
  disponible: boolean;
  ordre: number;
  created_at?: string;
};

type MetaProduit = {
  descriptionCourte?: string;
  descriptionDetaillee?: string;
  categorie?: string;
  sousCategorie?: string;
  prix?: number;
  prixPromo?: number | null;
  stock?: number;
  seuilAlerte?: number;
  masque?: boolean;
  populaire?: boolean;
  nouveau?: boolean;
  recommande?: boolean;
  sku?: string;
  images?: ImageArticle[];
  variantes?: VarianteProduit[];
};

const BALISE_META_DEBUT = "<!-- META:";
const BALISE_META_FIN = " -->";

/** Décode une ligne de base de données en ProduitEnrichi complet */
export function decoderProduit(row: RowProduit): ProduitEnrichi {
  let texteDescription = row.description || "";
  let meta: MetaProduit = {};

  const debutIdx = texteDescription.indexOf(BALISE_META_DEBUT);
  if (debutIdx !== -1) {
    const finIdx = texteDescription.indexOf(BALISE_META_FIN, debutIdx);
    if (finIdx !== -1) {
      const jsonStr = texteDescription.substring(debutIdx + BALISE_META_DEBUT.length, finIdx);
      try {
        meta = JSON.parse(jsonStr);
      } catch (e) {
        console.warn("Erreur de décodage des métadonnées du produit", row.id, e);
      }
      texteDescription = texteDescription.substring(0, debutIdx).trim();
    }
  }

  // Catégorie déduite par défaut si non spécifiée
  let categorieDefaut = "Croquettes";
  if (row.slug.includes("bissap") || row.slug.includes("gnama") || row.slug.includes("jus")) {
    categorieDefaut = "Jus naturels";
  }

  // Gestion des images
  let images: ImageArticle[] = meta.images || [];
  if (images.length === 0) {
    const urlInitiale = row.image_url || IMAGES_DEFAUT[row.slug] || null;
    if (urlInitiale) {
      images = [
        {
          id: `img-${row.id}-1`,
          url: urlInitiale,
          principale: true,
          ordre: 1,
          nomFichier: `${row.slug}.jpg`,
        },
      ];
    }
  } else {
    // S'assurer qu'au moins une image est marquée comme principale
    if (!images.some((img) => img.principale) && images.length > 0) {
      images[0].principale = true;
    }
  }

  // Variantes
  let variantes: VarianteProduit[] = meta.variantes || [];
  if (variantes.length === 0 && row.formats && row.formats.length > 0) {
    variantes = row.formats.map((f, i) => ({
      id: `var-${row.id}-${i}`,
      nom: f,
      prix: meta.prix ?? (f.toLowerCase().includes("bouteille") ? 1000 : 500),
      stock: meta.stock ?? 30,
      sku: `${row.slug.toUpperCase().slice(0, 4)}-${f.slice(0, 3).toUpperCase()}`,
      disponible: row.disponible,
    }));
  }

  const descCourte = meta.descriptionCourte || texteDescription.slice(0, 100) || row.nom;
  const descDetaillee = meta.descriptionDetaillee || texteDescription || descCourte;

  return {
    id: row.id,
    slug: row.slug,
    nom: row.nom,
    descriptionCourte: descCourte,
    descriptionDetaillee: descDetaillee,
    categorie: meta.categorie || categorieDefaut,
    sousCategorie: meta.sousCategorie || "",
    prix: meta.prix ?? 1000,
    prixPromo: meta.prixPromo ?? null,
    stock: meta.stock ?? 25,
    seuilAlerte: meta.seuilAlerte ?? 5,
    disponible: row.disponible,
    masque: meta.masque ?? false,
    populaire: meta.populaire ?? false,
    nouveau: meta.nouveau ?? false,
    recommande: meta.recommande ?? false,
    sku: meta.sku || row.slug.toUpperCase(),
    images,
    variantes,
    formats: row.formats || [],
    ordre: row.ordre ?? 0,
    created_at: row.created_at,
  };
}

/** Encode un ProduitEnrichi pour l'enregistrement dans la table 'produits' de Supabase */
export function encoderProduit(p: ProduitEnrichi): {
  nom: string;
  slug: string;
  description: string;
  formats: string[];
  image_url: string | null;
  disponible: boolean;
  ordre: number;
} {
  // L'image principale sert d'image_url publique compatible
  const imgPrincipale = p.images.find((img) => img.principale) || p.images[0];
  const imageUrl = imgPrincipale ? imgPrincipale.url : null;

  // Variantes alimentent également le champ 'formats' requis par passer_commande()
  const formats = p.variantes.length > 0 ? p.variantes.map((v) => v.nom) : p.formats.length > 0 ? p.formats : ["Standard"];

  const meta: MetaProduit = {
    descriptionCourte: p.descriptionCourte,
    descriptionDetaillee: p.descriptionDetaillee,
    categorie: p.categorie,
    sousCategorie: p.sousCategorie,
    prix: p.prix,
    prixPromo: p.prixPromo,
    stock: p.stock,
    seuilAlerte: p.seuilAlerte,
    masque: p.masque,
    populaire: p.populaire,
    nouveau: p.nouveau,
    recommande: p.recommande,
    sku: p.sku,
    images: p.images,
    variantes: p.variantes,
  };

  const texteBase = p.descriptionDetaillee || p.descriptionCourte || p.nom;
  const descriptionComplete = `${texteBase}\n${BALISE_META_DEBUT}${JSON.stringify(meta)}${BALISE_META_FIN}`;

  return {
    nom: p.nom.trim(),
    slug: p.slug.trim(),
    description: descriptionComplete,
    formats,
    image_url: imageUrl,
    disponible: p.disponible && !p.masque,
    ordre: p.ordre,
  };
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

/** Crée une copie indépendante complète d'un produit (Duplication) */
export function dupliquerProduit(original: ProduitEnrichi): ProduitEnrichi {
  const timestamp = Date.now().toString(36);
  const nouveauNom = `Copie de ${original.nom}`;
  const baseSlug = genererSlug(nouveauNom);
  const nouveauSlug = `${baseSlug}-${timestamp}`;
  const nouveauSku = original.sku ? `${original.sku}-COP` : `SKU-${timestamp.toUpperCase()}`;

  // Duplication propre des images avec nouveaux identifiants
  const nouvellesImages: ImageArticle[] = original.images.map((img, idx) => ({
    ...img,
    id: `img-dup-${timestamp}-${idx}`,
  }));

  // Duplication propre des variantes avec nouveaux identifiants
  const nouvellesVariantes: VarianteProduit[] = original.variantes.map((v, idx) => ({
    ...v,
    id: `var-dup-${timestamp}-${idx}`,
    sku: v.sku ? `${v.sku}-COP` : undefined,
  }));

  return {
    ...original,
    id: "", // Ne jamais réutiliser l'ID de l'original
    nom: nouveauNom,
    slug: nouveauSlug,
    sku: nouveauSku,
    disponible: false, // Toujours désactivé / brouillon au départ
    masque: true,
    nouveau: true,
    populaire: false,
    images: nouvellesImages,
    variantes: nouvellesVariantes,
    formats: [...original.formats],
    created_at: new Date().toISOString(),
  };
}

/** Compression & optimisation d'image côté client via Canvas HTML5 */
export async function optimiserImage(
  fichier: File,
  options: { maxDim?: number; qualite?: number } = {},
): Promise<{ url: string; largeur: number; hauteur: number; tailleAvant: number; tailleApres: number }> {
  const { maxDim = 1000, qualite = 0.82 } = options;

  const formatsAcceptes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
  if (!formatsAcceptes.includes(fichier.type.toLowerCase())) {
    throw new Error("Format d'image non supporté. Utilisez JPG, PNG ou WEBP.");
  }

  if (fichier.size > 15 * 1024 * 1024) {
    throw new Error("L'image dépasse la limite de 15 Mo.");
  }

  return new Promise((resolve, reject) => {
    const lecteur = new FileReader();
    lecteur.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;

        // Redimensionnement proportionnel
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Impossible d'initialiser le contexte de dessin."));
          return;
        }

        // Amélioration du lissage
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        // Compression en WebP si possible, sinon JPEG
        let dataUrl = "";
        try {
          dataUrl = canvas.toDataURL("image/webp", qualite);
        } catch {
          dataUrl = canvas.toDataURL("image/jpeg", qualite);
        }

        // Calcul de la taille approximative
        const base64Length = dataUrl.length - (dataUrl.indexOf(",") + 1);
        const tailleApres = Math.round((base64Length * 3) / 4);

        resolve({
          url: dataUrl,
          largeur: width,
          hauteur: height,
          tailleAvant: fichier.size,
          tailleApres,
        });
      };
      img.onerror = () => reject(new Error("Impossible de lire l'image."));
      img.src = e.target?.result as string;
    };
    lecteur.onerror = () => reject(new Error("Erreur de lecture du fichier."));
    lecteur.readAsDataURL(fichier);
  });
}
