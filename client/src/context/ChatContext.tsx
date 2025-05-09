import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Message, ConversationSummary } from "@/lib/types";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ChatContextProps {
  messages: Message[];
  loading: boolean;
  apiKey: string | null;
  summary: string | null;
  summarizing: boolean;
  showApiKeyModal: boolean;
  showMobileSummary: boolean;
  setShowApiKeyModal: (show: boolean) => void;
  setShowMobileSummary: (show: boolean) => void;
  setApiKey: (key: string) => void;
  sendMessage: (content: string) => Promise<void>;
}

const ChatContext = createContext<ChatContextProps | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [showMobileSummary, setShowMobileSummary] = useState(false);
  const { toast } = useToast();

  // Load API key from localStorage on component mount
  useEffect(() => {
    const storedApiKey = localStorage.getItem("openai_api_key");
    if (storedApiKey) {
      setApiKey(storedApiKey);
    } else {
      // Show API key modal on first load if no API key is found
      setShowApiKeyModal(true);
    }
  }, []);

  // Save API key to localStorage when it changes
  const handleSetApiKey = useCallback((key: string) => {
    setApiKey(key);
    localStorage.setItem("openai_api_key", key);
  }, []);

  // Send a message to the chat
  const sendMessage = useCallback(async (content: string) => {
    if (!apiKey) {
      setShowApiKeyModal(true);
      return;
    }

    const userMessage: Message = { role: "user", content };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      const response = await apiRequest("POST", "/api/chat", {
        message: content,
        messages: messages,
        apiKey: apiKey,  // Send API key to backend
      });

      const data = await response.json();

      if (data.assistant) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.assistant }]);
      }

      if (data.summary) {
        setSummary(data.summary);
        setSummarizing(false);
      } else {
        setSummarizing(true);
        const summaryResponse = await apiRequest("POST", "/api/summarize", {
          messages: [...messages, userMessage, { role: "assistant", content: data.assistant }],
          apiKey: apiKey,  // Send API key to backend for summary
        });
        
        const summaryData = await summaryResponse.json();
        setSummary(summaryData.summary);
        setSummarizing(false);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message. Please check your API key and try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [apiKey, messages, toast]);

  const value = {
    messages,
    loading,
    apiKey,
    summary,
    summarizing,
    showApiKeyModal,
    showMobileSummary,
    setShowApiKeyModal,
    setShowMobileSummary,
    setApiKey: handleSetApiKey,
    sendMessage,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChatContext must be used within a ChatProvider");
  }
  return context;
};
