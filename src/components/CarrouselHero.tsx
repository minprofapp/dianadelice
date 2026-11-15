import { useEffect, useState } from "react";
import croquettes from "@/assets/croquettes.jpg.asset.json";
import sachets from "@/assets/croquettes-sachets.jpg.asset.json";
import bissap from "@/assets/bissap.jpg.asset.json";
import gnamakoudji from "@/assets/gnamakoudji.jpg.asset.json";
import { cn } from "@/lib/utils";

const SLIDES = [
  { src: croquettes.url, label: "Croquettes maison", pos: "center" },
  { src: bissap.url, label: "Jus de Bissap", pos: "center 35%" },
  { src: gnamakoudji.url, label: "Jus de Gnamakoudji", pos: "center 40%" },
  { src: sachets.url, label: "Sachets & bocaux", pos: "center" },
];

export function CarrouselHero() {
  const [actif, setActif] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setActif((i) => (i + 1) % SLIDES.length), 4000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="absolute inset-0">
      {SLIDES.map((s, i) => (
        <img
          key={s.src}
          src={s.src}
          alt={s.label}
          loading={i === 0 ? "eager" : "lazy"}
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-opacity duration-1000",
            i === actif ? "opacity-100 animate-ken-burns" : "opacity-0",
          )}
          style={{ objectPosition: s.pos }}
        />
      ))}
      <div className="absolute inset-0 bg-hero-overlay" />
      <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
        {SLIDES.map((s, i) => (
          <button
            key={s.src}
            type="button"
            onClick={() => setActif(i)}
            aria-label={`Voir ${s.label}`}
            className={cn(
              "h-2 rounded-full transition-all",
              i === actif ? "w-6 bg-gold" : "w-2 bg-primary-foreground/60",
            )}
          />
        ))}
      </div>
    </div>
  );
}
