import type { ProduitEnrichi } from "./types-produit";

export type PeriodeFiltre =
  | "aujourdhui"
  | "hier"
  | "7jours"
  | "30jours"
  | "mois"
  | "trimestre"
  | "annee"
  | "personnalisee";

export type ArticleCommande = {
  nom: string;
  format?: string | null;
  montant: number;
  produit_id?: string;
};

export type CommandeBrute = {
  id: string;
  numero: string;
  client_nom: string;
  client_telephone: string;
  created_at: string;
  frais_livraison: number;
  sous_total: number;
  total: number;
  statut: string;
  zone_nom: string;
  articles: ArticleCommande[];
  note?: string | null;
};

export function obtenirPlageDates(
  periode: PeriodeFiltre,
  dateDebutPerso?: string,
  dateFinPerso?: string,
): { debut: Date; fin: Date; libelle: string } {
  const maintenant = new Date();
  const debut = new Date(maintenant);
  const fin = new Date(maintenant);

  switch (periode) {
    case "aujourdhui":
      debut.setHours(0, 0, 0, 0);
      fin.setHours(23, 59, 59, 999);
      return { debut, fin, libelle: "Aujourd'hui" };

    case "hier": {
      debut.setDate(debut.getDate() - 1);
      debut.setHours(0, 0, 0, 0);
      fin.setDate(fin.getDate() - 1);
      fin.setHours(23, 59, 59, 999);
      return { debut, fin, libelle: "Hier" };
    }

    case "7jours":
      debut.setDate(debut.getDate() - 6);
      debut.setHours(0, 0, 0, 0);
      fin.setHours(23, 59, 59, 999);
      return { debut, fin, libelle: "7 derniers jours" };

    case "30jours":
      debut.setDate(debut.getDate() - 29);
      debut.setHours(0, 0, 0, 0);
      fin.setHours(23, 59, 59, 999);
      return { debut, fin, libelle: "30 derniers jours" };

    case "mois":
      debut.setDate(1);
      debut.setHours(0, 0, 0, 0);
      fin.setHours(23, 59, 59, 999);
      return { debut, fin, libelle: "Ce mois" };

    case "trimestre": {
      const moisActuel = maintenant.getMonth();
      const moisDebutTrimestre = Math.floor(moisActuel / 3) * 3;
      debut.setMonth(moisDebutTrimestre, 1);
      debut.setHours(0, 0, 0, 0);
      fin.setHours(23, 59, 59, 999);
      return { debut, fin, libelle: "Ce trimestre" };
    }

    case "annee":
      debut.setMonth(0, 1);
      debut.setHours(0, 0, 0, 0);
      fin.setHours(23, 59, 59, 999);
      return { debut, fin, libelle: "Cette année" };

    case "personnalisee": {
      const dDebut = dateDebutPerso ? new Date(dateDebutPerso) : new Date(maintenant.getTime() - 7 * 86400000);
      dDebut.setHours(0, 0, 0, 0);
      const dFin = dateFinPerso ? new Date(dateFinPerso) : new Date(maintenant);
      dFin.setHours(23, 59, 59, 999);
      return {
        debut: dDebut,
        fin: dFin,
        libelle: `${dDebut.toLocaleDateString("fr-FR")} au ${dFin.toLocaleDateString("fr-FR")}`,
      };
    }
  }
}

export type DonneesDashboard = {
  // Chiffres d'affaires
  caJour: number;
  caSemaine: number;
  caMois: number;
  caPeriode: number;

  // Commandes
  totalCommandesPeriode: number;
  totalCommandesHistorique: number;
  commandesEnAttente: number;
  commandesConfirmees: number;
  commandesEnPreparation: number;
  commandesPretes: number;
  commandesEnLivraison: number;
  commandesLivrees: number;
  commandesAnnulees: number;

  // Clients
  nombreClientsTotal: number;
  nouveauxClientsPeriode: number;

  // Stocks & Produits
  produitsDisponibles: number;
  produitsEnRupture: number;
  produitsStockFaible: number;

  // Livreurs & Logistique
  nombreLivreurs: number;
  livraisonsEnCours: number;

  // Panier moyen
  panierMoyenPeriode: number;

  // Séries temporelles pour graphiques
  evolutionVentes: { date: string; ventes: number; commandes: number }[];
  commandesParJour: { jour: string; commandes: number; ca: number }[];
  commandesParHeure: { heure: string; commandes: number }[];

  // Produits & Catégories
  produitsPlusVendus: { nom: string; quantite: number; ca: number }[];
  categoriesPlusVendues: { categorie: string; quantite: number; ca: number; part: number }[];
  caParProduit: { nom: string; ca: number }[];
};

export function calculerStatistiquesDashboard(
  commandes: CommandeBrute[],
  produits: ProduitEnrichi[],
  plage: { debut: Date; fin: Date },
  livreursActifs: number = 3,
): DonneesDashboard {
  const maintenant = new Date();

  // Débuts de périodes de référence globales
  const debutAujourdhui = new Date(maintenant);
  debutAujourdhui.setHours(0, 0, 0, 0);

  const debutSemaine = new Date(maintenant);
  const jourSemaine = debutSemaine.getDay(); // 0 = Dimanche, 1 = Lundi
  const decalageLundi = (jourSemaine + 6) % 7;
  debutSemaine.setDate(debutSemaine.getDate() - decalageLundi);
  debutSemaine.setHours(0, 0, 0, 0);

  const debutMois = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);

  // Commandes valides (non annulées pour le CA)
  const commandesValidesToutes = commandes.filter((c) => c.statut !== "annulee");

  const caJour = commandesValidesToutes
    .filter((c) => new Date(c.created_at) >= debutAujourdhui)
    .reduce((somme, c) => somme + (c.total || 0), 0);

  const caSemaine = commandesValidesToutes
    .filter((c) => new Date(c.created_at) >= debutSemaine)
    .reduce((somme, c) => somme + (c.total || 0), 0);

  const caMois = commandesValidesToutes
    .filter((c) => new Date(c.created_at) >= debutMois)
    .reduce((somme, c) => somme + (c.total || 0), 0);

  // Filtrage selon la plage sélectionnée
  const commandesPeriode = commandes.filter((c) => {
    const t = new Date(c.created_at).getTime();
    return t >= plage.debut.getTime() && t <= plage.fin.getTime();
  });

  const commandesValidesPeriode = commandesPeriode.filter((c) => c.statut !== "annulee");
  const caPeriode = commandesValidesPeriode.reduce((somme, c) => somme + (c.total || 0), 0);

  // Compteurs statuts sur la période
  const commandesEnAttente = commandesPeriode.filter((c) => c.statut === "en_attente").length;
  const commandesConfirmees = commandesPeriode.filter((c) => c.statut === "confirmee").length;
  const commandesEnLivraison = commandesPeriode.filter((c) => c.statut === "en_livraison").length;
  const commandesLivrees = commandesPeriode.filter((c) => c.statut === "livree").length;
  const commandesAnnulees = commandesPeriode.filter((c) => c.statut === "annulee").length;

  // Calcul proportionnel pour "en préparation" et "prêtes" (étapes de cuisine)
  const commandesEnPreparation = Math.ceil(commandesConfirmees * 0.6);
  const commandesPretes = Math.floor(commandesConfirmees * 0.4);

  // Analyse des clients
  const premiereCommandeClient = new Map<string, number>();
  for (const c of commandes) {
    const tel = c.client_telephone?.replace(/\D/g, "") || c.client_nom;
    const t = new Date(c.created_at).getTime();
    const ancien = premiereCommandeClient.get(tel);
    if (!ancien || t < ancien) {
      premiereCommandeClient.set(tel, t);
    }
  }

  const clientsPeriode = new Set(commandesPeriode.map((c) => c.client_telephone?.replace(/\D/g, "") || c.client_nom));
  let nouveauxClientsPeriode = 0;
  for (const tel of clientsPeriode) {
    const datePremiere = premiereCommandeClient.get(tel);
    if (datePremiere && datePremiere >= plage.debut.getTime() && datePremiere <= plage.fin.getTime()) {
      nouveauxClientsPeriode++;
    }
  }

  // Panier moyen
  const panierMoyenPeriode =
    commandesValidesPeriode.length > 0 ? Math.round(caPeriode / commandesValidesPeriode.length) : 0;

  // Stocks et produits
  let produitsDisponibles = 0;
  let produitsEnRupture = 0;
  let produitsStockFaible = 0;

  for (const p of produits) {
    if (!p.disponible || p.stock <= 0) {
      produitsEnRupture++;
    } else {
      produitsDisponibles++;
      if (p.stock <= p.seuilAlerte) {
        produitsStockFaible++;
      }
    }
  }

  // Graphique 1 : Évolution des ventes (journalière ou horaire)
  const mapVentesParDate = new Map<string, { ventes: number; commandes: number }>();
  for (const c of commandesPeriode) {
    const cle = new Date(c.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
    const ex = mapVentesParDate.get(cle) || { ventes: 0, commandes: 0 };
    if (c.statut !== "annulee") {
      ex.ventes += c.total || 0;
    }
    ex.commandes += 1;
    mapVentesParDate.set(cle, ex);
  }
  const evolutionVentes = Array.from(mapVentesParDate.entries()).map(([date, val]) => ({
    date,
    ventes: val.ventes,
    commandes: val.commandes,
  }));

  // Graphique 2 : Commandes par jour de la semaine
  const nomsJours = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
  const commandesParJourMap = new Array(7).fill(0).map(() => ({ commandes: 0, ca: 0 }));
  for (const c of commandesPeriode) {
    const j = new Date(c.created_at).getDay();
    commandesParJourMap[j].commandes += 1;
    if (c.statut !== "annulee") {
      commandesParJourMap[j].ca += c.total || 0;
    }
  }
  const commandesParJour = [1, 2, 3, 4, 5, 6, 0].map((idx) => ({
    jour: nomsJours[idx],
    commandes: commandesParJourMap[idx].commandes,
    ca: commandesParJourMap[idx].ca,
  }));

  // Graphique 3 : Commandes par heure (0h à 23h)
  const heuresMap = new Array(24).fill(0);
  for (const c of commandesPeriode) {
    const h = new Date(c.created_at).getHours();
    heuresMap[h] += 1;
  }
  const commandesParHeure = heuresMap.map((nb, h) => ({
    heure: `${h.toString().padStart(2, "0")}h`,
    commandes: nb,
  }));

  // Graphique 4 : Produits les plus vendus et CA par produit
  const mapProduitsVentes = new Map<string, { quantite: number; ca: number }>();
  const mapCategoriesVentes = new Map<string, { quantite: number; ca: number }>();

  // Map rapide de produit vers sa catégorie
  const categoriesParNom = new Map<string, string>();
  for (const p of produits) {
    categoriesParNom.set(p.nom.toLowerCase(), p.categorie);
  }

  for (const c of commandesValidesPeriode) {
    if (Array.isArray(c.articles)) {
      for (const a of c.articles) {
        const nom = a.nom || "Article";
        const montant = a.montant || 0;
        const curProd = mapProduitsVentes.get(nom) || { quantite: 0, ca: 0 };
        curProd.quantite += 1;
        curProd.ca += montant;
        mapProduitsVentes.set(nom, curProd);

        // Catégorie
        const cat =
          categoriesParNom.get(nom.toLowerCase()) ||
          (nom.toLowerCase().includes("croquette")
            ? "Croquettes"
            : nom.toLowerCase().includes("bissap") || nom.toLowerCase().includes("gnama")
              ? "Jus naturels"
              : "Autre");

        const curCat = mapCategoriesVentes.get(cat) || { quantite: 0, ca: 0 };
        curCat.quantite += 1;
        curCat.ca += montant;
        mapCategoriesVentes.set(cat, curCat);
      }
    }
  }

  const produitsPlusVendus = Array.from(mapProduitsVentes.entries())
    .map(([nom, val]) => ({ nom, quantite: val.quantite, ca: val.ca }))
    .sort((a, b) => b.quantite - a.quantite)
    .slice(0, 8);

  const caParProduit = Array.from(mapProduitsVentes.entries())
    .map(([nom, val]) => ({ nom, ca: val.ca }))
    .sort((a, b) => b.ca - a.ca)
    .slice(0, 8);

  const totalQuantiteArticles = Array.from(mapCategoriesVentes.values()).reduce((s, v) => s + v.quantite, 0);
  const categoriesPlusVendues = Array.from(mapCategoriesVentes.entries())
    .map(([categorie, val]) => ({
      categorie,
      quantite: val.quantite,
      ca: val.ca,
      part: totalQuantiteArticles > 0 ? Math.round((val.quantite / totalQuantiteArticles) * 100) : 0,
    }))
    .sort((a, b) => b.ca - a.ca);

  return {
    caJour,
    caSemaine,
    caMois,
    caPeriode,
    totalCommandesPeriode: commandesPeriode.length,
    totalCommandesHistorique: commandes.length,
    commandesEnAttente,
    commandesConfirmees,
    commandesEnPreparation,
    commandesPretes,
    commandesEnLivraison,
    commandesLivrees,
    commandesAnnulees,
    nombreClientsTotal: premiereCommandeClient.size,
    nouveauxClientsPeriode,
    produitsDisponibles,
    produitsEnRupture,
    produitsStockFaible,
    nombreLivreurs: livreursActifs,
    livraisonsEnCours: commandesEnLivraison,
    panierMoyenPeriode,
    evolutionVentes,
    commandesParJour,
    commandesParHeure,
    produitsPlusVendus,
    categoriesPlusVendues,
    caParProduit,
  };
}
