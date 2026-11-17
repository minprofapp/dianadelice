export const STATUTS = [
  "en_attente",
  "confirmee",
  "en_preparation",
  "prete",
  "en_livraison",
  "livree",
  "annulee",
] as const;
export type Statut = (typeof STATUTS)[number];

/** Étapes suivies par une commande normale, dans l'ordre */
export const ETAPES_COMMANDE: Statut[] = ["en_attente", "confirmee", "en_preparation", "prete", "en_livraison", "livree"];

export const LIBELLE_STATUT: Record<Statut, string> = {
  en_attente: "En attente",
  confirmee: "Confirmée",
  en_preparation: "En préparation",
  prete: "Prête",
  en_livraison: "En livraison",
  livree: "Livrée",
  annulee: "Annulée",
};

export const MESSAGE_STATUT: Record<Statut, string> = {
  en_attente: "Diana a reçu ta commande, elle va confirmer bientôt.",
  confirmee: "C'est confirmé ! On va lancer ça bien bien.",
  en_preparation: "Ça chauffe en cuisine ! Ta commande est en préparation.",
  prete: "Ta commande est prête, le livreur va bientôt la prendre.",
  en_livraison: "Le livreur est en route, prépare la monnaie !",
  livree: "Livré ! Bonne dégustation, c'est doux même.",
  annulee: "Cette commande a été annulée. Écris à Diana si besoin.",
};

export const CLASSE_STATUT: Record<Statut, string> = {
  en_attente: "bg-gold/25 text-gold-foreground",
  confirmee: "bg-leaf/15 text-leaf",
  en_preparation: "bg-accent text-accent-foreground",
  prete: "bg-secondary text-secondary-foreground",
  en_livraison: "bg-primary/15 text-primary",
  livree: "bg-success/15 text-success",
  annulee: "bg-muted text-muted-foreground",
};

/** Étape suivante proposée au vendeur (null quand la commande est terminée) */
export function statutSuivant(s: Statut): Statut | null {
  const i = ETAPES_COMMANDE.indexOf(s);
  if (i === -1 || i === ETAPES_COMMANDE.length - 1) return null;
  return ETAPES_COMMANDE[i + 1] ?? null;
}
