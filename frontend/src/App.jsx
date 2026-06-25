import { useState, useEffect, useRef } from "react";

const BACKEND = "http://192.168.1.77:5000";// ← put your PC's IP here

export default function App() {
  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState([]);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [loading, setLoading] = useState(false);
  const recognitionRef = useRef(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleStart = async () => {
    setStarted(true);
    await startSession();
  };

  const startSession = async () => {
    try {
      const res = await fetch(`${BACKEND}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "", reset: true }),
      });
      const data = await res.json();
      setMessages([{ role: "assistant", text: data.reply }]);
      speak(data.reply);
    } catch {
      setMessages([{ role: "assistant", text: "Could not connect to server. Is the backend running?" }]);
    }
  };

  const speak = (text) => {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "en-US";
    utter.rate = 0.95;
    utter.pitch = 1.05;
    const setVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(
        (v) => v.name.includes("Samantha") || v.name.includes("Google US English") || v.lang === "en-US"
      );
      if (preferred) utter.voice = preferred;
      utter.onstart = () => setSpeaking(true);
      utter.onend = () => setSpeaking(false);
      window.speechSynthesis.speak(utter);
    };
    // voices may not be loaded yet on mobile
    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.onvoiceschanged = setVoice;
    } else {
      setVoice();
    }
  };

const toggleListening = () => {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    alert(
      "Speech recognition is not supported on this browser. Please use Chrome on Android or Safari on iPhone."
    );
    return;
  }

  if (listening) {
    recognitionRef.current?.stop();
    setListening(false);
    return;
  }

  try {
    window.speechSynthesis.cancel();

    const recognition = new SpeechRecognition();

    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;

    recognitionRef.current = recognition;

    recognition.onstart = () => {
      setListening(true);
    };

    recognition.onresult = (event) => {
      let text = "";

      for (let i = 0; i < event.results.length; i++) {
        text += event.results[i][0].transcript;
      }

      setTranscript(text);
    };

    recognition.onerror = (event) => {
      console.error("Speech error:", event.error);

      if (event.error === "not-allowed") {
        alert("Microphone permission denied.");
      } else {
        alert(`Speech error: ${event.error}`);
      }

      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognition.start();
  } catch (err) {
    console.error(err);
    alert("Could not start speech recognition.");
    setListening(false);
  }
};
  const sendTranscript = () => {
    if (transcript.trim()) {
      recognitionRef.current?.stop();
      setListening(false);
      sendMessage(transcript);
      setTranscript("");
    }
  };

  const sendMessage = async (text) => {
    if (!text.trim()) return;
    setLoading(true);
    setMessages((prev) => [...prev, { role: "user", text }]);
    try {
      const res = await fetch(`${BACKEND}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", text: data.reply }]);
      speak(data.reply);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", text: "Oops! Something went wrong." }]);
    }
    setLoading(false);
  };

  // Welcome screen
  if (!started) {
    return (
      <div style={styles.welcome}>
        <div style={styles.welcomeCard}>
          <div style={styles.welcomeAvatar}>🎓</div>
          <h1 style={styles.welcomeTitle}>Meet Emma</h1>
          <p style={styles.welcomeSubtitle}>Your personal AI English coach. Have real conversations and improve your English naturally!</p>
          <button onClick={handleStart} style={styles.startBtn}>
            Tap to Start Talking 🎤
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.avatar}>🎓</div>
        <div>
          <h2 style={styles.name}>Emma</h2>
          <p style={styles.subtitle}>
            {speaking ? "🔊 Speaking..." : listening ? "🎤 Listening..." : "Your AI English Coach"}
          </p>
        </div>
        <button onClick={() => { setStarted(false); setMessages([]); }} style={styles.resetBtn} title="New conversation">↺</button>
      </div>

      <div style={styles.chat}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 12 }}>
            <div style={m.role === "user" ? styles.userBubble : styles.botBubble}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 12 }}>
            <div style={styles.botBubble}>Emma is thinking... 💭</div>
          </div>
        )}
        {transcript && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
            <div style={{ ...styles.userBubble, opacity: 0.6, fontStyle: "italic" }}>{transcript}</div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div style={styles.footer}>
        {transcript ? (
          <div style={styles.transcriptBox}>
            <p style={styles.transcriptText}>{transcript}</p>
            <button onClick={sendTranscript} style={styles.sendBtn}>Send ➤</button>
          </div>
        ) : null}
        <button
          onClick={toggleListening}
          style={{ ...styles.micBtn, background: listening ? "#ef4444" : "#6366f1" }}
        >
          {listening ? "⏹ Stop Listening" : "🎤 Tap to Speak"}
        </button>
        <p style={styles.hint}>
          {listening ? "Speak now... tap Stop when done" : "Tap the button and start speaking"}
        </p>
      </div>
    </div>
  );
}

const styles = {
  welcome: { display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", padding: 24 },
  welcomeCard: { background: "white", borderRadius: 24, padding: 40, textAlign: "center", maxWidth: 360 },
  welcomeAvatar: { fontSize: 64, marginBottom: 16 },
  welcomeTitle: { margin: "0 0 12px", fontSize: 28, fontWeight: 800, color: "#1e293b" },
  welcomeSubtitle: { margin: "0 0 32px", fontSize: 15, color: "#64748b", lineHeight: 1.6 },
  startBtn: { width: "100%", padding: "16px", fontSize: 18, fontWeight: 700, color: "white", background: "#6366f1", border: "none", borderRadius: 14, cursor: "pointer" },
  container: { display: "flex", flexDirection: "column", height: "100vh", maxWidth: 480, margin: "0 auto", fontFamily: "system-ui, sans-serif", background: "#f8fafc" },
  header: { display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", background: "#6366f1", color: "white" },
  avatar: { fontSize: 32, background: "rgba(255,255,255,0.2)", borderRadius: "50%", width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center" },
  name: { margin: 0, fontSize: 18, fontWeight: 700 },
  subtitle: { margin: 0, fontSize: 13, opacity: 0.85 },
  resetBtn: { marginLeft: "auto", background: "rgba(255,255,255,0.2)", border: "none", color: "white", fontSize: 20, borderRadius: 8, padding: "6px 12px", cursor: "pointer" },
  chat: { flex: 1, overflowY: "auto", padding: "16px 16px 8px" },
  userBubble: { background: "#6366f1", color: "white", padding: "10px 14px", borderRadius: "18px 18px 4px 18px", maxWidth: "75%", fontSize: 15, lineHeight: 1.5 },
  botBubble: { background: "white", color: "#1e293b", padding: "10px 14px", borderRadius: "18px 18px 18px 4px", maxWidth: "75%", fontSize: 15, lineHeight: 1.5, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" },
  footer: { padding: "16px", background: "white", borderTop: "1px solid #e2e8f0", textAlign: "center" },
  micBtn: { width: "100%", padding: "14px", fontSize: 16, fontWeight: 600, color: "white", border: "none", borderRadius: 12, cursor: "pointer", transition: "background 0.2s" },
  hint: { margin: "8px 0 0", fontSize: 12, color: "#94a3b8" },
  transcriptBox: { background: "#f1f5f9", borderRadius: 12, padding: "10px 14px", marginBottom: 12, display: "flex", alignItems: "center", gap: 10 },
  transcriptText: { margin: 0, flex: 1, fontSize: 14, color: "#1e293b", fontStyle: "italic" },
  sendBtn: { background: "#6366f1", color: "white", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 14, fontWeight: 600, cursor: "pointer" },
};