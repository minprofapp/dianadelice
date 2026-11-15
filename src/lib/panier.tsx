import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { ArticlePanier } from "./commande";

const CLE_STOCKAGE = "panier-v1";

type PanierContexte = {
  articles: ArticlePanier[];
  nombre: number;
  sousTotal: number;
  ajouter: (a: Omit<ArticlePanier, "cle">) => void;
  retirer: (cle: string) => void;
  vider: () => void;
};

const Ctx = createContext<PanierContexte | null>(null);

export function PanierProvider({ children }: { children: ReactNode }) {
  const [articles, setArticles] = useState<ArticlePanier[]>([]);
  const [charge, setCharge] = useState(false);

  useEffect(() => {
    try {
      const brut = window.localStorage.getItem(CLE_STOCKAGE);
      if (brut) {
        const parsed = JSON.parse(brut);
        if (Array.isArray(parsed)) setArticles(parsed);
      }
    } catch {
      // panier illisible : on repart de zéro
    }
    setCharge(true);
  }, []);

  useEffect(() => {
    if (!charge) return;
    try {
      window.localStorage.setItem(CLE_STOCKAGE, JSON.stringify(articles));
    } catch {
      // stockage plein ou désactivé
    }
  }, [articles, charge]);

  const ajouter = useCallback((a: Omit<ArticlePanier, "cle">) => {
    setArticles((prev) => [...prev, { ...a, cle: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}` }]);
  }, []);
  const retirer = useCallback((cle: string) => {
    setArticles((prev) => prev.filter((a) => a.cle !== cle));
  }, []);
  const vider = useCallback(() => setArticles([]), []);

  const valeur = useMemo(
    () => ({
      articles,
      nombre: articles.length,
      sousTotal: articles.reduce((s, a) => s + a.montant, 0),
      ajouter,
      retirer,
      vider,
    }),
    [articles, ajouter, retirer, vider],
  );

  return <Ctx.Provider value={valeur}>{children}</Ctx.Provider>;
}

export function usePanier() {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePanier doit être utilisé dans PanierProvider");
  return v;
}
