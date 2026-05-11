import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth, type AppRole } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Link2 } from "lucide-react";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user, role, loading } = useAuth();
  const [busy, setBusy] = useState(false);

  // login state
  const [li_email, setLiEmail] = useState("");
  const [li_password, setLiPassword] = useState("");

  // signup state
  const [su_email, setSuEmail] = useState("");
  const [su_password, setSuPassword] = useState("");
  const [su_name, setSuName] = useState("");
  const [su_role, setSuRole] = useState<AppRole>("user");

  useEffect(() => {
    if (!loading && user && role) {
      navigate({ to: `/${role}` });
    }
  }, [loading, user, role, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: li_email,
      password: li_password,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back");
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const redirectUrl = `${window.location.origin}/`;
    const { data, error } = await supabase.auth.signUp({
      email: su_email,
      password: su_password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { full_name: su_name },
      },
    });
    if (error) {
      setBusy(false);
      return toast.error(error.message);
    }
    const uid = data.user?.id;
    if (uid) {
      const { error: roleErr } = await supabase
        .from("user_roles")
        .insert({ user_id: uid, role: su_role });
      if (roleErr) {
        setBusy(false);
        return toast.error(`Account created but role assignment failed: ${roleErr.message}`);
      }
    }
    setBusy(false);
    toast.success("Account created. You can now sign in.");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border/50">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="bg-gradient-hero h-9 w-9 rounded-lg flex items-center justify-center shadow-glow">
              <Link2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg tracking-tight">ChainCredit</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <Card className="w-full max-w-md p-8 bg-gradient-card border-border/50 shadow-elegant">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold">Welcome to ChainCredit</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Sign in or create an account to continue
            </p>
          </div>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="login">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Sign up</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-6">
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label htmlFor="li-email">Email</Label>
                  <Input
                    id="li-email"
                    type="email"
                    required
                    value={li_email}
                    onChange={(e) => setLiEmail(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="li-password">Password</Label>
                  <Input
                    id="li-password"
                    type="password"
                    required
                    value={li_password}
                    onChange={(e) => setLiPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full bg-gradient-hero" disabled={busy}>
                  {busy ? "Signing in…" : "Sign in"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="mt-6">
              <form onSubmit={handleSignup} className="space-y-4">
                <div>
                  <Label htmlFor="su-name">Full name</Label>
                  <Input
                    id="su-name"
                    required
                    value={su_name}
                    onChange={(e) => setSuName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="su-email">Email</Label>
                  <Input
                    id="su-email"
                    type="email"
                    required
                    value={su_email}
                    onChange={(e) => setSuEmail(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="su-password">Password</Label>
                  <Input
                    id="su-password"
                    type="password"
                    required
                    minLength={6}
                    value={su_password}
                    onChange={(e) => setSuPassword(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Account type</Label>
                  <Select value={su_role} onValueChange={(v) => setSuRole(v as AppRole)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">Individual (User)</SelectItem>
                      <SelectItem value="bank">Bank</SelectItem>
                      <SelectItem value="admin">Admin / Regulator</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full bg-gradient-hero" disabled={busy}>
                  {busy ? "Creating…" : "Create account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </Card>
      </main>
    </div>
  );
}
