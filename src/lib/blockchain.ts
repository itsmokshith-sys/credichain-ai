// Browser-friendly SHA-256 using Web Crypto API.
export async function sha256(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const hashBuf = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const GENESIS_HASH = "0".repeat(64);

export async function computeBlockHash(
  creditData: Record<string, unknown>,
  previousHash: string,
  timestamp: string,
): Promise<string> {
  const payload = JSON.stringify(creditData) + previousHash + timestamp;
  return sha256(payload);
}

export type CreditData = {
  email: string;
  age: number;
  loan_amount: number;
  due_amount: number;
  credits_used: number;
  repayment_history: string;
};

// Simple deterministic credit-score derivation (300-850 scale).
export function computeCreditScore(d: CreditData): number {
  const repaymentMap: Record<string, number> = {
    excellent: 100,
    good: 80,
    average: 55,
    poor: 25,
    bad: 10,
  };
  const repayScore = repaymentMap[d.repayment_history.toLowerCase()] ?? 50;
  const utilization = d.loan_amount > 0 ? d.due_amount / d.loan_amount : 0;
  const utilScore = Math.max(0, 100 - utilization * 100);
  const usageScore = Math.max(0, 100 - Math.min(100, d.credits_used));
  const raw = repayScore * 0.5 + utilScore * 0.3 + usageScore * 0.2;
  return Math.round(300 + (raw / 100) * 550);
}
