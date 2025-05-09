import React, { useRef, useEffect } from "react";
import MessageInput from "./MessageInput";
import { useChatContext } from "@/context/ChatContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bot, User } from "lucide-react";

const ChatPanel: React.FC = () => {
  const { messages, loading } = useChatContext();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="w-full lg:w-2/3 flex flex-col border-r border-border">
      {/* Chat Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                Hello! I'm your AI assistant. I'm here to help answer your
                questions and have a conversation. As we chat, I'll generate a
                summary of our conversation in the panel on the right.
              </p>
              <p className="mt-2">How can I help you today?</p>
            </div>
          </div>
        </div>

        {/* Message List */}
        {messages.map((message, index) => (
          <div
            key={index}
            className={`p-4 rounded-lg animate-in fade-in slide-in-from-bottom-5 ${
              message.role === "user" 
                ? "bg-muted" 
                : "bg-accent/10"
            }`}
          >
            <div className="flex items-start">
              <Avatar className={`mr-4 h-8 w-8 ${
                message.role === "user"
                  ? "bg-muted-foreground/20 text-foreground"
                  : "bg-primary text-primary-foreground"
              }`}>
                <AvatarFallback>
                  {message.role === "user" ? (
                    <User className="h-5 w-5" />
                  ) : (
                    <Bot className="h-5 w-5" />
                  )}
                </AvatarFallback>
              </Avatar>
              <div className="prose dark:prose-invert max-w-none">
                <div dangerouslySetInnerHTML={{ __html: message.content.replace(/\n/g, '<br>') }} />
              </div>
            </div>
          </div>
        ))}

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
