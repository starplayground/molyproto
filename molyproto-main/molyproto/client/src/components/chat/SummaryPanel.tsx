import React, { useState, useEffect } from "react";
import { ClipboardCopy, Check, X } from "lucide-react";
import { useChatContext } from "@/context/ChatContext";
import { Button } from "@/components/ui/button";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Conversation } from "@/lib/types";

const SummaryPanel: React.FC = () => {
  const { summary, setSummary, showNotePrompt, tempSummary, addToNotes, skipNote, currentConversationId, updateCurrentConversation } = useChatContext();
  const { copy } = useCopyToClipboard();
  const { toast } = useToast();
  const [displayValue, setDisplayValue] = useState("");
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  // Convert number to Chinese numeral
  const toChineseNumeral = (num: number): string => {
    const numerals = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
    if (num <= 10) return numerals[num - 1];
    if (num < 20) return '十' + (num % 10 === 0 ? '' : numerals[num % 10 - 1]);
    return numerals[Math.floor(num / 10) - 1] + '十' + (num % 10 === 0 ? '' : numerals[num % 10 - 1]);
  };

  // Merge notes of the same type
  const mergeNotesByType = (notes: string[], isTemp: boolean = false): string[] => {
    const noteGroups = new Map<string, string[]>();
    
    notes.forEach(note => {
      const tagMatch = note.match(/^【(.+?)】/);
      const tag = tagMatch ? tagMatch[1] : '未分类';
      
      if (!noteGroups.has(tag)) {
        noteGroups.set(tag, []);
      }
      noteGroups.get(tag)?.push(note);
    });

    return Array.from(noteGroups.entries()).map(([tag, groupNotes]) => {
      // For temporary notes, only keep the first one
      if (isTemp && groupNotes.length > 1) {
        groupNotes = [groupNotes[0]];
      }

      if (groupNotes.length === 1) {
        return groupNotes[0];
      }

      // Merge multiple notes of the same type
      const mergedContent = groupNotes.map((note, index) => {
        // Remove the tag and timestamp from the note content
        let content = note
          .replace(/^【.+?】\n\*(.+?)\*/, '')
          .replace(/^【.+?】/, '')
          .trim();

        // Strip existing numbering like "## 一、" or "1." to avoid nested numbers
        content = content
          .replace(/^#{1,6}\s*[一二三四五六七八九十]+、?\s*\n?/, '')
          .replace(/^\d+[\.、]\s*/, '');
        
        // Handle Markdown headers
        content = content.replace(/^(#{1,6})\s(.+)$/gm, (match, hashes, title) => `${hashes} ${title}`);

        // If no headers found, add numeric prefix
        if (!content.match(/^(#{1,6})\s/)) {
          if (!content.match(/^\d+\./)) {
            content = `${index + 1}. ${content}`;
          }
        }

        return `## ${toChineseNumeral(index + 1)}、\n${content}`;
      }).join('\n\n');

      // Get the timestamp from the first note
      const timestampMatch = groupNotes[0].match(/【(.+?)】\n\*(.+?)\*/);
      const timestamp = timestampMatch ? timestampMatch[2] : null;

      // Construct the merged note
      return `【${tag}】${timestamp ? `\n*${timestamp}*` : ''}\n\n${mergedContent}`;
    });
  };

  // Format the summary text with better spacing and line breaks
  const formatSummary = (text: string) => {
    if (!text) return "";
    // 按对话分割文本
    const conversations = text.split('\n\n---\n\n');
    return conversations
      .map((conversation, index) => {
        // 只在对话之间添加分隔符
        const separator = index > 0 ? '\n\n---\n\n' : '';
        return `${separator}${conversation}`;
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

  const handleNoteClick = (note: string) => {
    setEditingNote(note);
    setEditValue(note);
  };

  const handleNoteSave = () => {
    if (editingNote && summary) {
      const notes = summary.split('\n\n---\n\n');

      // Remove numbering prefixes before saving the edited note
      const processedValue = editValue
        .replace(/^#{1,6}\s*[一二三四五六七八九十]+、?\s*\n?/, '')
        .replace(/^\d+[\.、]\s*/, '');

      const updatedNotes = notes.map(note =>
        note === editingNote ? processedValue : note
      );
      const newSummary = updatedNotes.join('\n\n---\n\n');

      // 更新本地状态和对话内容
      setSummary(newSummary);

      if (currentConversationId) {
        updateCurrentConversation((conv: Conversation) => ({
          ...conv,
          summary: newSummary,
          lastActive: new Date()
        }));
      }

      setEditingNote(null);
    }
  };

  const handleNoteCancel = () => {
    setEditingNote(null);
  };

  const renderNote = (note: string, isTemp: boolean, idx: number) => {
    // 提取标签以获取颜色
    const tagMatch = note.match(/^【(.+?)】/);
    const tag = tagMatch ? tagMatch[1] : null;
    
    // 提取时间戳（如果存在）
    const timestampMatch = note.match(/【(.+?)】\n\*(.+?)\*/);
    const timestamp = timestampMatch ? timestampMatch[2] : null;
    
    // 生成与标签匹配的颜色
    const getTagColor = (tagText: string) => {
      const hash = tagText.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const hue = hash % 360;
      return {
        border: `hsla(${hue}, 70%, 85%, 1)`,
        accent: `hsla(${hue}, 70%, 35%, 0.07)`
      };
    };
    
    const colors = tag ? getTagColor(tag) : { border: '#e5e7eb', accent: '#f9fafb' };
    
    if (editingNote === note) {
      // 编辑工具栏插入函数
      const insertAtCursor = (before: string, after: string = '', placeholder: string = '') => {
        const textarea = document.getElementById('note-edit-textarea') as HTMLTextAreaElement;
        if (!textarea) return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const value = textarea.value;
        const selected = value.substring(start, end) || placeholder;
        const newValue = value.substring(0, start) + before + selected + after + value.substring(end);
        setEditValue(newValue);
        // 设置光标位置
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start + before.length, start + before.length + selected.length);
        }, 0);
      };
      // 撤销/重做按钮已移除（textarea原生不支持undo/redo API）
      return (
        <div className="relative">
          {/* 编辑工具栏 */}
          <div className="flex gap-2 mb-2 flex-wrap z-0 relative" style={{marginTop: 0}}>
            <button type="button" className="p-1.5 rounded hover:bg-gray-100" title="加粗" onClick={() => insertAtCursor('**', '**', '加粗文本')}><b>B</b></button>
            <button type="button" className="p-1.5 rounded hover:bg-gray-100" title="斜体" onClick={() => insertAtCursor('*', '*', '斜体文本')}><i>I</i></button>
            <button type="button" className="p-1.5 rounded hover:bg-gray-100" title="无序列表" onClick={() => insertAtCursor('\n- ', '', '列表项')}>• List</button>
            <button type="button" className="p-1.5 rounded hover:bg-gray-100" title="有序列表" onClick={() => insertAtCursor('\n1. ', '', '列表项')}>1. List</button>
            <button type="button" className="p-1.5 rounded hover:bg-gray-100" title="代码块" onClick={() => insertAtCursor('\n```\n', '\n```\n', '代码内容')}>{'</>'}</button>
            <button type="button" className="p-1.5 rounded hover:bg-gray-100" title="分割线" onClick={() => insertAtCursor('\n---\n', '', '')}>—</button>
            <button type="button" className="p-1.5 rounded hover:bg-gray-100" title="引用" onClick={() => insertAtCursor('\n> ', '', '引用内容')}>❝</button>
            <button type="button" className="p-1.5 rounded hover:bg-gray-100" title="插入链接" onClick={() => insertAtCursor('[', '](url)', '链接文本')}>🔗</button>
            <button type="button" className="p-1.5 rounded hover:bg-gray-100" title="插入图片" onClick={() => insertAtCursor('![', '](url)', '图片描述')}>🖼️</button>
          </div>
          {/* 右上角操作按钮绝对定位，z-10，工具栏下方有足够margin-top避免重叠 */}
          <div className="absolute top-3 right-3 flex gap-2 z-10">
            <button
              onClick={handleNoteSave}
              className="p-1.5 rounded-full bg-white shadow-sm hover:shadow-md transition-all"
              title="保存"
            >
              <Check className="w-4 h-4 text-green-600" />
            </button>
            <button
              onClick={handleNoteCancel}
              className="p-1.5 rounded-full bg-white shadow-sm hover:shadow-md transition-all"
              title="取消"
            >
              <X className="w-4 h-4 text-red-600" />
            </button>
          </div>
          <textarea
            id="note-edit-textarea"
            value={editValue}
            onChange={(e) => {
              setEditValue(e.target.value);
              // 动态调整高度，但限制最大高度
              const textarea = e.target;
              textarea.style.height = "auto";
              const newHeight = Math.min(textarea.scrollHeight, 500); // 限制最大高度为500px
              textarea.style.height = newHeight + "px";
            }}
            className="w-full p-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none shadow-sm mt-2 overflow-y-auto"
            autoFocus
            style={{
              minHeight: "100px",
              maxHeight: "500px",
              overflow: "auto",
              borderColor: colors.border
            }}
            ref={el => {
              if (el) {
                el.style.height = "auto";
                const newHeight = Math.min(el.scrollHeight, 500);
                el.style.height = newHeight + "px";
              }
            }}
          />
        </div>
      );
    }

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
    
    // 确保笔记内容不为空
    if (!formattedNote.trim()) {
      formattedNote = note; // 如果处理后内容为空，使用原始内容
    }
    
    // 处理 Markdown 格式
    formattedNote = formattedNote
      .replace(/\n\n+/g, '\n\n') // 将多个空行替换为两个空行
      .replace(/^\s+|\s+$/g, '') // 移除首尾空白
      .trim(); // 确保没有多余的空白
    
    console.log('处理后的笔记内容:', {
      original: note.substring(0, 50) + '...',
      formatted: formattedNote.substring(0, 50) + '...',
      tag,
      timestamp
    });
    
    return (
      <div 
        onClick={() => handleNoteClick(note)}
        className="cursor-pointer rounded-2xl transition-all duration-200 bg-white shadow-md hover:shadow-2xl border border-gray-200 hover:-translate-y-1 mb-6 relative"
        style={{ 
          border: `1.5px solid ${colors.border}`,
          backgroundColor: 'white',
          boxShadow: '0 2px 12px 0 rgba(120, 60, 255, 0.08)'
        }}
      >
        {/* 临时笔记右上角操作按钮 */}
        {isTemp && (
          <div className="absolute top-3 right-3 flex gap-2 z-10">
            <button
              onClick={e => { e.stopPropagation(); addToNotes(); }}
              className="p-1.5 rounded-full bg-white shadow-sm hover:shadow-md transition-all"
              title="保留该笔记"
            >
              <Check className="w-4 h-4 text-green-600" />
            </button>
            <button
              onClick={e => { e.stopPropagation(); skipNote(); }}
              className="p-1.5 rounded-full bg-white shadow-sm hover:shadow-md transition-all"
              title="删除该笔记"
            >
              <X className="w-4 h-4 text-red-600" />
            </button>
          </div>
        )}
        {tag && (
          <div 
            className="px-5 py-2 font-semibold text-base rounded-t-2xl flex items-center gap-2"
            style={{ backgroundColor: colors.accent }}
          >
            <div className="flex items-center">【{tag}】
              {isTemp && (
                <span className="ml-2 text-xs px-2 py-0.5 bg-yellow-300 text-yellow-900 rounded-full font-bold animate-pulse">新增</span>
              )}
            </div>
            {timestamp && (
              <div className="text-xs text-gray-500 mt-1 italic">
                {timestamp}
              </div>
            )}
          </div>
        )}
        <div className="p-5 text-gray-800 text-[15px] leading-relaxed">
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ children }) => <p className="mb-2">{children}</p>,
              ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
              li: ({ children }) => <li className="mb-1">{children}</li>,
              code: ({ children }) => <code className="bg-gray-100 px-1 rounded">{children}</code>,
              pre: ({ children }) => <pre className="bg-gray-100 p-2 rounded mb-2 overflow-x-auto">{children}</pre>,
              h1: ({ children }) => <h1 className="text-2xl font-bold mt-4 mb-2">{children}</h1>,
              h2: ({ children }) => <h2 className="text-xl font-bold mt-3 mb-2">{children}</h2>,
              h3: ({ children }) => <h3 className="text-lg font-bold mt-3 mb-2">{children}</h3>,
              h4: ({ children }) => <h4 className="text-base font-bold mt-2 mb-1">{children}</h4>,
              h5: ({ children }) => <h5 className="text-sm font-bold mt-2 mb-1">{children}</h5>,
              h6: ({ children }) => <h6 className="text-xs font-bold mt-2 mb-1">{children}</h6>
            }}
          >
            {formattedNote}
          </ReactMarkdown>
        </div>
      </div>
    );
  };

  // 解析所有类型（包含正式和临时笔记）
  const getAllTypes = (notesArr: string[], tempArr: string[]) => {
    const types = new Set<string>();
    
    // 不再自动添加默认类型
    
    const processNote = (note: string) => {
      // 1. 直接匹配【类别】格式
      const directMatch = note.match(/^【(.+?)】/);
      if (directMatch) {
        types.add(directMatch[1]);
        console.log('找到直接匹配类型:', directMatch[1]);
        return;
      }
      
      // 2. 在 Markdown 内容中匹配【类别】
      const markdownMatch = note.match(/\n【(.+?)】/);
      if (markdownMatch) {
        types.add(markdownMatch[1]);
        console.log('找到Markdown内匹配类型:', markdownMatch[1]);
        return;
      }
      
      // 3. 查找任何位置的【类别】
      const anyMatch = note.match(/【(.+?)】/);
      if (anyMatch) {
        types.add(anyMatch[1]);
        console.log('找到任意位置匹配类型:', anyMatch[1]);
      } else {
        console.log('未找到类型标签，笔记内容:', note.substring(0, 50) + '...');
      }
    };
    
    console.log('处理正式笔记，数量:', notesArr.length);
    notesArr.forEach(processNote);
    console.log('处理临时笔记，数量:', tempArr.length);
    tempArr.forEach(processNote);
    
    const result = Array.from(types);
    console.log('提取到的所有类型:', result);
    return result;
  };

  const notes = summary ? summary.split('\n\n---\n\n') : [];
  const tempNotes = tempSummary ? tempSummary.split('\n\n---\n\n') : [];
  console.log('summary内容前50字符:', summary ? summary.substring(0, 50) : 'null');
  console.log('tempSummary内容前50字符:', tempSummary ? tempSummary.substring(0, 50) : 'null');
  const allTypes = getAllTypes(notes, tempNotes);

  // 标签栏状态
  const [activeTypes, setActiveTypes] = useState<string[]>(allTypes);
  const [selectedType, setSelectedType] = useState<string>(allTypes.length > 0 ? allTypes[0] : "");
  
  // Debug logging for activeTypes
  useEffect(() => {
    console.log('SummaryPanel 渲染，activeTypes:', activeTypes);
  }, [activeTypes]);

  // 保证标签栏和类型同步
  useEffect(() => {
    const newAllTypes = getAllTypes(notes, tempNotes);
    setActiveTypes(newAllTypes);
    if (newAllTypes.length === 0) {
      setSelectedType("");
    } else if (!newAllTypes.includes(selectedType)) {
      setSelectedType(newAllTypes[0]);
    }
  }, [notes, tempNotes, selectedType]);

  // 关闭标签
  const handleCloseType = (type: string) => {
    // 从 activeTypes 中移除该类型
    const newTypes = activeTypes.filter(t => t !== type);
    setActiveTypes(newTypes);
    
    // 如果当前选中的类型是要关闭的类型，则切换到其他类型
    if (selectedType === type) {
      setSelectedType(newTypes.length > 0 ? newTypes[0] : "");
    }

    // 从 summary 中删除该类型的所有笔记
    if (summary) {
      const notes = summary.split('\n\n---\n\n');
      const filteredNotes = notes.filter(note => {
        const tagMatch = note.match(/^【(.+?)】/);
        const noteTag = tagMatch ? tagMatch[1] : '未分类';
        return noteTag !== type;
      });
      const newSummary = filteredNotes.join('\n\n---\n\n');
      setSummary(newSummary);

      // 更新当前对话的 summary
      updateCurrentConversation(conv => ({
        ...conv,
        summary: newSummary
      }));
    }
  };

  // 修改渲染标签栏的函数，使标签栏显示在笔记内容上方
  const renderTypeTabs = () => {
    if (activeTypes.length === 0) {
      return null;
    }
    const getTagColor = (tagText: string) => {
      const hash = tagText.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const hue = hash % 360;
      return {
        bg: `hsla(${hue}, 85%, ${tagText === selectedType ? '92%' : '96%'}, 1)`,
        text: `hsla(${hue}, 70%, 35%, 1)`,
        border: `hsla(${hue}, 70%, 85%, 1)`
      };
    };
    return (
      <div className="flex gap-3 flex-wrap w-full justify-start mb-6">
        {activeTypes.map(type => {
          const colors = getTagColor(type);
          return (
            <div
              key={type}
              className={`flex items-center rounded-full px-5 py-2 text-base cursor-pointer select-none transition-all duration-200 shadow-lg hover:shadow-xl font-semibold ${type === selectedType ? 'scale-105 ring-2 ring-violet-400' : ''}`}
              style={{
                backgroundColor: colors.bg,
                color: colors.text,
                border: `1.5px solid ${colors.border}`,
                boxShadow: type === selectedType ? '0 4px 16px 0 rgba(120, 60, 255, 0.10)' : '0 2px 8px 0 rgba(120, 60, 255, 0.06)',
                fontWeight: type === selectedType ? 700 : 500,
                transform: type === selectedType ? 'scale(1.08)' : 'scale(1)'
              }}
              onClick={() => setSelectedType(type)}
            >
              {type}
              <button
                className="ml-2 rounded-full hover:bg-white/60 p-0.5 transition-all"
                onClick={e => { e.stopPropagation(); handleCloseType(type); }}
                style={{ color: colors.text }}
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
    );
  };

  // 笔记按所选类型过滤
  const filterNoteByType = (note: string, type: string) => {
    // 提取笔记中的标签（如果有）
    const extractTag = (text: string): string => {
      // 1. 直接匹配开头的【类别】格式
      const directMatch = text.match(/^【(.+?)】/);
      if (directMatch) return directMatch[1];
      
      // 2. 在 Markdown 内容中匹配【类别】
      const markdownMatch = text.match(/\n【(.+?)】/);
      if (markdownMatch) return markdownMatch[1];
      
      // 3. 查找任何位置的【类别】
      const anyMatch = text.match(/【(.+?)】/);
      if (anyMatch) return anyMatch[1];
      
      return "未分类"; // 返回默认分类
    };
    
    const noteTag = extractTag(note);
    console.log(`过滤笔记，笔记标签: ${noteTag}, 要匹配的类型: ${type}`);
    
    // 如果没有选择类型，显示所有笔记
    if (type === "") {
      return true;
    }
    
    // 如果笔记没有标签，显示在"未分类"类型下
    if (noteTag === "未分类") {
      return type === "未分类";
    }
    
    // 检查标签是否完全匹配
    if (noteTag === type) {
      return true;
    }
    
    // 检查标签是否部分匹配（例如：标签"React组件"应该匹配"React"类型）
    return noteTag.includes(type) || type.includes(noteTag);
  };

  // Modify the renderNotes function
  const renderNotes = () => {
    // Merge notes of the same type
    const mergedNotes = mergeNotesByType(notes);
    const mergedTempNotes = mergeNotesByType(tempNotes, true);

    return (
      <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
        {/* 正式笔记 */}
        {mergedNotes
          .filter(note => selectedType === "" || filterNoteByType(note, selectedType))
          .map((note, idx) => renderNote(note, false, idx))}
          
        {/* 临时笔记显示在正式笔记下方 */}
        {mergedTempNotes
          .filter(note => selectedType === "" || filterNoteByType(note, selectedType))
          .map((note, idx) => renderNote(note, true, idx))}
          
        {/* 如果没有笔记，显示空状态 */}
        {notes.length === 0 && tempNotes.length === 0 && (
          <div className="text-center p-8 text-muted-foreground">
            对话笔记将在这里显示
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="hidden lg:flex lg:w-[45%] flex-col bg-muted/30 h-full relative">
      <div className="p-4 border-b border-border flex justify-between items-center">
        <h2 className="text-lg font-medium">对话笔记</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4 scrollbar-custom">
        <div className="space-y-4">
          {renderTypeTabs()}
          {renderNotes()}
        </div>
      </div>
    </div>
  );
};

export default SummaryPanel;
