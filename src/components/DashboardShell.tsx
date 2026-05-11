import { useNavigate, Link } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { useAuth, type AppRole } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Link2, LogOut } from "lucide-react";

export function DashboardShell({
  title,
  subtitle,
  requiredRole,
  children,
}: {
  title: string;
  subtitle?: string;
  requiredRole: AppRole;
  children: ReactNode;
}) {
  const { user, role, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    if (role && role !== requiredRole) {
      navigate({ to: `/${role}` });
    }
  }, [user, role, loading, requiredRole, navigate]);

  if (loading || !user || role !== requiredRole) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card/50 backdrop-blur sticky top-0 z-10">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="bg-gradient-hero h-9 w-9 rounded-lg flex items-center justify-center shadow-glow">
              <Link2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg tracking-tight">ChainCredit</span>
            <span className="ml-2 text-xs uppercase tracking-wider text-muted-foreground border border-border rounded px-2 py-0.5">
              {requiredRole}
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {user.email}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                await signOut();
                navigate({ to: "/" });
              }}
            >
              <LogOut className="h-4 w-4 mr-1" /> Sign out
            </Button>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          {subtitle && <p className="text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        {children}
      </main>
    </div>
  );
}
