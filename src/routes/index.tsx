import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Bike, Banknote, MapPin, Store, PackageSearch, MessageCircle, Leaf } from "lucide-react";
import { produitsQuery, zonesQuery } from "@/lib/catalogue";
import { CarteProduit } from "@/components/CarteProduit";
import { BarrePanier } from "@/components/BarrePanier";
import { CarrouselHero } from "@/components/CarrouselHero";
import { MachineAEcrire } from "@/components/MachineAEcrire";
import { BoutonInstaller } from "@/components/BoutonInstaller";
import { NOM_BOUTIQUE, WHATSAPP_AFFICHAGE, WHATSAPP_VENDEUR, formatFCFA } from "@/lib/commande";
import logo from "@/assets/diana-logo.png.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Diana Croquettes — Croquettes, bissap & gnamakoudji dès 500F" },
      {
        name: "description",
        content:
          "Croquettes maison, jus de bissap et jus de gnamakoudji dès 500F. Livraison à Anyama et au CAFOP Abobo, commande sur WhatsApp.",
      },
      { property: "og:title", content: "Diana Croquettes — C'est doux même !" },
      {
        property: "og:description",
        content: "Commandez dès 500F, livré à Anyama et au CAFOP Abobo. Paiement à la livraison.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(produitsQuery),
      context.queryClient.ensureQueryData(zonesQuery),
    ]);
  },
  component: Accueil,
});

function Accueil() {
  const { data: produits } = useSuspenseQuery(produitsQuery);
  const { data: zones } = useSuspenseQuery(zonesQuery);
  const fraisMin = zones.filter((z) => z.frais > 0).map((z) => z.frais).sort((a, b) => a - b)[0];

  return (
    <div className="min-h-screen pb-32">
      <header className="relative overflow-hidden text-primary-foreground">
        <CarrouselHero />
        <div className="relative mx-auto flex min-h-[460px] max-w-lg flex-col px-5 pb-12 pt-5">
          <div className="flex items-center justify-between gap-3">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-primary-deep/70 px-3 py-1 text-sm font-semibold backdrop-blur">
              <MapPin className="h-4 w-4" /> Anyama · CAFOP Abobo
            </p>
            <BoutonInstaller />
          </div>

          <div className="mt-auto">
            <img
              src={logo.url}
              alt={NOM_BOUTIQUE}
              width={112}
              height={112}
              className="h-28 w-28 rounded-full bg-card p-1 shadow-float"
            />
            <h1 className="mt-3 text-4xl font-bold leading-tight">{NOM_BOUTIQUE}</h1>
            <div className="mt-2 min-h-[3.5rem]">
              <MachineAEcrire className="text-lg font-medium" />
              <span className="sr-only">Croquettes et jus frais faits maison, livrés près de chez vous.</span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-2xl bg-gold-gradient px-4 py-2 text-lg font-bold text-gold-foreground shadow-soft">
                Dès {formatFCFA(500)}
              </span>
              <a
                href="#menu"
                className="rounded-2xl border-2 border-primary-foreground/70 px-4 py-2 font-semibold backdrop-blur"
              >
                Voir le menu ↓
              </a>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto -mt-6 max-w-lg space-y-5 px-4">
        <section className="relative grid grid-cols-2 gap-3 rounded-2xl border bg-card p-3 text-sm shadow-soft">
          <div className="flex items-center gap-2">
            <Banknote className="h-5 w-5 shrink-0 text-primary" />
            <span>Tu paies à la livraison</span>
          </div>
          <div className="flex items-center gap-2">
            <Bike className="h-5 w-5 shrink-0 text-primary" />
            <span>Livraison {fraisMin ? `dès ${formatFCFA(fraisMin)}` : "offerte"}</span>
          </div>
          <div className="flex items-center gap-2">
            <Leaf className="h-5 w-5 shrink-0 text-leaf" />
            <span>Fait maison, frais du jour</span>
          </div>
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 shrink-0 text-whatsapp" />
            <span>Reçu direct sur WhatsApp</span>
          </div>
        </section>

        <div className="grid grid-cols-2 gap-3">
          <Link
            to="/suivi"
            className="flex items-center gap-2 rounded-2xl border bg-secondary px-4 py-3 font-semibold text-secondary-foreground"
          >
            <PackageSearch className="h-5 w-5 text-primary" /> Suivre ma commande
          </Link>
          <a
            href={`https://wa.me/${WHATSAPP_VENDEUR}`}
            className="flex items-center gap-2 rounded-2xl border bg-secondary px-4 py-3 font-semibold text-secondary-foreground"
          >
            <MessageCircle className="h-5 w-5 text-whatsapp" /> Écrire à Diana
          </a>
        </div>

        <h2 id="menu" className="scroll-mt-4 pt-2 text-3xl font-bold">
          Le menu du jour
        </h2>
        <p className="-mt-3 text-muted-foreground">Choisis ton montant, à partir de 500F par article.</p>

        {produits.length === 0 ? (
          <p className="rounded-2xl bg-muted p-6 text-center text-muted-foreground">Le menu arrive bientôt, patiente un peu.</p>
        ) : (
          produits.map((p) => <CarteProduit key={p.id} produit={p} />)
        )}

        <footer className="space-y-2 pt-6 text-center text-sm text-muted-foreground">
          <p>
            {NOM_BOUTIQUE} · WhatsApp {WHATSAPP_AFFICHAGE}
          </p>
          <Link to="/admin" className="inline-flex items-center gap-1.5 underline-offset-4 hover:underline">
            <Store className="h-4 w-4" /> Espace vendeur
          </Link>
        </footer>
      </main>

      <BarrePanier />
    </div>
  );
}
