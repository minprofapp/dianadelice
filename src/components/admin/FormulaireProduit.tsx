import { useState } from "react";
import { Icone } from "@/components/Icone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { GestionImages } from "./GestionImages";
import { GestionVariantes } from "./GestionVariantes";
import { CATEGORIES_PAR_DEFAUT, type ProduitEnrichi } from "@/lib/types-produit";
import { formatFCFA } from "@/lib/commande";
import { genererSlug } from "@/lib/produit-service";

interface FormulaireProduitProps {
  initial?: ProduitEnrichi | null;
  onEnregistrer: (produit: ProduitEnrichi) => void;
  onAnnuler: () => void;
  enChargement?: boolean;
}

export function FormulaireProduit({
  initial,
  onEnregistrer,
  onAnnuler,
  enChargement = false,
}: FormulaireProduitProps) {
  const [nom, setNom] = useState(initial?.nom || "");
  const [descriptionCourte, setDescriptionCourte] = useState(initial?.descriptionCourte || "");
  const [descriptionDetaillee, setDescriptionDetaillee] = useState(initial?.descriptionDetaillee || "");
  const [categorie, setCategorie] = useState(initial?.categorie || "Croquettes");
  const [autreCategorie, setAutreCategorie] = useState("");
  const [sousCategorie, setSousCategorie] = useState(initial?.sousCategorie || "");
  const [prix, setPrix] = useState<number>(initial?.prix || 2500);
  const [prixPromo, setPrixPromo] = useState<number | null>(initial?.prixPromo ?? null);
  const [avecPromo, setAvecPromo] = useState<boolean>(initial?.prixPromo != null);
  const [stock, setStock] = useState<number>(initial?.stock || 50);
  const [seuilAlerte, setSeuilAlerte] = useState<number>(initial?.seuilAlerte || 10);
  const [disponible, setDisponible] = useState<boolean>(initial?.disponible ?? true);
  const [masque, setMasque] = useState<boolean>(initial?.masque ?? false);
  const [populaire, setPopulaire] = useState<boolean>(initial?.populaire ?? false);
  const [nouveau, setNouveau] = useState<boolean>(initial?.nouveau ?? true);
  const [recommande, setRecommande] = useState<boolean>(initial?.recommande ?? false);
  const [images, setImages] = useState(initial?.images || []);
  const [variantes, setVariantes] = useState(initial?.variantes || []);
  const [erreur, setErreur] = useState<string | null>(null);

  const categorieFinale = categorie === "Autre" && autreCategorie.trim() ? autreCategorie.trim() : categorie;

  function soumettre(e: React.FormEvent) {
    e.preventDefault();
    const nomNettoye = nom.trim();
    if (nomNettoye.length < 2) {
      setErreur("Le nom de l'article doit comporter au moins 2 caractères.");
      return;
    }
    if (prix < 100) {
      setErreur("Le prix doit être d'au moins 100 FCFA.");
      return;
    }

    const slug = initial?.slug || genererSlug(nomNettoye) + "-" + Date.now().toString(36).slice(-4);

    const produitMaj: ProduitEnrichi = {
      id: initial?.id || "",
      slug,
      nom: nomNettoye,
      descriptionCourte: descriptionCourte.trim() || nomNettoye,
      descriptionDetaillee: descriptionDetaillee.trim() || descriptionCourte.trim() || nomNettoye,
      categorie: categorieFinale,
      sousCategorie: sousCategorie.trim(),
      prix: Number(prix),
      prixPromo: avecPromo && prixPromo ? Number(prixPromo) : null,
      stock: Number(stock),
      seuilAlerte: Number(seuilAlerte),
      disponible,
      masque,
      populaire,
      nouveau,
      recommande,
      sku: initial?.sku || genererSlug(nomNettoye).toUpperCase().slice(0, 8),
      images,
      variantes,
      formats: variantes.length > 0 ? variantes.map((v) => v.nom) : initial?.formats || ["Standard"],
      ordre: initial?.ordre ?? 0,
      created_at: initial?.created_at,
    };

    onEnregistrer(produitMaj);
  }

  return (
    <form onSubmit={soumettre} className="space-y-6 rounded-3xl border bg-card p-5 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <div>
          <h3 className="text-xl font-bold text-foreground">
            {initial ? `Modifier « ${initial.nom} »` : "Ajouter un nouvel article"}
          </h3>
          <p className="text-xs text-muted-foreground">
            Remplissez les informations de l'article, configurez ses photos et ses variantes.
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onAnnuler} className="rounded-xl">
            Annuler
          </Button>
          <Button type="submit" variant="gold" disabled={enChargement} className="rounded-xl">
            {enChargement ? <Icone nom="rr:spinner" className="animate-spin" /> : <Icone nom="rr:check" />}
            {initial ? "Enregistrer les modifications" : "Créer l'article"}
          </Button>
        </div>
      </div>

      {erreur && (
        <div className="rounded-xl bg-destructive/15 p-3 text-sm font-semibold text-destructive">{erreur}</div>
      )}

      {/* 1. Informations générales */}
      <section className="space-y-4">
        <h4 className="flex items-center gap-2 font-bold text-primary">
          <Icone nom="rr:cookie" /> 1. Informations générales
        </h4>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-xs font-bold text-foreground">Nom de l'article *</label>
            <Input
              value={nom}
              onChange={(e) => {
                setNom(e.target.value);
                setErreur(null);
              }}
              placeholder="Ex : Croquettes au poulet, Jus de bissap frais..."
              required
              className="h-11 rounded-xl text-base font-medium"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Catégorie *</label>
            <select
              value={categorie}
              onChange={(e) => setCategorie(e.target.value)}
              className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm font-medium"
            >
              {CATEGORIES_PAR_DEFAUT.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            {categorie === "Autre" && (
              <Input
                value={autreCategorie}
                onChange={(e) => setAutreCategorie(e.target.value)}
                placeholder="Précisez la catégorie..."
                className="mt-2 h-10 rounded-xl"
              />
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Sous-catégorie (optionnelle)</label>
            <Input
              value={sousCategorie}
              onChange={(e) => setSousCategorie(e.target.value)}
              placeholder="Ex : Salé, Sucré, Format familial..."
              className="h-11 rounded-xl"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-xs font-bold text-foreground">Description courte (affichée sur la carte)</label>
            <Input
              value={descriptionCourte}
              onChange={(e) => setDescriptionCourte(e.target.value)}
              placeholder="Ex : Délicieuses croquettes croustillantes au poulet."
              maxLength={120}
              className="h-11 rounded-xl"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-xs font-bold text-foreground">Description détaillée</label>
            <textarea
              value={descriptionDetaillee}
              onChange={(e) => setDescriptionDetaillee(e.target.value)}
              rows={3}
              placeholder="Détails sur la préparation, ingrédients, conseils de dégustation..."
              className="w-full rounded-xl border border-input bg-card p-3 text-sm"
            />
          </div>
        </div>
      </section>

      {/* 2. Tarification & Gestion du stock */}
      <section className="space-y-4 border-t pt-4">
        <h4 className="flex items-center gap-2 font-bold text-primary">
          <Icone nom="rr:wallet" /> 2. Prix et Stock
        </h4>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Prix standard (FCFA) *</label>
            <div className="relative">
              <Input
                type="number"
                min={100}
                step={50}
                value={prix}
                onChange={(e) => setPrix(Number(e.target.value))}
                required
                className="h-11 rounded-xl pr-14 text-base font-bold"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                FCFA
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-foreground">Prix promo (FCFA)</label>
              <label className="flex items-center gap-1 text-[11px]">
                <span>Activer</span>
                <Switch checked={avecPromo} onCheckedChange={setAvecPromo} />
              </label>
            </div>
            <div className="relative">
              <Input
                type="number"
                min={100}
                step={50}
                disabled={!avecPromo}
                value={prixPromo ?? ""}
                onChange={(e) => setPrixPromo(e.target.value ? Number(e.target.value) : null)}
                placeholder="Optionnel"
                className="h-11 rounded-xl pr-14"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                FCFA
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Quantité disponible (Stock)</label>
            <Input
              type="number"
              min={0}
              value={stock}
              onChange={(e) => setStock(Number(e.target.value))}
              className="h-11 rounded-xl text-base"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Seuil d'alerte stock faible</label>
            <Input
              type="number"
              min={1}
              value={seuilAlerte}
              onChange={(e) => setSeuilAlerte(Number(e.target.value))}
              className="h-11 rounded-xl text-base"
            />
          </div>
        </div>
      </section>

      {/* 3. Statut & Badges de visibilité */}
      <section className="space-y-4 border-t pt-4">
        <h4 className="flex items-center gap-2 font-bold text-primary">
          <Icone nom="sr:star" /> 3. Statut et Visibilité
        </h4>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <label className="flex flex-col justify-between rounded-2xl border bg-card p-3 shadow-soft">
            <span className="text-xs font-semibold">Statut produit</span>
            <div className="mt-2 flex items-center justify-between">
              <span className={disponible ? "text-success text-xs font-bold" : "text-muted-foreground text-xs"}>
                {disponible ? "Actif" : "Inactif"}
              </span>
              <Switch checked={disponible} onCheckedChange={setDisponible} />
            </div>
          </label>

          <label className="flex flex-col justify-between rounded-2xl border bg-card p-3 shadow-soft">
            <span className="text-xs font-semibold">Masquer du menu</span>
            <div className="mt-2 flex items-center justify-between">
              <span className={masque ? "text-destructive text-xs font-bold" : "text-muted-foreground text-xs"}>
                {masque ? "Masqué" : "Visible"}
              </span>
              <Switch checked={masque} onCheckedChange={setMasque} />
            </div>
          </label>

          <label className="flex flex-col justify-between rounded-2xl border bg-card p-3 shadow-soft">
            <span className="text-xs font-semibold">Produit populaire 🔥</span>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{populaire ? "Oui" : "Non"}</span>
              <Switch checked={populaire} onCheckedChange={setPopulaire} />
            </div>
          </label>

          <label className="flex flex-col justify-between rounded-2xl border bg-card p-3 shadow-soft">
            <span className="text-xs font-semibold">Nouveau produit ✨</span>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{nouveau ? "Oui" : "Non"}</span>
              <Switch checked={nouveau} onCheckedChange={setNouveau} />
            </div>
          </label>

          <label className="flex flex-col justify-between rounded-2xl border bg-card p-3 shadow-soft">
            <span className="text-xs font-semibold">Recommandé ⭐</span>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{recommande ? "Oui" : "Non"}</span>
              <Switch checked={recommande} onCheckedChange={setRecommande} />
            </div>
          </label>
        </div>
      </section>

      {/* 4. Gestion complète des images */}
      <section className="border-t pt-4">
        <GestionImages images={images} onChange={setImages} />
      </section>

      {/* 5. Gestion des variantes */}
      <section className="border-t pt-4">
        <GestionVariantes
          variantes={variantes}
          imagesDisponibles={images}
          nomArticle={nom || "Article"}
          prixBase={prix}
          onChange={setVariantes}
        />
      </section>

      {/* Boutons d'action finaux */}
      <div className="flex flex-wrap items-center justify-end gap-3 border-t pt-4">
        <Button type="button" variant="outline" onClick={onAnnuler} className="h-11 rounded-xl">
          Annuler
        </Button>
        <Button type="submit" variant="gold" size="lg" disabled={enChargement} className="rounded-xl">
          {enChargement ? <Icone nom="rr:spinner" className="animate-spin" /> : <Icone nom="rr:check" />}
          {initial ? "Enregistrer l'article" : "Publier l'article"}
        </Button>
      </div>
    </form>
  );
}
