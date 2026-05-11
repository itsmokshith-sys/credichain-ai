import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Shield, Link2, Brain, TrendingUp, Lock, Zap } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user && role) {
      navigate({ to: `/${role}` });
    }
  }, [loading, user, role, navigate]);

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-10 bg-background/80">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-hero h-9 w-9 rounded-lg flex items-center justify-center shadow-glow">
              <Link2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg tracking-tight">ChainCredit</span>
          </div>
          <Link to="/auth">
            <Button>Sign in</Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-6 pt-20 pb-24 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground mb-6">
          <span className="bg-accent h-1.5 w-1.5 rounded-full animate-pulse" />
          Powered by Blockchain + Lovable AI
        </div>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight max-w-4xl mx-auto leading-[1.05]">
          Immutable credit records,{" "}
          <span className="bg-gradient-hero bg-clip-text text-transparent">
            intelligent risk insights
          </span>
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
          A blockchain-secured credit information platform with AI-powered risk
          analysis for users, banks, and regulators.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link to="/auth">
            <Button size="lg" className="bg-gradient-hero shadow-elegant text-base px-8">
              Get started
            </Button>
          </Link>
          <a href="#features">
            <Button size="lg" variant="outline" className="text-base px-8">
              Learn more
            </Button>
          </a>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="container mx-auto px-6 pb-24">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: Shield,
              title: "Tamper-proof records",
              desc: "SHA-256 hashed blocks form an immutable chain of credit history.",
            },
            {
              icon: Brain,
              title: "AI risk analysis",
              desc: "Lovable AI evaluates loans, repayment, and utilization in seconds.",
            },
            {
              icon: TrendingUp,
              title: "Track improvements",
              desc: "Watch your credit score evolve as positive history accumulates.",
            },
            {
              icon: Lock,
              title: "Role-based access",
              desc: "Separate dashboards for users, banks, and admin reviewers.",
            },
            {
              icon: Zap,
              title: "Real-time approval",
              desc: "Banks submit, admins approve, blocks are minted instantly.",
            },
            {
              icon: Link2,
              title: "Cryptographic linking",
              desc: "Every block references the previous hash — no rewriting history.",
            },
          ].map((f, i) => (
            <Card
              key={i}
              className="p-6 bg-gradient-card border-border/50 shadow-card hover:shadow-elegant transition-all"
            >
              <div className="bg-accent/10 h-11 w-11 rounded-lg flex items-center justify-center mb-4">
                <f.icon className="h-5 w-5 text-accent-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      <footer className="border-t border-border/50 py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} ChainCredit. Built with Lovable.
      </footer>
    </div>
  );
}
