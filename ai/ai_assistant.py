from openai import OpenAI
import os
from dotenv import load_dotenv
import json
from collections import defaultdict

def category_totals(expenses):
    totals = defaultdict(int)
    for e in expenses:
        totals[e["category"]] += e["amount"]
    return totals
load_dotenv()

client = OpenAI(
    api_key=os.getenv("GROQ_API_KEY"),
    base_url="https://api.groq.com/openai/v1"
)

# Load expenses
def load_expenses():
    with open("expenses.json", "r") as f:
        return json.load(f)

# Format expenses
def format_expenses(expenses):
    return "\n".join(
        [f"{e['date']} - {e['category']} - ₹{e['amount']}" for e in expenses]
    )

# Ask AI
def ask_ai(question):
    expenses = load_expenses()
    formatted = format_expenses(expenses)
    totals = category_totals(expenses)

summary = "\n".join(
    [f"{cat}: ₹{amt}" for cat, amt in totals.items()]
)

    messages = [
        {
            "role": "system",
            "content": "You are an AI Expense Assistant. Analyze expenses and give useful financial insights."
        },
        {
            "role": "user",
            "content": f"""
Here are my expenses:
{formatted}

Category totals:
{summary}

Question: {question}
"""
        }
    ]

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=messages
    )

    return response.choices[0].message.content