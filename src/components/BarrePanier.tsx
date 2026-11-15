import { Link } from "@tanstack/react-router";
import { ShoppingBag, ChevronRight } from "lucide-react";
import { usePanier } from "@/lib/panier";
import { formatFCFA } from "@/lib/commande";

export function BarrePanier() {
  const { nombre, sousTotal } = usePanier();
  if (nombre === 0) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-safe">
      <Link
        to="/panier"
        className="pointer-events-auto mx-auto flex max-w-lg items-center gap-3 rounded-2xl bg-primary px-4 py-3 text-primary-foreground shadow-float animate-pop-in"
      >
        <span key={nombre} className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-primary-deep animate-bump">
          <ShoppingBag className="h-5 w-5" />
          <span className="absolute -right-1.5 -top-1.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-gold px-1 text-xs font-bold text-gold-foreground">
            {nombre}
          </span>
        </span>
        <span className="flex-1 leading-tight">
          <span className="block text-xs opacity-80">{nombre > 1 ? `${nombre} articles` : "1 article"}</span>
          <span className="block text-lg font-bold">{formatFCFA(sousTotal)}</span>
        </span>
        <span className="flex items-center gap-1 font-semibold">
          Voir le panier <ChevronRight className="h-5 w-5" />
        </span>
      </Link>
    </div>
  );
}
