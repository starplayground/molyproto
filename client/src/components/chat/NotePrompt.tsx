import React, { useState, useEffect } from "react";
import { useChatContext } from "@/context/ChatContext";
import { Trash2, Check, X } from "lucide-react";

const NotePrompt: React.FC = () => {
  const { showNotePrompt, skipNote, addToNotes, conversations, currentConversationId, tempSummary, refinedNoteContent } = useChatContext();
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

  // 提取精炼内容（如果有）
  const refinedContent = refinedNoteContent ? refinedNoteContent.replace(/^【.+?】\n?/, "").trim() : null;

  const handleDelete = () => {
    setVisible(false);
    skipNote();
  };

  const handleConfirm = () => {
    setVisible(false);
    addToNotes();
  };

  return (
    <div
      className="flex items-center rounded-2xl px-4 py-3 shadow-sm mt-2 transition-all duration-200 hover:shadow-md mx-4 bg-[#f3f0ff]"
      style={{ minWidth: '200px', maxWidth: '100%' }}
    >
      {/* 左侧圆角"笔记"按钮 */}
      <div className="flex flex-col items-center mr-3">
        <span
          className="bg-white font-semibold px-3 py-1 rounded-xl text-base shadow-sm text-violet-600 border border-violet-200 select-none"
          style={{ minWidth: 44, textAlign: 'center' }}
        >
          笔记
        </span>
      </div>
      {/* 右侧内容区 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="font-bold text-lg text-gray-900">{topic}</span>
          <div className="flex items-center gap-2 ml-2">
            <button
              onClick={handleDelete}
              className="p-1 rounded hover:bg-white/60 transition-all flex-shrink-0"
              aria-label="删除"
            >
              <X className="w-5 h-5 text-violet-500" />
            </button>
            <button
              onClick={handleConfirm}
              className="p-1 rounded hover:bg-white/60 transition-all flex-shrink-0"
              aria-label="确认"
            >
              <Check className="w-5 h-5 text-violet-500" />
            </button>
          </div>
        </div>
        {refinedContent && (
          <div className="mt-1 text-base text-violet-700 font-medium whitespace-pre-line">
            {refinedContent}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotePrompt; 