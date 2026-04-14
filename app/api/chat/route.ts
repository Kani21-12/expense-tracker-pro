import { NextRequest, NextResponse } from "next/server";

type Transaction = {
  amount: number;
  category: string;
  date: string;
};

type CategorySummary = {
  category: string;
  total: number;
  percentage: number;
};

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL =  "llama-3.3-8b-instant";

function isValidTransaction(input: unknown): input is Transaction {
  if (!input || typeof input !== "object") {
    return false;
  }

  const transaction = input as Record<string, unknown>;

  return (
    typeof transaction.amount === "number" &&
    Number.isFinite(transaction.amount) &&
    typeof transaction.category === "string" &&
    transaction.category.trim().length > 0 &&
    typeof transaction.date === "string" &&
    transaction.date.trim().length > 0
  );
}

function summarizeTransactions(transactions: Transaction[]) {
  const totalSpending = transactions.reduce((sum, item) => sum + item.amount, 0);

  const byCategoryMap = transactions.reduce<Map<string, number>>((acc, item) => {
    const normalizedCategory = item.category.trim() || "Other";
    acc.set(normalizedCategory, (acc.get(normalizedCategory) ?? 0) + item.amount);
    return acc;
  }, new Map());

  const categoryBreakdown: CategorySummary[] = Array.from(byCategoryMap.entries())
    .map(([category, total]) => ({
      category,
      total,
      percentage: totalSpending > 0 ? (total / totalSpending) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);

  const topCategory = categoryBreakdown[0] ?? null;

  return {
    totalSpending,
    categoryBreakdown,
    topCategory,
    transactionCount: transactions.length,
  };
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

type AiJson = {
  summary: string;
  insights: string[];
  savingsTips: string[];
  warning?: string | null;
};

function buildPrompt(message: string, transactions: Transaction[]) {
  const summary = summarizeTransactions(transactions);

  const categoryLines = summary.categoryBreakdown.map((item) => ({
    category: item.category,
    totalInr: Math.round(item.total),
    percentage: Number(item.percentage.toFixed(1)),
  }));

  const recentTransactions = transactions.slice(-50).map((item) => ({
    date: item.date,
    category: item.category,
    amountInr: Math.round(item.amount),
  }));

  return `
You are a concise personal finance assistant for an expense tracker app.
Your job is to analyze the user's actual expenses and give practical, specific answers.

Rules:
- Be smart, crisp, and data-driven.
- Avoid generic advice.
- Use only the provided transaction data.
- Mention concrete categories, amounts, and percentages when helpful.
- Suggest realistic savings actions based on the biggest spend areas.
- Tips must include ₹ amounts or % (at least two tips).

Return STRICT JSON ONLY (no markdown, no extra text) matching this schema:
{
  "summary": "one short line",
  "insights": ["...", "..."],
  "savingsTips": ["...", "..."],
  "warning": "..." | null
}

Expense snapshot:
- Total spending INR: ${Math.round(summary.totalSpending)}
- Transaction count: ${summary.transactionCount}
- Highest spend category: ${
    summary.topCategory
      ? `${summary.topCategory.category} (${formatCurrency(summary.topCategory.total)})`
      : "N/A"
  }

Category breakdown (INR totals + %):
${JSON.stringify(categoryLines)}

Recent transactions (last up to 50):
${JSON.stringify(recentTransactions)}

User question:
${message}
`.trim();
}

function formatAssistantResponse(json: AiJson) {
  const summary = (json.summary || "").trim();
  const insights = Array.isArray(json.insights) ? json.insights : [];
  const tips = Array.isArray(json.savingsTips) ? json.savingsTips : [];
  const warning = (json.warning ?? "").toString().trim();

  const safeSummary = summary || "Here’s what your spending data suggests.";
  const safeInsights = insights.filter(Boolean).slice(0, 6);
  const safeTips = tips.filter(Boolean).slice(0, 6);

  const insightLines =
    safeInsights.length > 0
      ? safeInsights.map((v) => `- ${v}`).join("\n")
      : "- Not enough data for detailed insights yet.";

  const tipLines =
    safeTips.length > 0
      ? safeTips.map((v) => `- ${v}`).join("\n")
      : "- Reduce your highest category by 10% this month (e.g., ₹500–₹1,000) and track the change weekly.";

  const warningBlock = warning ? `\n\n⚠️ Warning:\n${warning}` : "";

  return `📊 Summary:\n${safeSummary}\n\n🔍 Insights:\n${insightLines}\n\n💡 Savings Tips:\n${tipLines}${warningBlock}`;
}

export async function POST(request: NextRequest) {
  try {
    console.log("API HIT");

    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      console.error("❌ GROQ_API_KEY missing");
    
      return NextResponse.json(
        { error: "Missing GROQ_API_KEY" },
        { status: 500 }
      );
    }
    const body = await request.json();
    const message = typeof body?.message === "string" ? body.message.trim() : "";
    const transactionsInput = Array.isArray(body?.transactions) ? body.transactions : [];

    if (!message) {
      return NextResponse.json(
        { error: "The `message` field is required." },
        { status: 400 }
      );
    }

    const transactions = transactionsInput.filter(isValidTransaction);

    if (transactions.length !== transactionsInput.length) {
      return NextResponse.json(
        {
          error:
            "Invalid `transactions` payload. Each item must include numeric `amount`, string `category`, and string `date`.",
        },
        { status: 400 }
      );
    }

    const prompt = buildPrompt(message, transactions);

    const groqResponse = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content: "Return only valid JSON per the provided schema.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
    
      console.error("❌ Groq API error:", errorText);
    
      return NextResponse.json(
        {
          error: "Groq request failed",
          details: errorText,
        },
        { status: 502 }
      );
    }
  

    const data = await groqResponse.json();
    const reply = data?.choices?.[0]?.message?.content;

    if (typeof reply !== "string" || !reply.trim()) {
      return NextResponse.json(
        { error: "Groq returned an empty response." },
        { status: 502 }
      );
    }

    const raw = reply.trim();
    let formatted = raw;
    try {
      const parsed = JSON.parse(raw) as AiJson;
      formatted = formatAssistantResponse(parsed);
    } catch {
      // If the model didn't return valid JSON, fall back to raw text.
      formatted = raw;
    }

    return NextResponse.json({ reply: formatted });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected error while processing chat.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
