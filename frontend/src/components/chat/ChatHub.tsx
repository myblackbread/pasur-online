"use client";

import React, { useState, useEffect, useRef } from "react";
import { chatService, type DecryptedChatMessage, type DirectChatSession } from "@/services/chatService";
import { ChatMessageBubble } from "./ChatMessageBubble";
import { ChatInputBar } from "./ChatInputBar";
import { RefreshCw } from "lucide-react";

export const ChatHub: React.FC<{
  myIdentityId: string;
  targetUserId: string;
  targetName?: string;
}> = ({ myIdentityId, targetUserId, targetName }) => {
  const [session, setSession] = useState<DirectChatSession | null>(null);
  const [messages, setMessages] = useState<DecryptedChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const listEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    listEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    let unsubscribeWs: (() => void) | undefined;

    chatService
      .openDirectChat(myIdentityId, targetUserId)
      .then(async (sess) => {
        setSession(sess);
        const history = await chatService.loadMessages(sess);
        setMessages(history.reverse());
        setIsLoading(false);

        unsubscribeWs = chatService.subscribeToChat(sess, (newMsg) => {
          setMessages((prev) => [...prev, newMsg]);
          scrollToBottom();
        });
      })
      .catch((err) => {
        console.error("[ChatHub Init Error]:", err);
        setIsLoading(false);
      });

    return () => {
      unsubscribeWs?.();
    };
  }, [myIdentityId, targetUserId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length]);

  const handleSend = async () => {
    if (!session || !inputText.trim() || isSending) return;

    const text = inputText.trim();
    setInputText("");
    setIsSending(true);

    try {
      const sent = await chatService.sendMessage(session, text);
      setMessages((prev) => [...prev, sent]);
      scrollToBottom();
    } catch (err) {
      console.error("[Send Error]:", err);
      setInputText(text);
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center text-muted gap-2">
        <RefreshCw size={18} className="animate-spin text-accent" />
        <span className="text-xs">Инициализация E2EE шифрования...</span>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col justify-between bg-bg select-none">
      {/* Шапка чата */}
      <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between shrink-0">
        <div className="flex flex-col">
          <span className="text-sm font-bold text-text">{targetName || "Диалог"}</span>
          <span className="text-[10px] text-emerald-400 font-medium">● Защищено Signal Sender Key</span>
        </div>
      </div>

      {/* Список расшифрованных сообщений */}
      <div className="flex-1 overflow-y-auto py-3 space-y-1 scrollbar-none">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-muted">
            Нет сообщений. Начните диалог.
          </div>
        ) : (
          messages.map((msg) => <ChatMessageBubble key={msg.id} message={msg} />)
        )}
        <div ref={listEndRef} />
      </div>

      {/* Поле ввода */}
      <ChatInputBar
        value={inputText}
        onChange={setInputText}
        onSend={handleSend}
        isSending={isSending}
      />
    </div>
  );
};