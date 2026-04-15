# 💰 Expense Tracker Pro

✨ AI-powered expense tracker with smart insights using Groq LLM + Next.js + Vercel

---

## 🔗 Live Demo

👉 (https://expense-tracker-pro-j84j-ip45jo1kh-kani21-12s-projects.vercel.app/index.html)

---

## 📸 Screenshots

### 🏠 Dashboard

<img width="1915" height="932" alt="image" src="https://github.com/user-attachments/assets/c623ca85-f7c6-4d96-95b7-78367d7b023f" />


### 🤖 AI Chat Insights

<img width="907" height="797" alt="image" src="https://github.com/user-attachments/assets/98ba08af-7d25-46e4-a65a-38ddcfea3ae0" />

<img width="613" height="717" alt="image" src="https://github.com/user-attachments/assets/85d3daa6-c664-461d-8288-4f9b4d74a9c6" />


---

## 🛠️ Tech Stack

* ⚛️ Next.js 15
* 🌐 Vercel (Deployment)
* 🤖 Groq API (LLM)
* 💅 Tailwind CSS
* 🟨 TypeScript

---

## ✨ Features

* 📊 Track daily expenses
* 📈 Category-wise breakdown
* 🤖 AI-powered insights & savings tips
* ⚡ Fast serverless API (Vercel)
* 🧠 Smart prompt-based analysis
* 💬 Chat-based financial assistant

---

## 🧠 AI Chat Capabilities

Ask questions like:

* "Where did I spend the most?"
* "Show my spending insights"
* "How can I save money?"
* "Give tips based on my expenses"

### 🎯 Smart Behavior

* Financial queries → 📊 Structured insights
* Casual chat → 💬 Normal conversation

---

## ⚙️ API Example

### Request

```json
{
  "message": "Where did I spend the most?",
  "transactions": [
    { "amount": 2000, "category": "Bills", "date": "2026-04-15" }
  ]
}
```

### Response

```json
{
  "reply": "📊 Summary: You spent most on Bills..."
}
```

---

## ⚙️ Environment Variables

Create `.env.local`:

```env
GROQ_API_KEY=your_api_key_here
```

---

## 🚀 Run Locally

```bash
git clone https://github.com/Kani21-12/expense-tracker-pro.git
cd expense-tracker-pro
npm install
npm run dev
```

---

## 🚀 Deployment

Deployed using Vercel:

* Connect GitHub repo
* Add environment variable
* Deploy

---

## ⚙️ AI Debugging & Learnings

### 🚨 Issues Faced

* Worked locally but failed on Vercel
* Timeout errors
* Model not found / deprecated

### ✅ Fixes

* Aligned timeout (10s vs 5s)
* Updated Groq model
* Fixed prompt logic

### 🧠 Learnings

* Serverless limits matter
* Prompt design controls output
* Handle API failures properly

---

## 🔮 Future Improvements

* 🔁 Streaming AI responses
* 🧠 Conversation memory
* 📊 Better charts & analytics
* 📱 Mobile UI improvements

---

## 👨‍💻 Author

**Kanmani N**

* GitHub: https://github.com/Kani21-12
* LinkedIn: www.linkedin.com/in/kanmani-natarajan-774510277

---

## ⭐ Support

If you like this project, give it a ⭐ on GitHub!
