import { describe, expect, it } from "vitest";
import { decoderProduit, dupliquerProduit, encoderProduit, genererSlug } from "./produit-service";
import { calculerStatistiquesDashboard, obtenirPlageDates } from "./tableau-bord-stats";
import type { ProduitEnrichi } from "./types-produit";

describe("produit-service", () => {
  it("génère des slugs propres", () => {
    expect(genererSlug("Croquettes au Poulet !")).toBe("croquettes-au-poulet");
    expect(genererSlug("Jus d'Ananas & Bissap")).toBe("jus-d-ananas-bissap");
  });

  it("duplique correctement un article sans copier son ID et avec le nom 'Copie de'", () => {
    const original: ProduitEnrichi = {
      id: "prod-12345",
      slug: "croquettes-poulet",
      nom: "Croquettes au poulet",
      descriptionCourte: "Croquettes dorées",
      descriptionDetaillee: "Recette traditionnelle",
      categorie: "Croquettes",
      sousCategorie: "Salé",
      prix: 2500,
      prixPromo: 2200,
      stock: 40,
      seuilAlerte: 10,
      disponible: true,
      masque: false,
      populaire: true,
      nouveau: false,
      recommande: true,
      sku: "CROQ-POUL",
      images: [
        { id: "img-1", url: "https://example.com/p1.jpg", principale: true, ordre: 1 },
        { id: "img-2", url: "https://example.com/p2.jpg", principale: false, ordre: 2 },
      ],
      variantes: [
        { id: "var-1", nom: "Petite portion", prix: 1500, stock: 20, disponible: true },
        { id: "var-2", nom: "Grande portion", prix: 3000, stock: 15, disponible: true },
      ],
      formats: ["Petite portion", "Grande portion"],
      ordre: 1,
    };

    const duplicata = dupliquerProduit(original);

    // 1. Ne jamais copier l'identifiant unique
    expect(duplicata.id).toBe("");
    expect(duplicata.slug).not.toBe(original.slug);
    expect(duplicata.slug).toContain("copie-de-croquettes-au-poulet");

    // 2. Nom préfixé par "Copie de"
    expect(duplicata.nom).toBe("Copie de Croquettes au poulet");

    // 3. Statut brouillon / désactivé
    expect(duplicata.disponible).toBe(false);
    expect(duplicata.masque).toBe(true);

    // 4. Copie fidèle des données (prix, catégorie, sous-catégorie)
    expect(duplicata.prix).toBe(2500);
    expect(duplicata.prixPromo).toBe(2200);
    expect(duplicata.categorie).toBe("Croquettes");
    expect(duplicata.sousCategorie).toBe("Salé");

    // 5. Nouvelles images et nouvelles variantes avec identifiants distincts
    expect(duplicata.images.length).toBe(2);
    expect(duplicata.images[0].id).not.toBe(original.images[0].id);
    expect(duplicata.images[0].url).toBe(original.images[0].url);

    expect(duplicata.variantes.length).toBe(2);
    expect(duplicata.variantes[0].id).not.toBe(original.variantes[0].id);
    expect(duplicata.variantes[0].nom).toBe("Petite portion");
  });

  it("encode et décode fidèlement les métadonnées de produit", () => {
    const produit: ProduitEnrichi = {
      id: "prod-test",
      slug: "bissap-test",
      nom: "Jus de Bissap",
      descriptionCourte: "Frais et glacé",
      descriptionDetaillee: "Infusion naturelle d'hibiscus",
      categorie: "Jus naturels",
      sousCategorie: "Frais",
      prix: 1000,
      prixPromo: null,
      stock: 50,
      seuilAlerte: 8,
      disponible: true,
      masque: false,
      populaire: true,
      nouveau: false,
      recommande: true,
      sku: "BIS-01",
      images: [{ id: "img-1", url: "https://example.com/b1.jpg", principale: true, ordre: 1 }],
      variantes: [{ id: "v1", nom: "50 cl", prix: 1000, stock: 50, disponible: true }],
      formats: ["50 cl"],
      ordre: 2,
    };

    const enc = encoderProduit(produit);
    expect(enc.nom).toBe("Jus de Bissap");
    expect(enc.image_url).toBe("https://example.com/b1.jpg");
    expect(enc.formats).toEqual(["50 cl"]);
    expect(enc.description).toContain("<!-- META:");

    const dec = decoderProduit({
      id: "prod-test",
      slug: enc.slug,
      nom: enc.nom,
      description: enc.description,
      formats: enc.formats,
      image_url: enc.image_url,
      disponible: enc.disponible,
      ordre: enc.ordre,
    });

    expect(dec.nom).toBe(produit.nom);
    expect(dec.categorie).toBe("Jus naturels");
    expect(dec.prix).toBe(1000);
    expect(dec.populaire).toBe(true);
    expect(dec.images.length).toBe(1);
    expect(dec.variantes.length).toBe(1);
    expect(dec.variantes[0].nom).toBe("50 cl");
  });
});

describe("tableau-bord-stats", () => {
  it("calcule correctement les statistiques et le panier moyen", () => {
    const commandesMock = [
      {
        id: "cmd-1",
        numero: "CMD-00001",
        client_nom: "Fatou Traore",
        client_telephone: "0701020304",
        created_at: new Date().toISOString(),
        frais_livraison: 500,
        sous_total: 2500,
        total: 3000,
        statut: "livree",
        zone_nom: "Anyama",
        articles: [{ nom: "Croquettes", montant: 2500 }],
      },
      {
        id: "cmd-2",
        numero: "CMD-00002",
        client_nom: "Amadou Diallo",
        client_telephone: "0705060708",
        created_at: new Date().toISOString(),
        frais_livraison: 500,
        sous_total: 1000,
        total: 1500,
        statut: "en_attente",
        zone_nom: "CAFOP Abobo",
        articles: [{ nom: "Jus de Bissap", montant: 1000 }],
      },
      {
        id: "cmd-3",
        numero: "CMD-00003",
        client_nom: "Koffi Serge",
        client_telephone: "0709080706",
        created_at: new Date().toISOString(),
        frais_livraison: 500,
        sous_total: 2000,
        total: 2500,
        statut: "annulee",
        zone_nom: "Anyama",
        articles: [{ nom: "Croquettes", montant: 2000 }],
      },
    ];

    const produitsMock: ProduitEnrichi[] = [
      {
        id: "p1",
        slug: "croquettes",
        nom: "Croquettes",
        descriptionCourte: "",
        descriptionDetaillee: "",
        categorie: "Croquettes",
        sousCategorie: "",
        prix: 2500,
        prixPromo: null,
        stock: 12,
        seuilAlerte: 5,
        disponible: true,
        masque: false,
        populaire: true,
        nouveau: false,
        recommande: false,
        sku: "CROQ",
        images: [],
        variantes: [],
        formats: [],
        ordre: 1,
      },
      {
        id: "p2",
        slug: "bissap",
        nom: "Jus de Bissap",
        descriptionCourte: "",
        descriptionDetaillee: "",
        categorie: "Jus naturels",
        sousCategorie: "",
        prix: 1000,
        prixPromo: null,
        stock: 3, // Stock faible <= seuil
        seuilAlerte: 5,
        disponible: true,
        masque: false,
        populaire: false,
        nouveau: true,
        recommande: false,
        sku: "BIS",
        images: [],
        variantes: [],
        formats: [],
        ordre: 2,
      },
      {
        id: "p3",
        slug: "gateau",
        nom: "Gâteau",
        descriptionCourte: "",
        descriptionDetaillee: "",
        categorie: "Pâtisseries",
        sousCategorie: "",
        prix: 1500,
        prixPromo: null,
        stock: 0, // Rupture
        seuilAlerte: 2,
        disponible: true,
        masque: false,
        populaire: false,
        nouveau: false,
        recommande: false,
        sku: "GAT",
        images: [],
        variantes: [],
        formats: [],
        ordre: 3,
      },
    ];

    const plage = obtenirPlageDates("aujourdhui");
    const stats = calculerStatistiquesDashboard(commandesMock, produitsMock, plage);

    // CA du jour exclut les commandes annulées (3000 + 1500 = 4500)
    expect(stats.caJour).toBe(4500);

    // Commandes par statut
    expect(stats.commandesLivrees).toBe(1);
    expect(stats.commandesEnAttente).toBe(1);
    expect(stats.commandesAnnulees).toBe(1);
    expect(stats.totalCommandesPeriode).toBe(3);

    // Panier moyen : 4500 / 2 commandes valides = 2250 FCFA
    expect(stats.panierMoyenPeriode).toBe(2250);

    // Stocks
    expect(stats.produitsDisponibles).toBe(2);
    expect(stats.produitsStockFaible).toBe(1);
    expect(stats.produitsEnRupture).toBe(1);

    // Clients
    expect(stats.nombreClientsTotal).toBe(3);
    expect(stats.nouveauxClientsPeriode).toBe(3);
  });
});
