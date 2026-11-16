import { useEffect, useState } from "react";
import { Icone } from "@/components/Icone";
import { Button } from "@/components/ui/button";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallationPwaModal({
  ouvert,
  onFermer,
}: {
  ouvert: boolean;
  onFermer: () => void;
}) {
  const [evtInstall, setEvtInstall] = useState<BeforeInstallPromptEvent | null>(null);
  const [estIos, setEstIos] = useState(false);
  const [dejaInstalle, setDejaInstalle] = useState(false);

  useEffect(() => {
    // Détection iOS Safari
    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua);
    setEstIos(isIosDevice);

    // Détection si déjà lancé en PWA standalone
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setDejaInstalle(isStandalone);

    const handler = (e: Event) => {
      e.preventDefault();
      setEvtInstall(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!ouvert) return null;

  async function installerAndroid() {
    if (evtInstall) {
      await evtInstall.prompt();
      const choix = await evtInstall.userChoice;
      if (choix.outcome === "accepted") {
        setEvtInstall(null);
        onFermer();
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md rounded-3xl border bg-card p-6 shadow-2xl animate-pop-in">
        <div className="flex items-center justify-between pb-3 border-b">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Icone nom="rr:smartphone" className="text-2xl" />
            </span>
            <div>
              <h3 className="text-lg font-bold">Installer Diana Croquettes</h3>
              <p className="text-xs text-muted-foreground">Accès rapide comme une application mobile</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onFermer}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-accent"
          >
            ✕
          </button>
        </div>

        {dejaInstalle ? (
          <div className="py-6 text-center space-y-2">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-success/15 text-success">
              <Icone nom="sr:check-circle" className="text-3xl" />
            </div>
            <p className="font-bold text-base">L'application est déjà installée !</p>
            <p className="text-xs text-muted-foreground">
              Vous profitez déjà de l'expérience plein écran sur votre téléphone.
            </p>
          </div>
        ) : estIos ? (
          <div className="py-4 space-y-4">
            <p className="text-sm">
              Sur <strong>iPhone et iPad (Safari)</strong>, suivez ces 2 étapes simples :
            </p>
            <ol className="space-y-3 text-sm bg-muted/40 p-4 rounded-2xl border">
              <li className="flex items-start gap-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  1
                </span>
                <span>
                  Appuyez sur le bouton <strong>Partager</strong> en bas de Safari (l'icône avec un carré et une flèche vers le haut 📤).
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  2
                </span>
                <span>
                  Faites défiler vers le bas et sélectionnez <strong>« Sur l'écran d'accueil »</strong> (icône ➕).
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  3
                </span>
                <span>
                  Touchez <strong>« Ajouter »</strong> en haut à droite. C'est prêt !
                </span>
              </li>
            </ol>
            <Button onClick={onFermer} variant="gold" className="w-full rounded-xl">
              J'ai compris !
            </Button>
          </div>
        ) : evtInstall ? (
          <div className="py-5 text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Installez Diana Croquettes directement sur votre écran d'accueil Android en un clic pour commander plus vite
              et recevoir les notifications de commande.
            </p>
            <Button onClick={installerAndroid} variant="gold" size="lg" className="w-full rounded-2xl brillance">
              <Icone nom="rr:download" /> Installer maintenant
            </Button>
          </div>
        ) : (
          <div className="py-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Pour installer cette application sur votre téléphone :
            </p>
            <div className="rounded-2xl bg-muted/40 p-4 text-xs space-y-2 border">
              <p>
                1. Ouvrez le menu de votre navigateur (les 3 points verticaux <strong>⋮</strong> en haut à droite).
              </p>
              <p>
                2. Cliquez sur <strong>« Installer l'application »</strong> ou <strong>« Ajouter à l'écran d'accueil »</strong>.
              </p>
            </div>
            <Button onClick={onFermer} variant="outline" className="w-full rounded-xl">
              Fermer
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
