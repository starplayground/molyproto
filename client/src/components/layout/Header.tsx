import React from "react";
import { Button } from "@/components/ui/button";
import { useChatContext } from "@/context/ChatContext";
import { useThemeContext } from "@/context/ThemeContext";
import { Bot, Moon, Sun, Key } from "lucide-react";

const Header: React.FC = () => {
  const { setShowApiKeyModal } = useChatContext();
  const { theme, toggleTheme } = useThemeContext();

  return (
    <header className="border-b border-border py-3 px-4 sm:px-6 flex justify-between items-center bg-background shadow-sm">
      <div className="flex items-center">
        <Bot className="text-primary h-6 w-6 mr-2" />
        <h1 className="text-xl font-semibold">ChatAssistant</h1>
      </div>
      <div className="flex items-center space-x-3">
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
          variant="outline"
          size="sm"
          className="flex items-center"
          onClick={() => setShowApiKeyModal(true)}
        >
          <Key className="h-4 w-4 mr-1" />
          <span>API Key</span>
        </Button>
      </div>
    </header>
  );
};

export default Header;
