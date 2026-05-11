import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { DashboardShell } from "@/components/DashboardShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useServerFn } from "@tanstack/react-start";
import { analyzeCredit, type AiAnalysis } from "@/lib/ai.functions";
import { computeCreditScore } from "@/lib/blockchain";
import { toast } from "sonner";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Brain, ShieldCheck, Sparkles, History } from "lucide-react";

export const Route = createFileRoute("/user")({
  component: UserDashboard,
});

type Block = {
  block_id: number;
  user_email: string;
  credit_data: any;
  previous_hash: string;
  current_hash: string;
  created_at: string;
};

function UserDashboard() {
  const { user } = useAuth();
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [analysis, setAnalysis] = useState<AiAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const runAnalysis = useServerFn(analyzeCredit);

  useEffect(() => {
    if (!user?.email) return;
    supabase
      .from("blocks")
      .select("*")
      .eq("user_email", user.email)
      .order("block_id", { ascending: true })
      .then(({ data }) => setBlocks((data as Block[]) ?? []));
  }, [user?.email]);

  const latest = blocks[blocks.length - 1];
  const latestData = latest?.credit_data ?? null;
  const currentScore = latestData ? computeCreditScore(latestData) : null;

  const chartData = blocks.map((b) => ({
    name: `#${b.block_id}`,
    score: computeCreditScore(b.credit_data),
  }));

  const handleAnalyze = async () => {
    if (!latestData) return toast.error("No credit data yet");
    setAnalyzing(true);
    try {
      const result = await runAnalysis({
        data: { ...latestData, credit_score: currentScore ?? undefined },
      });
      setAnalysis(result);
    } catch (e: any) {
      toast.error(e.message ?? "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  const riskColor = (lvl?: string) =>
    lvl === "low"
      ? "bg-success/15 text-success-foreground border-success/30"
      : lvl === "high"
      ? "bg-destructive/15 text-destructive border-destructive/30"
      : "bg-warning/15 text-warning-foreground border-warning/30";

  return (
    <DashboardShell
      title="Your Credit Dashboard"
      subtitle="Blockchain-secured history & AI insights"
      requiredRole="user"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 bg-gradient-card shadow-card lg:col-span-1">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
            <ShieldCheck className="h-4 w-4" /> Current credit score
          </div>
          <div className="text-5xl font-bold bg-gradient-hero bg-clip-text text-transparent">
            {currentScore ?? "—"}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Range 300–850 · derived from latest block
          </p>
        </Card>

        <Card className="p-6 bg-gradient-card shadow-card lg:col-span-2">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-4">
            <History className="h-4 w-4" /> Score over time
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis domain={[300, 850]} stroke="var(--muted-foreground)" fontSize={12} />
                <RTooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="var(--primary-glow)"
                  strokeWidth={3}
                  dot={{ fill: "var(--primary)", r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground py-12 text-center">
              No blockchain records yet. A bank must submit data and an admin must approve.
            </p>
          )}
        </Card>

        <Card className="p-6 bg-gradient-card shadow-card lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-accent" />
              <h2 className="font-semibold text-lg">AI Risk Analysis</h2>
            </div>
            <Button onClick={handleAnalyze} disabled={!latestData || analyzing}>
              <Sparkles className="h-4 w-4 mr-1" />
              {analyzing ? "Analyzing…" : "Run analysis"}
            </Button>
          </div>
          {analysis ? (
            <div className="space-y-4">
              <div>
                <Badge variant="outline" className={riskColor(analysis.risk_level)}>
                  {analysis.risk_level.toUpperCase()} RISK
                </Badge>
                <p className="mt-3 text-sm">{analysis.summary}</p>
              </div>
              <div>
                <h3 className="text-sm font-semibold mb-2">Suggestions</h3>
                <ul className="space-y-1.5">
                  {analysis.suggestions.map((s, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex gap-2">
                      <span className="text-accent">•</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-semibold mb-1">Behavior feedback</h3>
                <p className="text-sm text-muted-foreground">{analysis.behavior_feedback}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Click "Run analysis" to generate AI-powered insights from your latest credit data.
            </p>
          )}
        </Card>

        <Card className="p-6 bg-gradient-card shadow-card lg:col-span-3">
          <h2 className="font-semibold text-lg mb-4">Blockchain history</h2>
          {blocks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No blocks yet.</p>
          ) : (
            <div className="space-y-3">
              {[...blocks].reverse().map((b) => (
                <div
                  key={b.block_id}
                  className="border border-border rounded-lg p-4 bg-background/40"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Block #{b.block_id}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(b.created_at).toLocaleString()}
                      </span>
                    </div>
                    <Badge variant="outline" className="bg-success/10 text-success-foreground">
                      Score {computeCreditScore(b.credit_data)}
                    </Badge>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-2 text-xs font-mono text-muted-foreground">
                    <div>
                      <span className="text-foreground">prev:</span>{" "}
                      {b.previous_hash.slice(0, 24)}…
                    </div>
                    <div>
                      <span className="text-foreground">hash:</span>{" "}
                      {b.current_hash.slice(0, 24)}…
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Loan ${b.credit_data.loan_amount} · Due ${b.credit_data.due_amount} ·
                    Repayment {b.credit_data.repayment_history}
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
