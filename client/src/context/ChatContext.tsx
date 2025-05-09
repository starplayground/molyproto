import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Message, Conversation, ConversationSummary } from "@/lib/types";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ChatContextProps {
  conversations: Conversation[];
  currentConversationId: string | null;
  messages: Message[];
  loading: boolean;
  apiKey: string | null;
  summary: string | null;
  summarizing: boolean;
  showApiKeyModal: boolean;
  showMobileSummary: boolean;
  showSidebar: boolean;
  setShowSidebar: (show: boolean) => void;
  setShowApiKeyModal: (show: boolean) => void;
  setShowMobileSummary: (show: boolean) => void;
  setApiKey: (key: string) => void;
  sendMessage: (content: string) => Promise<void>;
  newConversation: () => void;
  selectConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
}

const ChatContext = createContext<ChatContextProps | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [showMobileSummary, setShowMobileSummary] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
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

  // Load conversations from localStorage
  useEffect(() => {
    const storedConversations = localStorage.getItem("conversations");
    if (storedConversations) {
      try {
        const parsedConversations = JSON.parse(storedConversations);
        if (Array.isArray(parsedConversations) && parsedConversations.length > 0) {
          // Convert string dates back to Date objects
          const processedConversations = parsedConversations.map(conv => ({
            ...conv,
            lastActive: new Date(conv.lastActive)
          }));
          
          setConversations(processedConversations);
          // Set current conversation to the most recent one
          const mostRecentConv = processedConversations.sort(
            (a, b) => new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime()
          )[0];
          setCurrentConversationId(mostRecentConv.id);
          setMessages(mostRecentConv.messages);
          setSummary(mostRecentConv.summary);
        } else {
          // Create a new conversation if none exists
          newConversation();
        }
      } catch (error) {
        console.error("Error parsing stored conversations:", error);
        newConversation();
      }
    } else {
      // Create a new conversation if none exists
      newConversation();
    }
  }, []);

  // Save conversations to localStorage whenever they change
  useEffect(() => {
    if (conversations.length > 0) {
      localStorage.setItem("conversations", JSON.stringify(conversations));
    }
  }, [conversations]);

  // Create a new conversation
  const newConversation = useCallback(() => {
    const newId = Date.now().toString();
    const newConv: Conversation = {
      id: newId,
      title: "New Conversation",
      messages: [],
      summary: null,
      lastActive: new Date()
    };
    setConversations(prev => [newConv, ...prev]);
    setCurrentConversationId(newId);
    setMessages([]);
    setSummary(null);
  }, []);

  // Select a conversation
  const selectConversation = useCallback((id: string) => {
    const conversation = conversations.find(conv => conv.id === id);
    if (conversation) {
      setCurrentConversationId(id);
      setMessages(conversation.messages);
      setSummary(conversation.summary);
      
      // Update lastActive for the selected conversation
      setConversations(prev => 
        prev.map(conv => 
          conv.id === id ? { ...conv, lastActive: new Date() } : conv
        )
      );
    }
  }, [conversations]);

  // Delete a conversation
  const deleteConversation = useCallback((id: string) => {
    setConversations(prev => prev.filter(conv => conv.id !== id));
    
    // If we're deleting the current conversation, switch to another one or create new
    if (id === currentConversationId) {
      const remainingConversations = conversations.filter(conv => conv.id !== id);
      if (remainingConversations.length > 0) {
        const nextConv = remainingConversations[0];
        setCurrentConversationId(nextConv.id);
        setMessages(nextConv.messages);
        setSummary(nextConv.summary);
      } else {
        newConversation();
      }
    }
  }, [conversations, currentConversationId, newConversation]);

  // Modified sendMessage to update the current conversation
  const handleSendMessage = useCallback(async (content: string) => {
    if (!apiKey) {
      setShowApiKeyModal(true);
      return;
    }

    if (!currentConversationId) {
      newConversation();
      return;
    }

    const userMessage: Message = { role: "user", content };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    
    // Update the messages in the current conversation
    setConversations(prev => 
      prev.map(conv => 
        conv.id === currentConversationId 
          ? { 
              ...conv, 
              messages: updatedMessages,
              lastActive: new Date(),
              // Update title if this is the first message
              title: conv.messages.length === 0 ? content.substring(0, 30) + (content.length > 30 ? '...' : '') : conv.title
            } 
          : conv
      )
    );
    
    setLoading(true);

    try {
      const response = await apiRequest("POST", "/api/chat", {
        message: content,
        messages: updatedMessages,
        apiKey: apiKey,  // Send API key to backend
      });

      const data = await response.json();

      if (data.assistant) {
        const assistantMessage: Message = { role: "assistant", content: data.assistant };
        const newMessages = [...updatedMessages, assistantMessage];
        setMessages(newMessages);
        
        // Update the messages in the current conversation with assistant's response
        setConversations(prev => 
          prev.map(conv => 
            conv.id === currentConversationId 
              ? { ...conv, messages: newMessages, lastActive: new Date() } 
              : conv
          )
        );
      }

      if (data.summary) {
        setSummary(data.summary);
        setSummarizing(false);
        
        // Update summary in the current conversation
        setConversations(prev => 
          prev.map(conv => 
            conv.id === currentConversationId 
              ? { ...conv, summary: data.summary } 
              : conv
          )
        );
      } else {
        setSummarizing(true);
        const summaryResponse = await apiRequest("POST", "/api/summarize", {
          messages: [...updatedMessages, { role: "assistant", content: data.assistant }],
          apiKey: apiKey,  // Send API key to backend for summary
        });
        
        const summaryData = await summaryResponse.json();
        setSummary(summaryData.summary);
        setSummarizing(false);
        
        // Update summary in the current conversation
        setConversations(prev => 
          prev.map(conv => 
            conv.id === currentConversationId 
              ? { ...conv, summary: summaryData.summary } 
              : conv
          )
        );
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
  }, [apiKey, currentConversationId, messages, newConversation, toast]);

  const value = {
    conversations,
    currentConversationId,
    messages,
    loading,
    apiKey,
    summary,
    summarizing,
    showApiKeyModal,
    showMobileSummary,
    showSidebar,
    setShowSidebar,
    setShowApiKeyModal,
    setShowMobileSummary,
    setApiKey: handleSetApiKey,
    sendMessage: handleSendMessage,
    newConversation,
    selectConversation,
    deleteConversation
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
