import { createServerFn } from "@tanstack/react-start";

type CreditPayload = {
  email: string;
  age: number;
  loan_amount: number;
  due_amount: number;
  credits_used: number;
  repayment_history: string;
  credit_score?: number;
};

export type AiAnalysis = {
  risk_level: "low" | "medium" | "high";
  summary: string;
  suggestions: string[];
  behavior_feedback: string;
};

export const analyzeCredit = createServerFn({ method: "POST" })
  .inputValidator((input: CreditPayload) => input)
  .handler(async ({ data }): Promise<AiAnalysis> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      throw new Error("LOVABLE_API_KEY is not configured.");
    }

    const systemPrompt = `You are a senior credit risk analyst. Analyze the credit profile and respond ONLY with valid JSON matching this schema:
{
  "risk_level": "low" | "medium" | "high",
  "summary": string (max 220 chars),
  "suggestions": string[] (3-5 actionable items),
  "behavior_feedback": string (max 300 chars)
}
No markdown, no commentary, just JSON.`;

    const userPrompt = `Profile:
- Email: ${data.email}
- Age: ${data.age}
- Loan amount: $${data.loan_amount}
- Outstanding due: $${data.due_amount}
- Credits used (utilization %): ${data.credits_used}
- Repayment history: ${data.repayment_history}
- Computed credit score: ${data.credit_score ?? "n/a"}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      if (res.status === 429) throw new Error("AI rate limit reached. Try again shortly.");
      if (res.status === 402)
        throw new Error("AI credits exhausted. Add credits in workspace settings.");
      throw new Error(`AI request failed (${res.status}): ${text}`);
    }

    const json = await res.json();
    const content: string = json?.choices?.[0]?.message?.content ?? "{}";
    let parsed: AiAnalysis;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error("AI returned invalid JSON.");
    }

    return {
      risk_level: parsed.risk_level ?? "medium",
      summary: parsed.summary ?? "",
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
      behavior_feedback: parsed.behavior_feedback ?? "",
    };
  });
