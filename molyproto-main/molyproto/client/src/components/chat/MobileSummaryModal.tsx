import React, { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useChatContext } from "@/context/ChatContext";
import { ClipboardCopy, X, Check } from "lucide-react";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const MobileSummaryModal: React.FC = () => {
  const { summary, setSummary, showMobileSummary, setShowMobileSummary, showNotePrompt, tempSummary, addToNotes, skipNote } = useChatContext();
  const { copy } = useCopyToClipboard();
  const { toast } = useToast();
  const [displayValue, setDisplayValue] = useState("");

  // Format the summary text with better spacing and line breaks
  const formatSummary = (text: string) => {
    if (!text) return "";
    // 按对话分割文本
    const conversations = text.split('\n\n---\n\n');
    return conversations
      .map((conversation, index) => {
        // 只在对话之间添加分隔符
        const separator = index > 0 ? '\n\n---\n\n' : '';
        // 保持对话内部的格式，只添加适当的换行
        const formattedConversation = conversation
          .split('\n')
          .map(line => line.trim())
          .filter(line => line)
          .join('\n');
        return `${separator}${formattedConversation}`;
      })
      .join('');
  };

  // Update display value when summary changes
  useEffect(() => {
    if (summary) {
      const formatted = formatSummary(summary);
      setDisplayValue(formatted);
    } else {
      setDisplayValue("");
    }
  }, [summary]);

  const handleCopyToClipboard = async () => {
    if (summary) {
      await copy(summary);
      toast({
        title: "已复制到剪贴板",
        description: "笔记内容已复制到剪贴板。",
      });
    }
  };

  // 提取笔记中的标签
  const extractTag = (text: string): string | null => {
    // 1. 直接匹配开头的【类别】格式
    const directMatch = text.match(/^【(.+?)】/);
    if (directMatch) return directMatch[1];
    
    // 2. 在 Markdown 内容中匹配【类别】
    const markdownMatch = text.match(/\n【(.+?)】/);
    if (markdownMatch) return markdownMatch[1];
    
    // 3. 查找任何位置的【类别】
    const anyMatch = text.match(/【(.+?)】/);
    if (anyMatch) return anyMatch[1];
    
    return null;
  };
  
  // 提取时间戳
  const extractTimestamp = (text: string): string | null => {
    const timestampMatch = text.match(/【(.+?)】\n\*(.+?)\*/);
    return timestampMatch ? timestampMatch[2] : null;
  };

  // 生成与标签匹配的颜色
  const getTagColor = (tagText: string) => {
    const hash = tagText.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const hue = hash % 360;
    return {
      border: `hsla(${hue}, 70%, 85%, 1)`,
      accent: `hsla(${hue}, 70%, 35%, 0.07)`,
      text: `hsla(${hue}, 70%, 35%, 1)`
    };
  };

  // 渲染单个笔记
  const renderNote = (note: string) => {
    // 提取标签以获取颜色
    const tag = extractTag(note);
    const timestamp = extractTimestamp(note);
    const colors = tag ? getTagColor(tag) : { border: '#e5e7eb', accent: '#f9fafb', text: '#374151' };
    
    // 清除标签、时间戳和note_id，只保留内容
    let formattedNote = note;
    if (tag) {
      // 移除标签和时间戳（如果有）
      formattedNote = timestamp
        ? formattedNote.replace(/^【(.+?)】\n\*(.+?)\*/, '') // 移除标签和时间戳
        : formattedNote.replace(/^【(.+?)】/, ''); // 只移除标签
    }
    // 移除note_id（如果有）
    formattedNote = formattedNote.replace(/\n\n<!-- note_id: .*? -->$/, '');

    return (
      <div 
        className="rounded-lg mb-6 transition-all duration-200 overflow-hidden shadow-sm"
        style={{ 
          border: `1px solid ${colors.border}`,
          backgroundColor: 'white'
        }}
      >
        {tag && (
          <div 
            className="px-4 py-2 font-medium text-sm rounded-t-lg"
            style={{ backgroundColor: colors.accent, color: colors.text }}
          >
            <div className="flex items-center">【{tag}】</div>
            {timestamp && (
              <div className="text-xs text-gray-500 mt-1 italic">
                {timestamp}
              </div>
            )}
          </div>
        )}
        <div className="p-4">
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            components={{
              // 自定义组件，处理HTML注释
              code: ({children, className, ...props}: any) => {
                const content = String(children);
                // 检测并隐藏时间戳和note_id注释
                if (content.includes('<!-- time:') || content.includes('<!-- note_id:')) {
                  return <span className="hide-note-meta">{children}</span>;
                }
                return <code className={className} {...props}>{children}</code>;
              }
            }}
          >
            {formattedNote.trim()}
          </ReactMarkdown>
        </div>
      </div>
    );
  };

  return (
    <Sheet open={showMobileSummary} onOpenChange={setShowMobileSummary}>
      <SheetContent side="bottom" className="h-[80vh] sm:max-w-lg sm:mx-auto">
        <SheetHeader className="flex flex-row justify-between items-center border-b pb-2">
          <SheetTitle>对话笔记</SheetTitle>
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
        <div className="mt-4 h-[calc(80vh-80px)] overflow-y-auto px-2">
          {summary ? (
            <div className="h-full w-full space-y-4">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                {summary.split('\n\n---\n\n').map((note, idx) => (
                  renderNote(note)
                ))}
              </div>
              {showNotePrompt && tempSummary && (
                <div 
                  className="rounded-lg shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden mb-6"
                  style={{
                    border: '1px solid #fde68a',
                    backgroundColor: 'white'
                  }}
                >
                  {extractTag(tempSummary) && (
                    <div className="px-4 py-2 font-medium text-sm rounded-t-lg"
                         style={{ backgroundColor: '#fef9e7' }}>
                      <div className="flex items-center">
                        【{extractTag(tempSummary)}】
                        <span className="ml-2 text-xs px-2 py-0.5 bg-yellow-200 rounded-full">新笔记</span>
                      </div>
                      {extractTimestamp(tempSummary) && (
                        <div className="text-xs text-gray-500 mt-1 italic">
                          {extractTimestamp(tempSummary)}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="p-4">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        // 自定义组件，处理HTML注释
                        code: ({children, className, ...props}: any) => {
                          const content = String(children);
                          // 检测并隐藏时间戳和note_id注释
                          if (content.includes('<!-- time:') || content.includes('<!-- note_id:')) {
                            return <span className="hide-note-meta">{children}</span>;
                          }
                          return <code className={className} {...props}>{children}</code>;
                        }
                      }}
                    >
                      {(() => {
                        let content = tempSummary;
                        const tag = extractTag(content);
                        const timestamp = extractTimestamp(content);
                        
                        if (tag) {
                          // 移除标签和时间戳（如果有）
                          content = timestamp
                            ? content.replace(/^【(.+?)】\n\*(.+?)\*/, '')
                            : content.replace(/^【(.+?)】/, '');
                        }
                        
                        // 移除note_id（如果有）
                        content = content.replace(/\n\n<!-- note_id: .*? -->$/, '');
                        
                        return content.trim();
                      })()}
                    </ReactMarkdown>
                  </div>
                  <div className="flex justify-end gap-2 p-3 bg-gray-50 border-t border-gray-100">
                    <button 
                      onClick={addToNotes} 
                      className="px-3 py-1.5 rounded-full bg-white border border-green-200 text-green-600 text-sm font-medium hover:bg-green-50 transition-all shadow-sm"
                    >
                      保存
                    </button>
                    <button 
                      onClick={skipNote} 
                      className="px-3 py-1.5 rounded-full bg-white border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-all shadow-sm"
                    >
                      删除
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-muted-foreground text-sm">
              开始对话并选择要保存的内容来创建笔记。
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MobileSummaryModal;
