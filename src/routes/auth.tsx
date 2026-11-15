import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Loader2, LogIn } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import logo from "@/assets/diana-logo.png.asset.json";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Connexion vendeur — Diana Croquettes" },
      { name: "description", content: "Accès réservé à l'équipe Diana Croquettes." },
      { property: "og:title", content: "Connexion vendeur — Diana Croquettes" },
      { property: "og:description", content: "Espace de gestion des commandes Diana Croquettes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Connexion,
});

function Connexion() {
  const [email, setEmail] = useState("");
  const [mdp, setMdp] = useState("");
  const [charge, setCharge] = useState(false);
  const navigate = useNavigate();

  async function seConnecter(e: React.FormEvent) {
    e.preventDefault();
    setCharge(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: mdp });
    setCharge(false);
    if (error) {
      toast.error("Email ou mot de passe incorrect");
      return;
    }
    navigate({ to: "/admin", replace: true });
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-5 py-10">
      <Link to="/" className="mb-6 inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> Retour au menu
      </Link>
      <img src={logo.url} alt="Diana Croquettes" width={96} height={96} className="mx-auto h-24 w-24" />
      <h1 className="mt-4 text-center text-3xl font-bold">Espace vendeur</h1>
      <p className="mt-1 text-center text-muted-foreground">Connecte-toi pour gérer les commandes.</p>
      <form onSubmit={seConnecter} className="mt-6 space-y-3">
        <Input
          type="email"
          autoComplete="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="h-12 rounded-xl text-base"
        />
        <Input
          type="password"
          autoComplete="current-password"
          placeholder="Mot de passe"
          value={mdp}
          onChange={(e) => setMdp(e.target.value)}
          required
          className="h-12 rounded-xl text-base"
        />
        <Button type="submit" size="xl" className="w-full" disabled={charge}>
          {charge ? <Loader2 className="!size-5 animate-spin" /> : <LogIn className="!size-5" />}
          Se connecter
        </Button>
      </form>
    </div>
  );
}
