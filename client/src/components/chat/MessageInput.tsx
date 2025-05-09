import React, { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useChatContext } from "@/context/ChatContext";

const MessageInput: React.FC = () => {
  const [message, setMessage] = useState("");
  const { sendMessage, loading } = useChatContext();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !loading) {
      sendMessage(message);
      setMessage("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Auto-resize the textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = 
        scrollHeight <= 150 ? `${scrollHeight}px` : "150px";
    }
  }, [message]);

  return (
    <div className="p-4 border-t border-border bg-background">
      <form className="flex items-end" onSubmit={handleSubmit}>
        <div className="relative flex-1">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message ChatAssistant..."
            className="resize-none pr-12 min-h-[50px] max-h-[150px]"
            disabled={loading}
          />
          <Button
            type="submit"
            size="icon"
            variant="ghost"
            className="absolute right-2 bottom-2 text-primary hover:bg-primary/10"
            disabled={!message.trim() || loading}
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </form>
      <p className="text-xs text-muted-foreground mt-2">
        ChatAssistant can make mistakes. Consider checking important information.
      </p>
    </div>
  );
};

export default MessageInput;
