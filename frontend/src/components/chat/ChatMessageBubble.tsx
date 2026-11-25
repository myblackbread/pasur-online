"use client";

import React from "react";
import type { DecryptedChatMessage } from "@/services/chatService";

export const ChatMessageBubble: React.FC<{ message: DecryptedChatMessage }> = ({ message }) => {
  const isMe = message.isMe;

  const formattedTime = new Date(message.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className={`w-full flex ${isMe ? "justify-end" : "justify-start"} px-4 py-1`}>
      <div
        className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm shadow-md flex flex-col gap-0.5 select-text ${
          isMe
            ? "bg-accent text-accent-text rounded-br-xs font-medium brass-glow"
            : "bg-card border border-white/10 text-text rounded-bl-xs"
        }`}
      >
        <p className="whitespace-pre-wrap leading-relaxed break-words">{message.text}</p>
        <span
          className={`text-[10px] self-end ${
            isMe ? "text-accent-text/70" : "text-muted"
          }`}
        >
          {formattedTime}
        </span>
      </div>
    </div>
  );
};