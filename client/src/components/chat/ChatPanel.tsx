import React, { useRef, useEffect } from "react";
import MessageInput from "./MessageInput";
import { useChatContext } from "@/context/ChatContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bot, User, Trash2 } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import NotePrompt from "./NotePrompt";

const MessageContent: React.FC<{ content: string }> = ({ content }) => {
  return (
    <div className="prose prose-sm max-w-none dark:prose-invert">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  );
};

const NotePromptCard: React.FC<{ title: string; onDelete: () => void }> = ({ title, onDelete }) => {
  // Extract the tag using regex
  const match = title.match(/【(.+?)】/);
  const tag = match ? match[1] : null;
  
  const handleDelete = () => {
    console.log('Deleting note with content:', title);
    onDelete();
  };

  return (
    <div 
      className="flex flex-col rounded-xl px-4 py-2 shadow-sm mt-2 transition-all duration-200 hover:shadow-md"
      style={{ 
        backgroundColor: '#f3f0ff',
        width: 'fit-content',
        minWidth: '200px',
        maxWidth: '90%'
      }}
    >
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span 
            className="bg-white font-semibold px-2 py-1 rounded-lg text-sm whitespace-nowrap shadow-sm text-violet-600"
          >
            笔记
          </span>
          <span className="font-semibold text-sm text-violet-800">
            {tag || "正在生成主题..."}
          </span>
        </div>
        <button
          onClick={handleDelete}
          className="p-1 rounded hover:bg-white/60 transition-all ml-3 flex-shrink-0"
          aria-label="删除"
        >
          <Trash2 className="w-4 h-4 text-violet-500" />
        </button>
      </div>
    </div>
  );
};

const ChatPanel: React.FC = () => {
  const { messages, loading, removeNotePromptMessage, showNotePrompt } = useChatContext();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="w-full lg:w-2/5 flex-1 flex flex-col border-r border-border">
      {/* Chat Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-custom">
        {/* Welcome Message */}
        <div className="p-4 rounded-lg bg-accent/10">
          <div className="flex items-start">
            <Avatar className="mr-4 h-8 w-8 bg-primary text-primary-foreground">
              <AvatarFallback>
                <Bot className="h-5 w-5" />
              </AvatarFallback>
            </Avatar>
            <div className="prose dark:prose-invert max-w-none">
              <p>
                你好！我是你的 AI 助手。我可以帮助你：
              </p>
              <ul className="mt-2 space-y-1 text-sm">
                <li> 回答你的问题和提供建议</li>
                <li> 生成对话笔记和要点总结</li>
                <li> 识别对话中的关键问题和建议</li>
                <li> 提供专业的技术支持</li>
              </ul>
              <p className="mt-2">
                在对话过程中，我会自动在右侧面板生成对话笔记，帮助你更好地整理和回顾重要信息。
              </p>
              <p className="mt-2">
                有什么我可以帮你的吗？
              </p>
            </div>
          </div>
        </div>

        {/* Message List */}
        {messages.map((message, index) => {
          if (message.role === "notePrompt") {
            // 兼容历史notePrompt消息（如有）
            return (
              <div key={index} className="flex items-start">
                <NotePromptCard
                  title={message.content}
                  onDelete={() => removeNotePromptMessage(message.content)}
                />
              </div>
            );
          }
          return (
            <div
              key={index}
              className={`flex items-start ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {message.role === "assistant" && (
                <Avatar className="mr-4 h-8 w-8 bg-primary text-primary-foreground">
                  <AvatarFallback>
                    <Bot className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
              )}
              <div
                className={`max-w-[85%] rounded-lg p-4 ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                <MessageContent content={message.content} />
              </div>
              {message.role === "user" && (
                <Avatar className="ml-4 h-8 w-8 bg-primary text-primary-foreground">
                  <AvatarFallback>
                    <User className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          );
        })}

        {/* NotePrompt 作为一条新的聊天记录插入到聊天流中 */}
        {showNotePrompt && <div className="flex items-start w-full"><NotePrompt /></div>}

        {/* Loading Indicator */}
        {loading && (
          <div className="p-4 rounded-lg bg-accent/10">
            <div className="flex items-start">
              <Avatar className="mr-4 h-8 w-8 bg-primary text-primary-foreground">
                <AvatarFallback>
                  <Bot className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              <div className="flex space-x-1 items-center pt-2">
                <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.3s]"></div>
                <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.15s]"></div>
                <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce"></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <MessageInput />
    </div>
  );
};

export default ChatPanel;
