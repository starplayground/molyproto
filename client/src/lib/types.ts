export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  summary: string | null;
  lastActive: Date;
}

export interface ConversationSummary {
  summary: string;
}

export interface ChatResponse {
  assistant: string;
  summary?: string;
}

export interface SummarizeResponse {
  summary: string;
}
