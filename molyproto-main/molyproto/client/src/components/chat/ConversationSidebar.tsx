import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { useChatContext } from "@/context/ChatContext";
import { Trash2, MessageSquarePlus, Menu, Search, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface ConversationSidebarProps {
  isMobile?: boolean;
}

const ConversationSidebar: React.FC<ConversationSidebarProps> = ({ isMobile = false }) => {
  const { 
    conversations,
    currentConversationId,
    selectConversation,
    deleteConversation,
    newConversation,
    showSidebar,
    setShowSidebar
  } = useChatContext();

  const [searchQuery, setSearchQuery] = useState("");

  const handleNewConversation = () => {
    newConversation();
    if (isMobile) {
      setShowSidebar(false);
    }
  };

  const handleSelectConversation = (id: string) => {
    selectConversation(id);
    if (isMobile) {
      setShowSidebar(false);
    }
  };

  const filteredConversations = conversations.filter(conversation =>
    conversation.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (date: Date) => {
    try {
      const formattedDate = formatDistanceToNow(date, { addSuffix: true });
      return formattedDate.replace('about ', '').replace('less than a minute ago', 'just now');
    } catch (error) {
      return 'unknown time';
    }
  };

  return (
    <div className={cn(
      "flex flex-col h-full bg-background border-r border-border",
      isMobile ? "fixed inset-y-0 left-0 w-64 z-50 transform transition-transform duration-200" : "w-64",
      isMobile && !showSidebar ? "-translate-x-full" : "translate-x-0"
    )}>
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">对话列表</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNewConversation}
            className="hover:bg-gray-100"
          >
            <MessageSquarePlus className="h-5 w-5 text-gray-600" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="搜索对话..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 scrollbar-custom">
        <div className="space-y-1">
          {filteredConversations.map((conversation) => (
            <div
              key={conversation.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors group",
                conversation.id === currentConversationId
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-gray-100 text-gray-700"
              )}
              onClick={() => handleSelectConversation(conversation.id)}
            >
              <MessageSquare className="h-5 w-5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">
                  {conversation.title || "新对话"}
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {formatDate(new Date(conversation.lastActive))}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteConversation(conversation.id);
                }}
              >
                <Trash2 className="h-4 w-4 text-gray-400 hover:text-red-500" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ConversationSidebar;