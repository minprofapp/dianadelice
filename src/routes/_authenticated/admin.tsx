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
import { TableauBordPrincipal } from "@/components/admin/TableauBordPrincipal";
import { GestionProduits } from "@/components/admin/GestionProduits";
import { decoderProduit } from "@/lib/produit-service";
import type { CommandeBrute } from "@/lib/tableau-bord-stats";

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

  // Chargement des commandes
  const commandesQuery = useQuery({
    queryKey: ["admin-commandes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commandes")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data || []) as unknown as CommandeBrute[];
    },
  });

  // Chargement des produits pour les stats
  const produitsQuery = useQuery({
    queryKey: ["admin-produits"],
    queryFn: async () => {
      const { data, error } = await supabase.from("produits").select("*").order("ordre");
      if (error) throw error;
      return (data || []).map(decoderProduit);
    },
  });

  // Abonnement Realtime aux nouvelles commandes
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
            duration: 5000,
          });
        }
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

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
    <div className="min-h-screen pb-16">
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
          <Link to="/" className="flex min-w-0 items-center gap-3">
            <img src={logo.url} alt="" width={44} height={44} className="h-11 w-11 shrink-0" />
            <div className="min-w-0">
              <p className="truncate text-lg font-bold">{NOM_BOUTIQUE}</p>
              <p className="truncate text-xs text-muted-foreground">Administration & Tableau de bord</p>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex rounded-xl text-xs">
              <Link to="/">
                <Icone nom="rr:shop" /> Voir boutique
              </Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={deconnexion} className="rounded-xl text-xs">
              <Icone nom="rr:sign-out-alt" /> Sortir
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pt-5">
        <Tabs defaultValue="dashboard">
          <TabsList className="grid h-12 w-full grid-cols-4 rounded-2xl bg-muted/60 p-1">
            <TabsTrigger value="dashboard" className="h-10 rounded-xl text-xs sm:text-sm font-bold">
              Tableau de bord
            </TabsTrigger>
            <TabsTrigger value="commandes" className="h-10 rounded-xl text-xs sm:text-sm font-bold">
              Commandes
            </TabsTrigger>
            <TabsTrigger value="produits" className="h-10 rounded-xl text-xs sm:text-sm font-bold">
              Articles
            </TabsTrigger>
            <TabsTrigger value="zones" className="h-10 rounded-xl text-xs sm:text-sm font-bold">
              Zones
            </TabsTrigger>
          </TabsList>

          {/* 1. TABLEAU DE BORD PRINCIPAL */}
          <TabsContent value="dashboard" className="mt-5">
            <TableauBordPrincipal
              commandes={commandesQuery.data ?? []}
              produits={produitsQuery.data ?? []}
              enChargement={commandesQuery.isLoading}
            />
          </TabsContent>

          {/* 2. COMMANDES */}
          <TabsContent value="commandes" className="mt-5">
            <OngletCommandes commandes={commandesQuery.data ?? []} isLoading={commandesQuery.isLoading} />
          </TabsContent>

          {/* 3. GESTION DES ARTICLES / PRODUITS */}
          <TabsContent value="produits" className="mt-5">
            <GestionProduits />
          </TabsContent>

          {/* 4. ZONES DE LIVRAISON */}
          <TabsContent value="zones" className="mt-5">
            <OngletZones />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

/* ---------------- Commandes ---------------- */

function OngletCommandes({ commandes, isLoading }: { commandes: CommandeBrute[]; isLoading: boolean }) {
  const queryClient = useQueryClient();
  const [filtre, setFiltre] = useState<Statut | "toutes">("toutes");
  const [recherche, setRecherche] = useState("");

  const changerStatut = useMutation({
    mutationFn: async ({ id, statut }: { id: string; statut: Statut }) => {
      const { error } = await supabase.from("commandes").update({ statut }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-commandes"] }),
    onError: () => toast.error("Statut non modifié, réessayez"),
  });

  const affichees = useMemo(() => {
    return commandes.filter((c) => {
      if (filtre !== "toutes" && c.statut !== filtre) return false;
      const q = recherche.trim().toLowerCase();
      if (!q) return true;
      return (
        c.numero.toLowerCase().includes(q) ||
        c.client_nom.toLowerCase().includes(q) ||
        c.client_telephone.includes(q.replace(/\s/g, ""))
      );
    });
  }, [commandes, filtre, recherche]);

  function exporterCSV() {
    const entete = [
      "Numéro",
      "Date",
      "Client",
      "Téléphone",
      "Zone",
      "Repère",
      "Note",
      "Articles",
      "Sous-total",
      "Livraison",
      "Total",
      "Statut",
    ];
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
      <section className="space-y-3">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
          <div className="relative">
            <Icone
              nom="rr:search"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Chercher : numéro, nom, téléphone..."
              className="h-11 rounded-xl pl-9"
            />
          </div>
          <Button variant="outline" className="h-11 rounded-xl" onClick={exporterCSV}>
            <Icone nom="rr:download" /> Exporter CSV
          </Button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {(["toutes", ...STATUTS] as const).map((s) => {
            const nb = s === "toutes" ? commandes.length : commandes.filter((c) => c.statut === s).length;
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

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Icone nom="rr:spinner" className="text-3xl animate-spin text-primary" />
        </div>
      ) : affichees.length === 0 ? (
        <p className="rounded-2xl bg-muted p-8 text-center text-muted-foreground">Aucune commande trouvée.</p>
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
                    <a
                      href={`https://wa.me/${telWa}`}
                      target="_blank"
                      rel="noreferrer"
                      aria-label="WhatsApp du client"
                    >
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
        <h3 className="text-lg font-semibold">Ajouter une zone de livraison</h3>
        <Input
          placeholder="Nom (ex : Abobo Gare, N'Dotré...)"
          value={nouvelle.nom}
          maxLength={60}
          onChange={(e) => setNouvelle({ ...nouvelle, nom: e.target.value })}
          className="h-11 rounded-xl"
        />
        <Input
          type="number"
          inputMode="numeric"
          placeholder="Frais de livraison (FCFA)"
          value={nouvelle.frais}
          onChange={(e) => setNouvelle({ ...nouvelle, frais: e.target.value })}
          className="h-11 rounded-xl"
        />
        <Button type="submit" variant="gold" size="touch" className="w-full" disabled={ajouter.isPending}>
          <Icone nom="rr:plus" /> Ajouter la zone
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
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            value={frais}
            onChange={(e) => setFrais(e.target.value.replace(/\D/g, ""))}
            className="h-11 rounded-xl pr-16"
            aria-label="Frais de livraison"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            FCFA
          </span>
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
