import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Model } from "@/lib/types";

interface ModelSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (modelId: string) => void;
  selectedModelId: string;
}

const AVAILABLE_MODELS: Model[] = [
  {
    id: "gpt-3.5-turbo",
    name: "GPT-3.5 Turbo",
    description: "Fast and efficient for most tasks",
  },
  {
    id: "gpt-4",
    name: "GPT-4",
    description: "Most capable model, better for complex tasks",
  },
  {
    id: "gpt-4-turbo",
    name: "GPT-4 Turbo",
    description: "Latest GPT-4 model with improved performance",
  },
];

const ModelSelectModal: React.FC<ModelSelectModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  selectedModelId,
}) => {
  const handleSelect = (modelId: string) => {
    onSelect(modelId);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Select AI Model</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <RadioGroup
            value={selectedModelId}
            onValueChange={handleSelect}
            className="space-y-4"
          >
            {AVAILABLE_MODELS.map((model) => (
              <div
                key={model.id}
                className="flex items-start space-x-3 rounded-lg border p-4 hover:bg-accent/50 cursor-pointer"
                onClick={() => handleSelect(model.id)}
              >
                <RadioGroupItem value={model.id} id={model.id} />
                <div className="flex-1">
                  <Label
                    htmlFor={model.id}
                    className="text-base font-medium cursor-pointer"
                  >
                    {model.name}
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {model.description}
                  </p>
                </div>
              </div>
            ))}
          </RadioGroup>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ModelSelectModal; 