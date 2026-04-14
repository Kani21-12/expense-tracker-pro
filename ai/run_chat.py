print("Chatbot started... Type 'exit' to quit")

from ai.ai_assistant import ask_ai

while True:
    user_input = input("You: ")
    
    if user_input.lower() == "exit":
        break

    response = ask_ai(user_input)
    print("Bot:", response)