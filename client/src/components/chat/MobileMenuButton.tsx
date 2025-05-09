import React from "react";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { useChatContext } from "@/context/ChatContext";

const MobileMenuButton: React.FC = () => {
  const { setShowSidebar } = useChatContext();

  return (
    <Button
      variant="ghost"
      size="icon"
      className="lg:hidden"
      onClick={() => setShowSidebar(true)}
      aria-label="Open menu"
    >
      <Menu className="h-5 w-5" />
    </Button>
  );
};

export default MobileMenuButton;