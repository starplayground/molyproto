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
    }
  };

  const calculateMenuPosition = (cursorPos: number) => {
    if (textareaRef.current) {
      const { top, left, height } = textareaRef.current.getBoundingClientRect();
      
      // 将菜单放在输入框上方或输入框内合适位置
      const menuTop = Math.max(top - 220, 10); // 放置在输入框上方，但确保不超出页面顶部
      const menuLeft = left + 50; // 适当缩进，避免太靠左
      
      setMenuPosition({ 
        top: menuTop,
        left: menuLeft 
      });
      setCursorPosition(cursorPos);
      
      // 记录当前位置供调试
      console.log(`Menu positioned at top: ${menuTop}, left: ${menuLeft}`);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const curPos = e.target.selectionStart || 0;
    setMessage(newValue);
    
    // 检测当前输入的字符是否是@
    const isAtCharJustTyped = curPos > 0 && newValue[curPos - 1] === '@' && (curPos === 1 || newValue[curPos - 2] === ' ' || newValue[curPos - 2] === '\n');
    
    if (isAtCharJustTyped && !showShortcutMenu) {
      console.log("@ just typed - showing menu");
      setShowShortcutMenu(true);
      calculateMenuPosition(curPos);
    } 
    
    // 如果菜单已打开且光标处于@字符后，但用户继续输入或删除了@，则关闭菜单
    if (showShortcutMenu) {
      // 如果完全删除了@或者已经在@后输入了空格/回车，则关闭菜单
      const atPosition = newValue.lastIndexOf('@');
      if (atPosition === -1 || curPos < atPosition || 
          (curPos > atPosition && (newValue.substring(atPosition + 1, curPos).includes(' ') || 
                                   newValue.substring(atPosition + 1, curPos).includes('\n')))) {
        console.log("@ context changed - hiding menu");
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
            placeholder="Message ChatAssistant... "
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
