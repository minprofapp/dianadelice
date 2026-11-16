import type { CSSProperties, ElementType, ReactNode } from "react";
import { useApparition, type TypeApparition } from "@/lib/animations";

/** Conteneur qui apparaît en douceur (montée, zoom, glissé, flou) quand on défile jusqu'à lui. */
export function Apparait({
  as: Balise = "div",
  type = "up",
  delaiMs = 0,
  className,
  style,
  children,
}: {
  as?: ElementType;
  type?: TypeApparition;
  delaiMs?: number;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  const ref = useApparition<HTMLElement>();
  return (
    <Balise ref={ref} data-reveal={type} className={className} style={{ "--d": `${delaiMs}ms`, ...style } as CSSProperties}>
      {children}
    </Balise>
  );
}
