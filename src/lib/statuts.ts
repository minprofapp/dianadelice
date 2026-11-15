export const STATUTS = ["en_attente", "confirmee", "en_livraison", "livree", "annulee"] as const;
export type Statut = (typeof STATUTS)[number];

export const LIBELLE_STATUT: Record<Statut, string> = {
  en_attente: "En attente",
  confirmee: "Confirmée",
  en_livraison: "En route",
  livree: "Livrée",
  annulee: "Annulée",
};

export const MESSAGE_STATUT: Record<Statut, string> = {
  en_attente: "Diana a reçu ta commande, elle va confirmer bientôt.",
  confirmee: "C'est confirmé ! On prépare ça bien bien.",
  en_livraison: "Le livreur est en route, prépare la monnaie !",
  livree: "Livré ! Bonne dégustation, c'est doux même.",
  annulee: "Cette commande a été annulée. Écris à Diana si besoin.",
};

export const CLASSE_STATUT: Record<Statut, string> = {
  en_attente: "bg-gold/25 text-gold-foreground",
  confirmee: "bg-leaf/15 text-leaf",
  en_livraison: "bg-primary/15 text-primary",
  livree: "bg-success/15 text-success",
  annulee: "bg-muted text-muted-foreground",
};
