import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { z } from "zod";
import { ArrowLeft, Loader2, MessageCircle, Trash2, CheckCircle2, Copy, PackageSearch } from "lucide-react";
import { ajouterHistorique, lireHistorique } from "@/lib/historique";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { zonesQuery } from "@/lib/catalogue";
import { usePanier } from "@/lib/panier";
import {
  calculerTotaux,
  construireMessageWhatsApp,
  formatFCFA,
  lienWhatsApp,
  nettoyerTelephone,
  telephoneValide,
  MONTANT_MIN,
} from "@/lib/commande";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/panier")({
  head: () => ({
    meta: [
      { title: "Mon panier — Diana Croquettes" },
      { name: "description", content: "Vérifiez votre panier et envoyez votre commande sur WhatsApp." },
      { property: "og:title", content: "Mon panier — Diana Croquettes" },
      { property: "og:description", content: "Finalisez votre commande de croquettes et jus frais." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(zonesQuery),
  component: Panier,
});

const schema = z.object({
  nom: z.string().trim().min(2, "Mets ton nom d'abord").max(80, "Nom trop long"),
  telephone: z
    .string()
    .trim()
    .refine(telephoneValide, "Numéro pas correct (ex : 07 07 12 34 56)"),
  zoneId: z.string().uuid("Choisis ta zone"),
  repere: z.string().trim().min(2, "Donne un repère pour qu'on te trouve").max(200, "Repère trop long"),
  note: z.string().trim().max(300, "Note trop longue (300 caractères max)").optional(),
});

type Erreurs = Partial<Record<keyof z.infer<typeof schema>, string>>;

function Panier() {
  const { data: zones } = useSuspenseQuery(zonesQuery);
  const { articles, retirer, vider } = usePanier();
  const [form, setForm] = useState({ nom: "", telephone: "", zoneId: "", repere: "", note: "" });
  const [erreurs, setErreurs] = useState<Erreurs>({});
  const [envoi, setEnvoi] = useState(false);
  const [confirmation, setConfirmation] = useState<Recu | null>(null);

  useEffect(() => {
    // Pré-remplit avec les infos de la dernière commande
    const dernier = lireHistorique()[0];
    if (dernier?.client) {
      setForm((f) => ({
        ...f,
        nom: f.nom || dernier.client!.nom,
        telephone: f.telephone || dernier.telephone,
        zoneId: f.zoneId || dernier.client!.zoneId,
        repere: f.repere || dernier.client!.repere,
      }));
    }
  }, []);

  const zone = zones.find((z) => z.id === form.zoneId);
  const { sousTotal, frais, total } = calculerTotaux(articles, zone?.frais ?? 0);
  const estRetrait = zone ? zone.frais === 0 : false;

  function maj<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
    setErreurs((e) => ({ ...e, [k]: undefined }));
  }

  async function commander(e: React.FormEvent) {
    e.preventDefault();
    if (articles.length === 0) return;
    if (sousTotal < MONTANT_MIN) {
      toast.error(`Faut au moins ${formatFCFA(MONTANT_MIN)} pour commander`);
      return;
    }
    const res = schema.safeParse(form);
    if (!res.success) {
      const errs: Erreurs = {};
      for (const issue of res.error.issues) {
        const k = issue.path[0] as keyof Erreurs;
        if (!errs[k]) errs[k] = issue.message;
      }
      setErreurs(errs);
      toast.error("Regarde bien le formulaire, y a un souci");
      return;
    }

    setEnvoi(true);
    const v = res.data;
    const { data, error } = await supabase.rpc("passer_commande", {
      p_nom: v.nom,
      p_telephone: nettoyerTelephone(v.telephone),
      p_zone_id: v.zoneId,
      p_repere: v.repere,
      p_note: v.note ?? "",
      p_articles: articles.map((a) => ({ produit_id: a.produitId, format: a.format, montant: a.montant })),
    });
    if (error || !data) {
      setEnvoi(false);
      toast.error("Commande pas partie", { description: error?.message ?? "Réessaie dans un instant." });
      return;
    }

    const r = data as {
      numero: string;
      articles: { nom: string; format: string | null; montant: number }[];
      sous_total: number;
      frais_livraison: number;
      total: number;
      zone_nom: string;
    };
    const message = construireMessageWhatsApp({
      numero: r.numero,
      clientNom: v.nom,
      clientTelephone: nettoyerTelephone(v.telephone),
      zone: r.zone_nom,
      repere: v.repere,
      note: v.note ?? null,
      articles: r.articles,
      sousTotal: r.sous_total,
      frais: r.frais_livraison,
      total: r.total,
    });
    const lien = lienWhatsApp(message);
    ajouterHistorique({
      numero: r.numero,
      telephone: nettoyerTelephone(v.telephone),
      total: r.total,
      date: new Date().toISOString(),
      articles: articles.map((a) => ({ produitId: a.produitId, nom: a.nom, format: a.format, montant: a.montant })),
      client: { nom: v.nom, zoneId: v.zoneId, repere: v.repere },
    });
    vider();
    setConfirmation({
      numero: r.numero,
      lien,
      message,
      client: v.nom,
      telephone: nettoyerTelephone(v.telephone),
      zone: r.zone_nom,
      repere: v.repere,
      note: v.note,
      articles: r.articles,
      sousTotal: r.sous_total,
      frais: r.frais_livraison,
      total: r.total,
    });
    setEnvoi(false);
    window.location.href = lien;
  }

  if (confirmation) return <EcranRecu recu={confirmation} />;

  return (
    <div className="min-h-screen pb-10">
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3">
          <Button asChild variant="ghost" size="icon" className="h-11 w-11 rounded-xl">
            <Link to="/" aria-label="Retour au menu">
              <ArrowLeft className="!size-5" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Mon panier</h1>
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-5 px-4 pt-4">
        {articles.length === 0 ? (
          <div className="rounded-3xl border bg-card p-8 text-center shadow-soft">
            <p className="text-lg font-semibold">Ton panier est vide dèh !</p>
            <p className="mt-1 text-muted-foreground">Va choisir tes croquettes et tes jus d'abord.</p>
            <Button asChild variant="gold" size="xl" className="mt-5 w-full">
              <Link to="/">Voir le menu</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={commander} className="space-y-5" noValidate>
            <section className="divide-y rounded-3xl border bg-card shadow-soft">
              {articles.map((a) => (
                <div key={a.cle} className="flex items-center gap-3 p-4">
                  <div className="flex-1">
                    <p className="font-semibold">{a.nom}</p>
                    {a.format && <p className="text-sm text-muted-foreground">{a.format}</p>}
                  </div>
                  <p className="font-bold">{formatFCFA(a.montant)}</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-11 w-11 rounded-xl text-muted-foreground"
                    onClick={() => retirer(a.cle)}
                    aria-label={`Retirer ${a.nom}`}
                  >
                    <Trash2 className="!size-5" />
                  </Button>
                </div>
              ))}
            </section>

            <section className="space-y-4 rounded-3xl border bg-card p-4 shadow-soft">
              <h2 className="text-xl font-semibold">Tes infos pour la livraison</h2>

              <Champ label="Nom et prénom" erreur={erreurs.nom}>
                <Input
                  value={form.nom}
                  onChange={(e) => maj("nom", e.target.value)}
                  autoComplete="name"
                  maxLength={80}
                  className="h-12 rounded-xl text-base"
                  placeholder="Ex : Awa Koné"
                />
              </Champ>

              <Champ label="Téléphone" erreur={erreurs.telephone}>
                <Input
                  type="tel"
                  inputMode="tel"
                  value={form.telephone}
                  onChange={(e) => maj("telephone", e.target.value)}
                  autoComplete="tel"
                  maxLength={20}
                  className="h-12 rounded-xl text-base"
                  placeholder="07 07 12 34 56"
                />
              </Champ>

              <Champ label="Zone de livraison" erreur={erreurs.zoneId}>
                <select
                  value={form.zoneId}
                  onChange={(e) => maj("zoneId", e.target.value)}
                  className={cn(
                    "h-12 w-full rounded-xl border border-input bg-card px-3 text-base focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                    !form.zoneId && "text-muted-foreground",
                  )}
                >
                  <option value="" disabled>
                    Choisir…
                  </option>
                  {zones.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.nom} — {z.frais > 0 ? formatFCFA(z.frais) : "0 FCFA"}
                    </option>
                  ))}
                </select>
              </Champ>

              <Champ
                label={estRetrait ? "Précision (heure de passage…)" : "Point de repère précis"}
                erreur={erreurs.repere}
              >
                <Input
                  value={form.repere}
                  onChange={(e) => maj("repere", e.target.value)}
                  maxLength={200}
                  className="h-12 rounded-xl text-base"
                  placeholder="Ex : Bâtiment B, près de la pharmacie"
                />
              </Champ>

              <Champ label="Note (facultatif)" erreur={erreurs.note}>
                <Textarea
                  value={form.note}
                  onChange={(e) => maj("note", e.target.value)}
                  maxLength={300}
                  rows={2}
                  className="rounded-xl text-base"
                  placeholder="Ex : bien glacé, peu sucré, appelle avant"
                />
              </Champ>
            </section>

            <section className="space-y-2 rounded-3xl border bg-secondary p-4">
              <Ligne label="Sous-total" valeur={formatFCFA(sousTotal)} />
              <Ligne
                label="Livraison"
                valeur={zone ? (frais > 0 ? formatFCFA(frais) : "0 FCFA") : "Choisissez une zone"}
              />
              <div className="flex items-baseline justify-between border-t border-border pt-2">
                <span className="text-lg font-semibold">Total à payer</span>
                <span className="text-2xl font-bold text-primary">{formatFCFA(total)}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Tu paies à la livraison : espèces ou Mobile Money.
              </p>
            </section>

            <Button type="submit" variant="whatsapp" size="xl" className="w-full" disabled={envoi}>
              {envoi ? <Loader2 className="!size-5 animate-spin" /> : <MessageCircle className="!size-5" />}
              Commander sur WhatsApp
            </Button>
          </form>
        )}
      </main>
    </div>
  );
}

function Champ({ label, erreur, children }: { label: string; erreur?: string | undefined; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-semibold">{label}</span>
      {children}
      {erreur && <span className="block text-sm font-medium text-destructive">{erreur}</span>}
    </label>
  );
}

function Ligne({ label, valeur }: { label: string; valeur: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{valeur}</span>
    </div>
  );
}

type Recu = {
  numero: string;
  lien: string;
  message: string;
  client: string;
  telephone: string;
  zone: string;
  repere: string;
  note?: string | undefined;
  articles: { nom: string; format: string | null; montant: number }[];
  sousTotal: number;
  frais: number;
  total: number;
};

function EcranRecu({ recu }: { recu: Recu }) {
  async function copier() {
    try {
      await navigator.clipboard.writeText(recu.message);
      toast.success("Reçu copié !");
    } catch {
      toast.error("Copie impossible sur ce téléphone");
    }
  }
  return (
    <div className="mx-auto min-h-screen max-w-lg px-4 py-8">
      <div className="text-center">
        <CheckCircle2 className="mx-auto h-16 w-16 text-success" />
        <h1 className="mt-3 text-3xl font-bold">C'est enregistré !</h1>
        <p className="mt-1 text-muted-foreground">
          Envoie le message sur WhatsApp pour confirmer. Tu paies à la livraison.
        </p>
      </div>

      <section className="mt-6 overflow-hidden rounded-3xl border bg-card shadow-soft animate-pop-in">
        <div className="bg-hero px-5 py-4 text-primary-foreground">
          <p className="text-sm opacity-80">Reçu de commande</p>
          <p className="text-2xl font-bold">{recu.numero}</p>
        </div>
        <div className="space-y-4 p-5 text-sm">
          <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
            <span className="text-muted-foreground">Client</span>
            <span className="font-semibold">{recu.client}</span>
            <span className="text-muted-foreground">Téléphone</span>
            <span className="font-semibold">{recu.telephone}</span>
            <span className="text-muted-foreground">Zone</span>
            <span className="font-semibold">{recu.zone}</span>
            <span className="text-muted-foreground">Repère</span>
            <span className="font-semibold">{recu.repere}</span>
            {recu.note && (
              <>
                <span className="text-muted-foreground">Note</span>
                <span className="font-semibold">{recu.note}</span>
              </>
            )}
          </div>
          <div className="divide-y border-y border-dashed">
            {recu.articles.map((a, i) => (
              <div key={i} className="flex justify-between py-2">
                <span>
                  {a.nom}
                  {a.format && <span className="text-muted-foreground"> · {a.format}</span>}
                </span>
                <span className="font-semibold">{formatFCFA(a.montant)}</span>
              </div>
            ))}
          </div>
          <Ligne label="Sous-total" valeur={formatFCFA(recu.sousTotal)} />
          <Ligne label="Livraison" valeur={formatFCFA(recu.frais)} />
          <div className="flex items-baseline justify-between">
            <span className="text-base font-semibold">Total à payer</span>
            <span className="text-2xl font-bold text-primary">{formatFCFA(recu.total)}</span>
          </div>
        </div>
      </section>

      <Button asChild variant="whatsapp" size="xl" className="mt-6 w-full">
        <a href={recu.lien}>
          <MessageCircle className="!size-5" /> Envoyer sur WhatsApp
        </a>
      </Button>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <Button type="button" variant="outline" size="touch" onClick={copier}>
          <Copy /> Copier le reçu
        </Button>
        <Button asChild variant="outline" size="touch">
          <Link to="/suivi">
            <PackageSearch /> Suivre
          </Link>
        </Button>
      </div>
      <Link to="/" className="mt-5 block text-center font-semibold text-primary underline-offset-4 hover:underline">
        Retour au menu
      </Link>
    </div>
  );
}
