import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useChatContext } from "@/context/ChatContext";
import { useToast } from "@/hooks/use-toast";
import { ExternalLink } from "lucide-react";

const ApiKeyModal: React.FC = () => {
  const { apiKey, setApiKey, showApiKeyModal, setShowApiKeyModal } = useChatContext();
  const [inputApiKey, setInputApiKey] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (apiKey) {
      setInputApiKey(apiKey);
    }
  }, [apiKey]);

  const handleSaveApiKey = () => {
    const key = inputApiKey.trim();
    if (key) {
      if (!key.startsWith("sk-")) {
        toast({
          title: "Invalid API Key",
          description: "OpenAI API keys typically start with 'sk-'",
          variant: "destructive",
        });
        return;
      }

      setApiKey(key);
      setShowApiKeyModal(false);
      toast({
        title: "API key saved",
        description: "Your OpenAI API key has been saved.",
      });
    } else {
      toast({
        title: "API key required",
        description: "Please enter a valid API key to continue.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={showApiKeyModal} onOpenChange={setShowApiKeyModal}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enter Your OpenAI API Key</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-muted-foreground mb-4">
            Your API key is required to use the ChatGPT API. It is stored locally and never sent to our servers.
          </p>
          <div className="mb-4">
            <Label htmlFor="apiKeyInput" className="mb-2 block">API Key</Label>
            <Input
              id="apiKeyInput"
              type="password"
              placeholder="sk-..."
              value={inputApiKey}
              onChange={(e) => setInputApiKey(e.target.value)}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Don't have an API key? Get one from the{" "}
            <a
              href="https://platform.openai.com/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center"
            >
              OpenAI dashboard
              <ExternalLink className="h-3 w-3 ml-1" />
            </a>
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowApiKeyModal(false)}>
            Cancel
          </Button>
          <Button onClick={handleSaveApiKey}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ApiKeyModal;
