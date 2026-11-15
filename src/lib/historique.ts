// Historique local des commandes du client (sur son téléphone uniquement).
const CLE = "mes-commandes-v1";

export type CommandeLocale = {
  numero: string;
  telephone: string;
  total: number;
  date: string;
  articles: { produitId?: string; nom: string; format: string | null; montant: number }[];
  client?: { nom: string; zoneId: string; repere: string };
};

export function lireHistorique(): CommandeLocale[] {
  try {
    const brut = window.localStorage.getItem(CLE);
    const v = brut ? JSON.parse(brut) : [];
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function ajouterHistorique(c: CommandeLocale) {
  try {
    const liste = [c, ...lireHistorique().filter((x) => x.numero !== c.numero)].slice(0, 20);
    window.localStorage.setItem(CLE, JSON.stringify(liste));
  } catch {
    // stockage indisponible
  }
}
