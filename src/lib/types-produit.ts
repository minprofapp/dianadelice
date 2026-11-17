export type ImageArticle = {
  id: string;
  url: string; // URL affichable (lien signé longue durée ou image d'origine)
  principale: boolean;
  ordre: number;
  nomFichier?: string | undefined;
  chemin?: string | undefined; // Emplacement du fichier dans le stockage des photos
};

export type VarianteProduit = {
  id: string;
  nom: string; // Ex : "25 cl", "Petite portion", "1 L"
  prix: number; // En FCFA
  stock: number;
  sku: string;
  disponible: boolean;
  image?: string | null | undefined;
};

export const CATEGORIES_PAR_DEFAUT = [
  "Croquettes",
  "Jus naturels",
  "Pâtisseries",
  "Snacks & Goûters",
  "Boissons",
  "Formules & Packs",
  "Autre",
] as const;

export type ProduitEnrichi = {
  id: string;
  slug: string;
  nom: string;
  descriptionCourte: string;
  descriptionDetaillee: string;
  categorie: string;
  sousCategorie: string;
  prix: number;
  prixPromo: number | null;
  stock: number;
  seuilAlerte: number;
  disponible: boolean;
  masque: boolean;
  populaire: boolean;
  nouveau: boolean;
  recommande: boolean;
  sku: string;
  images: ImageArticle[];
  variantes: VarianteProduit[];
  formats: string[];
  ordre: number;
  created_at?: string | undefined;
};

export type FiltresProduits = {
  recherche: string;
  categorie: string;
  statut: "tous" | "actif" | "inactif" | "masque" | "rupture" | "faible" | "promo";
  tri: "ordre" | "nom-asc" | "nom-desc" | "prix-asc" | "prix-desc" | "stock-asc" | "stock-desc" | "date-desc";
};
