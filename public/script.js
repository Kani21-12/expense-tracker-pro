/**
 * Expense Tracker Pro — state + localStorage + Chart.js
 */

const STORAGE_KEY = "expense-tracker-pro-v1";
const THEME_KEY = "expense-tracker-pro-theme";
const CURRENCY_KEY = "expense-tracker-pro-currency";

const currencyConfig = {
  INR: { locale: "en-IN", currency: "INR" },
  USD: { locale: "en-US", currency: "USD" },
  EUR: { locale: "de-DE", currency: "EUR" },
};

const exchangeRates = {
  INR: 1,
  USD: 0.012,
  EUR: 0.011,
};

function convertAmount(amountInINR) {
  const v = Number(amountInINR) || 0;
  const rate = exchangeRates[selectedCurrency] ?? 1;
  return v * rate;
}

const CATEGORY_META = {
  Food: { emoji: "🍔", border: "border-l-emerald-500", chart: "#10b981" },
  Travel: { emoji: "✈️", border: "border-l-sky-500", chart: "#0ea5e9" },
  Bills: { emoji: "📄", border: "border-l-amber-500", chart: "#f59e0b" },
  Other: { emoji: "📌", border: "border-l-violet-500", chart: "#8b5cf6" },
};

let expenses = [];
let monthlyBudget = 0;
let editingId = null;
let chartInstance = null;
let selectedCurrency = "INR";

const els = {
  form: document.getElementById("expense-form"),
  amount: document.getElementById("amount"),
  category: document.getElementById("category"),
  date: document.getElementById("date"),
  note: document.getElementById("note"),
  submitBtn: document.getElementById("submit-btn"),
  formTitle: document.getElementById("form-title"),
  cancelEditBtn: document.getElementById("cancel-edit-btn"),
  filterMonth: document.getElementById("filter-month"),
  filterCategory: document.getElementById("filter-category"),
  searchNote: document.getElementById("search-note"),
  exportCsvBtn: document.getElementById("export-csv-btn"),
  currencySelect: document.getElementById("currency-select"),
  budgetCurrencySymbol: document.getElementById("budget-currency-symbol"),
  darkModeToggle: document.getElementById("dark-mode-toggle"),
  darkModeIcon: document.getElementById("dark-mode-icon"),
  darkModeLabel: document.getElementById("dark-mode-label"),
  expenseList: document.getElementById("expense-list"),
  emptyState: document.getElementById("empty-state"),
  summaryTotal: document.getElementById("summary-total"),
  summaryRemaining: document.getElementById("summary-remaining"),
  summaryTotalHint: document.getElementById("summary-total-hint"),
  summaryRemainingHint: document.getElementById("summary-remaining-hint"),
  chartSubtitle: document.getElementById("chart-subtitle"),
  budgetInput: document.getElementById("budget-input"),
  chartCanvas: document.getElementById("spending-chart"),
};

function formatCurrency(amountInINR) {
  const converted = convertAmount(amountInINR);
  const config = currencyConfig[selectedCurrency] || currencyConfig.INR;
  return new Intl.NumberFormat(config.locale, {
    style: "currency",
    currency: config.currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(converted);
}

function setCurrency(next) {
  const candidate = String(next || "").toUpperCase();
  selectedCurrency = currencyConfig[candidate] ? candidate : "INR";
  try {
    localStorage.setItem(CURRENCY_KEY, selectedCurrency);
  } catch (_) {}
  syncCurrencyUi();
  renderExpenses();
}

function loadCurrencyPreference() {
  try {
    const v = localStorage.getItem(CURRENCY_KEY);
    if (v && currencyConfig[String(v).toUpperCase()]) {
      selectedCurrency = String(v).toUpperCase();
    }
  } catch (_) {}
}

function syncCurrencyUi() {
  if (els.currencySelect) els.currencySelect.value = selectedCurrency;
  if (els.budgetCurrencySymbol) {
    // Inputs remain base currency INR.
    els.budgetCurrencySymbol.textContent = "₹";
  }
}

function getMonthKey(isoDate) {
  const d = new Date(isoDate + "T12:00:00");
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getSelectedMonthKey() {
  const v = els.filterMonth && els.filterMonth.value;
  return v || currentMonthKey();
}

function formatMonthLabel(ym) {
  if (!ym || ym.length < 7) return "";
  const [y, m] = ym.split("-").map(Number);
  if (!y || !m) return ym;
  const d = new Date(y, m - 1, 1);
  return d.toLocaleString(undefined, { month: "long", year: "numeric" });
}

/** Expenses in the selected calendar month (budget / summary scope). */
function getExpensesInSelectedMonth() {
  const key = getSelectedMonthKey();
  return expenses.filter((e) => getMonthKey(e.date) === key);
}

/**
 * Combined filters: month + category + note search (case-insensitive).
 * Used for list, chart, and CSV export.
 */
function filterExpenses() {
  const monthKey = getSelectedMonthKey();
  const cat = els.filterCategory.value;
  const q = (els.searchNote.value || "").trim().toLowerCase();

  return expenses.filter((e) => {
    if (getMonthKey(e.date) !== monthKey) return false;
    if (cat !== "All" && e.category !== cat) return false;
    if (q) {
      const note = (e.note || "").toLowerCase();
      if (!note.includes(q)) return false;
    }
    return true;
  });
}

function isDarkMode() {
  return document.documentElement.classList.contains("dark");
}

function toggleDarkMode() {
  const root = document.documentElement;
  const next = !root.classList.contains("dark");
  root.classList.toggle("dark", next);
  try {
    localStorage.setItem(THEME_KEY, next ? "dark" : "light");
  } catch (_) {}
  syncDarkModeToggleUi();
  applyChartTheme();
}

function syncDarkModeToggleUi() {
  const dark = isDarkMode();
  els.darkModeToggle.setAttribute("aria-pressed", dark ? "true" : "false");
  els.darkModeIcon.textContent = dark ? "☀️" : "🌙";
  els.darkModeLabel.textContent = dark ? "Light" : "Dark";
}

function applyChartTheme() {
  if (!chartInstance) return;
  const dark = isDarkMode();
  const text = dark ? "#cbd5e1" : "#475569";
  const border = dark ? "#1e293b" : "#ffffff";
  chartInstance.options.plugins.legend.labels.color = text;
  if (chartInstance.data.datasets[0]) {
    chartInstance.data.datasets[0].borderColor = border;
  }
  chartInstance.update();
}

function saveToLocalStorage() {
  const payload = {
    expenses,
    monthlyBudget: Number(els.budgetInput.value) || 0,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function loadFromLocalStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      expenses = [];
      monthlyBudget = 0;
      return;
    }
    const data = JSON.parse(raw);
    expenses = Array.isArray(data.expenses) ? data.expenses : [];
    monthlyBudget = typeof data.monthlyBudget === "number" ? data.monthlyBudget : 0;
  } catch {
    expenses = [];
    monthlyBudget = 0;
  }
}

function getSelectedMonthTotalSpending() {
  return getExpensesInSelectedMonth().reduce((sum, e) => sum + Number(e.amount || 0), 0);
}

function updateSummaryHints() {
  const label = formatMonthLabel(getSelectedMonthKey());
  els.summaryTotalHint.textContent = label ? `All categories · ${label}` : "Selected month";
  els.summaryRemainingHint.textContent = label
    ? `Budget minus spending in ${label}`
    : "Budget minus selected month";
}

function updateChartSubtitle() {
  const parts = [];
  parts.push(formatMonthLabel(getSelectedMonthKey()) || "Selected month");
  if (els.filterCategory.value !== "All") parts.push(els.filterCategory.value);
  if ((els.searchNote.value || "").trim()) parts.push("search applied");
  els.chartSubtitle.textContent = `Category totals: ${parts.join(" · ")}.`;
}

function updateSummary() {
  const monthSpend = getSelectedMonthTotalSpending();
  const budget = Number(els.budgetInput.value) || 0;
  const remaining = budget - monthSpend;

  els.summaryTotal.textContent = formatCurrency(monthSpend);
  els.summaryRemaining.textContent = formatCurrency(remaining);
  els.summaryRemaining.classList.remove("text-emerald-600", "text-rose-600", "text-slate-900", "dark:text-slate-100");
  if (budget <= 0) {
    els.summaryRemaining.classList.add("text-slate-900", "dark:text-slate-100");
  } else if (remaining < 0) {
    els.summaryRemaining.classList.add("text-rose-600");
  } else {
    els.summaryRemaining.classList.add("text-emerald-600");
  }
  updateSummaryHints();
}

function totalsByCategory(list) {
  const acc = { Food: 0, Travel: 0, Bills: 0, Other: 0 };
  list.forEach((e) => {
    const c = acc[e.category] !== undefined ? e.category : "Other";
    acc[c] += Number(e.amount || 0);
  });
  return acc;
}

function updateChart() {
  const list = filterExpenses();
  const totals = totalsByCategory(list);
  const labels = Object.keys(CATEGORY_META);
  const data = labels.map((k) => totals[k] || 0);
  const colors = labels.map((k) => CATEGORY_META[k].chart);
  const legendColor = isDarkMode() ? "#cbd5e1" : "#475569";
  const sliceBorder = isDarkMode() ? "#1e293b" : "#ffffff";

  if (chartInstance) {
    chartInstance.data.labels = labels.map((k) => `${CATEGORY_META[k].emoji} ${k}`);
    chartInstance.data.datasets[0].data = data;
    chartInstance.data.datasets[0].backgroundColor = colors;
    chartInstance.data.datasets[0].borderColor = sliceBorder;
    chartInstance.options.plugins.legend.labels.color = legendColor;
    chartInstance.update();
    return;
  }

  chartInstance = new Chart(els.chartCanvas, {
    type: "pie",
    data: {
      labels: labels.map((k) => `${CATEGORY_META[k].emoji} ${k}`),
      datasets: [
        {
          data,
          backgroundColor: colors,
          borderWidth: 2,
          borderColor: sliceBorder,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            padding: 14,
            usePointStyle: true,
            font: { family: "'DM Sans', sans-serif", size: 12 },
            color: legendColor,
          },
        },
        tooltip: {
          callbacks: {
            label(ctx) {
              const v = ctx.raw || 0;
              return ` ${ctx.label}: ${formatCurrency(v)}`;
            },
          },
        },
      },
    },
  });
}

function getEmptyStateMessage() {
  if (expenses.length === 0) {
    return "No expenses yet. Add your first expense above to see it here.";
  }
  const inMonth = getExpensesInSelectedMonth();
  if (inMonth.length === 0) {
    const label = formatMonthLabel(getSelectedMonthKey());
    return label
      ? `No data for ${label}. Try another month or add an expense dated in this month.`
      : "No data for this month.";
  }
  if (filterExpenses().length === 0) {
    return "No expenses match your category or note search for this month. Adjust filters to see results.";
  }
  return "";
}

function renderExpenses() {
  const list = filterExpenses();
  list.sort((a, b) => new Date(b.date) - new Date(a.date));

  els.expenseList.innerHTML = "";

  if (list.length === 0) {
    els.emptyState.classList.remove("hidden");
    els.emptyState.textContent = getEmptyStateMessage();
    updateChartSubtitle();
    updateChart();
    updateSummary();
    return;
  }

  els.emptyState.classList.add("hidden");

  const frag = document.createDocumentFragment();
  list.forEach((e) => {
    const meta = CATEGORY_META[e.category] || CATEGORY_META.Other;
    const card = document.createElement("article");
    card.className =
      `group rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm transition duration-200 ` +
      `hover:shadow-md hover:shadow-slate-200/60 border-l-4 ${meta.border} ` +
      `dark:border-slate-700/80 dark:bg-slate-900 dark:hover:shadow-black/30`;

    card.innerHTML = `
      <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-baseline gap-2">
            <span class="text-xl font-bold tabular-nums text-slate-900 dark:text-white">${formatCurrency(e.amount)}</span>
            <span class="text-sm font-medium text-slate-600 dark:text-slate-300">${meta.emoji} ${escapeHtml(e.category)}</span>
          </div>
          <p class="mt-1 text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">${escapeHtml(e.date)}</p>
          ${
            e.note
              ? `<p class="mt-2 text-sm text-slate-600 dark:text-slate-300">${escapeHtml(e.note)}</p>`
              : `<p class="mt-2 text-sm italic text-slate-400 dark:text-slate-500">No note</p>`
          }
        </div>
        <div class="flex shrink-0 gap-2 sm:flex-col sm:items-end">
          <button type="button" data-action="edit" data-id="${e.id}"
            class="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 active:scale-[0.98] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-indigo-500/50 dark:hover:bg-slate-700 dark:hover:text-white">
            Edit
          </button>
          <button type="button" data-action="delete" data-id="${e.id}"
            class="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:border-rose-200 hover:bg-rose-50 active:scale-[0.98] dark:border-slate-600 dark:bg-slate-800 dark:text-rose-400 dark:hover:border-rose-500/40 dark:hover:bg-rose-950/40">
            Delete
          </button>
        </div>
      </div>
    `;
    frag.appendChild(card);
  });

  els.expenseList.appendChild(frag);
  updateChartSubtitle();
  updateChart();
  updateSummary();
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str == null ? "" : String(str);
  return div.innerHTML;
}

function csvEscape(value) {
  const s = value == null ? "" : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function exportToCSV() {
  const rows = filterExpenses().slice().sort((a, b) => new Date(b.date) - new Date(a.date));
  const header = ["Amount", "Category", "Date", "Note"];
  const lines = [header.join(",")];
  rows.forEach((e) => {
    lines.push(
      [
        csvEscape(Number(e.amount).toFixed(2)),
        csvEscape(e.category),
        csvEscape(e.date),
        csvEscape(e.note || ""),
      ].join(",")
    );
  });
  const blob = new Blob([lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const ym = getSelectedMonthKey().replace(/-/g, "");
  a.href = url;
  a.download = `expenses-${ym}.csv`;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function clearForm() {
  els.form.reset();
  setDefaultDate();
  editingId = null;
  els.submitBtn.textContent = "Add expense";
  els.formTitle.textContent = "Add Expense";
  els.cancelEditBtn.classList.add("hidden");
}

function setDefaultDate() {
  const t = new Date();
  els.date.value = t.toISOString().slice(0, 10);
}

function addExpense(payload) {
  const item = {
    id: Date.now(),
    amount: Number(payload.amount),
    category: payload.category,
    date: payload.date,
    note: (payload.note || "").trim(),
  };
  expenses.push(item);
  saveToLocalStorage();
  renderExpenses();
}

function deleteExpense(id) {
  if (!confirm("Delete this expense? This cannot be undone.")) return;
  expenses = expenses.filter((e) => e.id !== id);
  if (editingId === id) clearForm();
  saveToLocalStorage();
  renderExpenses();
}

function editExpense(id, payload) {
  const idx = expenses.findIndex((e) => e.id === id);
  if (idx === -1) return;
  expenses[idx] = {
    ...expenses[idx],
    amount: Number(payload.amount),
    category: payload.category,
    date: payload.date,
    note: (payload.note || "").trim(),
  };
  editingId = null;
  clearForm();
  saveToLocalStorage();
  renderExpenses();
}

function startEdit(id) {
  const e = expenses.find((x) => x.id === id);
  if (!e) return;
  editingId = id;
  els.amount.value = e.amount;
  els.category.value = e.category;
  els.date.value = e.date;
  els.note.value = e.note || "";
  els.submitBtn.textContent = "Update expense";
  els.formTitle.textContent = "Edit Expense";
  els.cancelEditBtn.classList.remove("hidden");
  els.amount.focus();
}

function initListeners() {
  els.form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const payload = {
      amount: els.amount.value,
      category: els.category.value,
      date: els.date.value,
      note: els.note.value,
    };
    if (editingId != null) {
      editExpense(editingId, payload);
    } else {
      addExpense(payload);
      clearForm();
    }
  });

  els.cancelEditBtn.addEventListener("click", () => {
    clearForm();
  });

  const refetch = () => renderExpenses();

  els.filterMonth.addEventListener("change", refetch);
  els.filterCategory.addEventListener("change", refetch);
  els.searchNote.addEventListener("input", refetch);

  els.exportCsvBtn.addEventListener("click", () => exportToCSV());

  if (els.currencySelect) {
    els.currencySelect.addEventListener("change", () => setCurrency(els.currencySelect.value));
  }

  els.darkModeToggle.addEventListener("click", () => toggleDarkMode());

  els.budgetInput.addEventListener("input", () => {
    updateSummary();
  });
  els.budgetInput.addEventListener("change", () => {
    saveToLocalStorage();
    updateSummary();
  });

  els.expenseList.addEventListener("click", (ev) => {
    const btn = ev.target.closest("button[data-action]");
    if (!btn) return;
    const id = Number(btn.dataset.id);
    const action = btn.dataset.action;
    if (action === "delete") deleteExpense(id);
    if (action === "edit") startEdit(id);
  });
}

function init() {
  loadCurrencyPreference();
  loadFromLocalStorage();
  els.budgetInput.value = monthlyBudget > 0 ? String(monthlyBudget) : "";
  els.filterMonth.value = currentMonthKey();
  setDefaultDate();
  syncCurrencyUi();
  syncDarkModeToggleUi();
  initListeners();
  renderExpenses();
}

init();

/**
 * Minimal AI Chatbot integration (non-invasive).
 * - Injects a floating chat UI
 * - Sends current `expenses` to `/api/chat`
 * - Does not alter existing expense logic
 */
(function initExpenseChatbot() {
  const CHAT_KEY = "expense-tracker-pro-chat-open";

  function safeJsonParse(text) {
    try {
      return JSON.parse(text);
    } catch (_) {
      return null;
    }
  }

  function getTransactionsForChat() {
    // Use base-currency INR amounts as stored.
    return (Array.isArray(expenses) ? expenses : [])
      .filter((e) => e && typeof e === "object")
      .map((e) => ({
        amount: Number(e.amount || 0),
        category: String(e.category || "Other"),
        date: String(e.date || ""),
      }))
      .filter((t) => Number.isFinite(t.amount) && t.date);
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function scrollToBottom(container) {
    container.scrollTop = container.scrollHeight;
  }

  function appendMessage(list, role, content) {
    const bubble =
      role === "user"
        ? el(
            "div",
            "ml-auto max-w-[85%] whitespace-pre-wrap rounded-2xl bg-indigo-600 px-3 py-2 text-sm text-white shadow-sm",
            content
          )
        : el(
            "div",
            "max-w-[85%] whitespace-pre-wrap rounded-2xl bg-white px-3 py-2 text-sm text-slate-800 shadow-sm dark:bg-slate-800 dark:text-slate-100",
            content
          );
    list.appendChild(bubble);
    scrollToBottom(list);
  }

  function setOpen(root, open) {
    root.dataset.open = open ? "true" : "false";
    try {
      localStorage.setItem(CHAT_KEY, open ? "1" : "0");
    } catch (_) {}
  }

  function loadOpenPreference() {
    try {
      return localStorage.getItem(CHAT_KEY) === "1";
    } catch (_) {
      return false;
    }
  }

  // Root container
  const root = el("div", "fixed bottom-4 right-4 z-50");
  root.id = "expense-chatbot";

  // Toggle button
  const toggleBtn = el(
    "button",
    "inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-950",
    "AI Chat"
  );
  const toggleHint = el("span", "text-base", "🤖");
  toggleBtn.prepend(toggleHint);

  // Panel
  const panel = el(
    "div",
    "mt-3 hidden w-[min(92vw,380px)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-900"
  );

  const header = el(
    "div",
    "flex items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800"
  );
  const titleWrap = el("div", "min-w-0");
  titleWrap.appendChild(el("div", "text-sm font-semibold text-slate-900 dark:text-white", "Expense Assistant"));
  titleWrap.appendChild(
    el("div", "text-xs text-slate-500 dark:text-slate-300", "Insights from your current transactions")
  );
  const closeBtn = el(
    "button",
    "rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-700",
    "Close"
  );
  header.appendChild(titleWrap);
  header.appendChild(closeBtn);

  const messages = el("div", "max-h-[360px] space-y-2 overflow-y-auto bg-white p-3 dark:bg-slate-900");
  const footer = el("div", "border-t border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900");

  const errorBox = el(
    "div",
    "mb-2 hidden rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200"
  );

  const row = el("div", "flex gap-2");
  const input = el(
    "input",
    "flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white",
    null
  );
  input.type = "text";
  input.placeholder = "Ask: Where did I spend the most?";

  const sendBtn = el(
    "button",
    "rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50",
    "Send"
  );

  row.appendChild(input);
  row.appendChild(sendBtn);
  footer.appendChild(errorBox);
  footer.appendChild(row);

  panel.appendChild(header);
  panel.appendChild(messages);
  panel.appendChild(footer);

  root.appendChild(toggleBtn);
  root.appendChild(panel);
  document.body.appendChild(root);

  appendMessage(
    messages,
    "assistant",
    "Ask about your spending (e.g., “Where did I spend the most?”, “Show insights”, “How can I save money?”)."
  );

  let isLoading = false;

  function setError(msg) {
    if (!msg) {
      errorBox.classList.add("hidden");
      errorBox.textContent = "";
      return;
    }
    errorBox.textContent = msg;
    errorBox.classList.remove("hidden");
  }

  function setLoading(next) {
    isLoading = next;
    sendBtn.disabled = next;
    input.disabled = next;
    if (next) {
      sendBtn.textContent = "…";
    } else {
      sendBtn.textContent = "Send";
    }
  }

  async function send() {
    const text = (input.value || "").trim();
    if (!text || isLoading) return;

    const transactions = getTransactionsForChat();
    if (transactions.length === 0) {
      setError("Add at least one expense so I can analyze your spending.");
      return;
    }

    setError(null);
    appendMessage(messages, "user", text);
    input.value = "";
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, transactions }),
      });

      const raw = await res.text();
      const data = safeJsonParse(raw);

      if (!res.ok) {
        const msg = (data && data.error) || `Chat failed (${res.status}).`;
        throw new Error(msg);
      }

      const reply = data && typeof data.reply === "string" ? data.reply : raw;
      appendMessage(messages, "assistant", String(reply || "").trim() || "No response.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong contacting the assistant.";
      setError(msg);
      appendMessage(messages, "assistant", "Sorry — I couldn't reach the assistant right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function openPanel() {
    panel.classList.remove("hidden");
    toggleBtn.classList.add("hidden");
    setOpen(root, true);
    setTimeout(() => input.focus(), 0);
  }

  function closePanel() {
    panel.classList.add("hidden");
    toggleBtn.classList.remove("hidden");
    setOpen(root, false);
  }

  toggleBtn.addEventListener("click", openPanel);
  closeBtn.addEventListener("click", closePanel);
  sendBtn.addEventListener("click", send);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void send();
    }
  });

  if (loadOpenPreference()) {
    openPanel();
  }
})();
