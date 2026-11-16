import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Icone } from "@/components/Icone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatFCFA } from "@/lib/commande";
import {
  calculerStatistiquesDashboard,
  obtenirPlageDates,
  type CommandeBrute,
  type PeriodeFiltre,
} from "@/lib/tableau-bord-stats";
import type { ProduitEnrichi } from "@/lib/types-produit";
import { cn } from "@/lib/utils";

interface TableauBordPrincipalProps {
  commandes: CommandeBrute[];
  produits: ProduitEnrichi[];
  enChargement?: boolean;
}

const COULEURS_CATEGORIES = ["#8e1b2a", "#d4a373", "#2a9d8f", "#e76f51", "#264653", "#e9c46a", "#a8dadc"];

export function TableauBordPrincipal({
  commandes,
  produits,
  enChargement = false,
}: TableauBordPrincipalProps) {
  const [periode, setPeriode] = useState<PeriodeFiltre>("mois");
  const [dateDebutPerso, setDateDebutPerso] = useState<string>("");
  const [dateFinPerso, setDateFinPerso] = useState<string>("");

  const plage = useMemo(() => {
    return obtenirPlageDates(periode, dateDebutPerso, dateFinPerso);
  }, [periode, dateDebutPerso, dateFinPerso]);

  const stats = useMemo(() => {
    return calculerStatistiquesDashboard(commandes, produits, plage);
  }, [commandes, produits, plage]);

  const filtresOptions: { id: PeriodeFiltre; label: string }[] = [
    { id: "aujourdhui", label: "Aujourd'hui" },
    { id: "hier", label: "Hier" },
    { id: "7jours", label: "7 derniers jours" },
    { id: "30jours", label: "30 derniers jours" },
    { id: "mois", label: "Ce mois" },
    { id: "trimestre", label: "Ce trimestre" },
    { id: "annee", label: "Cette année" },
    { id: "personnalisee", label: "Période personnalisée" },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Barre de filtres de période */}
      <div className="rounded-3xl border bg-card p-4 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icone nom="rr:clock" className="text-lg" />
            </span>
            <div>
              <p className="text-xs font-semibold text-muted-foreground">Période d'analyse</p>
              <h3 className="font-bold text-foreground text-sm">{plage.libelle}</h3>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {filtresOptions.map((opt) => (
              <Button
                key={opt.id}
                type="button"
                size="sm"
                variant={periode === opt.id ? "chipActive" : "chip"}
                className="rounded-full text-xs font-semibold"
                onClick={() => setPeriode(opt.id)}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Inputs dates personnalisées */}
        {periode === "personnalisee" && (
          <div className="mt-4 flex flex-wrap items-center gap-3 border-t pt-3 animate-fade-in">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-muted-foreground">Du :</label>
              <Input
                type="date"
                value={dateDebutPerso}
                onChange={(e) => setDateDebutPerso(e.target.value)}
                className="h-9 w-40 rounded-xl text-xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-muted-foreground">Au :</label>
              <Input
                type="date"
                value={dateFinPerso}
                onChange={(e) => setDateFinPerso(e.target.value)}
                className="h-9 w-40 rounded-xl text-xs"
              />
            </div>
          </div>
        )}
      </div>

      {/* 2. KPIs Chiffre d'affaires & Panier Moyen */}
      <section>
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Chiffre d'Affaires & Ventes
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <CarteKpi
            icone={<Icone nom="rr:wallet" />}
            titre="CA du jour"
            valeur={formatFCFA(stats.caJour)}
            sousTitre="Aujourd'hui"
            accent
          />
          <CarteKpi
            icone={<Icone nom="rr:chart-line-up" />}
            titre="CA de la semaine"
            valeur={formatFCFA(stats.caSemaine)}
            sousTitre="Depuis lundi"
          />
          <CarteKpi
            icone={<Icone nom="rr:shop" />}
            titre="CA du mois"
            valeur={formatFCFA(stats.caMois)}
            sousTitre="Mois en cours"
          />
          <CarteKpi
            icone={<Icone nom="rr:shopping-bag" />}
            titre={`CA sur la sélection`}
            valeur={formatFCFA(stats.caPeriode)}
            sousTitre={plage.libelle}
          />
          <CarteKpi
            icone={<Icone nom="rr:hand-holding-usd" />}
            titre="Panier moyen"
            valeur={formatFCFA(stats.panierMoyenPeriode)}
            sousTitre="Par commande"
          />
        </div>
      </section>

      {/* 3. KPIs Flux des commandes en temps réel */}
      <section>
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Suivi des Commandes (Temps Réel)
        </h3>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-8">
          <BadgeStatut
            icone={<Icone nom="rr:shopping-bag" />}
            titre="Total"
            nombre={stats.totalCommandesPeriode}
            couleur="bg-card text-foreground"
          />
          <BadgeStatut
            icone={<Icone nom="rr:clock" />}
            titre="En attente"
            nombre={stats.commandesEnAttente}
            couleur="bg-amber-500/15 text-amber-600 border-amber-300"
            alerte={stats.commandesEnAttente > 0}
          />
          <BadgeStatut
            icone={<Icone nom="rr:check-circle" />}
            titre="Confirmées"
            nombre={stats.commandesConfirmees}
            couleur="bg-blue-500/15 text-blue-600 border-blue-300"
          />
          <BadgeStatut
            icone={<Icone nom="rr:cookie" />}
            titre="En préparation"
            nombre={stats.commandesEnPreparation}
            couleur="bg-purple-500/15 text-purple-600 border-purple-300"
          />
          <BadgeStatut
            icone={<Icone nom="rr:box-open" />}
            titre="Prêtes"
            nombre={stats.commandesPretes}
            couleur="bg-indigo-500/15 text-indigo-600 border-indigo-300"
          />
          <BadgeStatut
            icone={<Icone nom="rr:moped" />}
            titre="En livraison"
            nombre={stats.commandesEnLivraison}
            couleur="bg-primary/15 text-primary border-primary/30"
          />
          <BadgeStatut
            icone={<Icone nom="sr:check-circle" />}
            titre="Livrées"
            nombre={stats.commandesLivrees}
            couleur="bg-emerald-500/15 text-emerald-600 border-emerald-300"
          />
          <BadgeStatut
            icone={<Icone nom="rr:trash" />}
            titre="Annulées"
            nombre={stats.commandesAnnulees}
            couleur="bg-muted text-muted-foreground"
          />
        </div>
      </section>

      {/* 4. Clients, Logistique et État des stocks */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Clients */}
        <div className="rounded-2xl border bg-card p-4 shadow-soft">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Clients</span>
            <Icone nom="rr:user" className="text-primary text-lg" />
          </div>
          <p className="mt-2 text-2xl font-extrabold">{stats.nombreClientsTotal}</p>
          <div className="mt-1 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Nouveaux sur la période :</span>
            <span className="font-bold text-success">+{stats.nouveauxClientsPeriode}</span>
          </div>
        </div>

        {/* Logistique & Livreurs */}
        <div className="rounded-2xl border bg-card p-4 shadow-soft">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Logistique & Flotte</span>
            <Icone nom="rr:moped" className="text-primary text-lg" />
          </div>
          <p className="mt-2 text-2xl font-extrabold">{stats.nombreLivreurs} livreurs</p>
          <div className="mt-1 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Courses en cours :</span>
            <span className="font-bold text-primary">{stats.livraisonsEnCours}</span>
          </div>
        </div>

        {/* Produits disponibles & Rupture */}
        <div className="rounded-2xl border bg-card p-4 shadow-soft">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Catalogue Actif</span>
            <Icone nom="rr:cookie" className="text-primary text-lg" />
          </div>
          <p className="mt-2 text-2xl font-extrabold">{stats.produitsDisponibles} dispo</p>
          <div className="mt-1 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">En rupture totale :</span>
            <span className={cn("font-bold", stats.produitsEnRupture > 0 ? "text-destructive" : "text-muted-foreground")}>
              {stats.produitsEnRupture}
            </span>
          </div>
        </div>

        {/* Alertes Stock Faible */}
        <div
          className={cn(
            "rounded-2xl border p-4 shadow-soft",
            stats.produitsStockFaible > 0 ? "border-amber-400 bg-amber-500/10" : "bg-card",
          )}
        >
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Alerte Stocks</span>
            <span className="text-lg">⚠️</span>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-amber-600">{stats.produitsStockFaible}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {stats.produitsStockFaible > 0 ? "Articles sous le seuil d'alerte" : "Tous les stocks sont optimaux"}
          </p>
        </div>
      </section>

      {/* 5. Graphiques analytiques */}
      <section className="space-y-6">
        {/* Ligne 1 : Évolution des ventes & Commandes par jour */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Évolution des ventes */}
          <div className="rounded-3xl border bg-card p-5 shadow-soft">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-foreground">Évolution des ventes</h4>
                <p className="text-xs text-muted-foreground">Chiffre d'affaires par intervalle</p>
              </div>
              <Icone nom="rr:chart-line-up" className="text-primary text-xl" />
            </div>
            <div className="h-64 w-full">
              {stats.evolutionVentes.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  Aucune vente enregistrée sur cette période
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.evolutionVentes}>
                    <defs>
                      <linearGradient id="degradeVentes" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8e1b2a" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#8e1b2a" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v / 1000}k`} />
                    <Tooltip
                      formatter={(val: any) => [formatFCFA(Number(val)), "Ventes"]}
                      contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="ventes"
                      stroke="#8e1b2a"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#degradeVentes)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Commandes par jour de la semaine */}
          <div className="rounded-3xl border bg-card p-5 shadow-soft">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-foreground">Commandes par jour</h4>
                <p className="text-xs text-muted-foreground">Fréquence des commandes par jour</p>
              </div>
              <Icone nom="rr:shopping-bag" className="text-primary text-xl" />
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.commandesParJour}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="jour" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    formatter={(val: any) => [`${val} commande(s)`, "Volume"]}
                    contentStyle={{ borderRadius: "12px" }}
                  />
                  <Bar dataKey="commandes" fill="#d4a373" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Ligne 2 : Commandes par heure & Catégories les plus vendues */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Commandes par heure */}
          <div className="rounded-3xl border bg-card p-5 shadow-soft">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-foreground">Commandes par heure</h4>
                <p className="text-xs text-muted-foreground">Heures de pointe de la journée (00h - 23h)</p>
              </div>
              <Icone nom="rr:time-fast" className="text-primary text-xl" />
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.commandesParHeure}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="heure" tick={{ fontSize: 10 }} interval={2} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    formatter={(val: any) => [`${val} commande(s)`, "Commandes"]}
                    contentStyle={{ borderRadius: "12px" }}
                  />
                  <Bar dataKey="commandes" fill="#8e1b2a" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Catégories les plus vendues */}
          <div className="rounded-3xl border bg-card p-5 shadow-soft">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-foreground">Catégories les plus vendues</h4>
                <p className="text-xs text-muted-foreground">Répartition des ventes par catégorie</p>
              </div>
              <Icone nom="rr:cookie" className="text-primary text-xl" />
            </div>
            <div className="h-64 w-full flex items-center justify-center">
              {stats.categoriesPlusVendues.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune vente par catégorie enregistrée</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.categoriesPlusVendues}
                      dataKey="ca"
                      nameKey="categorie"
                      cx="50%"
                      cy="50%"
                      outerRadius={85}
                      innerRadius={45}
                      paddingAngle={4}
                      label={({ name, percent }: { name?: string; percent?: number }) =>
                        `${name ?? ""} (${((percent ?? 0) * 100).toFixed(0)}%)`
                      }
                      labelLine={false}
                    >
                      {stats.categoriesPlusVendues.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COULEURS_CATEGORIES[index % COULEURS_CATEGORIES.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any) => [formatFCFA(Number(val)), "Chiffre d'affaires"]}
                      contentStyle={{ borderRadius: "12px" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* Ligne 3 : Produits les plus vendus & Chiffre d'affaires par produit */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Produits les plus vendus (Quantités) */}
          <div className="rounded-3xl border bg-card p-5 shadow-soft">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-foreground">Produits les plus vendus</h4>
                <p className="text-xs text-muted-foreground">Classement par volume de commandes</p>
              </div>
              <Icone nom="sr:flame" className="text-amber-500 text-xl" />
            </div>
            <div className="space-y-3">
              {stats.produitsPlusVendus.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Aucune commande enregistrée</p>
              ) : (
                stats.produitsPlusVendus.map((p, idx) => {
                  const maxQ = stats.produitsPlusVendus[0]?.quantite || 1;
                  const pct = Math.round((p.quantite / maxQ) * 100);
                  return (
                    <div key={p.nom} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="flex items-center gap-1.5 truncate">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-[10px]">
                            {idx + 1}
                          </span>
                          <span className="truncate">{p.nom}</span>
                        </span>
                        <span>{p.quantite} vendus</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gold-gradient transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Chiffre d'affaires par produit */}
          <div className="rounded-3xl border bg-card p-5 shadow-soft">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-foreground">Chiffre d'affaires par produit</h4>
                <p className="text-xs text-muted-foreground">Classement par revenus générés</p>
              </div>
              <Icone nom="rr:wallet" className="text-primary text-xl" />
            </div>
            <div className="space-y-3">
              {stats.caParProduit.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Aucun revenu sur la période</p>
              ) : (
                stats.caParProduit.map((p, idx) => {
                  const maxCA = stats.caParProduit[0]?.ca || 1;
                  const pct = Math.round((p.ca / maxCA) * 100);
                  return (
                    <div key={p.nom} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="flex items-center gap-1.5 truncate">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px]">
                            {idx + 1}
                          </span>
                          <span className="truncate">{p.nom}</span>
                        </span>
                        <span className="font-bold text-primary">{formatFCFA(p.ca)}</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function CarteKpi({
  icone,
  titre,
  valeur,
  sousTitre,
  accent,
}: {
  icone: React.ReactNode;
  titre: string;
  valeur: string;
  sousTitre: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-4 shadow-soft transition-transform hover:-translate-y-0.5",
        accent ? "border-gold/60 bg-gold/15" : "bg-card",
      )}
    >
      <div className="flex items-center justify-between text-primary">
        <span className="text-xs font-bold text-muted-foreground truncate">{titre}</span>
        <span className="text-lg">{icone}</span>
      </div>
      <p className="mt-2 text-xl font-extrabold text-foreground truncate">{valeur}</p>
      <p className="mt-0.5 text-[11px] text-muted-foreground truncate">{sousTitre}</p>
    </div>
  );
}

function BadgeStatut({
  icone,
  titre,
  nombre,
  couleur,
  alerte,
}: {
  icone: React.ReactNode;
  titre: string;
  nombre: number;
  couleur: string;
  alerte?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border p-2.5 text-center shadow-soft transition-transform hover:scale-102",
        couleur,
        alerte && "animate-pulse ring-2 ring-amber-400",
      )}
    >
      <span className="text-base">{icone}</span>
      <span className="mt-1 text-lg font-extrabold leading-none">{nombre}</span>
      <span className="mt-1 text-[10px] font-semibold leading-tight line-clamp-1">{titre}</span>
    </div>
  );
}
