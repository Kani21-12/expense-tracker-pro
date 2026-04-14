import { ExpenseChat } from "@/components/expense-chat";

const transactions = [
  { amount: 450, category: "Food", date: "2026-04-02" },
  { amount: 2200, category: "Travel", date: "2026-04-04" },
  { amount: 1800, category: "Bills", date: "2026-04-08" },
  { amount: 650, category: "Food", date: "2026-04-09" },
  { amount: 400, category: "Other", date: "2026-04-10" },
];

export default function ChatDemoPage() {
  return (
    <main className="mx-auto max-w-4xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Expense Chat Demo</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Replace the sample array with transactions from your app state, database, or store.
        </p>
      </div>

      <ExpenseChat transactions={transactions} />
    </main>
  );
}
