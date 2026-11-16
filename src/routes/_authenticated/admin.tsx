import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Icone } from "@/components/Icone";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatFCFA, NOM_BOUTIQUE } from "@/lib/commande";
import { CLASSE_STATUT, LIBELLE_STATUT, STATUTS, type Statut } from "@/lib/statuts";
import { cn } from "@/lib/utils";
import logo from "@/assets/diana-logo.png.asset.json";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Tableau de bord — Diana Croquettes" },
      { name: "description", content: "Gestion des commandes, produits et zones de livraison de Diana Croquettes." },
      { property: "og:title", content: "Tableau de bord — Diana Croquettes" },
      { property: "og:description", content: "Espace vendeur Diana Croquettes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Admin,
});

type Article = { nom: string; format: string | null; montant: number };

const SUIVANT: Partial<Record<Statut, Statut>> = {
  en_attente: "confirmee",
  confirmee: "en_livraison",
  en_livraison: "livree",
};

function bip() {
  try {
    const ctx = new AudioContext();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = 880;
    g.gain.setValueAtTime(0.15, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.4);
  } catch {
    // son indisponible
  }
}

function Admin() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const role = useQuery({
    queryKey: ["role-admin", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
  });

  async function deconnexion() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (role.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Icone nom="rr:spinner" className="text-3xl animate-spin text-primary" />
      </div>
    );
  }

  if (!role.data) {
    return (
      <div className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-2xl font-bold">Accès réservé</h1>
        <p className="text-muted-foreground">Ce compte n'a pas accès à l'espace vendeur.</p>
        <Button onClick={deconnexion} variant="outline">
          <Icone nom="rr:sign-out-alt" /> Se déconnecter
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-10">
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto grid max-w-5xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
          <Link to="/" className="flex min-w-0 items-center gap-3">
            <img src={logo.url} alt="" width={44} height={44} className="h-11 w-11 shrink-0" />
            <div className="min-w-0">
              <p className="truncate text-lg font-bold">{NOM_BOUTIQUE}</p>
              <p className="truncate text-xs text-muted-foreground">Tableau de bord</p>
            </div>
          </Link>
          <Button variant="ghost" size="sm" onClick={deconnexion}>
            <Icone nom="rr:sign-out-alt" /> Sortir
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pt-4">
        <Tabs defaultValue="commandes">
          <TabsList className="grid h-12 w-full grid-cols-3 rounded-xl">
            <TabsTrigger value="commandes" className="h-10 rounded-lg text-base">Commandes</TabsTrigger>
            <TabsTrigger value="produits" className="h-10 rounded-lg text-base">Produits</TabsTrigger>
            <TabsTrigger value="zones" className="h-10 rounded-lg text-base">Zones</TabsTrigger>
          </TabsList>
          <TabsContent value="commandes" className="mt-4">
            <OngletCommandes />
          </TabsContent>
          <TabsContent value="produits" className="mt-4">
            <OngletProduits />
          </TabsContent>
          <TabsContent value="zones" className="mt-4">
            <OngletZones />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

/* ---------------- Commandes ---------------- */

function OngletCommandes() {
  const queryClient = useQueryClient();
  const [filtre, setFiltre] = useState<Statut | "toutes">("toutes");
  const [recherche, setRecherche] = useState("");

  const commandes = useQuery({
    queryKey: ["admin-commandes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commandes")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel(`commandes-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "commandes" }, (payload) => {
        queryClient.invalidateQueries({ queryKey: ["admin-commandes"] });
        if (payload.eventType === "INSERT") {
          const n = payload.new as { numero: string; client_nom: string; total: number };
          bip();
          toast.success(`Nouvelle commande ${n.numero}`, {
            description: `${n.client_nom} · ${formatFCFA(n.total)}`,
          });
        }
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const changerStatut = useMutation({
    mutationFn: async ({ id, statut }: { id: string; statut: Statut }) => {
      const { error } = await supabase.from("commandes").update({ statut }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-commandes"] }),
    onError: () => toast.error("Statut non modifié, réessaie"),
  });

  const liste = commandes.data ?? [];

  const stats = useMemo(() => {
    const debutJour = new Date();
    debutJour.setHours(0, 0, 0, 0);
    const debutMois = new Date(debutJour.getFullYear(), debutJour.getMonth(), 1);
    const valides = liste.filter((c) => c.statut !== "annulee");
    const duJour = valides.filter((c) => new Date(c.created_at) >= debutJour);
    const duMois = valides.filter((c) => new Date(c.created_at) >= debutMois);
    const ventes: Record<string, number> = {};
    for (const c of duMois) {
      for (const a of c.articles as Article[]) ventes[a.nom] = (ventes[a.nom] ?? 0) + a.montant;
    }
    const top = Object.entries(ventes).sort((a, b) => b[1] - a[1]);
    return {
      nbJour: duJour.length,
      caJour: duJour.reduce((s, c) => s + c.total, 0),
      enAttente: liste.filter((c) => c.statut === "en_attente").length,
      caMois: duMois.reduce((s, c) => s + c.total, 0),
      top,
      maxTop: top[0]?.[1] ?? 1,
    };
  }, [liste]);

  const affichees = liste.filter((c) => {
    if (filtre !== "toutes" && c.statut !== filtre) return false;
    const q = recherche.trim().toLowerCase();
    if (!q) return true;
    return (
      c.numero.toLowerCase().includes(q) ||
      c.client_nom.toLowerCase().includes(q) ||
      c.client_telephone.includes(q.replace(/\s/g, ""))
    );
  });

  function exporterCSV() {
    const entete = ["Numéro", "Date", "Client", "Téléphone", "Zone", "Repère", "Note", "Articles", "Sous-total", "Livraison", "Total", "Statut"];
    const lignes = affichees.map((c) => [
      c.numero,
      new Date(c.created_at).toLocaleString("fr-FR"),
      c.client_nom,
      c.client_telephone,
      c.zone_nom,
      c.repere,
      c.note ?? "",
      (c.articles as Article[]).map((a) => `${a.nom}${a.format ? ` (${a.format})` : ""} ${a.montant}`).join(" | "),
      c.sous_total,
      c.frais_livraison,
      c.total,
      LIBELLE_STATUT[c.statut as Statut] ?? c.statut,
    ]);
    const csv = [entete, ...lignes]
      .map((l) => l.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";"))
      .join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `commandes-diana-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat icone={<Icone nom="rr:shopping-bag" />} label="Commandes du jour" valeur={String(stats.nbJour)} />
        <Stat icone={<Icone nom="rr:wallet" />} label="Ventes du jour" valeur={formatFCFA(stats.caJour)} />
        <Stat icone={<Icone nom="rr:clock" />} label="En attente" valeur={String(stats.enAttente)} accent={stats.enAttente > 0} />
        <Stat icone={<Icone nom="rr:chart-line-up" />} label="Ventes du mois" valeur={formatFCFA(stats.caMois)} />
      </section>

      {stats.top.length > 0 && (
        <section className="rounded-2xl border bg-card p-4 shadow-soft">
          <h2 className="mb-3 text-lg font-semibold">Ce qui part le plus (ce mois)</h2>
          <div className="space-y-2">
            {stats.top.map(([nom, total]) => (
              <div key={nom}>
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{nom}</span>
                  <span className="font-semibold">{formatFCFA(total)}</span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-muted">
                  <div className="h-2 rounded-full bg-gold-gradient" style={{ width: `${(total / stats.maxTop) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
          <div className="relative">
            <Icone nom="rr:search" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Chercher : numéro, nom, téléphone"
              className="h-11 rounded-xl pl-9"
            />
          </div>
          <Button variant="outline" className="h-11 rounded-xl" onClick={exporterCSV}>
            <Icone nom="rr:download" /> CSV
          </Button>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(["toutes", ...STATUTS] as const).map((s) => {
            const nb = s === "toutes" ? liste.length : liste.filter((c) => c.statut === s).length;
            return (
              <Button
                key={s}
                size="sm"
                variant={filtre === s ? "chipActive" : "chip"}
                className="shrink-0 rounded-full"
                onClick={() => setFiltre(s)}
              >
                {s === "toutes" ? "Toutes" : LIBELLE_STATUT[s]} · {nb}
              </Button>
            );
          })}
        </div>
      </section>

      {commandes.isLoading ? (
        <div className="flex justify-center py-10">
          <Icone nom="rr:spinner" className="text-3xl animate-spin text-primary" />
        </div>
      ) : affichees.length === 0 ? (
        <p className="rounded-2xl bg-muted p-8 text-center text-muted-foreground">Aucune commande pour le moment.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {affichees.map((c) => {
            const statut = c.statut as Statut;
            const suivant = SUIVANT[statut];
            const tel = c.client_telephone.replace(/^\+/, "");
            const telWa = tel.startsWith("225") ? tel : `225${tel}`;
            return (
              <article key={c.id} className="space-y-3 rounded-2xl border bg-card p-4 shadow-soft">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-lg font-bold">{c.numero}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(c.created_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                    </p>
                  </div>
                  <span className={cn("shrink-0 rounded-full px-3 py-1 text-xs font-semibold", CLASSE_STATUT[statut])}>
                    {LIBELLE_STATUT[statut]}
                  </span>
                </div>
                <div className="text-sm">
                  <p className="font-semibold">{c.client_nom}</p>
                  <p className="text-muted-foreground">
                    {c.zone_nom} · {c.repere}
                  </p>
                  {c.note && <p className="mt-1 rounded-lg bg-accent px-2 py-1 text-accent-foreground">📝 {c.note}</p>}
                </div>
                <ul className="space-y-0.5 border-y border-dashed py-2 text-sm">
                  {(c.articles as Article[]).map((a, i) => (
                    <li key={i} className="flex justify-between">
                      <span>
                        {a.nom}
                        {a.format ? ` · ${a.format}` : ""}
                      </span>
                      <span>{formatFCFA(a.montant)}</span>
                    </li>
                  ))}
                  {c.frais_livraison > 0 && (
                    <li className="flex justify-between text-muted-foreground">
                      <span>Livraison</span>
                      <span>{formatFCFA(c.frais_livraison)}</span>
                    </li>
                  )}
                </ul>
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Total</span>
                  <span className="text-xl font-bold text-primary">{formatFCFA(c.total)}</span>
                </div>
                <div className="grid grid-cols-[auto_auto_minmax(0,1fr)] gap-2">
                  <Button asChild variant="outline" size="icon" className="h-11 w-11 rounded-xl">
                    <a href={`tel:${c.client_telephone}`} aria-label="Appeler le client">
                      <Icone nom="rr:phone-call" />
                    </a>
                  </Button>
                  <Button asChild variant="outline" size="icon" className="h-11 w-11 rounded-xl">
                    <a href={`https://wa.me/${telWa}`} target="_blank" rel="noreferrer" aria-label="WhatsApp du client">
                      <Icone nom="brands:whatsapp" />
                    </a>
                  </Button>
                  <select
                    value={statut}
                    onChange={(e) => changerStatut.mutate({ id: c.id, statut: e.target.value as Statut })}
                    className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm font-medium"
                    aria-label="Changer le statut"
                  >
                    {STATUTS.map((s) => (
                      <option key={s} value={s}>
                        {LIBELLE_STATUT[s]}
                      </option>
                    ))}
                  </select>
                </div>
                {suivant && (
                  <Button
                    className="w-full"
                    size="touch"
                    onClick={() => changerStatut.mutate({ id: c.id, statut: suivant })}
                  >
                    Passer à « {LIBELLE_STATUT[suivant]} » <Icone nom="rr:angle-small-right" />
                  </Button>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({ icone, label, valeur, accent }: { icone: React.ReactNode; label: string; valeur: string; accent?: boolean }) {
  return (
    <div className={cn("rounded-2xl border p-4 shadow-soft transition-transform animate-fade-up hover:-translate-y-0.5 [&_.icone]:text-2xl", accent ? "bg-gold/20" : "bg-card")}>
      <div className="flex items-center gap-2 text-primary">{icone}</div>
      <p className="mt-2 text-xl font-bold">{valeur}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

/* ---------------- Produits ---------------- */

function OngletProduits() {
  const queryClient = useQueryClient();
  const produits = useQuery({
    queryKey: ["admin-produits"],
    queryFn: async () => {
      const { data, error } = await supabase.from("produits").select("*").order("ordre");
      if (error) throw error;
      return data;
    },
  });

  const rafraichir = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-produits"] });
    queryClient.invalidateQueries({ queryKey: ["produits"] });
  };

  const maj = useMutation({
    mutationFn: async ({ id, ...champs }: { id: string; disponible?: boolean; nom?: string; description?: string; formats?: string[] }) => {
      const { error } = await supabase.from("produits").update(champs).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      rafraichir();
      toast.success("Produit mis à jour");
    },
    onError: () => toast.error("Modification impossible"),
  });

  const [nouveau, setNouveau] = useState({ nom: "", description: "", formats: "Sachet" });
  const ajouter = useMutation({
    mutationFn: async () => {
      const nom = nouveau.nom.trim();
      if (nom.length < 2 || nom.length > 60) throw new Error("Nom entre 2 et 60 caractères");
      const slug =
        nom
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") + "-" + Date.now().toString(36);
      const formats = nouveau.formats.split(",").map((f) => f.trim()).filter(Boolean).slice(0, 5);
      const { error } = await supabase.from("produits").insert({
        nom,
        slug,
        description: nouveau.description.trim().slice(0, 200),
        formats,
        ordre: (produits.data?.length ?? 0) + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNouveau({ nom: "", description: "", formats: "Sachet" });
      rafraichir();
      toast.success("Produit ajouté au menu");
    },
    onError: (e: Error) => toast.error(e.message || "Ajout impossible"),
  });

  return (
    <div className="space-y-4">
      {(produits.data ?? []).map((p) => (
        <ProduitEditable key={p.id} produit={p} onSave={(champs) => maj.mutate({ id: p.id, ...champs })} />
      ))}

      <form
        className="space-y-3 rounded-2xl border-2 border-dashed bg-card p-4"
        onSubmit={(e) => {
          e.preventDefault();
          ajouter.mutate();
        }}
      >
        <h3 className="text-lg font-semibold">Ajouter un produit</h3>
        <Input placeholder="Nom (ex : Jus de baobab)" value={nouveau.nom} maxLength={60} onChange={(e) => setNouveau({ ...nouveau, nom: e.target.value })} className="h-11 rounded-xl" />
        <Input placeholder="Petite description" value={nouveau.description} maxLength={200} onChange={(e) => setNouveau({ ...nouveau, description: e.target.value })} className="h-11 rounded-xl" />
        <Input placeholder="Formats séparés par virgule (ex : Sachet, Bouteille)" value={nouveau.formats} maxLength={100} onChange={(e) => setNouveau({ ...nouveau, formats: e.target.value })} className="h-11 rounded-xl" />
        <Button type="submit" variant="gold" size="touch" className="w-full" disabled={ajouter.isPending}>
          <Icone nom="rr:plus" /> Ajouter
        </Button>
      </form>
    </div>
  );
}

function ProduitEditable({
  produit,
  onSave,
}: {
  produit: { id: string; nom: string; description: string; formats: string[]; disponible: boolean };
  onSave: (c: { disponible?: boolean; nom?: string; description?: string; formats?: string[] }) => void;
}) {
  const [nom, setNom] = useState(produit.nom);
  const [desc, setDesc] = useState(produit.description);
  const [formats, setFormats] = useState(produit.formats.join(", "));
  const modifie = nom !== produit.nom || desc !== produit.description || formats !== produit.formats.join(", ");

  return (
    <div className="space-y-3 rounded-2xl border bg-card p-4 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <p className="text-lg font-semibold">{produit.nom}</p>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <span className={produit.disponible ? "text-success" : "text-destructive"}>
            {produit.disponible ? "En stock" : "Épuisé"}
          </span>
          <Switch checked={produit.disponible} onCheckedChange={(v) => onSave({ disponible: v })} />
        </label>
      </div>
      <Input value={nom} maxLength={60} onChange={(e) => setNom(e.target.value)} className="h-11 rounded-xl" aria-label="Nom" />
      <Input value={desc} maxLength={200} onChange={(e) => setDesc(e.target.value)} className="h-11 rounded-xl" aria-label="Description" />
      <Input value={formats} maxLength={100} onChange={(e) => setFormats(e.target.value)} className="h-11 rounded-xl" aria-label="Formats" placeholder="Sachet, Bouteille" />
      {modifie && (
        <Button
          size="touch"
          className="w-full"
          onClick={() =>
            onSave({
              nom: nom.trim().slice(0, 60),
              description: desc.trim().slice(0, 200),
              formats: formats.split(",").map((f) => f.trim()).filter(Boolean).slice(0, 5),
            })
          }
        >
          Enregistrer
        </Button>
      )}
    </div>
  );
}

/* ---------------- Zones ---------------- */

function OngletZones() {
  const queryClient = useQueryClient();
  const zones = useQuery({
    queryKey: ["admin-zones"],
    queryFn: async () => {
      const { data, error } = await supabase.from("zones_livraison").select("*").order("ordre");
      if (error) throw error;
      return data;
    },
  });
  const rafraichir = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-zones"] });
    queryClient.invalidateQueries({ queryKey: ["zones"] });
  };
  const maj = useMutation({
    mutationFn: async ({ id, ...champs }: { id: string; frais?: number; actif?: boolean; nom?: string }) => {
      const { error } = await supabase.from("zones_livraison").update(champs).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      rafraichir();
      toast.success("Zone mise à jour");
    },
    onError: () => toast.error("Modification impossible"),
  });
  const [nouvelle, setNouvelle] = useState({ nom: "", frais: "500" });
  const ajouter = useMutation({
    mutationFn: async () => {
      const nom = nouvelle.nom.trim();
      const frais = Number(nouvelle.frais);
      if (nom.length < 2 || nom.length > 60) throw new Error("Nom entre 2 et 60 caractères");
      if (!Number.isInteger(frais) || frais < 0 || frais > 20000) throw new Error("Frais entre 0 et 20 000 FCFA");
      const { error } = await supabase
        .from("zones_livraison")
        .insert({ nom, frais, ordre: (zones.data?.length ?? 0) + 1 });
      if (error) throw error;
    },
    onSuccess: () => {
      setNouvelle({ nom: "", frais: "500" });
      rafraichir();
      toast.success("Zone ajoutée");
    },
    onError: (e: Error) => toast.error(e.message || "Ajout impossible"),
  });

  return (
    <div className="space-y-3">
      {(zones.data ?? []).map((z) => (
        <ZoneEditable key={z.id} zone={z} onSave={(c) => maj.mutate({ id: z.id, ...c })} />
      ))}
      <form
        className="space-y-3 rounded-2xl border-2 border-dashed bg-card p-4"
        onSubmit={(e) => {
          e.preventDefault();
          ajouter.mutate();
        }}
      >
        <h3 className="text-lg font-semibold">Ajouter une zone</h3>
        <Input placeholder="Nom (ex : Abobo Gare)" value={nouvelle.nom} maxLength={60} onChange={(e) => setNouvelle({ ...nouvelle, nom: e.target.value })} className="h-11 rounded-xl" />
        <Input type="number" inputMode="numeric" placeholder="Frais (FCFA)" value={nouvelle.frais} onChange={(e) => setNouvelle({ ...nouvelle, frais: e.target.value })} className="h-11 rounded-xl" />
        <Button type="submit" variant="gold" size="touch" className="w-full" disabled={ajouter.isPending}>
          <Icone nom="rr:plus" /> Ajouter
        </Button>
      </form>
    </div>
  );
}

function ZoneEditable({
  zone,
  onSave,
}: {
  zone: { id: string; nom: string; frais: number; actif: boolean };
  onSave: (c: { frais?: number; actif?: boolean }) => void;
}) {
  const [frais, setFrais] = useState(String(zone.frais));
  const modifie = frais !== String(zone.frais);
  return (
    <div className="space-y-3 rounded-2xl border bg-card p-4 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <p className="text-lg font-semibold">{zone.nom}</p>
        <label className="flex items-center gap-2 text-sm font-semibold">
          {zone.actif ? "Active" : "Masquée"}
          <Switch checked={zone.actif} onCheckedChange={(v) => onSave({ actif: v })} />
        </label>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
        <div className="relative">
          <Input type="number" inputMode="numeric" min={0} value={frais} onChange={(e) => setFrais(e.target.value.replace(/\D/g, ""))} className="h-11 rounded-xl pr-16" aria-label="Frais de livraison" />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">FCFA</span>
        </div>
        <Button
          className="h-11 rounded-xl"
          disabled={!modifie}
          onClick={() => {
            const n = Number(frais);
            if (!Number.isInteger(n) || n < 0 || n > 20000) {
              toast.error("Frais entre 0 et 20 000 FCFA");
              return;
            }
            onSave({ frais: n });
          }}
        >
          Enregistrer
        </Button>
      </div>
    </div>
  );
}
