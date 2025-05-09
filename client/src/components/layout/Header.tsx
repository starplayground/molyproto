import React from "react";
import { Button } from "@/components/ui/button";
import { useChatContext } from "@/context/ChatContext";
import { useThemeContext } from "@/context/ThemeContext";
import { Bot, Moon, Sun, Key, MessageSquarePlus } from "lucide-react";
import MobileMenuButton from "@/components/chat/MobileMenuButton";

const Header: React.FC = () => {
  const { setShowApiKeyModal, newConversation } = useChatContext();
  const { theme, toggleTheme } = useThemeContext();

  return (
    <header className="border-b border-border py-3 px-4 sm:px-6 flex justify-between items-center bg-background shadow-sm">
      <div className="flex items-center">
        <MobileMenuButton />
        <Bot className="text-primary h-6 w-6 mx-2" />
        <h1 className="text-xl font-semibold">ChatAssistant</h1>
      </div>
      <div className="flex items-center space-x-2 md:space-x-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          aria-label="Toggle dark/light mode"
        >
          {theme === "dark" ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={newConversation}
          aria-label="New conversation"
        >
          <MessageSquarePlus className="h-5 w-5" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center"
          onClick={() => setShowApiKeyModal(true)}
        >
          <Key className="h-4 w-4 mr-1" />
          <span className="hidden sm:inline">API Key</span>
        </Button>
      </div>
    </header>
  );
};

export default Header;
