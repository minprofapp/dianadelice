import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { produitsQuery, zonesQuery } from "@/lib/catalogue";
import { CarteProduit } from "@/components/CarteProduit";
import { BarrePanier } from "@/components/BarrePanier";
import { CarrouselHero } from "@/components/CarrouselHero";
import { MachineAEcrire } from "@/components/MachineAEcrire";
import { BoutonInstaller } from "@/components/BoutonInstaller";
import { BandeDefilante } from "@/components/BandeDefilante";
import { TexteAnime } from "@/components/TexteAnime";
import { Icone } from "@/components/Icone";
import type { NomIcone } from "@/components/icones-noms";
import { Apparait } from "@/components/Apparait";
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

  const atouts: { icone: NomIcone; couleur: string; texte: string }[] = [
    { icone: "rr:hand-holding-usd", couleur: "text-primary", texte: "Tu paies à la livraison" },
    { icone: "rr:moped", couleur: "text-primary", texte: `Livraison ${fraisMin ? `dès ${formatFCFA(fraisMin)}` : "offerte"}` },
    { icone: "rr:leaf", couleur: "text-leaf", texte: "Fait maison, frais du jour" },
    { icone: "brands:whatsapp", couleur: "text-whatsapp", texte: "Reçu direct sur WhatsApp" },
  ];

  return (
    <div className="min-h-screen overflow-x-hidden pb-32">
      <header className="relative overflow-hidden text-primary-foreground">
        <CarrouselHero />
        <div className="relative mx-auto flex min-h-[500px] max-w-lg flex-col px-5 pb-14 pt-5">
          <div className="flex items-center justify-between gap-3 animate-fade-in">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-primary-deep/70 px-3 py-1 text-sm font-bold backdrop-blur">
              <Icone nom="rr:marker" /> Anyama · CAFOP Abobo
            </p>
            <BoutonInstaller />
          </div>

          <div className="mt-auto">
            <img
              src={logo.url}
              alt={NOM_BOUTIQUE}
              width={112}
              height={112}
              className="h-28 w-28 rounded-full bg-card p-1 shadow-float animate-tampon"
            />
            <TexteAnime
              as="h1"
              auto
              delaiMs={250}
              texte={NOM_BOUTIQUE}
              className="mt-3 text-5xl font-extrabold leading-none drop-shadow-sm"
            />
            <div className="mt-2 min-h-[3.5rem] animate-fade-up" style={{ ["--d" as string]: "500ms" }}>
              <MachineAEcrire className="text-lg font-semibold" />
              <span className="sr-only">Croquettes et jus frais faits maison, livrés près de chez vous.</span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 animate-fade-up" style={{ ["--d" as string]: "700ms" }}>
              <span className="brillance rounded-2xl bg-gold-gradient px-4 py-2 text-lg font-extrabold text-gold-foreground shadow-soft">
                Dès {formatFCFA(500)}
              </span>
              <a
                href="#menu"
                className="group inline-flex items-center gap-1.5 rounded-2xl border-2 border-primary-foreground/70 px-4 py-2 font-bold backdrop-blur transition-all hover:bg-primary-foreground hover:text-primary"
              >
                Voir le menu
                <Icone nom="rr:angle-small-down" className="transition-transform group-hover:translate-y-0.5 animate-bounce" />
              </a>
            </div>
          </div>
        </div>
      </header>

      <BandeDefilante />

      <main className="mx-auto max-w-lg space-y-5 px-4 pt-3">
        <Apparait as="section" className="relative grid grid-cols-2 gap-3 rounded-3xl border bg-card p-4 text-sm shadow-soft">
          {atouts.map((a, i) => (
            <Apparait key={a.texte} type="zoom" delaiMs={120 + i * 90} className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary">
                <Icone nom={a.icone} className={`text-xl ${a.couleur}`} />
              </span>
              <span className="font-semibold leading-snug">{a.texte}</span>
            </Apparait>
          ))}
        </Apparait>

        <div className="grid grid-cols-2 gap-3">
          <Apparait type="left" delaiMs={80}>
          <Link
            to="/suivi"
            className="group flex h-full items-center gap-2 rounded-2xl border bg-secondary px-4 py-3 font-bold text-secondary-foreground transition-all hover:-translate-y-0.5 hover:shadow-soft"
          >
            <Icone nom="rr:box-open" className="text-xl text-primary transition-transform group-hover:-rotate-12" /> Suivre ma commande
          </Link>
          </Apparait>
          <Apparait type="right" delaiMs={160}>
          <a
            href={`https://wa.me/${WHATSAPP_VENDEUR}`}
            className="group flex h-full items-center gap-2 rounded-2xl border bg-secondary px-4 py-3 font-bold text-secondary-foreground transition-all hover:-translate-y-0.5 hover:shadow-soft"
          >
            <Icone nom="brands:whatsapp" className="text-xl text-whatsapp transition-transform group-hover:scale-125" /> Écrire à Diana
          </a>
          </Apparait>
        </div>

        <div className="pt-3">
          <TexteAnime as="h2" id="menu" texte="Le menu du jour" className="scroll-mt-4 text-4xl font-extrabold" />
          <Apparait as="p" type="blur" delaiMs={250} className="mt-1 text-muted-foreground">
            Choisis ton montant, à partir de 500F par article.
          </Apparait>
        </div>

        {produits.length === 0 ? (
          <Apparait as="p" className="rounded-2xl bg-muted p-6 text-center text-muted-foreground">
            Le menu arrive bientôt, patiente un peu.
          </Apparait>
        ) : (
          produits.map((p, i) => (
            <Apparait key={p.id} type={i % 2 ? "right" : "left"} delaiMs={60}>
              <CarteProduit produit={p} prioritaire={i === 0} />
            </Apparait>
          ))
        )}

        <Apparait as="footer" className="space-y-2 pt-6 text-center text-sm text-muted-foreground">
          <img src={logo.url} alt="" width={56} height={56} className="mx-auto h-14 w-14 animate-flotte" />
          <p>
            {NOM_BOUTIQUE} · WhatsApp {WHATSAPP_AFFICHAGE}
          </p>
          <Link to="/admin" className="inline-flex items-center gap-1.5 underline-offset-4 hover:underline">
            <Icone nom="rr:shop" /> Espace vendeur
          </Link>
          <p className="text-xs">
            Icônes{" "}
            <a href="https://www.flaticon.com/uicons" target="_blank" rel="noreferrer" className="underline">
              UIcons par Flaticon
            </a>
          </p>
        </Apparait>
      </main>

      <BarrePanier />
    </div>
  );
}
