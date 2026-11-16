export type ImageArticle = {
  id: string;
  url: string; // URL ou data URL optimisée WebP
  principale: boolean;
  ordre: number;
  nomFichier?: string;
};

export type VarianteProduit = {
  id: string;
  nom: string; // Ex : "25 cl", "Petite portion", "1 L"
  prix: number; // En FCFA
  stock: number;
  sku?: string;
  disponible: boolean;
  image?: string | null;
};

export type CategorieProduit =
  | "Croquettes"
  | "Jus naturels"
  | "Pâtisseries"
  | "Snacks & Goûters"
  | "Boissons"
  | "Formules & Packs"
  | "Autre";

export const CATEGORIES_PAR_DEFAUT: CategorieProduit[] = [
  "Croquettes",
  "Jus naturels",
  "Pâtisseries",
  "Snacks & Goûters",
  "Boissons",
  "Formules & Packs",
  "Autre",
];

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
  created_at?: string;
};

export type FiltresProduits = {
  recherche: string;
  categorie: string;
  statut: "tous" | "actif" | "inactif" | "rupture" | "faible";
  tri: "ordre" | "nom-asc" | "nom-desc" | "prix-asc" | "prix-desc" | "stock-asc" | "stock-desc" | "date-desc";
};
