import { useEffect, useRef } from "react";

export type TypeApparition = "up" | "zoom" | "left" | "right" | "blur";

let observateur: IntersectionObserver | null = null;
function obtenirObservateur() {
  if (!observateur) {
    observateur = new IntersectionObserver(
      (entrees) => {
        for (const e of entrees) {
          if (!e.isIntersecting) continue;
          e.target.setAttribute("data-vu", "");
          observateur?.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.06 },
    );
  }
  return observateur;
}

/**
 * Renvoie une ref : l'élément reçoit `data-vu` quand il entre à l'écran (déclenche l'animation CSS).
 * L'observation commence après l'hydratation de l'élément, pour ne pas gêner React.
 */
export function useApparition<T extends Element>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || el.hasAttribute("data-vu")) return;
    const o = obtenirObservateur();
    o.observe(el);
    return () => o.unobserve(el);
  }, []);
  return ref;
}

/** À appeler une fois à la racine : signale que les animations au défilement sont prises en charge. */
export function useAnimationsDefilement() {
  useEffect(() => {
    document.documentElement.classList.add("anim-on");
  }, []);
}

/** Script inline : active les apparitions avant le premier affichage (sauf si l'utilisateur réduit les animations). */
export const SCRIPT_APPARITIONS =
  "try{if(!matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.classList.add('reveal-ready')}catch(e){}";
