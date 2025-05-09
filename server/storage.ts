import { type Conversation, type Message } from "@shared/schema";

export interface IStorage {
  getConversation(id: string): Promise<Conversation | undefined>;
  createConversation(): Promise<Conversation>;
  addMessageToConversation(id: string, message: Message): Promise<Conversation | undefined>;
  updateConversationSummary(id: string, summary: string): Promise<Conversation | undefined>;
}

export class MemStorage implements IStorage {
  private conversations: Map<string, Conversation>;

  constructor() {
    this.conversations = new Map();
  }

  async getConversation(id: string): Promise<Conversation | undefined> {
    return this.conversations.get(id);
  }

  async createConversation(): Promise<Conversation> {
    const id = crypto.randomUUID();
    const conversation: Conversation = {
      id,
      messages: [],
      summary: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.conversations.set(id, conversation);
    return conversation;
  }

  async addMessageToConversation(id: string, message: Message): Promise<Conversation | undefined> {
    const conversation = this.conversations.get(id);
    if (!conversation) return undefined;
    
    conversation.messages.push(message);
    conversation.updatedAt = new Date().toISOString();
    this.conversations.set(id, conversation);
    
    return conversation;
  }

  async updateConversationSummary(id: string, summary: string): Promise<Conversation | undefined> {
    const conversation = this.conversations.get(id);
    if (!conversation) return undefined;
    
    conversation.summary = summary;
    conversation.updatedAt = new Date().toISOString();
    this.conversations.set(id, conversation);
    
    return conversation;
  }
}

export const storage = new MemStorage();
