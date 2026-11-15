import { useState } from "react";
import { Check, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MONTANTS_RAPIDES, MONTANT_MIN, formatFCFA, verifierMontant } from "@/lib/commande";
import { usePanier } from "@/lib/panier";
import { imageProduit } from "@/lib/catalogue";
import { cn } from "@/lib/utils";

type Produit = {
  id: string;
  slug: string;
  nom: string;
  description: string;
  formats: string[];
  image_url: string | null;
  disponible: boolean;
};

export function CarteProduit({ produit, prioritaire }: { produit: Produit; prioritaire?: boolean }) {
  const { ajouter } = usePanier();
  const [montant, setMontant] = useState<number | null>(1000);
  const [saisie, setSaisie] = useState("");
  const [format, setFormat] = useState<string | null>(produit.formats[0] ?? null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [ajoute, setAjoute] = useState(false);
  const img = imageProduit(produit);

  function choisirRapide(m: number) {
    setMontant(m);
    setSaisie("");
    setErreur(null);
  }

  function changerSaisie(v: string) {
    const propre = v.replace(/\D/g, "").slice(0, 6);
    setSaisie(propre);
    setMontant(propre ? Number(propre) : null);
    setErreur(null);
  }

  function ajouterAuPanier() {
    const e = verifierMontant(montant);
    if (e) {
      setErreur(e);
      return;
    }
    ajouter({ produitId: produit.id, nom: produit.nom, format, montant: montant! });
    toast.success(`${produit.nom} est dans le panier !`, { description: `${formatFCFA(montant!)} · C'est doux même 😋`, duration: 1800 });
    setAjoute(true);
    setTimeout(() => setAjoute(false), 1200);
  }

  return (
    <article
      className={cn(
        "overflow-hidden rounded-3xl border bg-card shadow-soft",
        !produit.disponible && "opacity-70",
      )}
    >
      <div className="relative aspect-[4/3] bg-muted">
        {img && (
          <img
            src={img}
            alt={produit.nom}
            width={480}
            height={480}
            loading={prioritaire ? "eager" : "lazy"}
            decoding="async"
            className={cn("h-full w-full object-cover", !produit.disponible && "grayscale")}
          />
        )}
        {!produit.disponible && (
          <span className="absolute left-3 top-3 rounded-full bg-foreground px-3 py-1 text-sm font-bold text-background">
            Épuisé
          </span>
        )}
      </div>

      <div className="space-y-4 p-4">
        <div>
          <h2 className="text-2xl font-semibold">{produit.nom}</h2>
          {produit.description && <p className="text-muted-foreground">{produit.description}</p>}
        </div>

        {produit.disponible ? (
          <>
            {produit.formats.length > 1 && (
              <div>
                <p className="mb-2 text-sm font-semibold text-muted-foreground">Sachet ou bouteille ?</p>
                <div className="grid grid-cols-2 gap-2">
                  {produit.formats.map((f) => (
                    <Button
                      key={f}
                      type="button"
                      size="touch"
                      variant={format === f ? "chipActive" : "chip"}
                      onClick={() => setFormat(f)}
                      aria-pressed={format === f}
                    >
                      {f}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="mb-2 text-sm font-semibold text-muted-foreground">Ton montant (FCFA)</p>
              <div className="grid grid-cols-4 gap-2">
                {MONTANTS_RAPIDES.map((m) => {
                  const actif = !saisie && montant === m;
                  return (
                    <Button
                      key={m}
                      type="button"
                      size="touch"
                      variant={actif ? "chipActive" : "chip"}
                      className="px-1 text-sm"
                      onClick={() => choisirRapide(m)}
                      aria-pressed={actif}
                    >
                      {m.toLocaleString("fr-FR").replace(/\u202f|\u00a0/g, " ")}
                    </Button>
                  );
                })}
              </div>
              <label className="mt-2 block">
                <span className="sr-only">Autre montant en FCFA</span>
                <div className="relative">
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={MONTANT_MIN}
                    step={50}
                    placeholder="Autre montant (min. 500)"
                    value={saisie}
                    onChange={(e) => changerSaisie(e.target.value)}
                    aria-invalid={!!erreur}
                    className={cn(
                      "h-12 rounded-xl pr-16 text-base",
                      saisie && "border-primary ring-1 ring-primary",
                      erreur && "border-destructive ring-destructive",
                    )}
                  />
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
                    FCFA
                  </span>
                </div>
              </label>
              {erreur && <p className="mt-1 text-sm font-medium text-destructive">{erreur}</p>}
            </div>

            <Button type="button" variant="gold" size="xl" className="w-full" onClick={ajouterAuPanier}>
              {ajoute ? <Check className="!size-5" /> : <Plus className="!size-5" />}
              {ajoute ? "C'est ajouté !" : `Ajouter${montant && montant >= MONTANT_MIN ? ` · ${formatFCFA(montant)}` : ""}`}
            </Button>
          </>
        ) : (
          <p className="rounded-xl bg-muted p-3 text-center font-medium text-muted-foreground">
            C'est fini pour aujourd'hui, on en refait bientôt !
          </p>
        )}
      </div>
    </article>
  );
}
