"use client";

import { useMemo, useState } from "react";

type Transaction = {
  amount: number;
  category: string;
  date: string;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type ExpenseChatProps = {
  transactions: Transaction[];
};

const SUGGESTED_PROMPTS = [
  "Where did I spend the most?",
  "How can I save money?",
  "Show insights",
];

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function ExpenseChat({ transactions }: ExpenseChatProps) {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: createId(),
      role: "assistant",
      content:
        "Ask about your spending, savings opportunities, or overall patterns. I will analyze your current transactions.",
    },
  ]);

  const hasTransactions = transactions.length > 0;

  const normalizedTransactions = useMemo(
    () =>
      transactions.map((item) => ({
        amount: Number(item.amount) || 0,
        category: item.category,
        date: item.date,
      })),
    [transactions]
  );

  async function sendMessage(customMessage?: string) {
    const nextMessage = (customMessage ?? input).trim();

    if (!nextMessage || isLoading) {
      return;
    }

    if (!hasTransactions) {
      setError("Add a few transactions first so the assistant has data to analyze.");
      return;
    }

    const userMessage: ChatMessage = {
      id: createId(),
      role: "user",
      content: nextMessage,
    };

    setError(null);
    setIsLoading(true);
    setMessages((current) => [...current, userMessage]);
    setInput("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: nextMessage,
          transactions: normalizedTransactions,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Failed to get a response from the assistant.");
      }

      const assistantMessage: ChatMessage = {
        id: createId(),
        role: "assistant",
        content: data.reply,
      };

      setMessages((current) => [...current, assistantMessage]);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong while contacting the assistant.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">AI Expense Chat</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Practical insights based on your current transaction data.
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {transactions.length} transactions
        </span>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {SUGGESTED_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => void sendMessage(prompt)}
            disabled={isLoading}
            className="rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:border-indigo-500 dark:hover:bg-slate-900"
          >
            {prompt}
          </button>
        ))}
      </div>

      <div className="mb-4 max-h-[420px] space-y-3 overflow-y-auto rounded-2xl bg-slate-50 p-3 dark:bg-slate-900">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${
              message.role === "user"
                ? "ml-auto bg-indigo-600 text-white"
                : "bg-white text-slate-800 shadow-sm dark:bg-slate-800 dark:text-slate-100"
            }`}
          >
            {message.content}
          </div>
        ))}

        {isLoading ? (
          <div className="max-w-[90%] rounded-2xl bg-white px-4 py-3 text-sm text-slate-500 shadow-sm dark:bg-slate-800 dark:text-slate-300">
            Analyzing your spending...
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
          {error}
        </div>
      ) : null}

      <div className="flex gap-2">
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void sendMessage();
            }
          }}
          placeholder="Ask about your spending..."
          className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          disabled={isLoading}
        />
        <button
          type="button"
          onClick={() => void sendMessage()}
          disabled={isLoading || !input.trim()}
          className="rounded-xl bg-indigo-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </section>
  );
}
