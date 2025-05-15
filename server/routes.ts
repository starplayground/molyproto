import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { sendChatMessage, summarizeConversation } from "./openai";

export async function registerRoutes(app: Express): Promise<Server> {
  // Chat API endpoint
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, messages, apiKey } = req.body;
      
      if (!message) {
        return res.status(400).json({ message: "Message is required" });
      }

      // Get conversation history or create a new one
      const conversationMessages = Array.isArray(messages) ? messages : [];
      
      // Send message to OpenAI with user's API key
      const response = await sendChatMessage(message, conversationMessages, apiKey);
      
      return res.json(response);
    } catch (error) {
      console.error("Error in chat endpoint:", error);
      return res.status(500).json({ 
        message: error instanceof Error ? error.message : "An error occurred" 
      });
    }
  });

  // Summarize conversation endpoint
  app.post("/api/summarize", async (req, res) => {
    try {
      const { messages, apiKey, generateTopicOnly } = req.body;
      
      if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ message: "Valid messages array is required" });
      }

      // Generate summary from conversation using user's API key
      const summary = await summarizeConversation(messages, apiKey, undefined, generateTopicOnly);
      
      return res.json({ summary });
    } catch (error) {
      console.error("Error in summarize endpoint:", error);
      return res.status(500).json({ 
        message: error instanceof Error ? error.message : "An error occurred" 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
