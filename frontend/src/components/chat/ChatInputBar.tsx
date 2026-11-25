"use client";

import React, { useRef } from "react";
import { ArrowUp } from "lucide-react";

export interface ChatInputBarProps {
  value: string;
  placeholder?: string;
  onChange: (val: string) => void;
  onSend: () => void;
  isSending?: boolean;
}

export const ChatInputBar: React.FC<ChatInputBarProps> = ({
  value,
  placeholder = "Сообщение...",
  onChange,
  onSend,
  isSending = false,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasText = value.trim().length > 0;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="w-full px-4 pt-2 pb-[calc(env(safe-area-inset-bottom,0px)+8px)] bg-bg border-t border-white/5 flex items-end gap-2.5">
      <div className="flex-1 bg-card border border-white/10 rounded-2xl px-3.5 py-2.5 min-h-[44px] flex items-center focus-within:border-accent/50 transition-colors">
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full bg-transparent border-none outline-none resize-none text-sm text-text placeholder-subtle max-h-32 scrollbar-none"
        />
      </div>

      <button
        type="button"
        disabled={!hasText || isSending}
        onClick={onSend}
        aria-label="Отправить"
        className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95 ${
          hasText
            ? "bg-accent text-accent-text brass-glow cursor-pointer"
            : "bg-input border border-white/10 text-muted opacity-40 cursor-not-allowed"
        }`}
      >
        <ArrowUp size={20} strokeWidth={2.5} />
      </button>
    </div>
  );
};