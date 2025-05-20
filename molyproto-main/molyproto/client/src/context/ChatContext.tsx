import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Message, Conversation, ConversationSummary } from "@/lib/types";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// 常量定义
const STORAGE_KEYS = {
  API_KEY: "openai_api_key",
  CONVERSATIONS: "conversations",
};

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
  showNotePrompt: boolean;
  tempSummary: string | null;
  refinedNoteContent: string | null;
  showModelSelectModal: boolean;
  selectedModelId: string;
  setShowSidebar: (show: boolean) => void;
  setShowApiKeyModal: (show: boolean) => void;
  setShowMobileSummary: (show: boolean) => void;
  setShowNotePrompt: (show: boolean) => void;
  setShowModelSelectModal: (show: boolean) => void;
  setSelectedModelId: (modelId: string) => void;
  setApiKey: (key: string) => void;
  setSummary: (summary: string | null) => void;
  setRefinedNoteContent: (content: string | null) => void;
  sendMessage: (content: string) => Promise<void>;
  newConversation: () => void;
  selectConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  addToNotes: () => void;
  skipNote: () => void;
  removeNotePromptMessage: (title: string) => void;
  updateCurrentConversation: (updater: (conv: Conversation) => Conversation) => void;
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
  const [showNotePrompt, setShowNotePrompt] = useState(false);
  const [tempSummary, setTempSummary] = useState<string | null>(null);
  const [refinedNoteContent, setRefinedNoteContent] = useState<string | null>(null);
  const [showModelSelectModal, setShowModelSelectModal] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState("gpt-3.5-turbo");
  const { toast } = useToast();

  // 辅助函数：生成带唯一ID和时间戳的格式化内容
  const formatSummaryContent = useCallback((summaryText: string) => {
    // 直接返回摘要文本，不添加时间戳和note_id
    return summaryText;
  }, []);

  // 辅助函数：将笔记添加到现有摘要中
  const appendToSummary = useCallback((prevSummary: string | null, newContent: string) => {
    console.log('Appending to summary:', { 
      prevSummary: prevSummary ? prevSummary.substring(0, 50) + '...' : null, 
      newContent: newContent.substring(0, 50) + '...' 
    });
    
    // 如果没有现有的摘要，直接返回新内容
    if (!prevSummary || prevSummary.trim() === '') {
      return newContent;
    }
    
    // 检查新内容是否已经存在于摘要中，避免重复
    // 特别注意避免使用includes，因为部分匹配可能导致误判
    const notes = prevSummary.split('\n\n---\n\n');
    for (const note of notes) {
      // 如果新内容与现有笔记几乎完全匹配，视为重复
      const similarity = calculateSimilarity(note, newContent);
      if (similarity > 0.7) { // 70%以上的相似度视为相同笔记
        console.log('Content already exists in summary (similarity: ' + similarity + '), not appending');
        return prevSummary;
      }
    }
    
    // 添加分隔符并附加新内容
    return `${prevSummary}\n\n---\n\n${newContent}`;
  }, []);

  // 计算两个字符串的相似度（0-1之间，1表示完全相同）
  const calculateSimilarity = (str1: string, str2: string): number => {
    // 简单实现：基于较长字符串的包含率
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    // 如果短字符串是长字符串的子串，相似度很高
    if (longer.includes(shorter)) {
      return shorter.length / longer.length;
    }
    
    // 否则计算共同单词的比例
    const words1 = str1.toLowerCase().split(/\s+/);
    const words2 = str2.toLowerCase().split(/\s+/);
    
    const uniqueWords1 = Array.from(new Set(words1));
    const uniqueWords2 = Array.from(new Set(words2));
    
    let commonWords = 0;
    for (let i = 0; i < uniqueWords1.length; i++) {
      if (uniqueWords2.includes(uniqueWords1[i])) {
        commonWords++;
      }
    }
    
    // 合并两个数组并去重，得到所有不重复的单词
    const allWords = [...uniqueWords1, ...uniqueWords2];
    const uniqueAllWords = Array.from(new Set(allWords));
    
    return uniqueAllWords.length > 0 ? commonWords / uniqueAllWords.length : 0;
  };

  // 辅助函数：从笔记中提取ID
  const extractNoteId = useCallback((content: string): string | null => {
    // 不再使用note_id
    return null;
  }, []);

  // 辅助函数：更新当前对话
  const updateCurrentConversation = useCallback((updater: (conv: Conversation) => Conversation) => {
    if (!currentConversationId) return;
    
    setConversations(prev => 
      prev.map(conv => 
        conv.id === currentConversationId 
          ? updater(conv)
          : conv
      )
    );
  }, [currentConversationId]);

  // 辅助函数：过滤笔记
  const filterNotesByNoteId = useCallback((notes: string, contentToRemove: string): string => {
    if (!notes) return '';
    
    // 分割笔记
    const noteItems = notes.split('\n\n---\n\n');
    
    // 过滤掉匹配内容的笔记
    const filteredNotes = noteItems.filter(note => note !== contentToRemove);
    
    // 重新组合
    return filteredNotes.join('\n\n---\n\n');
  }, []);

  // Load API key from localStorage on component mount
  useEffect(() => {
    const storedApiKey = localStorage.getItem(STORAGE_KEYS.API_KEY);
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
    localStorage.setItem(STORAGE_KEYS.API_KEY, key);
  }, []);

  // Load conversations from localStorage
  useEffect(() => {
    const storedConversations = localStorage.getItem(STORAGE_KEYS.CONVERSATIONS);
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
          createNewConversation();
        }
      } catch (error) {
        console.error("Error parsing stored conversations:", error);
        createNewConversation();
      }
    } else {
      // Create a new conversation if none exists
      createNewConversation();
    }
  }, []);

  // Save conversations to localStorage whenever they change
  useEffect(() => {
    if (conversations.length > 0) {
      localStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(conversations));
    }
  }, [conversations]);

  // Create a new conversation
  const createNewConversation = () => {
    const newId = Date.now().toString();
    const newConv: Conversation = {
      id: newId,
      title: "New Conversation",
      messages: [],
      summary: null,
      lastActive: new Date(),
      modelId: selectedModelId
    };
    setConversations(prev => [newConv, ...prev]);
    setCurrentConversationId(newId);
    setMessages([]);
    setSummary(null);
    setTempSummary(null);
    setRefinedNoteContent(null);
    setShowNotePrompt(false);
  };
  
  const newConversation = useCallback(() => {
    createNewConversation();
  }, []);

  // Select a conversation
  const selectConversation = useCallback((id: string) => {
    const conversation = conversations.find(conv => conv.id === id);
    if (conversation) {
      setCurrentConversationId(id);
      setMessages(conversation.messages);
      setSummary(conversation.summary);
      
      // Update lastActive for the selected conversation
      updateCurrentConversation(conv => ({ ...conv, lastActive: new Date() }));
    }
  }, [conversations, updateCurrentConversation]);

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

  // Handle sending a message and processing the response
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
    updateCurrentConversation(conv => ({
      ...conv,
      messages: updatedMessages,
      lastActive: new Date(),
      title: conv.messages.length === 0 
        ? content.substring(0, 30) + (content.length > 30 ? '...' : '') 
        : conv.title
    }));
    
    setLoading(true);

    try {
      // 发送聊天消息
      const response = await apiRequest("POST", "/api/chat", {
        message: content,
        // 过滤掉 notePrompt 类型的消息，只发送 OpenAI 支持的消息类型
        messages: updatedMessages.filter(msg => msg.role !== "notePrompt"),
        apiKey: apiKey,
        // 告诉服务器不要返回摘要，因为我们会自己生成
        skipSummary: true,
        modelId: selectedModelId, // Add modelId to the request
      });

      const data = await response.json();

      if (data.assistant) {
        // 使用精炼后的内容作为消息内容
        const refinedContent = data.assistant.split('\n\n---\n\n')[0];
        const assistantMessage: Message = { role: "assistant", content: refinedContent };
        const newMessages = [...updatedMessages, assistantMessage];
        setMessages(newMessages);
        
        // Update the messages in the current conversation with assistant's response
        updateCurrentConversation(conv => ({ 
          ...conv, 
          messages: newMessages,
          lastActive: new Date() 
        }));

        // 生成新的摘要
        await generateAndProcessSummary(newMessages, data.assistant);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [apiKey, currentConversationId, messages, newConversation, toast, updateCurrentConversation, selectedModelId]);

  // 生成并处理摘要
  const generateAndProcessSummary = useCallback(async (messages: Message[], assistantResponse: string) => {
    if (!apiKey) {
      setShowApiKeyModal(true);
      return;
    }

    setSummarizing(true);

    try {
      // 生成摘要和精炼内容
      const response = await apiRequest("POST", "/api/summarize", {
        messages: messages.filter(msg => msg.role !== "notePrompt"),
        assistantResponse,
        apiKey: apiKey,
        generateTopicOnly: false, // 生成完整摘要而不仅仅是主题标签
        generateRefinedContent: true, // 请求生成精炼内容
      });

      const data = await response.json();

      if (data.summary) {
        // 设置临时摘要
        setTempSummary(data.summary);
        
        // 如果有精炼内容，设置它
        if (data.refinedContent) {
          const tagMatch = data.summary.match(/【(.+?)】/);
          const tag = tagMatch ? tagMatch[1] : "";
          setRefinedNoteContent(`【${tag}】\n${data.refinedContent}`);
        }
        
        // 显示笔记提示
        setShowNotePrompt(true);
      }
    } catch (error) {
      console.error("Error generating summary:", error);
      toast({
        title: "Error",
        description: "Failed to generate summary. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSummarizing(false);
    }
  }, [apiKey, toast]);

  // Add the current tempSummary to the permanent notes
  const addToNotes = useCallback(() => {
    if (currentConversationId && tempSummary) {
      console.log('Adding note to existing summary', {
        existingSummary: summary,
        newNote: tempSummary,
        refinedContent: refinedNoteContent
      });
      
      // 始终使用原始摘要
      const noteContent = tempSummary;
      
      // 更新对话中的摘要
      updateCurrentConversation(conv => {
        const updatedSummary = appendToSummary(conv.summary, noteContent);
        console.log('Updated conversation summary:', updatedSummary);
        return { 
          ...conv, 
          summary: updatedSummary
        };
      });
      
      // 更新当前摘要
      setSummary(prev => {
        const updatedSummary = appendToSummary(prev, noteContent);
        console.log('Updated current summary:', updatedSummary);
        return updatedSummary;
      });

      // 清除临时状态
      setShowNotePrompt(false);
      setTempSummary(null);
      setRefinedNoteContent(null);
    }
  }, [currentConversationId, tempSummary, summary, appendToSummary, updateCurrentConversation]);

  // Skip adding the current tempSummary to notes
  const skipNote = useCallback(() => {
    setShowNotePrompt(false);
    setTempSummary(null);
    setRefinedNoteContent(null);
  }, []);

  // Remove a notePrompt message from the chat and its corresponding note
  const removeNotePromptMessage = useCallback((title: string) => {
    console.log('Removing note with content:', title);
    
    // Remove the notePrompt message from messages
    setMessages(prev => prev.filter(m => !(m.role === "notePrompt" && m.content === title)));
    
    // 如果当前有临时摘要，检查是否需要清除
    if (tempSummary && tempSummary === title) {
      setTempSummary(null);
      setShowNotePrompt(false);
    }
    
    // Remove the corresponding note from summary
    setSummary(prev => prev ? filterNotesByNoteId(prev, title) : null);

    // Update the conversation's summary
    updateCurrentConversation(conv => ({
      ...conv,
      summary: conv.summary ? filterNotesByNoteId(conv.summary, title) : null
    }));
  }, [tempSummary, filterNotesByNoteId, updateCurrentConversation]);

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
    showNotePrompt,
    tempSummary,
    refinedNoteContent,
    showModelSelectModal,
    selectedModelId,
    setShowSidebar,
    setShowApiKeyModal,
    setShowMobileSummary,
    setShowNotePrompt,
    setShowModelSelectModal,
    setSelectedModelId,
    setApiKey,
    setSummary,
    setRefinedNoteContent,
    sendMessage: handleSendMessage,
    newConversation,
    selectConversation,
    deleteConversation,
    addToNotes,
    skipNote,
    removeNotePromptMessage,
    updateCurrentConversation,
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
