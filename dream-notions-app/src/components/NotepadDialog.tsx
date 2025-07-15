import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface NotepadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  value: string;
  onChange: (value: string) => void;
  onSave?: (value: string) => void; // Add onSave prop
}

const NotepadDialog: React.FC<NotepadDialogProps> = ({ isOpen, onClose, value, onChange, onSave }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Reset content to initialContent whenever dialog is opened
  useEffect(() => {
    if (isOpen) {
      // setContent(initialContent); // This line is removed as per the edit hint
    }
  }, [isOpen, value]); // Changed initialContent to value

  // Move line up
  const moveLineUp = () => {
    if (!textareaRef.current) return;
    const lines = value.split('\n');
    const cursorPos = textareaRef.current.selectionStart;
    let currentPos = 0;
    let lineIndex = 0;
    for (let i = 0; i < lines.length; i++) {
      const lineLength = lines[i].length + 1;
      if (cursorPos <= currentPos + lineLength) {
        lineIndex = i;
        break;
      }
      currentPos += lineLength;
    }
    if (lineIndex <= 0) return;
    const temp = lines[lineIndex];
    lines[lineIndex] = lines[lineIndex - 1];
    lines[lineIndex - 1] = temp;
    onChange(lines.join('\n'));
  };

  // Move line down
  const moveLineDown = () => {
    if (!textareaRef.current) return;
    const lines = value.split('\n');
    const cursorPos = textareaRef.current.selectionStart;
    let currentPos = 0;
    let lineIndex = 0;
    for (let i = 0; i < lines.length; i++) {
      const lineLength = lines[i].length + 1;
      if (cursorPos <= currentPos + lineLength) {
        lineIndex = i;
        break;
      }
      currentPos += lineLength;
    }
    if (lineIndex >= lines.length - 1) return;
    const temp = lines[lineIndex];
    lines[lineIndex] = lines[lineIndex + 1];
    lines[lineIndex + 1] = temp;
    onChange(lines.join('\n'));
  };

  // Helper: get current line index and text
  const getCurrentLineInfo = () => {
    if (!textareaRef.current) return { lineIndex: -1, line: '' };
    const lines = value.split('\n');
    const cursorPos = textareaRef.current.selectionStart;
    let currentPos = 0;
    let lineIndex = 0;
    for (let i = 0; i < lines.length; i++) {
      const lineLength = lines[i].length + 1;
      if (cursorPos <= currentPos + lineLength) {
        lineIndex = i;
        break;
      }
      currentPos += lineLength;
    }
    return { lineIndex, line: lines[lineIndex] || '' };
  };

  // Promote: Move current line to top of Todo section (or top of content)
  const promoteToTodo = () => {
    const lines = value.split('\n');
    const { lineIndex, line } = getCurrentLineInfo();
    if (!line.trim()) return;
    lines.splice(lineIndex, 1);
    // Find Todo section
    let todoIndex = lines.findIndex(l => l.trim().toLowerCase().startsWith('## todo'));
    if (todoIndex === -1) {
      // No Todo section, add at top
      lines.unshift('## Todo', line);
    } else {
      lines.splice(todoIndex + 1, 0, line);
    }
    onChange(lines.join('\n'));
  };

  // Demote: Move current line to bottom of Inbox section (or bottom of content)
  const demoteFromTodo = () => {
    const lines = value.split('\n');
    const { lineIndex, line } = getCurrentLineInfo();
    if (!line.trim()) return;
    lines.splice(lineIndex, 1);
    // Find Inbox section
    let inboxIndex = lines.findIndex(l => l.trim().toLowerCase().startsWith('## inbox'));
    if (inboxIndex === -1) {
      // No Inbox section, add at end
      lines.push('## Inbox', line);
    } else {
      // Find end of Inbox section
      let insertAt = inboxIndex + 1;
      while (insertAt < lines.length && lines[insertAt].trim() && !lines[insertAt].startsWith('## ')) {
        insertAt++;
      }
      lines.splice(insertAt, 0, line);
    }
    onChange(lines.join('\n'));
  };

  // Done: Move current line to top of Done section (create if needed)
  const moveToDone = () => {
    const lines = value.split('\n');
    const { lineIndex, line } = getCurrentLineInfo();
    if (!line.trim()) return;
    lines.splice(lineIndex, 1);
    // Find Done section
    let doneIndex = lines.findIndex(l => l.trim().toLowerCase().startsWith('## done'));
    if (doneIndex === -1) {
      // No Done section, add at end
      lines.push('## Done', line);
    } else {
      lines.splice(doneIndex + 1, 0, line);
    }
    onChange(lines.join('\n'));
  };

  // const handleSave = () => { // This function is removed as per the edit hint
  //   onSave(content);
  // };

  if (!isOpen) return null;
  return (
    <div
      style={{
        position: 'fixed',
        top: 120,
        left: 120,
        zIndex: 1000,
        width: '100%',
        maxWidth: '48rem',
        minWidth: 0,
        height: '650px',
        minHeight: '500px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
        display: 'flex',
        flexDirection: 'column',
      }}
      className="bg-card border border-border shadow-lg rounded-lg p-0"
    >
      <div
        className="flex items-center justify-between px-4 py-2 rounded-t-lg bg-muted border-b border-border"
        style={{ userSelect: 'none' }}
      >
        <span className="font-semibold text-primary">Notepad</span>
        <Button size="icon" variant="ghost" onClick={onClose} title="Close Notepad">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </Button>
      </div>
      <div className="flex-1 flex flex-col min-h-0 h-full" style={{overflow: 'hidden'}}>
        <div className="flex-1 flex flex-col h-full min-h-0">
          <Textarea
            ref={textareaRef}
            className="w-full flex-1 min-h-0 p-3 font-mono text-xs resize-none text-foreground bg-transparent border-0 rounded-none placeholder:text-muted-foreground focus:outline-none focus:ring-0"
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder="Start writing your notes in markdown...\n\nUse ## Todo, ## Que, ## Done, and ## Inbox sections for task management."
          />
        </div>
        <div className="flex gap-2 items-center p-2 bg-card border-t border-border w-full flex-shrink-0">
          <Button variant="outline" size="sm" onClick={promoteToTodo} className="text-xs h-7 bg-primary text-primary-foreground hover:bg-primary/90">Promote</Button>
          <Button variant="outline" size="sm" onClick={demoteFromTodo} className="text-xs h-7 bg-primary text-primary-foreground hover:bg-primary/90">Demote</Button>
          <Button variant="outline" size="sm" onClick={moveToDone} className="text-xs h-7 bg-card border border-green-500/50 text-green-500 hover:bg-muted/80">Done</Button>
          <div className="w-px h-6 bg-border"></div>
          <Button variant="outline" size="sm" onClick={moveLineUp} className="text-xs h-7 bg-card border border-border text-foreground hover:bg-muted/80">Move Up</Button>
          <Button variant="outline" size="sm" onClick={moveLineDown} className="text-xs h-7 bg-card border border-border text-foreground hover:bg-muted/80">Move Down</Button>
          <div className="flex-1"></div>
          {/* Save Button */}
          {onSave && (
            <Button onClick={() => onSave(value)} size="sm" className="text-xs h-7 bg-card border border-primary text-primary hover:bg-primary/90 text-primary-foreground font-semibold ml-2">Save</Button>
          )}
          {/* <Button onClick={handleSave} size="sm" className="text-xs h-7 bg-card border border-primary text-foreground hover:bg-muted/80 font-semibold">Save</Button> */}
        </div>
      </div>
    </div>
  );
};

export default NotepadDialog; 