import React from "react";
import Header from "@/components/layout/Header";
import ChatPanel from "@/components/chat/ChatPanel";
import SummaryPanel from "@/components/chat/SummaryPanel";
import ApiKeyModal from "@/components/chat/ApiKeyModal";
import MobileSummaryModal from "@/components/chat/MobileSummaryModal";
import { useChatContext } from "@/context/ChatContext";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";

const ChatPage: React.FC = () => {
  const { 
    showMobileSummary, 
    setShowMobileSummary,
    showApiKeyModal
  } = useChatContext();

  return (
    <div className="flex flex-col h-screen bg-background">
      <Header />
      
      <main className="flex flex-1 overflow-hidden">
        <ChatPanel />
        <SummaryPanel />
      </main>
      
      {/* Mobile summary button */}
      <div className="fixed bottom-20 right-4 lg:hidden">
        <Button 
          variant="default" 
          size="icon" 
          className="h-12 w-12 rounded-full shadow-lg bg-primary hover:bg-primary/90"
          onClick={() => setShowMobileSummary(true)}
        >
          <FileText className="h-5 w-5" />
        </Button>
      </div>
      
      {/* Modals */}
      {showApiKeyModal && <ApiKeyModal />}
      {showMobileSummary && <MobileSummaryModal />}
    </div>
  );
};

export default ChatPage;
