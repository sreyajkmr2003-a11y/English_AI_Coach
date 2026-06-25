from flask import Flask, request, jsonify
from flask_cors import CORS
from groq import Groq
from dotenv import load_dotenv
import os

load_dotenv()

app = Flask(__name__)
CORS(app)
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

SYSTEM_PROMPT = """You are Emma, a friendly and encouraging English coach. 
You speak naturally like a real person in casual conversation — not like a textbook.
Keep responses SHORT (2-3 sentences max) so it feels like a real back-and-forth chat.
Gently correct grammar mistakes in a friendly way, like: "Nice! Just a small tip — instead of '...' you could say '...'"
Ask follow-up questions to keep the conversation going.
Never use bullet points or lists. Always speak in a warm, human tone."""

conversation_history = []

@app.route("/chat", methods=["POST"])
def chat():
    global conversation_history
    data = request.json
    user_message = data.get("message", "")

    if data.get("reset"):
        conversation_history = []
        return jsonify({"reply": "Hey! I'm Emma, your English coach. Let's have a chat — how's your day going?"})

    conversation_history.append({"role": "user", "content": user_message})

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        max_tokens=200,
        messages=[{"role": "system", "content": SYSTEM_PROMPT}] + conversation_history
    )

    reply = response.choices[0].message.content
    conversation_history.append({"role": "assistant", "content": reply})

    return jsonify({"reply": reply})

if __name__ == "__main__":
    app.run(debug=True, port=5000, host="0.0.0.0")