import React from "react";
import { Button } from "@/components/ui/button";
import { useChatContext } from "@/context/ChatContext";
import { Trash2, MessageSquarePlus, Menu } from "lucide-react";
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

  return (
    <div className={cn(
      "flex flex-col border-r border-border bg-background z-10 h-full transition-all duration-300 ease-in-out",
      isMobile ? "fixed inset-y-0 left-0 w-3/4 max-w-[300px]" : "w-[260px]",
      isMobile && !showSidebar && "-translate-x-full"
    )}>
      {/* Header */}
      <div className="p-3 border-b border-border flex justify-between items-center">
        <h2 className="text-lg font-medium">Conversations</h2>
        {isMobile && (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setShowSidebar(false)}
            className="lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* New Chat Button */}
      <div className="p-3">
        <Button 
          variant="default" 
          className="w-full flex items-center"
          onClick={handleNewConversation}
        >
          <MessageSquarePlus className="h-4 w-4 mr-2" />
          New Conversation
        </Button>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {conversations.map((conversation) => (
          <div 
            key={conversation.id}
            className={cn(
              "group p-2 rounded-md flex justify-between items-start cursor-pointer hover:bg-accent/50 transition-colors",
              conversation.id === currentConversationId && "bg-accent"
            )}
            onClick={() => handleSelectConversation(conversation.id)}
          >
            <div className="flex flex-col flex-1 truncate">
              <div className="font-medium truncate">{conversation.title}</div>
              <div className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(conversation.lastActive), { addSuffix: true })}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6"
              onClick={(e) => {
                e.stopPropagation();
                deleteConversation(conversation.id);
              }}
            >
              <Trash2 className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ConversationSidebar;