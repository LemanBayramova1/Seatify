import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { seedGreeting, useChatbotStore } from "../../store/useChatbotStore";
import { GlassCard } from "../shared/GlassCard";

export function ChatbotWidget() {
  const { t } = useTranslation();
  const isOpen = useChatbotStore((s) => s.isOpen);
  const messages = useChatbotStore((s) => s.messages);
  const isSending = useChatbotStore((s) => s.isSending);
  const toggle = useChatbotStore((s) => s.toggle);
  const sendMessage = useChatbotStore((s) => s.sendMessage);

  const [draft, setDraft] = useState("");
  const scrollRef = useRef(null);

  useEffect(() => {
    if (isOpen) seedGreeting(t("chatbot.greeting"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isOpen]);

  function handleSubmit(e) {
    e.preventDefault();
    if (!draft.trim() || isSending) return;
    sendMessage(draft);
    setDraft("");
  }

  return (
    <>
      <motion.button
        type="button"
        onClick={toggle}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.96 }}
        aria-label={t("chatbot.header")}
        className="fixed bottom-5 right-5 z-[70] flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-b from-brand-500 to-brand-600 text-2xl text-white shadow-glow"
      >
        {isOpen ? "✕" : "💬"}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="fixed bottom-24 right-5 z-[70] w-[min(360px,92vw)]"
          >
            <GlassCard className="flex h-[480px] max-h-[70vh] flex-col overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.03] px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500/20 text-lg">🤖</span>
                  <div>
                    <p className="text-sm font-bold text-slate-100">{t("chatbot.header")}</p>
                    <p className="text-[11px] text-status-free">{t("chatbot.onlineStatus")}</p>
                  </div>
                </div>
                <button onClick={toggle} className="text-slate-400 hover:text-slate-200">
                  ✕
                </button>
              </div>

              <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
                {messages.map((m) => (
                  <ChatBubble key={m.id} role={m.role} text={m.isKey ? t(m.text) : m.text} />
                ))}
                {isSending && <ChatBubble role="bot" typing />}
              </div>

              <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-white/10 p-3">
                <input
                  className="glass-input flex-1"
                  placeholder={t("chatbot.inputPlaceholder")}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                />
                <button type="submit" disabled={!draft.trim() || isSending} className="btn-primary px-3 py-2">
                  {t("chatbot.send")}
                </button>
              </form>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function ChatBubble({ role, text, typing }) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${
          isUser
            ? "rounded-br-sm bg-gradient-to-b from-brand-500 to-brand-600 text-white"
            : "rounded-bl-sm border border-white/10 bg-white/[0.05] text-slate-200"
        }`}
      >
        {typing ? (
          <span className="flex gap-1">
            <Dot delay={0} />
            <Dot delay={0.15} />
            <Dot delay={0.3} />
          </span>
        ) : (
          text
        )}
      </div>
    </div>
  );
}

function Dot({ delay }) {
  return (
    <motion.span
      className="h-1.5 w-1.5 rounded-full bg-slate-400"
      animate={{ opacity: [0.3, 1, 0.3] }}
      transition={{ duration: 1, repeat: Infinity, delay }}
    />
  );
}
