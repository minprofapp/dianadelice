import type { CSSProperties, ElementType } from "react";
import { cn } from "@/lib/utils";
import { useApparition } from "@/lib/animations";

/**
 * Affiche un texte mot par mot avec une petite montée.
 * `auto` : l'animation démarre tout de suite (haut de page) ; sinon quand le texte arrive à l'écran.
 */
export function TexteAnime({
  texte,
  as: Balise = "span",
  className,
  delaiMs = 0,
  auto = false,
  id,
}: {
  texte: string;
  as?: ElementType;
  className?: string;
  delaiMs?: number;
  auto?: boolean;
  id?: string;
}) {
  const ref = useApparition<HTMLElement>();
  const mots = texte.split(/\s+/).filter(Boolean);
  return (
    <Balise
      id={id}
      ref={auto ? undefined : ref}
      className={cn(auto && "mots-auto", className)}
      data-mots={auto ? undefined : ""}
      aria-label={texte}
      style={{ "--d": `${delaiMs}ms` } as CSSProperties}
    >
      {mots.map((m, i) => (
        <span key={i} aria-hidden="true">
          <span className="mot" style={{ "--i": i } as CSSProperties}>
            {m}
          </span>
          {i < mots.length - 1 ? " " : null}
        </span>
      ))}
    </Balise>
  );
}
