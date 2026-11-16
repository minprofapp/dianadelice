import { useEffect, useState } from "react";
import { Icone } from "@/components/Icone";
import { Button } from "@/components/ui/button";
import { InstallationPwaModal } from "./InstallationPwaModal";

type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<unknown> };

/** Propose d'installer l'appli sur l'écran d'accueil sur tous les téléphones mobiles (Android + iOS) */
export function BoutonInstaller() {
  const [evt, setEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [modalOuverte, setModalOuverte] = useState(false);
  const [estMobile, setEstMobile] = useState(false);

  useEffect(() => {
    // Détecter si on est sur mobile ou tablette
    const ua = window.navigator.userAgent.toLowerCase();
    const isMobileDevice = /android|iphone|ipad|ipod|mobile/.test(ua);
    setEstMobile(isMobileDevice);

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    // Si déjà installée, pas besoin d'afficher le bouton
    if (isStandalone) return;

    const h = (e: Event) => {
      e.preventDefault();
      setEvt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", h);
    return () => window.removeEventListener("beforeinstallprompt", h);
  }, []);

  async function gererClic() {
    if (evt) {
      await evt.prompt();
      setEvt(null);
    } else {
      setModalOuverte(true);
    }
  }

  // Affiche le bouton si l'événement est capturé OU si on est sur mobile (pour guider iOS et autres navigateurs)
  if (!evt && !estMobile) return null;

  return (
    <>
      <Button
        type="button"
        variant="gold"
        size="sm"
        className="brillance rounded-full animate-pop-in text-xs font-bold"
        onClick={gererClic}
        title="Installer l'application sur votre téléphone"
      >
        <Icone nom="rr:download" /> Installer l'appli
      </Button>

      <InstallationPwaModal ouvert={modalOuverte} onFermer={() => setModalOuverte(false)} />
    </>
  );
}
