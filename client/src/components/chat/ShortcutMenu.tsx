import React, { useState, useEffect, useRef } from "react";
import { ShortcutOption } from "@/lib/shortcuts";

interface ShortcutMenuProps {
  options: ShortcutOption[];
  position: { top: number; left: number };
  onSelect: (option: ShortcutOption) => void;
  onClose: () => void;
}

const ShortcutMenu: React.FC<ShortcutMenuProps> = ({ 
  options, 
  position, 
  onSelect,
  onClose 
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % options.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + options.length) % options.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        onSelect(options[selectedIndex]);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [options, selectedIndex, onSelect, onClose]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div 
      ref={menuRef}
      className="absolute z-50 bg-popover border-2 border-primary rounded-md shadow-lg py-2 w-64"
      style={{ 
        top: `${position.top}px`, 
        left: `${position.left}px`,
        maxHeight: '200px',
        overflowY: 'auto'
      }}
    >
      <div className="px-3 py-1 mb-1 text-sm font-medium text-muted-foreground border-b">
        快捷选项
      </div>
      {options.map((option, index) => (
        <div
          key={option.id}
          className={`px-3 py-3 cursor-pointer flex items-center hover:bg-accent transition-colors ${
            index === selectedIndex ? 'bg-accent text-accent-foreground' : 'text-foreground'
          }`}
          onClick={() => onSelect(option)}
          onMouseEnter={() => setSelectedIndex(index)}
        >
          <div className="w-8 h-8 flex items-center justify-center rounded-full bg-primary text-primary-foreground mr-3 font-bold">
            {option.name}
          </div>
          <div className="text-sm">{option.description}</div>
        </div>
      ))}
    </div>
  );
};

export default ShortcutMenu;