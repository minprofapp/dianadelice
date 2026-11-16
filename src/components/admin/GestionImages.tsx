import { useState, useRef, type ChangeEvent } from "react";
import { Icone } from "@/components/Icone";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { optimiserImage } from "@/lib/produit-service";
import type { ImageArticle } from "@/lib/types-produit";
import { cn } from "@/lib/utils";

interface GestionImagesProps {
  images: ImageArticle[];
  onChange: (images: ImageArticle[]) => void;
}

export function GestionImages({ images, onChange }: GestionImagesProps) {
  const [enTraitement, setEnTraitement] = useState(false);
  const inputFichierRef = useRef<HTMLInputElement>(null);
  const inputCameraRef = useRef<HTMLInputElement>(null);
  const [remplaceId, setRemplaceId] = useState<string | null>(null);

  async function traiterFichiers(fichiers: FileList | null, estRemplacement = false) {
    if (!fichiers || fichiers.length === 0) return;
    setEnTraitement(true);

    try {
      const nouvellesImages: ImageArticle[] = [];
      let nbOptimisees = 0;

      for (let i = 0; i < fichiers.length; i++) {
        const f = fichiers[i];
        try {
          const res = await optimiserImage(f, { maxDim: 1200, qualite: 0.85 });
          nbOptimisees++;

          const nouvelleImage: ImageArticle = {
            id: `img-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
            url: res.url,
            principale: images.length === 0 && nouvellesImages.length === 0,
            ordre: images.length + nouvellesImages.length + 1,
            nomFichier: f.name,
          };

          nouvellesImages.push(nouvelleImage);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Erreur sur le fichier";
          toast.error(`${f.name}: ${msg}`);
        }
      }

      if (nouvellesImages.length > 0) {
        if (estRemplacement && remplaceId) {
          // Remplacer l'image ciblée
          const maj = images.map((img) =>
            img.id === remplaceId ? { ...nouvellesImages[0], principale: img.principale, ordre: img.ordre } : img,
          );
          onChange(maj);
          toast.success("Image remplacée et optimisée");
          setRemplaceId(null);
        } else {
          // Ajout à la liste existante
          let combine = [...images, ...nouvellesImages];
          // S'assurer qu'au moins une est principale
          if (!combine.some((img) => img.principale) && combine.length > 0) {
            combine[0].principale = true;
          }
          onChange(combine);
          toast.success(`${nbOptimisees} image(s) ajoutée(s) et compressée(s) en WebP`);
        }
      }
    } finally {
      setEnTraitement(false);
      if (inputFichierRef.current) inputFichierRef.current.value = "";
      if (inputCameraRef.current) inputCameraRef.current.value = "";
    }
  }

  function definirPrincipale(id: string) {
    const maj = images.map((img) => ({
      ...img,
      principale: img.id === id,
    }));
    onChange(maj);
    toast.success("Image principale mise à jour");
  }

  function supprimerImage(id: string) {
    const restantes = images.filter((img) => img.id !== id);
    if (restantes.length > 0 && !restantes.some((img) => img.principale)) {
      restantes[0].principale = true;
    }
    onChange(restantes);
    toast.info("Image supprimée");
  }

  function deplacer(index: number, direction: "monter" | "descendre") {
    const nouvelIndex = direction === "monter" ? index - 1 : index + 1;
    if (nouvelIndex < 0 || nouvelIndex >= images.length) return;

    const copie = [...images];
    const temp = copie[index];
    copie[index] = copie[nouvelIndex];
    copie[nouvelIndex] = temp;

    // Réassigner l'ordre séquentiel
    const reordonnees = copie.map((img, i) => ({ ...img, ordre: i + 1 }));
    onChange(reordonnees);
  }

  function declencherRemplacement(id: string) {
    setRemplaceId(id);
    inputFichierRef.current?.click();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="font-semibold text-foreground">Galerie photos du produit</h4>
          <p className="text-xs text-muted-foreground">
            Formats acceptés : JPG, PNG, WEBP. Compression et redimensionnement automatiques.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Input fichier standard */}
          <input
            ref={inputFichierRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/jpg"
            multiple={!remplaceId}
            className="hidden"
            onChange={(e: ChangeEvent<HTMLInputElement>) => traiterFichiers(e.target.files, !!remplaceId)}
          />

          {/* Input caméra (mobile / webcam) */}
          <input
            ref={inputCameraRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/jpg"
            capture="environment"
            className="hidden"
            onChange={(e: ChangeEvent<HTMLInputElement>) => traiterFichiers(e.target.files, false)}
          />

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl"
            disabled={enTraitement}
            onClick={() => {
              setRemplaceId(null);
              inputFichierRef.current?.click();
            }}
          >
            <Icone nom="rr:box-open" /> Importer photos
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl"
            disabled={enTraitement}
            onClick={() => {
              setRemplaceId(null);
              inputCameraRef.current?.click();
            }}
          >
            <Icone nom="rr:smartphone" /> Prendre photo
          </Button>
        </div>
      </div>

      {enTraitement && (
        <div className="flex items-center justify-center gap-2 rounded-xl bg-accent/50 p-4 text-sm font-medium">
          <Icone nom="rr:spinner" className="animate-spin text-primary" />
          <span>Compression et optimisation de l'image en cours...</span>
        </div>
      )}

      {images.length === 0 ? (
        <div
          onClick={() => inputFichierRef.current?.click()}
          className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-muted-foreground/30 bg-muted/30 p-8 text-center transition-colors hover:border-primary/50 hover:bg-muted/50"
        >
          <div className="rounded-full bg-primary/10 p-3 text-primary">
            <Icone nom="rr:box-open" className="text-2xl" />
          </div>
          <p className="font-semibold text-sm">Cliquez pour ajouter des photos</p>
          <p className="text-xs text-muted-foreground">ou prenez directement une photo avec votre smartphone</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {images.map((img, idx) => (
            <div
              key={img.id}
              className={cn(
                "group relative overflow-hidden rounded-2xl border bg-card p-1 shadow-soft transition-all",
                img.principale ? "ring-2 ring-primary" : "border-border",
              )}
            >
              <div className="relative aspect-square overflow-hidden rounded-xl bg-muted">
                <img src={img.url} alt="" className="h-full w-full object-cover" />

                {img.principale && (
                  <span className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-md bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground shadow">
                    <Icone nom="sr:star" className="text-[10px]" /> Principale
                  </span>
                )}

                <div className="absolute right-1.5 top-1.5 flex flex-col gap-1 opacity-90 transition-opacity">
                  <button
                    type="button"
                    onClick={() => supprimerImage(img.id)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-black/65 text-white hover:bg-destructive"
                    title="Supprimer cette image"
                  >
                    <Icone nom="rr:trash" className="text-xs" />
                  </button>
                </div>
              </div>

              {/* Barre de contrôles sous la photo */}
              <div className="mt-2 flex items-center justify-between gap-1 px-1 pb-1">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => deplacer(idx, "monter")}
                    className="flex h-6 w-6 items-center justify-center rounded border bg-muted text-xs hover:bg-accent disabled:opacity-30"
                    title="Déplacer vers la gauche"
                  >
                    ◀
                  </button>
                  <button
                    type="button"
                    disabled={idx === images.length - 1}
                    onClick={() => deplacer(idx, "descendre")}
                    className="flex h-6 w-6 items-center justify-center rounded border bg-muted text-xs hover:bg-accent disabled:opacity-30"
                    title="Déplacer vers la droite"
                  >
                    ▶
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  {!img.principale && (
                    <button
                      type="button"
                      onClick={() => definirPrincipale(img.id)}
                      className="rounded border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-[11px] font-semibold text-primary hover:bg-primary hover:text-primary-foreground"
                      title="Définir comme photo principale"
                    >
                      Étoile
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => declencherRemplacement(img.id)}
                    className="rounded border bg-muted px-1.5 py-0.5 text-[11px] font-medium hover:bg-accent"
                    title="Remplacer cette image"
                  >
                    Remplacer
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
