import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MONTANTS_RAPIDES, MONTANT_MIN, MONTANT_MAX, formatFCFA, verifierMontant } from "@/lib/commande";
import { usePanier } from "@/lib/panier";
import { cn } from "@/lib/utils";
import { Icone } from "@/components/Icone";
import { decoderProduit, type RowProduit } from "@/lib/produit-service";

type ProduitRow = RowProduit;

export function CarteProduit({ produit, prioritaire }: { produit: ProduitRow; prioritaire?: boolean }) {
  const { ajouter } = usePanier();

  // Décodage des métadonnées enrichies (images multiples, variantes, badges)
  const enrichi = useMemo(() => {
    return decoderProduit(produit);
  }, [produit]);

  const [indexImage, setIndexImage] = useState(0);
  const images = enrichi.images;
  const imageActive = images[indexImage]?.url || enrichi.images[0]?.url || produit.image_url;

  // Variantes ou formats
  const aDesVariantes = enrichi.variantes.length > 0;
  const formatsDispos = aDesVariantes ? enrichi.variantes.map((v) => v.nom) : enrichi.formats;
  const aPlusieursFormats = formatsDispos.length > 1;
  const varianteInitiale = aDesVariantes ? enrichi.variantes[0] : null;

  const [varianteChoisie, setVarianteChoisie] = useState<string | null>(
    varianteInitiale ? varianteInitiale.nom : enrichi.formats[0] ?? null,
  );

  const [montant, setMontant] = useState<number | null>(
    varianteInitiale ? varianteInitiale.prix : enrichi.prix || 1000,
  );
  const [saisie, setSaisie] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [ajoute, setAjoute] = useState(false);

  function choisirVariante(nomFormat: string) {
    setVarianteChoisie(nomFormat);
    if (aDesVariantes) {
      const v = enrichi.variantes.find((item) => item.nom === nomFormat);
      if (v) {
        // Si aucune saisie personnalisée n'est en cours, suggérer le prix par défaut
        if (!saisie) {
          setMontant(v.prix);
        }
        setErreur(null);
      }
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
      const m = Number(propre);
      setMontant(m);
      setErreur(verifierMontant(m));
    } else {
      setMontant(null);
      setErreur("Indiquez un montant");
    }
  }

  function ajouterAuPanier() {
    const e = verifierMontant(montant);
    if (e) {
      setErreur(e);
      toast.error(e);
      return;
    }
    ajouter({
      produitId: enrichi.id,
      nom: enrichi.nom,
      format: varianteChoisie,
      montant: montant!,
    });
    toast.success(`${enrichi.nom} est dans le panier !`, {
      description: `${formatFCFA(montant!)} ${varianteChoisie ? `(${varianteChoisie})` : ""} · C'est doux même 😋`,
      duration: 2000,
    });
    setAjoute(true);
    setTimeout(() => setAjoute(false), 1200);
  }

  if (enrichi.masque) {
    return null; // Masqué du catalogue
  }

  const estDisponible = enrichi.disponible && enrichi.stock > 0;
  const varianteActive = aDesVariantes ? enrichi.variantes.find((v) => v.nom === varianteChoisie) : null;
  const varianteEpuisee = !!varianteActive && (!varianteActive.disponible || varianteActive.stock <= 0);

  return (
    <article
      className={cn(
        "group overflow-hidden rounded-3xl border bg-card shadow-soft transition-shadow duration-300 hover:shadow-float",
        !estDisponible && "opacity-70",
      )}
    >
      {/* Galerie photo principale */}
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {imageActive && (
          <img
            src={imageActive}
            alt={enrichi.nom}
            width={480}
            height={480}
            loading={prioritaire ? "eager" : "lazy"}
            decoding="async"
            className={cn(
              "img-reveal h-full w-full object-cover transition-[scale] duration-700 ease-out group-hover:scale-105",
              !estDisponible && "grayscale",
            )}
          />
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-foreground/40 to-transparent" />

        {/* Badges d'animation */}
        <div className="absolute left-3 top-3 flex flex-col gap-1 z-10">
          {enrichi.nouveau && (
            <span className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-extrabold text-white shadow-md">
              ✨ Nouveau
            </span>
          )}
          {enrichi.populaire && (
            <span className="rounded-full bg-amber-500 px-3 py-1 text-xs font-extrabold text-white shadow-md">
              🔥 Populaire
            </span>
          )}
          {enrichi.recommande && (
            <span className="rounded-full bg-primary px-3 py-1 text-xs font-extrabold text-white shadow-md">
              ⭐ Recommandé
            </span>
          )}
          {!estDisponible && (
            <span className="rounded-full bg-foreground px-3 py-1 text-sm font-bold text-background shadow-md">
              Épuisé
            </span>
          )}
        </div>

        {estDisponible && (
          <span className="absolute right-3 top-3 flex h-16 w-16 rotate-12 flex-col items-center justify-center rounded-full bg-gold-gradient text-center font-display leading-none text-gold-foreground shadow-float animate-balance">
            <span className="text-xs font-bold">dès</span>
            <span className="text-base font-extrabold">
              {formatFCFA(
                aDesVariantes
                  ? Math.min(...enrichi.variantes.map((v) => v.prix))
                  : enrichi.prixPromo || enrichi.prix || 500,
              ).replace(" FCFA", "F")}
            </span>
          </span>
        )}

        {/* Galerie miniatures si plusieurs photos */}
        {images.length > 1 && (
          <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center gap-1.5 overflow-x-auto rounded-xl bg-black/40 p-1.5 backdrop-blur-sm">
            {images.map((img, i) => (
              <button
                key={img.id}
                type="button"
                onClick={() => setIndexImage(i)}
                className={cn(
                  "relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border transition-all",
                  indexImage === i ? "border-gold ring-2 ring-gold scale-105" : "border-white/50 opacity-70",
                )}
              >
                <img src={img.url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4 p-4">
        <div>
          <span className="text-xs font-semibold text-primary uppercase tracking-wider">{enrichi.categorie}</span>
          <h2 className="text-2xl font-extrabold">{enrichi.nom}</h2>
          {enrichi.descriptionCourte && <p className="text-sm text-muted-foreground mt-0.5">{enrichi.descriptionCourte}</p>}
        </div>

        {estDisponible ? (
          <>
            {/* Sélection de Variantes ou Formats (si plusieurs choix disponibles) */}
            {aPlusieursFormats && (
              <div>
                <p className="mb-2 text-xs font-bold uppercase text-muted-foreground">
                  {aDesVariantes ? "Choisissez votre formule" : "Format"}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {formatsDispos.map((f) => {
                    const actif = varianteChoisie === f;
                    const vObj = aDesVariantes ? enrichi.variantes.find((v) => v.nom === f) : null;
                    return (
                      <Button
                        key={f}
                        type="button"
                        size="touch"
                        variant={actif ? "chipActive" : "chip"}
                        onClick={() => choisirVariante(f)}
                        aria-pressed={actif}
                        className="flex flex-col items-center justify-center py-2 h-auto text-xs"
                      >
                        <span className="font-bold">{f}</span>
                        {vObj && (
                          <span className={cn("text-[11px]", actif ? "text-primary-foreground font-semibold" : "text-muted-foreground")}>
                            {formatFCFA(vObj.prix)}
                          </span>
                        )}
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Montant rapide ou saisie libre par le client */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold uppercase text-muted-foreground">Montant (FCFA)</p>
                {montant && montant >= MONTANT_MIN && (
                  <span className="text-xs font-extrabold text-primary animate-pop-in">
                    {formatFCFA(montant)}
                  </span>
                )}
              </div>

              {/* Boutons de montants rapides */}
              <div className="grid grid-cols-4 gap-2">
                {MONTANTS_RAPIDES.map((m) => {
                  const actif = !saisie && montant === m;
                  return (
                    <Button
                      key={m}
                      type="button"
                      size="touch"
                      variant={actif ? "chipActive" : "chip"}
                      className="px-1 text-sm font-bold"
                      onClick={() => choisirRapide(m)}
                      aria-pressed={actif}
                    >
                      {m.toLocaleString("fr-FR").replace(/\u202f|\u00a0/g, " ")}
                    </Button>
                  );
                })}
              </div>

              {/* Saisie personnalisée du montant par le client */}
              <label className="mt-2.5 block">
                <span className="mb-1 block text-xs font-bold text-muted-foreground">
                  Ou saisis ton montant personnalisé :
                </span>
                <div className="relative">
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={MONTANT_MIN}
                    max={MONTANT_MAX}
                    step={50}
                    placeholder="Ex : 2 500, 3 000, 5 000..."
                    value={saisie}
                    onChange={(e) => changerSaisie(e.target.value)}
                    aria-invalid={!!erreur}
                    className={cn(
                      "h-12 rounded-xl pr-16 text-base font-bold transition-all",
                      saisie && "border-primary ring-2 ring-primary/20 bg-primary/5",
                      erreur && "border-destructive ring-destructive",
                    )}
                  />
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-extrabold text-primary">
                    FCFA
                  </span>
                </div>
              </label>
              {erreur && <p className="mt-1.5 text-sm font-bold text-destructive animate-glisse">{erreur}</p>}
            </div>

            <Button
              type="button"
              variant={ajoute ? "whatsapp" : "gold"}
              size="xl"
              className={cn("w-full shadow-soft", !ajoute && "brillance")}
              onClick={ajouterAuPanier}
            >
              <span key={ajoute ? "ok" : "plus"} className="inline-flex items-center gap-2 animate-pop-in">
                {ajoute ? <Icone nom="rr:check" className="animate-tampon" /> : <Icone nom="rr:plus" />}
                {ajoute
                  ? "C'est ajouté !"
                  : `Ajouter au panier${montant && montant >= MONTANT_MIN ? ` · ${formatFCFA(montant)}` : ""}`}
              </span>
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
