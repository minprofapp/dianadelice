import { useEffect, useState } from "react";
import { Icone } from "@/components/Icone";
import { Button } from "@/components/ui/button";

type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<unknown> };

/** Propose d'installer l'appli sur l'écran d'accueil quand le téléphone le permet. */
export function BoutonInstaller() {
  const [evt, setEvt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const h = (e: Event) => {
      e.preventDefault();
      setEvt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", h);
    return () => window.removeEventListener("beforeinstallprompt", h);
  }, []);

  if (!evt) return null;
  return (
    <Button
      type="button"
      variant="gold"
      size="sm"
      className="brillance rounded-full animate-pop-in"
      onClick={async () => {
        await evt.prompt();
        setEvt(null);
      }}
    >
      <Icone nom="rr:download" /> Installer l'appli
    </Button>
  );
}
