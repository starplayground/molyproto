import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useChatContext } from "@/context/ChatContext";
import { Trash2, Check, X } from "lucide-react";

const NotePrompt: React.FC = () => {
  const { showNotePrompt, skipNote, conversations, currentConversationId, tempSummary } = useChatContext();
  const [visible, setVisible] = useState(false);

  // Show card when showNotePrompt is true and hide when switching conversations
  useEffect(() => {
    if (showNotePrompt) {
      setVisible(true);
    } else {
      setVisible(false);
    }
  }, [showNotePrompt, currentConversationId]);

  if (!visible) return null;

  // Get the current conversation
  const conversation = conversations.find(c => c.id === currentConversationId);
  if (!conversation) return null;

  // 提取对话主题
  const topicMatch = tempSummary?.match(/【(.+?)】/);
  const topic = topicMatch ? topicMatch[1] : "正在生成主题...";

  const handleDelete = () => {
    setVisible(false);
    skipNote();
  };

  return (
    <div 
      className="flex flex-col rounded-xl px-4 py-2 shadow-sm mt-2 transition-all duration-200 hover:shadow-md mx-4"
      style={{ 
        backgroundColor: '#f3f0ff',
        width: 'fit-content',
        minWidth: '200px',
        maxWidth: '90%'
      }}
    >
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span 
            className="bg-white font-semibold px-2 py-1 rounded-lg text-sm whitespace-nowrap shadow-sm text-violet-600"
          >
            笔记
          </span>
          <span className="font-semibold text-sm text-violet-800">
            {topic}
          </span>
        </div>
        <button
          onClick={handleDelete}
          className="p-1 rounded hover:bg-white/60 transition-all ml-3 flex-shrink-0"
          aria-label="删除"
        >
          <Trash2 className="w-4 h-4 text-violet-500" />
        </button>
      </div>
    </div>
  );
};

export default NotePrompt; 