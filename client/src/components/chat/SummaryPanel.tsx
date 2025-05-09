import React from "react";
import { ClipboardCopy } from "lucide-react";
import { useChatContext } from "@/context/ChatContext";
import { Button } from "@/components/ui/button";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { useToast } from "@/hooks/use-toast";

const SummaryPanel: React.FC = () => {
  const { summary, summarizing } = useChatContext();
  const { copy } = useCopyToClipboard();
  const { toast } = useToast();

  const handleCopyToClipboard = async () => {
    if (summary) {
      await copy(summary);
      toast({
        title: "Copied to clipboard",
        description: "The summary has been copied to your clipboard.",
      });
    }
  };

  return (
    <div className="hidden lg:flex lg:w-1/4 flex-col bg-muted/30">
      <div className="p-4 border-b border-border flex justify-between items-center">
        <h2 className="text-lg font-medium">Conversation Summary</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCopyToClipboard}
          disabled={!summary}
          className="text-muted-foreground hover:text-foreground"
        >
          <ClipboardCopy className="h-5 w-5" />
        </Button>
      </div>
      <div className="flex-1 p-4 overflow-y-auto">
        {summarizing ? (
          <div className="text-muted-foreground text-sm">
            Generating summary...
          </div>
        ) : summary ? (
          <div 
            className="prose dark:prose-invert prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: summary.replace(/\n/g, '<br>') }}
          />
        ) : (
          <div className="text-muted-foreground text-sm">
            Start a conversation to see a summary here.
          </div>
        )}
      </div>
    </div>
  );
};

export default SummaryPanel;
