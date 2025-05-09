import React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useChatContext } from "@/context/ChatContext";
import { ClipboardCopy, X } from "lucide-react";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { useToast } from "@/hooks/use-toast";

const MobileSummaryModal: React.FC = () => {
  const { summary, summarizing, showMobileSummary, setShowMobileSummary } = useChatContext();
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
    <Sheet open={showMobileSummary} onOpenChange={setShowMobileSummary}>
      <SheetContent side="bottom" className="h-[80vh] sm:max-w-lg sm:mx-auto">
        <SheetHeader className="flex flex-row justify-between items-center border-b pb-2">
          <SheetTitle>Conversation Summary</SheetTitle>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCopyToClipboard}
              disabled={!summary}
            >
              <ClipboardCopy className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowMobileSummary(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </SheetHeader>
        <div className="mt-4 overflow-y-auto max-h-[calc(80vh-80px)]">
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
      </SheetContent>
    </Sheet>
  );
};

export default MobileSummaryModal;
