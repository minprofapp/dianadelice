import { Link } from "@tanstack/react-router";
import { Icone } from "@/components/Icone";
import { usePanier } from "@/lib/panier";
import { formatFCFA } from "@/lib/commande";

export function BarrePanier() {
  const { nombre, sousTotal } = usePanier();
  if (nombre === 0) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-safe">
      <Link
        to="/panier"
        className="group brillance pointer-events-auto mx-auto flex max-w-lg items-center gap-3 rounded-2xl bg-primary px-4 py-3 text-primary-foreground shadow-float animate-fade-up transition-transform hover:-translate-y-1"
      >
        <span key={nombre} className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-primary-deep animate-bump">
          <Icone nom="sr:shopping-bag" className="text-2xl" />
          <span className="absolute -right-1.5 -top-1.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-gold px-1 text-xs font-bold text-gold-foreground">
            {nombre}
          </span>
        </span>
        <span className="flex-1 leading-tight">
          <span className="block text-xs opacity-80">{nombre > 1 ? `${nombre} articles` : "1 article"}</span>
          <span key={sousTotal} className="block whitespace-nowrap text-xl font-extrabold animate-pop-in">{formatFCFA(sousTotal)}</span>
        </span>
        <span className="flex shrink-0 items-center gap-1 font-bold">
          Voir le panier <Icone nom="rr:angle-small-right" className="text-2xl transition-transform group-hover:translate-x-1" />
        </span>
      </Link>
    </div>
  );
}
