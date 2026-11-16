import { useCallback, useEffect, useRef, useState } from "react";
import croquettes from "@/assets/croquettes.jpg.asset.json";
import sachets from "@/assets/croquettes-sachets.jpg.asset.json";
import bissap from "@/assets/bissap.jpg.asset.json";
import gnamakoudji from "@/assets/gnamakoudji.jpg.asset.json";
import { Icone } from "@/components/Icone";
import { cn } from "@/lib/utils";

const DUREE = 4500;
const SLIDES = [
  { src: croquettes.url, label: "Croquettes maison", pos: "center" },
  { src: bissap.url, label: "Jus de Bissap", pos: "center 35%" },
  { src: gnamakoudji.url, label: "Jus de Gnamakoudji", pos: "center 40%" },
  { src: sachets.url, label: "Sachets & bocaux", pos: "center" },
];

/** Diaporama plein écran : fondu + zoom lent, glisser du doigt, barres de progression. */
export function CarrouselHero() {
  const [actif, setActif] = useState(0);
  const [pause, setPause] = useState(false);
  const racine = useRef<HTMLDivElement>(null);

  const aller = useCallback((sens: number) => setActif((i) => (i + sens + SLIDES.length) % SLIDES.length), []);

  useEffect(() => {
    if (pause) return;
    const id = setTimeout(() => aller(1), DUREE);
    return () => clearTimeout(id);
  }, [actif, pause, aller]);

  // Glisser du doigt sur toute la zone du haut (le texte est par-dessus le diaporama)
  useEffect(() => {
    const zone = racine.current?.parentElement;
    if (!zone) return;
    let x0: number | null = null;
    const debut = (e: TouchEvent) => {
      x0 = e.touches[0]?.clientX ?? null;
    };
    const fin = (e: TouchEvent) => {
      if (x0 === null) return;
      const dx = (e.changedTouches[0]?.clientX ?? x0) - x0;
      if (Math.abs(dx) > 45) aller(dx < 0 ? 1 : -1);
      x0 = null;
    };
    zone.addEventListener("touchstart", debut, { passive: true });
    zone.addEventListener("touchend", fin, { passive: true });
    return () => {
      zone.removeEventListener("touchstart", debut);
      zone.removeEventListener("touchend", fin);
    };
  }, [aller]);

  return (
    <div
      ref={racine}
      className="absolute inset-0"
      onMouseEnter={() => setPause(true)}
      onMouseLeave={() => setPause(false)}
    >
      {SLIDES.map((s, i) => (
        <img
          key={s.src}
          src={s.src}
          alt={s.label}
          loading={i === 0 ? "eager" : "lazy"}
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-[opacity,filter] duration-[1200ms] ease-out",
            i === actif ? "opacity-100 blur-0 animate-ken-burns" : "opacity-0 blur-sm",
          )}
          style={{ objectPosition: s.pos }}
        />
      ))}
      <div className="absolute inset-0 bg-hero-overlay" />

      {/* Nom de la photo en cours */}
      <p
        key={`l-${actif}`}
        className="absolute right-4 top-16 inline-flex items-center gap-1.5 rounded-full bg-card/90 px-3 py-1 text-sm font-bold text-foreground shadow-soft animate-glisse"
      >
        <Icone nom="sr:star" className="text-gold" /> {SLIDES[actif]?.label}
      </p>

      <div className="absolute bottom-10 left-1/2 flex -translate-x-1/2 items-center gap-2">
        {SLIDES.map((s, i) => (
          <button
            key={s.src}
            type="button"
            onClick={() => setActif(i)}
            aria-label={`Voir ${s.label}`}
            aria-current={i === actif}
            className={cn(
              "relative h-2 overflow-hidden rounded-full bg-primary-foreground/40 transition-all duration-500",
              i === actif ? "w-10" : "w-2 hover:bg-primary-foreground/70",
            )}
          >
            {i === actif && (
              <span
                key={`p-${actif}-${pause}`}
                className={cn("absolute inset-0 rounded-full bg-gold", !pause && "animate-remplit")}
                style={{ ["--duree" as string]: `${DUREE}ms` }}
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
