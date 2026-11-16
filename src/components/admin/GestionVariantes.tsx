import { useState } from "react";
import { Icone } from "@/components/Icone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { formatFCFA } from "@/lib/commande";
import type { VarianteProduit, ImageArticle } from "@/lib/types-produit";

interface GestionVariantesProps {
  variantes: VarianteProduit[];
  imagesDisponibles: ImageArticle[];
  nomArticle: string;
  prixBase: number;
  onChange: (variantes: VarianteProduit[]) => void;
}

export function GestionVariantes({
  variantes,
  imagesDisponibles,
  nomArticle,
  prixBase,
  onChange,
}: GestionVariantesProps) {
  const [nouvelleVariante, setNouvelleVariante] = useState<Partial<VarianteProduit>>({
    nom: "",
    prix: prixBase || 1000,
    stock: 25,
    sku: "",
    disponible: true,
  });

  function ajouterVariante() {
    const nom = nouvelleVariante.nom?.trim();
    if (!nom) return;

    const nouvelle: VarianteProduit = {
      id: `var-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
      nom,
      prix: Number(nouvelleVariante.prix) || prixBase || 1000,
      stock: Number(nouvelleVariante.stock) || 0,
      sku: nouvelleVariante.sku?.trim() || `${nomArticle.slice(0, 3).toUpperCase()}-${nom.slice(0, 3).toUpperCase()}`,
      disponible: nouvelleVariante.disponible ?? true,
      image: nouvelleVariante.image || null,
    };

    onChange([...variantes, nouvelle]);
    setNouvelleVariante({
      nom: "",
      prix: prixBase || 1000,
      stock: 25,
      sku: "",
      disponible: true,
    });
  }

  function modifierVariante(id: string, champs: Partial<VarianteProduit>) {
    const maj = variantes.map((v) => (v.id === id ? { ...v, ...champs } : v));
    onChange(maj);
  }

  function supprimerVariante(id: string) {
    onChange(variantes.filter((v) => v.id !== id));
  }

  // Modèles prédéfinis rapides selon les exemples fournis par l'utilisateur
  function appliquerModele(modele: "boissons" | "portions") {
    if (modele === "boissons") {
      onChange([
        { id: `var-1`, nom: "25 cl", prix: 500, stock: 30, sku: "BOIS-25CL", disponible: true },
        { id: `var-2`, nom: "50 cl", prix: 1000, stock: 25, sku: "BOIS-50CL", disponible: true },
        { id: `var-3`, nom: "1 L", prix: 1800, stock: 15, sku: "BOIS-1L", disponible: true },
        { id: `var-4`, nom: "2 L", prix: 3000, stock: 10, sku: "BOIS-2L", disponible: true },
      ]);
    } else {
      onChange([
        { id: `var-1`, nom: "Petite portion", prix: 500, stock: 30, sku: "PORT-PETITE", disponible: true },
        { id: `var-2`, nom: "Moyenne portion", prix: 1000, stock: 25, sku: "PORT-MOYENNE", disponible: true },
        { id: `var-3`, nom: "Grande portion", prix: 2000, stock: 20, sku: "PORT-GRANDE", disponible: true },
        { id: `var-4`, nom: "Pack familial", prix: 5000, stock: 10, sku: "PORT-FAMILLE", disponible: true },
      ]);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="font-semibold text-foreground">Variantes et formats de l'article</h4>
          <p className="text-xs text-muted-foreground">
            Configurez différentes tailles, volumes ou portions avec leur prix et stock respectifs.
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 rounded-lg text-xs"
            onClick={() => appliquerModele("portions")}
          >
            Modèle Portions
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 rounded-lg text-xs"
            onClick={() => appliquerModele("boissons")}
          >
            Modèle Boissons (25cl, 50cl, 1L, 2L)
          </Button>
        </div>
      </div>

      {variantes.length === 0 ? (
        <p className="rounded-xl border border-dashed bg-muted/30 p-4 text-center text-sm text-muted-foreground">
          Aucune variante spécifique. Le prix de base et le format par défaut s'appliqueront.
        </p>
      ) : (
        <div className="space-y-2">
          {variantes.map((v) => (
            <div
              key={v.id}
              className="grid grid-cols-1 items-center gap-2 rounded-xl border bg-card p-3 shadow-soft sm:grid-cols-12"
            >
              <div className="sm:col-span-3">
                <label className="text-[11px] font-semibold text-muted-foreground sm:sr-only">Nom variante</label>
                <Input
                  value={v.nom}
                  onChange={(e) => modifierVariante(v.id, { nom: e.target.value })}
                  placeholder="Nom (ex : 50 cl)"
                  className="h-9 rounded-lg text-sm"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[11px] font-semibold text-muted-foreground sm:sr-only">Prix (FCFA)</label>
                <div className="relative">
                  <Input
                    type="number"
                    value={v.prix}
                    onChange={(e) => modifierVariante(v.id, { prix: Number(e.target.value) })}
                    placeholder="Prix"
                    className="h-9 rounded-lg pr-10 text-sm"
                  />
                  <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                    F
                  </span>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="text-[11px] font-semibold text-muted-foreground sm:sr-only">Stock</label>
                <Input
                  type="number"
                  value={v.stock}
                  onChange={(e) => modifierVariante(v.id, { stock: Number(e.target.value) })}
                  placeholder="Stock"
                  className="h-9 rounded-lg text-sm"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[11px] font-semibold text-muted-foreground sm:sr-only">SKU</label>
                <Input
                  value={v.sku || ""}
                  onChange={(e) => modifierVariante(v.id, { sku: e.target.value })}
                  placeholder="SKU"
                  className="h-9 rounded-lg text-xs"
                />
              </div>

              <div className="flex items-center justify-between gap-2 sm:col-span-2 sm:justify-center">
                <span className="text-xs font-medium sm:hidden">Disponible</span>
                <label className="flex items-center gap-1.5 text-xs">
                  <Switch
                    checked={v.disponible}
                    onCheckedChange={(val) => modifierVariante(v.id, { disponible: val })}
                  />
                  <span className={v.disponible ? "text-success font-medium" : "text-muted-foreground"}>
                    {v.disponible ? "Actif" : "Épuisé"}
                  </span>
                </label>
              </div>

              <div className="flex justify-end sm:col-span-1">
                <button
                  type="button"
                  onClick={() => supprimerVariante(v.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  title="Supprimer la variante"
                >
                  <Icone nom="rr:trash" className="text-sm" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Formulaire rapide d'ajout de variante */}
      <div className="rounded-xl border border-dashed bg-muted/20 p-3">
        <p className="mb-2 text-xs font-semibold text-foreground">Ajouter une nouvelle variante</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-12 sm:items-center">
          <div className="sm:col-span-4">
            <Input
              value={nouvelleVariante.nom}
              onChange={(e) => setNouvelleVariante({ ...nouvelleVariante, nom: e.target.value })}
              placeholder="Nom (ex : 1 L, Pack duo)"
              className="h-9 rounded-lg text-sm"
            />
          </div>
          <div className="sm:col-span-3">
            <Input
              type="number"
              value={nouvelleVariante.prix || ""}
              onChange={(e) => setNouvelleVariante({ ...nouvelleVariante, prix: Number(e.target.value) })}
              placeholder="Prix FCFA"
              className="h-9 rounded-lg text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <Input
              type="number"
              value={nouvelleVariante.stock ?? ""}
              onChange={(e) => setNouvelleVariante({ ...nouvelleVariante, stock: Number(e.target.value) })}
              placeholder="Stock"
              className="h-9 rounded-lg text-sm"
            />
          </div>
          <div className="sm:col-span-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 w-full rounded-lg"
              disabled={!nouvelleVariante.nom?.trim()}
              onClick={ajouterVariante}
            >
              <Icone nom="rr:plus" /> Ajouter
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
