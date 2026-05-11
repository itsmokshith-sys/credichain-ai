import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardShell } from "@/components/DashboardShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Check, X, Blocks } from "lucide-react";
import { computeBlockHash, GENESIS_HASH } from "@/lib/blockchain";

export const Route = createFileRoute("/admin")({
  component: AdminDashboard,
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

type Block = {
  block_id: number;
  user_email: string;
  credit_data: any;
  previous_hash: string;
  current_hash: string;
  created_at: string;
};

function AdminDashboard() {
  const [pending, setPending] = useState<Req[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    const [{ data: reqs }, { data: blks }] = await Promise.all([
      supabase
        .from("requests")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: true }),
      supabase
        .from("blocks")
        .select("*")
        .order("block_id", { ascending: false })
        .limit(20),
    ]);
    setPending((reqs as Req[]) ?? []);
    setBlocks((blks as Block[]) ?? []);
  };

  useEffect(() => {
    load();
  }, []);

  const reject = async (r: Req) => {
    setBusyId(r.id);
    const { error } = await supabase
      .from("requests")
      .update({ status: "rejected", reviewed_at: new Date().toISOString() })
      .eq("id", r.id);
    setBusyId(null);
    if (error) return toast.error(error.message);
    toast.success("Request rejected");
    load();
  };

  const approve = async (r: Req) => {
    setBusyId(r.id);
    try {
      // Find prev hash for this user
      const { data: lastBlocks } = await supabase
        .from("blocks")
        .select("current_hash")
        .eq("user_email", r.user_email)
        .order("block_id", { ascending: false })
        .limit(1);
      const previous_hash = lastBlocks?.[0]?.current_hash ?? GENESIS_HASH;

      const credit_data = {
        email: r.user_email,
        age: r.age,
        loan_amount: r.loan_amount,
        due_amount: r.due_amount,
        credits_used: r.credits_used,
        repayment_history: r.repayment_history,
      };
      const timestamp = new Date().toISOString();
      const current_hash = await computeBlockHash(credit_data, previous_hash, timestamp);

      const { error: insErr } = await supabase.from("blocks").insert({
        user_email: r.user_email,
        credit_data,
        previous_hash,
        current_hash,
        request_id: r.id,
      });
      if (insErr) throw insErr;

      const { error: updErr } = await supabase
        .from("requests")
        .update({ status: "approved", reviewed_at: timestamp })
        .eq("id", r.id);
      if (updErr) throw updErr;

      toast.success("Approved & block minted");
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Approval failed");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <DashboardShell
      title="Admin Console"
      subtitle="Review submissions and mint blockchain records"
      requiredRole="admin"
    >
      <div className="grid gap-6">
        <Card className="p-6 bg-gradient-card shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg">Pending requests</h2>
            <Badge variant="secondary">{pending.length}</Badge>
          </div>
          {pending.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending requests.</p>
          ) : (
            <div className="space-y-3">
              {pending.map((r) => (
                <div
                  key={r.id}
                  className="border border-border rounded-lg p-4 bg-background/40 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                >
                  <div className="flex-1">
                    <div className="font-medium">{r.user_email}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Age {r.age} · Loan ${r.loan_amount} · Due ${r.due_amount} · Util{" "}
                      {r.credits_used}% · Repayment {r.repayment_history}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Submitted {new Date(r.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busyId === r.id}
                      onClick={() => reject(r)}
                    >
                      <X className="h-4 w-4 mr-1" /> Reject
                    </Button>
                    <Button
                      size="sm"
                      className="bg-gradient-hero"
                      disabled={busyId === r.id}
                      onClick={() => approve(r)}
                    >
                      <Check className="h-4 w-4 mr-1" /> Approve
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-6 bg-gradient-card shadow-card">
          <div className="flex items-center gap-2 mb-4">
            <Blocks className="h-5 w-5 text-accent" />
            <h2 className="font-semibold text-lg">Blockchain ledger (latest 20)</h2>
          </div>
          {blocks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No blocks yet.</p>
          ) : (
            <div className="space-y-2">
              {blocks.map((b) => (
                <div
                  key={b.block_id}
                  className="border border-border rounded-lg p-3 bg-background/40"
                >
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary">Block #{b.block_id}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(b.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-sm mt-1">{b.user_email}</div>
                  <div className="grid sm:grid-cols-2 gap-1 text-xs font-mono text-muted-foreground mt-1">
                    <div>prev: {b.previous_hash.slice(0, 32)}…</div>
                    <div>hash: {b.current_hash.slice(0, 32)}…</div>
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
