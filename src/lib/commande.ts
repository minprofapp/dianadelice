// Règles métier de la commande : montants, totaux et message WhatsApp.

/** Numéro WhatsApp du vendeur (format international, sans + ni espaces). */
export const WHATSAPP_VENDEUR = "2250789734413";
export const WHATSAPP_AFFICHAGE = "07 89 73 44 13";

export const NOM_BOUTIQUE = "Diana Croquettes";

export const MONTANT_MIN = 500;
export const MONTANT_MAX = 100000;
export const MONTANTS_RAPIDES = [500, 1000, 1500, 2000] as const;

export type ArticlePanier = {
  cle: string;
  produitId: string;
  nom: string;
  format: string | null;
  montant: number;
};

export function formatFCFA(n: number): string {
  // Espace fine pour séparer les milliers, lisible sur mobile et dans WhatsApp
  return `${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")} FCFA`;
}

/** Retourne un message d'erreur, ou null si le montant est valide. */
export function verifierMontant(montant: number | null | undefined): string | null {
  if (montant == null || Number.isNaN(montant)) return "Indiquez un montant";
  if (!Number.isInteger(montant)) return "Montant sans centimes, s'il vous plaît";
  if (montant < MONTANT_MIN) return `Minimum ${formatFCFA(MONTANT_MIN)}`;
  if (montant > MONTANT_MAX) return `Maximum ${formatFCFA(MONTANT_MAX)}`;
  return null;
}

export function calculerTotaux(articles: Pick<ArticlePanier, "montant">[], fraisLivraison: number) {
  const sousTotal = articles.reduce((s, a) => s + a.montant, 0);
  const frais = Math.max(0, fraisLivraison);
  return { sousTotal, frais, total: sousTotal + frais };
}

export function nettoyerTelephone(tel: string): string {
  return tel.replace(/[\s.\-()]/g, "");
}

export function telephoneValide(tel: string): boolean {
  return /^\+?[0-9]{8,15}$/.test(nettoyerTelephone(tel));
}

export type RecapCommande = {
  numero: string;
  clientNom: string;
  clientTelephone: string;
  zone: string;
  repere: string;
  note?: string | null;
  articles: { nom: string; format: string | null; montant: number }[];
  sousTotal: number;
  frais: number;
  total: number;
};

export function construireMessageWhatsApp(c: RecapCommande): string {
  const lignes = c.articles.map(
    (a) => `• ${a.nom}${a.format ? ` (${a.format})` : ""} : ${formatFCFA(a.montant)}`,
  );
  const parties = [
    `🧡 *DIANA CROQUETTES*`,
    `🧾 *Reçu de commande ${c.numero}*`,
    `📅 ${new Date().toLocaleString("fr-FR", { timeZone: "Africa/Abidjan", dateStyle: "short", timeStyle: "short" })}`,
    "",
    `👤 *Client :* ${c.clientNom}`,
    `📞 *Tél :* ${c.clientTelephone}`,
    "",
    "🧾 *Détail de la commande :*",
    ...lignes,
    "",
    `📍 *Zone :* ${c.zone}`,
    `🏠 *Repère :* ${c.repere}`,
  ];
  if (c.note && c.note.trim()) parties.push(`📝 *Note :* ${c.note.trim()}`);
  parties.push(
    "",
    `💵 Sous-total : ${formatFCFA(c.sousTotal)}`,
    `🛵 Livraison : ${c.frais > 0 ? formatFCFA(c.frais) : "Gratuite"}`,
    `✅ *TOTAL À PAYER : ${formatFCFA(c.total)}*`,
    "",
    "💰 Paiement à la livraison (espèces ou Mobile Money).",
    "Bonjour Diana, voici ma commande. On est ensemble ! 🙏",
  );
  return parties.join("\n");
}

export function lienWhatsApp(message: string, numero = WHATSAPP_VENDEUR): string {
  return `https://wa.me/${numero}?text=${encodeURIComponent(message)}`;
}
