import { describe, expect, it } from "vitest";
import {
  calculerTotaux,
  construireMessageWhatsApp,
  formatFCFA,
  lienWhatsApp,
  telephoneValide,
  verifierMontant,
} from "./commande";

describe("montant minimum de 500 FCFA et saisie libre par le client", () => {
  it("refuse null ou indéfini", () => {
    expect(verifierMontant(null)).toBe("Indiquez un montant");
    expect(verifierMontant(undefined)).toBe("Indiquez un montant");
    expect(verifierMontant(NaN)).toBe("Indiquez un montant");
  });
  it("refuse un montant avec centimes", () => {
    expect(verifierMontant(1250.5)).toBe("Montant sans centimes, s'il vous plaît");
  });
  it("refuse moins de 500 FCFA", () => {
    expect(verifierMontant(499)).toBe("Minimum 500 FCFA");
    expect(verifierMontant(0)).toBe("Minimum 500 FCFA");
    expect(verifierMontant(-100)).toBe("Minimum 500 FCFA");
  });
  it("refuse plus de 100 000 FCFA", () => {
    expect(verifierMontant(100001)).toBe("Maximum 100 000 FCFA");
  });
  it("accepte 500 FCFA", () => {
    expect(verifierMontant(500)).toBeNull();
  });
  it("accepte des montants libres saisis par le client (ex: 2 750, 3 500, 5 000 FCFA)", () => {
    expect(verifierMontant(1000)).toBeNull();
    expect(verifierMontant(1500)).toBeNull();
    expect(verifierMontant(2000)).toBeNull();
    expect(verifierMontant(2750)).toBeNull();
    expect(verifierMontant(3500)).toBeNull();
    expect(verifierMontant(5000)).toBeNull();
    expect(verifierMontant(10000)).toBeNull();
    expect(verifierMontant(100000)).toBeNull();
  });
});

describe("total avec frais de livraison", () => {
  it("additionne les articles et les frais de la zone", () => {
    expect(calculerTotaux([{ montant: 1000 }, { montant: 1500 }], 500)).toEqual({
      sousTotal: 2500,
      frais: 500,
      total: 3000,
    });
  });
  it("retrait sur place : 0 FCFA de frais", () => {
    expect(calculerTotaux([{ montant: 500 }], 0).total).toBe(500);
  });
});

describe("téléphone", () => {
  it("accepte un numéro ivoirien à 10 chiffres avec espaces", () => {
    expect(telephoneValide("07 07 12 34 56")).toBe(true);
  });
  it("refuse un numéro trop court", () => {
    expect(telephoneValide("0707")).toBe(false);
  });
});

describe("message WhatsApp", () => {
  const message = construireMessageWhatsApp({
    numero: "CMD-00012",
    clientNom: "Awa Koné",
    clientTelephone: "0707123456",
    zone: "Anyama",
    repere: "Près de la mosquée",
    note: "bien glacé",
    articles: [{ nom: "Jus de Bissap", format: "Bouteille", montant: 1500 }],
    sousTotal: 1500,
    frais: 500,
    total: 2000,
  });
  it("contient le numéro de commande et le total à payer", () => {
    expect(message).toContain("CMD-00012");
    expect(message).toContain(`TOTAL À PAYER : ${formatFCFA(2000)}`);
  });
  it("le lien wa.me encode le message", () => {
    expect(lienWhatsApp("Salut 🙏", "2250700000000")).toBe(
      `https://wa.me/2250700000000?text=${encodeURIComponent("Salut 🙏")}`,
    );
  });
});
