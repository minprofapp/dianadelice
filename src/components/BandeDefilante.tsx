import { Fragment } from "react";
import { Icone } from "@/components/Icone";

const MOTS = [
  "Croquettes maison",
  "Jus de bissap glacé",
  "Gnamakoudji qui pique",
  "Dès 500F",
  "Livré à Anyama",
  "CAFOP Abobo",
  "Tu paies à la livraison",
];

/** Bandeau doré qui défile en continu sous le haut de page. */
export function BandeDefilante() {
  const suite = [...MOTS, ...MOTS];
  return (
    <div className="relative z-10 -mt-7 overflow-hidden py-3" aria-hidden="true">
      <div className="-mx-4 -rotate-2 bg-gold-gradient py-2.5 text-gold-foreground shadow-float">
        <div className="flex w-max animate-defile items-center gap-5 whitespace-nowrap font-display text-lg font-bold">
          {suite.map((m, i) => (
            <Fragment key={i}>
              <span>{m}</span>
              <Icone nom={i % 2 ? "sr:cookie" : "sr:star"} className="text-primary" />
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
