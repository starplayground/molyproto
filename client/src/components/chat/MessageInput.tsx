import React, { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useChatContext } from "@/context/ChatContext";
import ShortcutMenu from "@/components/chat/ShortcutMenu";
import { DefaultShortcutProvider, ShortcutOption } from "@/lib/shortcuts";

const MessageInput: React.FC = () => {
  const [message, setMessage] = useState("");
  const [showShortcutMenu, setShowShortcutMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [cursorPosition, setCursorPosition] = useState(0);
  
  const { sendMessage, loading } = useChatContext();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const shortcutProvider = useRef(new DefaultShortcutProvider()).current;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !loading) {
      sendMessage(message);
      setMessage("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && !showShortcutMenu) {
      e.preventDefault();
      handleSubmit(e);
    } else if (e.key === '@') {
      // 记录@符号的位置，用于展示快捷菜单
      if (textareaRef.current) {
        const { top, left, height } = textareaRef.current.getBoundingClientRect();
        const cursorPos = textareaRef.current.selectionStart;
        
        // 创建临时元素来计算光标位置
        const textBeforeCursor = message.substring(0, cursorPos);
        const span = document.createElement('span');
        span.textContent = textBeforeCursor;
        span.style.position = 'absolute';
        span.style.visibility = 'hidden';
        span.style.whiteSpace = 'pre-wrap';
        span.style.width = `${textareaRef.current.clientWidth}px`;
        document.body.appendChild(span);
        
        // 计算光标位置
        const cursorLeft = left + (span.offsetWidth % textareaRef.current.clientWidth);
        const lineHeight = parseInt(getComputedStyle(textareaRef.current).lineHeight, 10) || 20;
        const cursorTop = top + Math.floor(span.offsetHeight / lineHeight) * lineHeight;
        
        document.body.removeChild(span);
        
        setMenuPosition({ 
          top: cursorTop + lineHeight,
          left: cursorLeft 
        });
        setCursorPosition(cursorPos + 1);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setMessage(newValue);
    
    // 检查是否输入了@字符，用于显示快捷菜单
    const curPos = e.target.selectionStart;
    const isAtChar = newValue[curPos - 1] === '@';
    
    // 只在刚输入@字符时显示菜单
    if (isAtChar && !showShortcutMenu) {
      setShowShortcutMenu(true);
    } else if (showShortcutMenu) {
      // 当已经显示菜单时，检查光标是否已经不在@附近了
      const textAfterAt = newValue.substring(cursorPosition);
      const isOutOfRange = textAfterAt.includes(' ') || textAfterAt.includes('\n');
      
      if (isOutOfRange || newValue.length < cursorPosition || curPos < cursorPosition - 1) {
        setShowShortcutMenu(false);
      }
    }
  };

  const handleSelectOption = (option: ShortcutOption) => {
    // 执行选项的行为
    option.execute();
    
    // 将@替换为选中的选项
    const beforeAt = message.substring(0, cursorPosition - 1);
    const afterAt = message.substring(cursorPosition);
    const newMessage = `${beforeAt}${option.name} ${afterAt}`;
    setMessage(newMessage);
    
    // 关闭菜单
    setShowShortcutMenu(false);
    
    // 聚焦输入框并将光标设置到正确位置
    if (textareaRef.current) {
      textareaRef.current.focus();
      const newPosition = beforeAt.length + option.name.length + 1;
      textareaRef.current.setSelectionRange(newPosition, newPosition);
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
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Message ChatAssistant... (Type @ for shortcuts)"
            className="resize-none pr-12 min-h-[50px] max-h-[150px]"
            disabled={loading}
          />
          {showShortcutMenu && (
            <ShortcutMenu 
              options={shortcutProvider.getOptions()}
              position={menuPosition}
              onSelect={handleSelectOption}
              onClose={() => setShowShortcutMenu(false)}
            />
          )}
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
