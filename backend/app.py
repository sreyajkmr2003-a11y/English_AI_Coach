from flask import Flask, request, jsonify
from flask_cors import CORS
from groq import Groq
from dotenv import load_dotenv
import os

# Load environment variables from .env (local only)
load_dotenv()

app = Flask(__name__)
CORS(app)

# Get API key from environment (Render / local .env)
api_key = os.getenv("GROQ_API_KEY")

if not api_key:
    raise ValueError("GROQ_API_KEY is not set in environment variables")

client = Groq(api_key=api_key)

SYSTEM_PROMPT = """
You are Emma, a friendly and encouraging English coach.
You speak naturally like a real person in casual conversation — not like a textbook.
Keep responses SHORT (2-3 sentences max) so it feels like a real back-and-forth chat.
Gently correct grammar mistakes in a friendly way, like:
"Nice! Just a small tip — instead of '...' you could say '...'"
Ask follow-up questions to keep the conversation going.
Never use bullet points or lists. Always speak in a warm, human tone.
"""

# In-memory chat history (⚠️ resets when server restarts)
conversation_history = []


@app.route("/")
def home():
    return jsonify({
        "status": "English AI Coach backend is running 🚀",
        "endpoints": ["/chat"]
    })


@app.route("/chat", methods=["POST"])
def chat():
    global conversation_history

    data = request.get_json()

    if not data:
        return jsonify({"reply": "No input received"}), 400

    user_message = data.get("message", "").strip()

    # Reset chat
    if data.get("reset"):
        conversation_history = []
        return jsonify({
            "reply": "Hey! I'm Emma 😊 Your English coach. How's your day going?"
        })

    if not user_message:
        return jsonify({"reply": "Please send a message 😊"}), 400

    # Add user message
    conversation_history.append({
        "role": "user",
        "content": user_message
    })

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT}
            ] + conversation_history,
            max_tokens=200
        )

        reply = response.choices[0].message.content

        # Add assistant reply
        conversation_history.append({
            "role": "assistant",
            "content": reply
        })

        return jsonify({"reply": reply})

    except Exception as e:
        return jsonify({
            "reply": "Sorry, something went wrong on the server.",
            "error": str(e)
        }), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)