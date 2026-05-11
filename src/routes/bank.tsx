import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { DashboardShell } from "@/components/DashboardShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Send } from "lucide-react";

export const Route = createFileRoute("/bank")({
  component: BankDashboard,
});

type Req = {
  id: string;
  user_email: string;
  age: number;
  loan_amount: number;
  due_amount: number;
  credits_used: number;
  repayment_history: string;
  status: string;
  created_at: string;
};

const initialForm = {
  user_email: "",
  age: 30,
  loan_amount: 0,
  due_amount: 0,
  credits_used: 0,
  repayment_history: "good",
};

function BankDashboard() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<Req[]>([]);
  const [form, setForm] = useState(initialForm);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("requests")
      .select("*")
      .eq("bank_id", user.id)
      .order("created_at", { ascending: false });
    setRequests((data as Req[]) ?? []);
  };

  useEffect(() => {
    load();
  }, [user?.id]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("requests").insert({
      bank_id: user.id,
      user_email: form.user_email.trim().toLowerCase(),
      age: Number(form.age),
      loan_amount: Number(form.loan_amount),
      due_amount: Number(form.due_amount),
      credits_used: Number(form.credits_used),
      repayment_history: form.repayment_history,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Submission sent for admin approval");
    setForm(initialForm);
    load();
  };

  const statusBadge = (s: string) => {
    if (s === "approved")
      return <Badge className="bg-success/15 text-success-foreground border-success/30">Approved</Badge>;
    if (s === "rejected")
      return <Badge variant="destructive">Rejected</Badge>;
    return <Badge variant="secondary">Pending</Badge>;
  };

  return (
    <DashboardShell
      title="Bank Portal"
      subtitle="Submit credit data for admin approval and on-chain recording"
      requiredRole="bank"
    >
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-6 bg-gradient-card shadow-card">
          <h2 className="font-semibold text-lg mb-4">New credit submission</h2>
          <form onSubmit={submit} className="space-y-3">
            <div>
              <Label htmlFor="email">User email</Label>
              <Input
                id="email"
                type="email"
                required
                value={form.user_email}
                onChange={(e) => setForm({ ...form, user_email: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="age">Age</Label>
                <Input
                  id="age"
                  type="number"
                  required
                  min={18}
                  value={form.age}
                  onChange={(e) => setForm({ ...form, age: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label htmlFor="util">Credits used (%)</Label>
                <Input
                  id="util"
                  type="number"
                  required
                  min={0}
                  max={100}
                  value={form.credits_used}
                  onChange={(e) => setForm({ ...form, credits_used: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="loan">Loan amount</Label>
                <Input
                  id="loan"
                  type="number"
                  required
                  min={0}
                  value={form.loan_amount}
                  onChange={(e) => setForm({ ...form, loan_amount: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label htmlFor="due">Due amount</Label>
                <Input
                  id="due"
                  type="number"
                  required
                  min={0}
                  value={form.due_amount}
                  onChange={(e) => setForm({ ...form, due_amount: Number(e.target.value) })}
                />
              </div>
            </div>
            <div>
              <Label>Repayment history</Label>
              <Select
                value={form.repayment_history}
                onValueChange={(v) => setForm({ ...form, repayment_history: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="excellent">Excellent</SelectItem>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="average">Average</SelectItem>
                  <SelectItem value="poor">Poor</SelectItem>
                  <SelectItem value="bad">Bad</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full bg-gradient-hero" disabled={busy}>
              <Send className="h-4 w-4 mr-1" />
              {busy ? "Submitting…" : "Submit for approval"}
            </Button>
          </form>
        </Card>

        <Card className="p-6 bg-gradient-card shadow-card">
          <h2 className="font-semibold text-lg mb-4">Your submissions</h2>
          {requests.length === 0 ? (
            <p className="text-sm text-muted-foreground">No submissions yet.</p>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-auto">
              {requests.map((r) => (
                <div
                  key={r.id}
                  className="border border-border rounded-lg p-3 bg-background/40"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">{r.user_email}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(r.created_at).toLocaleString()}
                      </div>
                    </div>
                    {statusBadge(r.status)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    Loan ${r.loan_amount} · Due ${r.due_amount} · Util {r.credits_used}% ·{" "}
                    {r.repayment_history}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </DashboardShell>
  );
}
