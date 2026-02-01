import React, { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  className?: string;
}

export function RichTextEditor({
  value,
  onChange,
  onBlur,
  placeholder = 'Start typing...',
  className = ''
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current && value !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  };

  const ToolbarButton = ({ 
    onClick, 
    children, 
    title 
  }: { 
    onClick: () => void; 
    children: React.ReactNode; 
    title?: string;
  }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="p-1.5 rounded hover:bg-[var(--muted)] transition-colors"
      style={{ color: 'var(--foreground)' }}
      onMouseDown={(e) => e.preventDefault()}
    >
      {children}
    </button>
  );

  return (
    <div className={cn("border rounded", className)} style={{ borderColor: 'var(--border)', backgroundColor: 'var(--background)' }}>
      {/* Toolbar */}
      <div 
        ref={toolbarRef}
        className="flex items-center gap-1 p-2 border-b flex-wrap"
        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--muted)' }}
      >
        <ToolbarButton onClick={() => execCommand('bold')} title="Bold">
          <strong>B</strong>
        </ToolbarButton>
        <ToolbarButton onClick={() => execCommand('italic')} title="Italic">
          <em>I</em>
        </ToolbarButton>
        <ToolbarButton onClick={() => execCommand('underline')} title="Underline">
          <u>U</u>
        </ToolbarButton>
        <div className="w-px h-6" style={{ backgroundColor: 'var(--border)' }} />
        <ToolbarButton onClick={() => execCommand('formatBlock', '<h2>')} title="Heading">
          H
        </ToolbarButton>
        <div className="w-px h-6" style={{ backgroundColor: 'var(--border)' }} />
        <ToolbarButton onClick={() => execCommand('insertUnorderedList')} title="Bullet List">
          •
        </ToolbarButton>
        <ToolbarButton onClick={() => execCommand('insertOrderedList')} title="Numbered List">
          1.
        </ToolbarButton>
        <div className="w-px h-6" style={{ backgroundColor: 'var(--border)' }} />
        <ToolbarButton onClick={() => execCommand('justifyLeft')} title="Align Left">
          ⬅
        </ToolbarButton>
        <ToolbarButton onClick={() => execCommand('justifyCenter')} title="Align Center">
          ⬌
        </ToolbarButton>
        <ToolbarButton onClick={() => execCommand('justifyRight')} title="Align Right">
          ➡
        </ToolbarButton>
        <div className="w-px h-6" style={{ backgroundColor: 'var(--border)' }} />
        <ToolbarButton onClick={() => {
          const url = prompt('Enter URL:');
          if (url) execCommand('createLink', url);
        }} title="Insert Link">
          🔗
        </ToolbarButton>
        <ToolbarButton onClick={() => execCommand('removeFormat')} title="Remove Formatting">
          ✕
        </ToolbarButton>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onBlur={onBlur}
        className="min-h-[100px] p-3 outline-none text-sm"
        style={{ 
          color: 'var(--foreground)',
          backgroundColor: 'var(--background)'
        }}
        data-placeholder={placeholder}
        suppressContentEditableWarning
      />
      
      <style>{`
        [contenteditable][data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: var(--muted-foreground);
          opacity: 0.5;
        }
      `}</style>
    </div>
  );
}

