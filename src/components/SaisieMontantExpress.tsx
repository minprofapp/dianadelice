import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Icone } from "@/components/Icone";
import { formatFCFA, MONTANT_MIN, MONTANT_MAX, verifierMontant } from "@/lib/commande";
import { usePanier } from "@/lib/panier";
import { cn } from "@/lib/utils";

type ProduitSimple = {
  id: string;
  nom: string;
  slug: string;
  formats: string[];
  disponible: boolean;
};

const MONTANTS_EXPRESS = [500, 1000, 1500, 2000, 5000] as const;

export function SaisieMontantExpress({ produits }: { produits: ProduitSimple[] }) {
  const { ajouter } = usePanier();
  const navigate = useNavigate();

  const dispos = produits.filter((p) => p.disponible);
  const [produitId, setProduitId] = useState<string>(dispos[0]?.id || "");
  const produitActif = dispos.find((p) => p.id === produitId) || dispos[0];

  const formats = produitActif?.formats || [];
  const [formatChoisi, setFormatChoisi] = useState<string | null>(formats[0] ?? null);

  const [montant, setMontant] = useState<number | null>(1000);
  const [saisie, setSaisie] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);

  if (!produitActif) return null;

  function changerProduit(id: string) {
    setProduitId(id);
    const p = dispos.find((x) => x.id === id);
    if (p && p.formats.length > 0) {
      setFormatChoisi(p.formats[0]);
    } else {
      setFormatChoisi(null);
    }
  }

  function choisirRapide(m: number) {
    setMontant(m);
    setSaisie("");
    setErreur(null);
  }

  function changerSaisie(v: string) {
    const propre = v.replace(/\D/g, "").slice(0, 6);
    setSaisie(propre);
    if (propre) {
      const n = Number(propre);
      setMontant(n);
      setErreur(verifierMontant(n));
    } else {
      setMontant(null);
      setErreur("Indiquez un montant");
    }
  }

  function commander(versPanier = false) {
    const err = verifierMontant(montant);
    if (err) {
      setErreur(err);
      toast.error(err);
      return;
    }

    ajouter({
      produitId: produitActif.id,
      nom: produitActif.nom,
      format: formatChoisi,
      montant: montant!,
    });

    toast.success(`${produitActif.nom} ajouté pour ${formatFCFA(montant!)} !`, {
      description: "Votre sélection est dans le panier 😋",
      duration: 2200,
    });

    if (versPanier) {
      navigate({ to: "/panier" });
    }
  }

  return (
    <section className="relative overflow-hidden rounded-3xl border-2 border-primary/20 bg-gradient-to-br from-card via-card to-secondary/30 p-5 shadow-soft">
      {/* En-tête */}
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-soft">
          <Icone nom="rr:wallet" className="text-2xl" />
        </span>
        <div>
          <h3 className="text-xl font-extrabold text-foreground">
            Commander selon ton montant
          </h3>
          <p className="text-xs text-muted-foreground">
            Saisis ton montant ou ton budget, choisis et commande directement !
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {/* Étape 1 : Choisir le produit */}
        <div>
          <p className="mb-2 text-xs font-bold uppercase text-muted-foreground">
            1. Choisis ta gourmandise
          </p>
          <div className="grid grid-cols-3 gap-2">
            {dispos.map((p) => {
              const actif = p.id === produitActif.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => changerProduit(p.id)}
                  className={cn(
                    "flex flex-col items-center justify-center rounded-2xl border p-2.5 text-center transition-all",
                    actif
                      ? "border-primary bg-primary text-primary-foreground shadow-soft scale-[1.02]"
                      : "border-border bg-card hover:bg-muted/50 text-foreground",
                  )}
                >
                  <Icone
                    nom={p.slug.includes("croquette") ? "sr:cookie" : "rr:shopping-bag"}
                    className="text-xl mb-1"
                  />
                  <span className="text-xs font-extrabold line-clamp-1">{p.nom}</span>
                </button>
              );
            })}
          </div>

          {/* Formats si plusieurs */}
          {formats.length > 1 && (
            <div className="mt-2.5 flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground">Format :</span>
              {formats.map((f) => (
                <Button
                  key={f}
                  type="button"
                  size="sm"
                  variant={formatChoisi === f ? "chipActive" : "chip"}
                  onClick={() => setFormatChoisi(f)}
                  className="h-8 text-xs font-bold px-3"
                >
                  {f}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Étape 2 : Saisir le montant */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold uppercase text-muted-foreground">
              2. Saisis ton montant (FCFA)
            </p>
            {montant && montant >= MONTANT_MIN && (
              <span className="text-xs font-extrabold text-primary animate-pop-in">
                {formatFCFA(montant)}
              </span>
            )}
          </div>

          {/* Montants rapides express */}
          <div className="grid grid-cols-5 gap-1.5">
            {MONTANTS_EXPRESS.map((m) => {
              const actif = !saisie && montant === m;
              return (
                <Button
                  key={m}
                  type="button"
                  size="touch"
                  variant={actif ? "chipActive" : "chip"}
                  className="px-1 text-xs font-extrabold h-10"
                  onClick={() => choisirRapide(m)}
                  aria-pressed={actif}
                >
                  {m >= 1000 ? `${m / 1000}k` : m}
                </Button>
              );
            })}
          </div>

          {/* Champ de saisie personnalisée */}
          <div className="mt-2.5">
            <div className="relative">
              <Input
                type="number"
                inputMode="numeric"
                min={MONTANT_MIN}
                max={MONTANT_MAX}
                step={50}
                placeholder="Ou saisis ton montant (ex : 3 000, 7 500...)"
                value={saisie}
                onChange={(e) => changerSaisie(e.target.value)}
                aria-invalid={!!erreur}
                className={cn(
                  "h-12 rounded-2xl pr-16 text-base font-extrabold transition-all",
                  saisie && "border-primary ring-2 ring-primary/20 bg-primary/5",
                  erreur && "border-destructive ring-destructive",
                )}
              />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-extrabold text-primary">
                FCFA
              </span>
            </div>
            {erreur && (
              <p className="mt-1.5 text-xs font-bold text-destructive animate-glisse">{erreur}</p>
            )}
          </div>
        </div>

        {/* Boutons d'action */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="rounded-2xl font-bold h-12 text-sm"
            onClick={() => commander(false)}
          >
            <Icone nom="rr:plus" />
            Ajouter au panier
          </Button>

          <Button
            type="button"
            variant="gold"
            size="lg"
            className="rounded-2xl font-extrabold h-12 text-sm brillance shadow-soft"
            onClick={() => commander(true)}
          >
            Commander {montant && montant >= MONTANT_MIN ? `· ${formatFCFA(montant)}` : ""}
            <Icone nom="rr:angle-small-right" className="text-xl" />
          </Button>
        </div>
      </div>
    </section>
  );
}
