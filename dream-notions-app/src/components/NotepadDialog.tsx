import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { Tab } from '../types/Tab';

interface NotepadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tabs: Tab[];
  activeTabId: string;
  onTabChange: (tabId: string) => void;
  onTabContentChange: (content: string) => void;
  onTabRename: (tabId: string, newName: string) => void;
  onTabAdd: () => void;
  onTabDelete: (tabId: string) => void;
  onTabReorder: (fromIdx: number, toIdx: number) => void;
}

const NotepadDialog: React.FC<NotepadDialogProps> = ({
  isOpen, onClose, tabs, activeTabId, onTabChange, onTabContentChange, onTabRename, onTabAdd, onTabDelete, onTabReorder
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Draggable state
  const [position, setPosition] = useState({ x: 120, y: 120 });
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  // Tab rename state
  const [renamingTabId, setRenamingTabId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  // Drag-and-drop for tabs
  const [dragTabIdx, setDragTabIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  // Reset content to initialContent whenever dialog is opened
  useEffect(() => {
    if (isOpen) {
      setPosition({ x: 120, y: 120 }); // Reset position only when dialog is opened
    }
  }, [isOpen]);

  // Mouse event handlers for dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    dragOffset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
    document.body.style.userSelect = 'none';
  };
  useEffect(() => {
    if (!dragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      setPosition(_ => ({
        x: Math.max(0, e.clientX - dragOffset.current.x),
        y: Math.max(0, e.clientY - dragOffset.current.y),
      }));
    };
    const handleMouseUp = () => {
      setDragging(false);
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging]);

  // Move line up
  const moveLineUp = () => {
    if (!textareaRef.current) return;
    const lines = activeTab?.content.split('\n');
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
    onTabContentChange(lines.join('\n'));
  };

  // Move line down
  const moveLineDown = () => {
    if (!textareaRef.current) return;
    const lines = activeTab?.content.split('\n');
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
    onTabContentChange(lines.join('\n'));
  };

  // Helper: get current line index and text
  const getCurrentLineInfo = () => {
    if (!textareaRef.current) return { lineIndex: -1, line: '' };
    const lines = activeTab?.content.split('\n');
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
    const lines = activeTab?.content.split('\n');
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
    onTabContentChange(lines.join('\n'));
  };

  // Demote: Move current line to bottom of Inbox section (or bottom of content)
  const demoteFromTodo = () => {
    const lines = activeTab?.content.split('\n');
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
    onTabContentChange(lines.join('\n'));
  };

  // Done: Move current line to top of Done section (create if needed)
  const moveToDone = () => {
    const lines = activeTab?.content.split('\n');
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
    onTabContentChange(lines.join('\n'));
  };

  // Delete current line
  const deleteCurrentLine = () => {
    if (!textareaRef.current) return;
    const lines = activeTab?.content.split('\n');
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
    if (lines.length === 0) return;
    lines.splice(lineIndex, 1);
    onTabContentChange(lines.join('\n'));
  };

  // const handleSave = () => { // This function is removed as per the edit hint
  //   onSave(content);
  // };

  // Find active tab
  const activeTab = tabs.find(tab => tab.id === activeTabId) || tabs[0];

  if (!isOpen) return null;
  return (
    <div
      style={{
        position: 'fixed',
        top: position.y,
        left: position.x,
        zIndex: 1000,
        width: '100%',
        maxWidth: '48rem',
        minWidth: 0,
        height: '650px',
        minHeight: '500px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
        display: 'flex',
        flexDirection: 'column',
        cursor: dragging ? 'grabbing' : 'default',
      }}
      className="bg-card border border-border shadow-lg rounded-lg p-0"
    >
      {/* Header at the very top for dragging */}
      <div
        className="flex items-center justify-between px-4 py-2 rounded-t-lg bg-muted border-b border-border cursor-move"
        style={{ userSelect: 'none' }}
        onMouseDown={handleMouseDown}
      >
        <span className="font-semibold text-primary">Notepad</span>
        <Button size="icon" variant="ghost" onClick={onClose} title="Close Notepad">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </Button>
      </div>
      {/* Tab Bar below header */}
      <div className="flex flex-col select-none">
        <div className="flex items-center px-2 pt-2 pb-0" style={{ userSelect: 'none' }}>
          {tabs.map((tab, idx) => (
            <div
              key={tab.id}
              className={`flex items-center px-3 py-1 rounded-t-lg mr-1 text-xs font-medium cursor-pointer transition-colors ${tab.id === activeTabId ? 'bg-muted text-primary' : 'bg-card text-muted-foreground hover:bg-muted/80'}`}
              draggable
              onClick={() => onTabChange(tab.id)}
              onContextMenu={e => {
                e.preventDefault();
                setRenamingTabId(tab.id);
                setRenameValue(tab.name);
              }}
              onDragStart={() => setDragTabIdx(idx)}
              onDragOver={e => { e.preventDefault(); setDragOverIdx(idx); }}
              onDrop={() => {
                if (dragTabIdx !== null && dragTabIdx !== idx) {
                  onTabReorder(dragTabIdx, idx);
                }
                setDragTabIdx(null);
                setDragOverIdx(null);
              }}
              style={{
                border: dragOverIdx === idx ? '2px solid var(--color-primary)' : undefined,
                opacity: dragTabIdx === idx ? 0.5 : 1,
                minWidth: 60,
                maxWidth: 180,
                position: 'relative',
              }}
            >
              {renamingTabId === tab.id ? (
                <input
                  className="text-xs px-1 py-0.5 rounded border border-primary outline-none bg-background"
                  value={renameValue}
                  autoFocus
                  onChange={e => setRenameValue(e.target.value)}
                  onBlur={() => {
                    onTabRename(tab.id, renameValue.trim() || tab.name);
                    setRenamingTabId(null);
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      onTabRename(tab.id, renameValue.trim() || tab.name);
                      setRenamingTabId(null);
                    } else if (e.key === 'Escape') {
                      setRenamingTabId(null);
                    }
                  }}
                  style={{ width: Math.max(60, renameValue.length * 8) }}
                />
              ) : (
                <span className="truncate max-w-[100px]">{tab.name}</span>
              )}
              {tab.isDeletable && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="ml-1 p-0.5 text-xs"
                  onClick={e => { e.stopPropagation(); onTabDelete(tab.id); }}
                  title="Delete tab"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </Button>
              )}
            </div>
          ))}
          {/* Add Tab Button */}
          <Button
            size="icon"
            variant="ghost"
            className="ml-1 p-0.5 text-xs"
            onClick={onTabAdd}
            title="Add tab"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          </Button>
        </div>
        {/* Faint line below tabs */}
        <div className="w-full h-px bg-border/60" style={{marginTop: '2px', marginBottom: '2px'}} />
      </div>
      <div className="flex-1 flex flex-col min-h-0 h-full" style={{overflow: 'hidden'}}>
        <div className="flex-1 flex flex-col h-full min-h-0">
          <Textarea
            ref={textareaRef}
            className="w-full flex-1 min-h-0 p-3 font-mono text-xs resize-none text-foreground bg-transparent border-0 rounded-none placeholder:text-muted-foreground focus:outline-none focus:ring-0"
            value={activeTab?.content || ''}
            onChange={e => onTabContentChange(e.target.value)}
            placeholder="Start writing your notes in markdown...\n\nUse ## Todo, ## Que, ## Done, and ## Inbox sections for task management."
          />
        </div>
        <div className="flex gap-2 items-center p-2 bg-card border-t border-border w-full flex-shrink-0">
          <Button variant="outline" size="sm" onClick={promoteToTodo} className="text-xs h-7 bg-primary text-primary-foreground hover:bg-primary/90">Promote</Button>
          <Button variant="outline" size="sm" onClick={demoteFromTodo} className="text-xs h-7 bg-primary text-primary-foreground hover:bg-primary/90">Demote</Button>
          <Button variant="outline" size="sm" onClick={moveToDone} className="text-xs h-7 bg-card border border-green-500/50 text-green-500 hover:bg-muted/80" title="Mark as Done">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          </Button>
          <Button variant="outline" size="sm" onClick={deleteCurrentLine} className="text-xs h-7 bg-card border border-red-500/50 text-red-500 hover:bg-muted/80" title="Delete current line">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </Button>
          <div className="w-px h-6 bg-border"></div>
          <Button variant="outline" size="sm" onClick={moveLineUp} className="text-xs h-7 bg-card border border-border text-foreground hover:bg-muted/80" title="Move line up">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14m0-14l-7 7m7-7l7 7" /></svg>
          </Button>
          <Button variant="outline" size="sm" onClick={moveLineDown} className="text-xs h-7 bg-card border border-border text-foreground hover:bg-muted/80" title="Move line down">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V5m0 14l-7-7m7 7l7-7" /></svg>
          </Button>
          <div className="flex-1"></div>
        </div>
      </div>
    </div>
  );
};

export default NotepadDialog; 