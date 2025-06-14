"use client";
import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { motion } from "framer-motion";
import { createPortal } from "react-dom";

function getSystemTheme() {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

const VOIDAI_URL = "/api/voidai";

export default function Home() {
  const searchRef = useRef<HTMLInputElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const [theme, setTheme] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("theme") || getSystemTheme();
    }
    return "light";
  });
  const [animating, setAnimating] = useState(false);
  const [chat, setChat] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [circle, setCircle] = useState<{x: number, y: number} | null>(null);
  const toggleBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Keyboard shortcut: '/' focuses the search bar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement !== searchRef.current) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleToggleTheme = () => {
    if (toggleBtnRef.current) {
      const rect = toggleBtnRef.current.getBoundingClientRect();
      setCircle({
        x: rect.right - rect.width / 2,
        y: rect.top + rect.height / 2,
      });
      setAnimating(true);
      setTimeout(() => {
        setTheme((prev) => (prev === "dark" ? "light" : "dark"));
        setTimeout(() => setAnimating(false), 700);
      }, 350); // Switch theme halfway through animation
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const newChat: { role: "user" | "assistant"; content: string }[] = [...chat, { role: "user", content: input }];
    setChat(newChat);
    setInput("");
    setLoading(true);
    let assistantMsg = "";
    setChat((prev) => [...prev, { role: "assistant", content: "" }]);
    try {
      const res = await fetch(VOIDAI_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "system", content: "You are a helpful assistant." },
            ...newChat.map((m) => ({ role: m.role, content: m.content })),
          ],
        }),
      });
      if (!res.body) throw new Error("No response body");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunk = decoder.decode(value);
        // Parse SSE stream: lines starting with 'data: '
        chunk.split(/\n/).forEach((line) => {
          if (line.startsWith("data: ")) {
            const data = line.replace("data: ", "").trim();
            if (data === "[DONE]") return;
            try {
              const json = JSON.parse(data);
              const delta = json.choices?.[0]?.delta?.content || "";
              assistantMsg += delta;
              setChat((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: "assistant", content: assistantMsg };
                return updated;
              });
            } catch {}
          }
        });
      }
    } catch {
      setChat((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content: "Sorry, something went wrong." };
        return updated;
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSend();
    }
  };

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center relative transition-colors duration-700 ${theme === "dark" ? "bg-black text-white" : "bg-[#FFFFF8] text-black"}`}>
      <button
        ref={toggleBtnRef}
        onClick={handleToggleTheme}
        className="absolute top-4 right-4 p-2 rounded-full bg-muted text-foreground z-10"
        aria-label="Toggle theme"
      >
        {theme === "dark" ? "🌞" : "🌚"}
      </button>
      {animating && circle && createPortal(
        <motion.div
          initial={{ scale: 0, x: circle.x, y: circle.y, opacity: 1 }}
          animate={{ scale: 50, x: circle.x - window.innerWidth / 2, y: circle.y - window.innerHeight / 2, opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7, ease: "easeInOut" }}
          className={`fixed top-0 left-0 w-screen h-screen z-50 pointer-events-none ${theme === "dark" ? "bg-[#FFFFF8]" : "bg-[#18181b]"}`}
          style={{ borderRadius: "50%" }}
        />, document.body
      )}
      <main className="flex flex-col items-center w-full max-w-xl px-4">
        <h1 className="text-5xl font-bold mb-2 text-center">Crumb.</h1>
        <p className="mb-8 text-lg text-center text-muted-foreground">‘cause every journey starts with a lil crumb</p>
        <div className="w-full flex flex-col items-center">
          <div className="w-full flex items-center bg-muted rounded-xl px-6 py-4 mb-6 shadow-sm">
            <input
              ref={searchRef}
              type="text"
              placeholder="What are we cookin' today? 🔥"
              className="flex-1 bg-transparent outline-none text-lg font-medium placeholder:text-foreground/60"
              aria-label="Recipe search"
            />
            <button
              className="ml-4 p-2 rounded-full bg-primary text-primary-foreground hover:bg-primary/80 transition-colors"
              aria-label="Search"
            >
              <Send size={28} />
            </button>
          </div>
          <div className="flex flex-wrap gap-4 justify-center mt-2">
            {[
              "< 5 min",
              "5-10 mins",
              "10-30 mins",
              "30-60 mins",
              "1+ hour",
            ].map((label) => (
              <button
                key={label}
                className="badge-timer focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {label}
              </button>
            ))}
          </div>
          {/* Chat UI */}
          <div className="w-full mt-10 flex flex-col gap-4 max-h-[40vh] overflow-y-auto" id="chat-ui">
            {chat.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`rounded-2xl px-4 py-2 max-w-[80%] whitespace-pre-line text-base font-sans ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground border border-border"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl px-4 py-2 max-w-[80%] bg-muted text-foreground border border-border font-sans animate-pulse">
                  ...
                </div>
              </div>
            )}
          </div>
          <div className="w-full flex items-center gap-2 mt-4">
            <input
              ref={chatInputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="Ask anything about cooking..."
              className="flex-1 bg-transparent outline-none text-lg font-medium placeholder:text-foreground/60 border-b border-border py-2 font-sans"
              aria-label="Chat input"
              disabled={loading}
            />
            <button
              className="p-2 rounded-full bg-primary text-primary-foreground hover:bg-primary/80 transition-colors disabled:opacity-50"
              aria-label="Send"
              onClick={handleSend}
              disabled={loading || !input.trim()}
            >
              <Send size={24} />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
