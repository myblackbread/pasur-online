import { defineContract } from "@/app/hybrid-scrollbar/shared/contract";
import type { DecryptedChatMessage } from "@/services/chatService";

export interface ChatConversationParams {
  targetUserId: string;
  targetName?: string;
}

export const ChatConversationContract = defineContract<
  "chat-conversation",
  ChatConversationParams
>("chat-conversation");

export const ChatMorphContract = defineContract<
  "chat-messages-morph",
  DecryptedChatMessage
>("chat-messages-morph");