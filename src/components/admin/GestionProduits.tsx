import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Icone } from "@/components/Icone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { formatFCFA } from "@/lib/commande";
import { CATEGORIES_PAR_DEFAUT, type FiltresProduits, type ProduitEnrichi } from "@/lib/types-produit";
import { decoderProduit, dupliquerProduit, encoderProduit } from "@/lib/produit-service";
import { FormulaireProduit } from "./FormulaireProduit";
import { cn } from "@/lib/utils";

export function GestionProduits() {
  const queryClient = useQueryClient();
  const [vueFormulaire, setVueFormulaire] = useState<"aucun" | "ajout" | "edition">("aucun");
  const [produitEnEdition, setProduitEnEdition] = useState<ProduitEnrichi | null>(null);

  // Modale de confirmation de duplication
  const [produitADupliquer, setProduitADupliquer] = useState<ProduitEnrichi | null>(null);

  // Modale de confirmation de suppression
  const [produitASupprimer, setProduitASupprimer] = useState<ProduitEnrichi | null>(null);

  // Filtres et recherche
  const [filtres, setFiltres] = useState<FiltresProduits>({
    recherche: "",
    categorie: "toutes",
    statut: "tous",
    tri: "ordre",
  });

  // Chargement des produits depuis Supabase
  const requeteProduits = useQuery({
    queryKey: ["admin-produits"],
    queryFn: async () => {
      const { data, error } = await supabase.from("produits").select("*").order("ordre");
      if (error) throw error;
      return (data || []).map(decoderProduit);
    },
  });

  const produits = requeteProduits.data ?? [];

  const rafraichir = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-produits"] });
    queryClient.invalidateQueries({ queryKey: ["produits"] });
  };

  // Mutation d'enregistrement / mise à jour complète
  const mutationEnregistrer = useMutation({
    mutationFn: async (p: ProduitEnrichi) => {
      const payload = encoderProduit(p);
      if (p.id) {
        // Mise à jour
        const { error } = await supabase.from("produits").update(payload).eq("id", p.id);
        if (error) throw error;
      } else {
        // Ajout
        const { error } = await supabase.from("produits").insert({
          ...payload,
          ordre: (produits.length ?? 0) + 1,
        });
        if (error) throw error;
      }
    },
    onSuccess: (_, p) => {
      rafraichir();
      toast.success(p.id ? `« ${p.nom} » mis à jour` : `« ${p.nom} » ajouté au catalogue !`);
      setVueFormulaire("aucun");
      setProduitEnEdition(null);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Erreur d'enregistrement";
      toast.error(msg);
    },
  });

  // Mutation de modification rapide (prix, stock, statut, masqué)
  const mutationModifRapide = useMutation({
    mutationFn: async ({ id, modifs }: { id: string; modifs: Partial<ProduitEnrichi> }) => {
      const existant = produits.find((p) => p.id === id);
      if (!existant) throw new Error("Produit introuvable");
      const maj = { ...existant, ...modifs };
      const payload = encoderProduit(maj);
      const { error } = await supabase.from("produits").update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      rafraichir();
      toast.success("Produit actualisé");
    },
    onError: () => toast.error("Modification impossible"),
  });

  // Mutation de duplication
  const mutationDupliquer = useMutation({
    mutationFn: async (original: ProduitEnrichi) => {
      const copie = dupliquerProduit(original);
      const payload = encoderProduit(copie);
      const { data, error } = await supabase.from("produits").insert({
        ...payload,
        ordre: produits.length + 1,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      rafraichir();
      setProduitADupliquer(null);
      toast.success("Article dupliqué avec succès.", {
        description: "Le nouvel article est créé en mode désactivé / brouillon.",
        duration: 3500,
      });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Erreur de duplication";
      toast.error(msg);
    },
  });

  // Mutation de suppression
  const mutationSupprimer = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("produits").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      rafraichir();
      setProduitASupprimer(null);
      toast.success("Article supprimé du catalogue");
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Impossible de supprimer";
      toast.error(msg);
    },
  });

  // Catégories présentes dans les produits pour filtrage
  const categoriesDisponibles = useMemo(() => {
    const ens = new Set(CATEGORIES_PAR_DEFAUT);
    for (const p of produits) {
      if (p.categorie) ens.add(p.categorie as any);
    }
    return Array.from(ens);
  }, [produits]);

  // Filtrage et tri des produits
  const produitsFiltres = useMemo(() => {
    let resultat = [...produits];

    // Recherche
    const q = filtres.recherche.trim().toLowerCase();
    if (q) {
      resultat = resultat.filter(
        (p) =>
          p.nom.toLowerCase().includes(q) ||
          p.descriptionCourte.toLowerCase().includes(q) ||
          p.descriptionDetaillee.toLowerCase().includes(q) ||
          p.categorie.toLowerCase().includes(q) ||
          (p.sku && p.sku.toLowerCase().includes(q)),
      );
    }

    // Catégorie
    if (filtres.categorie !== "toutes") {
      resultat = resultat.filter((p) => p.categorie === filtres.categorie);
    }

    // Statut
    if (filtres.statut === "actif") {
      resultat = resultat.filter((p) => p.disponible && !p.masque && p.stock > 0);
    } else if (filtres.statut === "inactif") {
      resultat = resultat.filter((p) => !p.disponible || p.masque);
    } else if (filtres.statut === "rupture") {
      resultat = resultat.filter((p) => p.stock <= 0);
    } else if (filtres.statut === "faible") {
      resultat = resultat.filter((p) => p.stock > 0 && p.stock <= p.seuilAlerte);
    }

    // Tri
    switch (filtres.tri) {
      case "nom-asc":
        resultat.sort((a, b) => a.nom.localeCompare(b.nom));
        break;
      case "nom-desc":
        resultat.sort((a, b) => b.nom.localeCompare(a.nom));
        break;
      case "prix-asc":
        resultat.sort((a, b) => a.prix - b.prix);
        break;
      case "prix-desc":
        resultat.sort((a, b) => b.prix - a.prix);
        break;
      case "stock-asc":
        resultat.sort((a, b) => a.stock - b.stock);
        break;
      case "stock-desc":
        resultat.sort((a, b) => b.stock - a.stock);
        break;
      case "date-desc":
        resultat.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        break;
      default:
        resultat.sort((a, b) => a.ordre - b.ordre);
    }

    return resultat;
  }, [produits, filtres]);

  if (vueFormulaire !== "aucun") {
    return (
      <FormulaireProduit
        initial={produitEnEdition}
        onEnregistrer={(p) => mutationEnregistrer.mutate(p)}
        onAnnuler={() => {
          setVueFormulaire("aucun");
          setProduitEnEdition(null);
        }}
        enChargement={mutationEnregistrer.isPending}
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* Barre supérieure : Titre & Bouton d'ajout */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Gestion des articles & catalogue</h2>
          <p className="text-sm text-muted-foreground">
            {produits.length} article(s) au total · {produits.filter((p) => p.disponible && !p.masque).length} actif(s)
          </p>
        </div>

        <Button
          onClick={() => {
            setProduitEnEdition(null);
            setVueFormulaire("ajout");
          }}
          variant="gold"
          size="lg"
          className="rounded-xl shadow-soft"
        >
          <Icone nom="rr:plus" /> Ajouter un article
        </Button>
      </div>

      {/* Barre de recherche, filtres et tri */}
      <div className="space-y-3 rounded-2xl border bg-card p-4 shadow-soft">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Recherche textuelle */}
          <div className="relative sm:col-span-2">
            <Icone
              nom="rr:search"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={filtres.recherche}
              onChange={(e) => setFiltres({ ...filtres, recherche: e.target.value })}
              placeholder="Rechercher par nom, description, catégorie, SKU..."
              className="h-11 rounded-xl pl-9"
            />
          </div>

          {/* Filtre catégorie */}
          <div>
            <select
              value={filtres.categorie}
              onChange={(e) => setFiltres({ ...filtres, categorie: e.target.value })}
              className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm font-medium"
              aria-label="Filtrer par catégorie"
            >
              <option value="toutes">Toutes les catégories</option>
              {categoriesDisponibles.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Tri */}
          <div>
            <select
              value={filtres.tri}
              onChange={(e) => setFiltres({ ...filtres, tri: e.target.value as FiltresProduits["tri"] })}
              className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm font-medium"
              aria-label="Trier les articles"
            >
              <option value="ordre">Ordre par défaut</option>
              <option value="nom-asc">Nom (A → Z)</option>
              <option value="nom-desc">Nom (Z → A)</option>
              <option value="prix-asc">Prix (Croissant)</option>
              <option value="prix-desc">Prix (Décroissant)</option>
              <option value="stock-asc">Stock (Plus bas)</option>
              <option value="stock-desc">Stock (Plus haut)</option>
              <option value="date-desc">Plus récents</option>
            </select>
          </div>
        </div>

        {/* Boutons chips pour filtrage rapide par statut */}
        <div className="flex flex-wrap gap-1.5 border-t pt-3">
          {[
            { id: "tous", libelle: "Tous les statuts" },
            { id: "actif", libelle: "En vente" },
            { id: "faible", libelle: "Stock faible ⚠️" },
            { id: "rupture", libelle: "Rupture de stock" },
            { id: "inactif", libelle: "Désactivés / Masqués" },
          ].map((s) => (
            <Button
              key={s.id}
              type="button"
              size="sm"
              variant={filtres.statut === s.id ? "chipActive" : "chip"}
              onClick={() => setFiltres({ ...filtres, statut: s.id as FiltresProduits["statut"] })}
              className="rounded-full text-xs"
            >
              {s.libelle}
            </Button>
          ))}
        </div>
      </div>

      {/* Liste des produits sous forme de cartes riches */}
      {requeteProduits.isLoading ? (
        <div className="flex justify-center py-16">
          <Icone nom="rr:spinner" className="text-3xl animate-spin text-primary" />
        </div>
      ) : produitsFiltres.length === 0 ? (
        <div className="rounded-3xl border border-dashed bg-muted/30 p-12 text-center">
          <Icone nom="rr:box-open" className="mx-auto mb-2 text-4xl text-muted-foreground" />
          <h3 className="text-lg font-bold">Aucun article ne correspond à votre recherche</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Essayez de modifier vos filtres ou ajoutez un nouvel article au menu.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {produitsFiltres.map((p) => {
            const imgPrincipale = p.images.find((img) => img.principale) || p.images[0];
            const estRupture = p.stock <= 0;
            const estFaible = p.stock > 0 && p.stock <= p.seuilAlerte;

            return (
              <article
                key={p.id}
                className={cn(
                  "relative flex flex-col justify-between overflow-hidden rounded-3xl border bg-card p-4 shadow-soft transition-all",
                  !p.disponible && "opacity-75 bg-muted/20",
                )}
              >
                <div>
                  {/* Entête avec miniature, infos principales & badges */}
                  <div className="flex items-start gap-3">
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-muted border">
                      {imgPrincipale ? (
                        <img src={imgPrincipale.url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                          <Icone nom="rr:cookie" className="text-2xl" />
                        </div>
                      )}
                      {p.images.length > 1 && (
                        <span className="absolute bottom-1 right-1 rounded-md bg-black/70 px-1 py-0.5 text-[10px] font-bold text-white">
                          +{p.images.length - 1}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-1">
                        <div>
                          <span className="inline-block rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-accent-foreground">
                            {p.categorie} {p.sousCategorie ? `· ${p.sousCategorie}` : ""}
                          </span>
                          <h3 className="truncate text-lg font-bold text-foreground">{p.nom}</h3>
                        </div>

                        {/* Switch statut rapide */}
                        <div className="flex flex-col items-end">
                          <Switch
                            checked={p.disponible && !p.masque}
                            onCheckedChange={(val) => mutationModifRapide.mutate({ id: p.id, modifs: { disponible: val, masque: !val } })}
                            title={p.disponible && !p.masque ? "Article actif (visible)" : "Article inactif / masqué"}
                          />
                          <span className="text-[10px] text-muted-foreground mt-0.5">
                            {p.disponible && !p.masque ? "Actif" : "Désactivé"}
                          </span>
                        </div>
                      </div>

                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {p.descriptionCourte || p.descriptionDetaillee}
                      </p>
                    </div>
                  </div>

                  {/* Badges de visibilité */}
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                    {p.populaire && (
                      <span className="rounded-md bg-amber-500/15 px-2 py-0.5 font-bold text-amber-600">
                        🔥 Populaire
                      </span>
                    )}
                    {p.nouveau && (
                      <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 font-bold text-emerald-600">
                        ✨ Nouveau
                      </span>
                    )}
                    {p.recommande && (
                      <span className="rounded-md bg-purple-500/15 px-2 py-0.5 font-bold text-purple-600">
                        ⭐ Recommandé
                      </span>
                    )}
                    {p.masque && (
                      <span className="rounded-md bg-destructive/15 px-2 py-0.5 font-bold text-destructive">
                        👁️ Masqué
                      </span>
                    )}
                  </div>

                  {/* Bloc Prix et Stock interactif */}
                  <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl bg-muted/30 p-2.5">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground">Prix</p>
                      <p className="text-base font-extrabold text-primary">
                        {formatFCFA(p.prix)}
                        {p.prixPromo && (
                          <span className="ml-1 text-xs text-muted-foreground line-through">
                            {formatFCFA(p.prixPromo)}
                          </span>
                        )}
                      </p>
                      {p.variantes.length > 0 && (
                        <p className="text-[10px] text-muted-foreground">{p.variantes.length} variante(s)</p>
                      )}
                    </div>

                    <div>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground">Stock</p>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            "inline-block h-2 w-2 rounded-full",
                            estRupture ? "bg-destructive" : estFaible ? "bg-amber-500 animate-pulse" : "bg-emerald-500",
                          )}
                        />
                        <span
                          className={cn(
                            "text-base font-bold",
                            estRupture ? "text-destructive" : estFaible ? "text-amber-600 font-extrabold" : "text-foreground",
                          )}
                        >
                          {p.stock} unités
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {estRupture ? "Épuisé" : estFaible ? `Alerte (≤ ${p.seuilAlerte})` : "En stock"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Boutons d'action : [Modifier] [DUPLIQUER] [Supprimer] */}
                <div className="mt-4 flex items-center justify-between gap-2 border-t pt-3">
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-xl h-9 text-xs"
                      onClick={() => {
                        setProduitEnEdition(p);
                        setVueFormulaire("edition");
                      }}
                    >
                      <Icone nom="rr:cookie" /> Modifier
                    </Button>

                    {/* Bouton obligatoire DUPLIQUER */}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-xl h-9 text-xs border-primary/30 text-primary hover:bg-primary/10"
                      onClick={() => setProduitADupliquer(p)}
                    >
                      <Icone nom="rr:copy-alt" /> DUPLIQUER
                    </Button>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-xl"
                    onClick={() => setProduitASupprimer(p)}
                    title="Supprimer cet article"
                  >
                    <Icone nom="rr:trash" />
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Modale de confirmation de duplication */}
      {produitADupliquer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-3xl border bg-card p-6 shadow-2xl animate-pop-in">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary mb-3">
              <Icone nom="rr:copy-alt" className="text-2xl" />
            </div>
            <h3 className="text-xl font-bold">Voulez-vous dupliquer cet article ?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Une copie complète et indépendante de « <strong>{produitADupliquer.nom}</strong> » sera créée avec ses
              images, prix, catégories et variantes, sous le statut <strong>Désactivé / Brouillon</strong>.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                disabled={mutationDupliquer.isPending}
                onClick={() => setProduitADupliquer(null)}
              >
                Annuler
              </Button>
              <Button
                type="button"
                variant="gold"
                className="rounded-xl"
                disabled={mutationDupliquer.isPending}
                onClick={() => mutationDupliquer.mutate(produitADupliquer)}
              >
                {mutationDupliquer.isPending ? <Icone nom="rr:spinner" className="animate-spin" /> : "Dupliquer"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modale de confirmation de suppression */}
      {produitASupprimer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-3xl border bg-card p-6 shadow-2xl animate-pop-in">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/15 text-destructive mb-3">
              <Icone nom="rr:trash" className="text-2xl" />
            </div>
            <h3 className="text-xl font-bold">Supprimer cet article ?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Êtes-vous sûr de vouloir supprimer définitivement « <strong>{produitASupprimer.nom}</strong> » du
              catalogue ? Cette action est irréversible.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                disabled={mutationSupprimer.isPending}
                onClick={() => setProduitASupprimer(null)}
              >
                Annuler
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="rounded-xl"
                disabled={mutationSupprimer.isPending}
                onClick={() => mutationSupprimer.mutate(produitASupprimer.id)}
              >
                {mutationSupprimer.isPending ? <Icone nom="rr:spinner" className="animate-spin" /> : "Supprimer"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
