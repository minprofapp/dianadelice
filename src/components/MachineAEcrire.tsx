import { useEffect, useState } from "react";
import { PHRASES_ANIMEES } from "@/lib/phrases";

/** Fait défiler les phrases une à une, lettre par lettre, en boucle. */
export function MachineAEcrire({ className }: { className?: string }) {
  const [index, setIndex] = useState(0);
  const [texte, setTexte] = useState("");
  const [efface, setEfface] = useState(false);

  useEffect(() => {
    // Départ aléatoire côté navigateur pour varier à chaque visite
    setIndex(Math.floor(Math.random() * PHRASES_ANIMEES.length));
  }, []);

  useEffect(() => {
    const phrase = PHRASES_ANIMEES[index] ?? "";
    let t: ReturnType<typeof setTimeout>;
    if (!efface && texte.length < phrase.length) {
      t = setTimeout(() => setTexte(phrase.slice(0, texte.length + 1)), 45);
    } else if (!efface) {
      t = setTimeout(() => setEfface(true), 1900);
    } else if (texte.length > 0) {
      t = setTimeout(() => setTexte(texte.slice(0, -1)), 18);
    } else {
      setEfface(false);
      setIndex((i) => (i + 1) % PHRASES_ANIMEES.length);
    }
    return () => clearTimeout(t);
  }, [texte, efface, index]);

  return (
    <p className={className} aria-hidden="true">
      {texte}
      <span className="ml-0.5 inline-block w-[2px] animate-caret bg-current align-middle" style={{ height: "1.1em" }} />
    </p>
  );
}
