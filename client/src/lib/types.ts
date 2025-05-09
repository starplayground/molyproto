export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
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
