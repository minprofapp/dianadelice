import { cn } from "@/lib/utils";
import type { NomIcone } from "./icones-noms";

/** Icône Flaticon UIcons. `nom` = "rr:..." (contour), "sr:..." (plein) ou "brands:...". */
export function Icone({ nom, className, label }: { nom: NomIcone; className?: string; label?: string }) {
  const [style, n] = nom.split(":");
  return (
    <i
      className={cn("icone", `fi-${style}-${n}`, className)}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  );
}
