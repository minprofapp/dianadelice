import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Loader2, PackageSearch, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatFCFA, nettoyerTelephone } from "@/lib/commande";
import { lireHistorique, type CommandeLocale } from "@/lib/historique";
import { usePanier } from "@/lib/panier";
import { CLASSE_STATUT, LIBELLE_STATUT, MESSAGE_STATUT, type Statut } from "@/lib/statuts";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/suivi")({
  head: () => ({
    meta: [
      { title: "Suivre ma commande — Diana Croquettes" },
      { name: "description", content: "Suivez l'état de votre commande Diana Croquettes et recommandez en un clic." },
      { property: "og:title", content: "Suivre ma commande — Diana Croquettes" },
      { property: "og:description", content: "Où en est ma commande de croquettes et jus ?" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Suivi,
});

type Resultat = {
  numero: string;
  statut: Statut;
  articles: { nom: string; format: string | null; montant: number }[];
  total: number;
  zone_nom: string;
  created_at: string;
};

const ETAPES: Statut[] = ["en_attente", "confirmee", "en_livraison", "livree"];

function Suivi() {
  const [numero, setNumero] = useState("");
  const [tel, setTel] = useState("");
  const [charge, setCharge] = useState(false);
  const [res, setRes] = useState<Resultat | null>(null);
  const [historique, setHistorique] = useState<CommandeLocale[]>([]);
  const { ajouter } = usePanier();
  const navigate = useNavigate();

  useEffect(() => {
    const h = lireHistorique();
    setHistorique(h);
    if (h[0]) {
      setNumero(h[0].numero);
      setTel(h[0].telephone);
    }
  }, []);

  async function chercher(n = numero, t = tel) {
    if (!n.trim() || !t.trim()) {
      toast.error("Mets le numéro de commande et ton téléphone");
      return;
    }
    setCharge(true);
    const { data, error } = await supabase.rpc("suivre_commande", {
      p_numero: n.trim(),
      p_telephone: nettoyerTelephone(t),
    });
    setCharge(false);
    if (error) {
      toast.error("Souci de connexion, réessaie");
      return;
    }
    if (!data) {
      setRes(null);
      toast.error("On n'a pas trouvé cette commande", { description: "Vérifie le numéro et le téléphone." });
      return;
    }
    setRes(data as Resultat);
  }

  function recommander(c: CommandeLocale) {
    for (const a of c.articles) {
      if (a.produitId) ajouter({ produitId: a.produitId, nom: a.nom, format: a.format, montant: a.montant });
    }
    toast.success("C'est remis dans le panier !");
    navigate({ to: "/panier" });
  }

  const etapeActuelle = res ? ETAPES.indexOf(res.statut) : -1;

  return (
    <div className="min-h-screen pb-10">
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3">
          <Button asChild variant="ghost" size="icon" className="h-11 w-11 rounded-xl">
            <Link to="/" aria-label="Retour au menu">
              <ArrowLeft className="!size-5" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Ma commande</h1>
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-5 px-4 pt-4">
        <form
          className="space-y-3 rounded-3xl border bg-card p-4 shadow-soft"
          onSubmit={(e) => {
            e.preventDefault();
            chercher();
          }}
        >
          <h2 className="text-xl font-semibold">Où en est ma commande ?</h2>
          <Input
            value={numero}
            onChange={(e) => setNumero(e.target.value.toUpperCase())}
            placeholder="Numéro (ex : CMD-00012)"
            maxLength={20}
            className="h-12 rounded-xl text-base"
          />
          <Input
            type="tel"
            inputMode="tel"
            value={tel}
            onChange={(e) => setTel(e.target.value)}
            placeholder="Ton téléphone"
            maxLength={20}
            className="h-12 rounded-xl text-base"
          />
          <Button type="submit" variant="default" size="xl" className="w-full" disabled={charge}>
            {charge ? <Loader2 className="!size-5 animate-spin" /> : <PackageSearch className="!size-5" />}
            Vérifier
          </Button>
        </form>

        {res && (
          <section className="space-y-4 rounded-3xl border bg-card p-5 shadow-soft animate-pop-in">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xl font-bold">{res.numero}</p>
              <span className={cn("rounded-full px-3 py-1 text-sm font-semibold", CLASSE_STATUT[res.statut])}>
                {LIBELLE_STATUT[res.statut]}
              </span>
            </div>
            <p className="font-medium">{MESSAGE_STATUT[res.statut]}</p>
            {res.statut !== "annulee" && (
              <ol className="grid grid-cols-4 gap-1">
                {ETAPES.map((e, i) => (
                  <li key={e} className="space-y-1 text-center text-xs">
                    <div className={cn("h-2 rounded-full", i <= etapeActuelle ? "bg-primary" : "bg-muted")} />
                    <span className={i <= etapeActuelle ? "font-semibold" : "text-muted-foreground"}>
                      {LIBELLE_STATUT[e]}
                    </span>
                  </li>
                ))}
              </ol>
            )}
            <div className="divide-y border-t text-sm">
              {res.articles.map((a, i) => (
                <div key={i} className="flex justify-between py-2">
                  <span>
                    {a.nom}
                    {a.format ? ` · ${a.format}` : ""}
                  </span>
                  <span className="font-semibold">{formatFCFA(a.montant)}</span>
                </div>
              ))}
              <div className="flex justify-between pt-2 text-base">
                <span className="font-semibold">Total ({res.zone_nom})</span>
                <span className="font-bold text-primary">{formatFCFA(res.total)}</span>
              </div>
            </div>
          </section>
        )}

        {historique.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xl font-semibold">Mes dernières commandes</h2>
            {historique.map((c) => (
              <div key={c.numero} className="flex items-center gap-3 rounded-2xl border bg-card p-3">
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => {
                    setNumero(c.numero);
                    setTel(c.telephone);
                    chercher(c.numero, c.telephone);
                  }}
                >
                  <p className="font-semibold">{c.numero}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {new Date(c.date).toLocaleDateString("fr-FR")} · {formatFCFA(c.total)}
                  </p>
                </button>
                <Button type="button" variant="gold" size="sm" onClick={() => recommander(c)}>
                  <RotateCcw /> Recommander
                </Button>
              </div>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}

