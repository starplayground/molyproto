export interface Message {
  role: "user" | "assistant" | "system" | "notePrompt";
  content: string;
  // Optionally, you can add more fields for notePrompt, e.g. title
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  summary: string | null;
  lastActive: Date;
  modelId: string;
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

export interface Model {
  id: string;
  name: string;
  description: string;
}
