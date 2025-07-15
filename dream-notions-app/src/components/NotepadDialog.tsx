import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';

interface NotepadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (content: string) => void;
  initialContent: string;
}

const NotepadDialog: React.FC<NotepadDialogProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  initialContent,
}) => {
  const [tabs, setTabs] = useState<any[]>([
    {
      id: 'todo',
      name: 'Todo',
      content: initialContent,
      isDeletable: false,
      isRenameable: true
    }
  ]);
  const [activeTabId, setActiveTabId] = useState('todo');
  const [isRenaming, setIsRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Floating pop-up position and drag state
  const [panelPos, setPanelPos] = useState({ top: 120, left: 120 });
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  // Center the notepad when opened
  useEffect(() => {
    if (isOpen) {
      // Center in viewport
      const width = 700;
      const height = 500;
      const top = Math.max(40, window.innerHeight / 2 - height / 2);
      const left = Math.max(40, window.innerWidth / 2 - width / 2);
      setPanelPos({ top, left });
    }
  }, [isOpen]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    dragOffset.current = {
      x: e.clientX - panelPos.left,
      y: e.clientY - panelPos.top,
    };
    document.body.style.userSelect = 'none';
  };
  useEffect(() => {
    if (!dragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      setPanelPos(() => ({
        top: Math.max(0, e.clientY - dragOffset.current.y),
        left: Math.max(0, e.clientX - dragOffset.current.x),
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

  useEffect(() => {
    setTabs(prevTabs => 
      prevTabs.map(tab => 
        tab.id === 'todo' ? { ...tab, content: initialContent } : tab
      )
    );
  }, [initialContent]);

  const activeTab = tabs.find(tab => tab.id === activeTabId);
  const content = activeTab?.content || '';

  const setContent = (newContent: string) => {
    setTabs(prevTabs => 
      prevTabs.map(tab => 
        tab.id === activeTabId 
          ? { ...tab, content: newContent }
          : tab
      )
    );
  };

  // Parse document structure for todo/que/inbox/done sections
  const parseStructure = (text: string) => {
    const lines = text.split('\n');
    const structure = {
      todoSectionStart: -1,
      todoSectionEnd: -1,
      queSectionStart: -1,
      queSectionEnd: -1,
      inboxSectionStart: -1,
      inboxSectionEnd: -1,
      doneSectionStart: -1,
      doneSectionEnd: -1,
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]?.trim() || '';
      if (line.match(/^#+\s*todo$/i)) {
        structure.todoSectionStart = i;
        // Find the end of todo section
        for (let j = i + 1; j < lines.length; j++) {
          if (lines[j]?.match(/^#+\s/)) {
            structure.todoSectionEnd = j - 1;
            break;
          }
          if (j === lines.length - 1) {
            structure.todoSectionEnd = j;
          }
        }
      } else if (line.match(/^#+\s*que$/i)) {
        structure.queSectionStart = i;
        // Find the end of que section
        for (let j = i + 1; j < lines.length; j++) {
          if (lines[j]?.match(/^#+\s/)) {
            structure.queSectionEnd = j - 1;
            break;
          }
          if (j === lines.length - 1) {
            structure.queSectionEnd = j;
          }
        }
      } else if (line.match(/^#+\s*inbox$/i)) {
        structure.inboxSectionStart = i;
        // Find the end of inbox section
        for (let j = i + 1; j < lines.length; j++) {
          if (lines[j]?.match(/^#+\s/)) {
            structure.inboxSectionEnd = j - 1;
            break;
          }
          if (j === lines.length - 1) {
            structure.inboxSectionEnd = j;
          }
        }
      } else if (line.match(/^#+\s*done$/i)) {
        structure.doneSectionStart = i;
        // Find the end of done section
        for (let j = i + 1; j < lines.length; j++) {
          if (lines[j]?.match(/^#+\s/)) {
            structure.doneSectionEnd = j - 1;
            break;
          }
          if (j === lines.length - 1) {
            structure.doneSectionEnd = j;
          }
        }
      }
    }

    return structure;
  };

  // Get current line information
  const getCurrentLineInfo = () => {
    if (!textareaRef.current) return { lineIndex: -1, isListItem: false, line: '' };
    
    const textarea = textareaRef.current;
    const lines = content.split('\n');
    const cursorPos = textarea.selectionStart;
    
    let currentPos = 0;
    let lineIndex = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const lineLength = lines[i].length + 1; // +1 for newline
      if (cursorPos <= currentPos + lineLength) {
        lineIndex = i;
        break;
      }
      currentPos += lineLength;
    }
    
    const line = lines[lineIndex] || '';
    const isListItem = line.trim().startsWith('-');
    
    return { lineIndex, isListItem, line };
  };

  // No auto-formatting - normal text editor behavior
  const handleKeyDown = (_e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Allow normal text editing without any auto-formatting
  };

  // Move line up
  const moveLineUp = () => {
    const { lineIndex } = getCurrentLineInfo();
    if (lineIndex <= 0) return;
    
    const lines = content.split('\n');
    const currentLine = lines[lineIndex];
    const temp = lines[lineIndex];
    lines[lineIndex] = lines[lineIndex - 1];
    lines[lineIndex - 1] = temp;
    
    const newContent = lines.join('\n');
    setContent(newContent);
    
    // Move cursor to follow the line that moved up
    setTimeout(() => {
      if (textareaRef.current) {
        const newLineIndex = lineIndex - 1;
        const newCursorPos = lines.slice(0, newLineIndex).join('\n').length + (newLineIndex > 0 ? 1 : 0);
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos + currentLine.length);
        textareaRef.current.focus();
      }
    }, 0);
  };

  // Move line down
  const moveLineDown = () => {
    const { lineIndex } = getCurrentLineInfo();
    const lines = content.split('\n');
    if (lineIndex >= lines.length - 1) return;
    
    const currentLine = lines[lineIndex];
    const temp = lines[lineIndex];
    lines[lineIndex] = lines[lineIndex + 1];
    lines[lineIndex + 1] = temp;
    
    const newContent = lines.join('\n');
    setContent(newContent);
    
    // Move cursor to follow the line that moved down
    setTimeout(() => {
      if (textareaRef.current) {
        const newLineIndex = lineIndex + 1;
        const newCursorPos = lines.slice(0, newLineIndex).join('\n').length + (newLineIndex > 0 ? 1 : 0);
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos + currentLine.length);
        textareaRef.current.focus();
      }
    }, 0);
  };

  // Move to Done: Move line just below Done heading
  const moveToDone = () => {
    const lines = content.split('\n');
    const { lineIndex, line } = getCurrentLineInfo();
    
    if (!line.trim()) return; // Don't move empty lines

    const structure = parseStructure(content);
    const newLines = [...lines];

    // Remove the item from current location
    newLines.splice(lineIndex, 1);

    // Ensure Done section exists
    let doneInsertIndex: number;
    if (structure.doneSectionStart === -1) {
      // Create Done section at the end
      newLines.push('## Done');
      doneInsertIndex = newLines.length;
    } else {
      // Insert directly after the Done heading
      doneInsertIndex = structure.doneSectionStart + 1;
      
      // Remove any blank lines immediately after the header to ensure clean insertion
      while (doneInsertIndex < newLines.length && 
             doneInsertIndex <= structure.doneSectionEnd &&
             newLines[doneInsertIndex].trim() === '') {
        newLines.splice(doneInsertIndex, 1);
        // Update the structure end since we removed a line
        structure.doneSectionEnd--;
      }
    }
    
    // Insert the line as-is
    newLines.splice(doneInsertIndex, 0, line);
    
    setContent(newLines.join('\n'));
  };

  // Promote: Move line just below Todo heading
  const promoteToTodo = () => {
    const lines = content.split('\n');
    const { lineIndex, line } = getCurrentLineInfo();
    
    if (!line.trim()) return; // Don't move empty lines

    const structure = parseStructure(content);
    const newLines = [...lines];

    // Remove the item from current location
    newLines.splice(lineIndex, 1);

    // Ensure Todo section exists
    let todoInsertIndex: number;
    if (structure.todoSectionStart === -1) {
      // Create Todo section at the top
      newLines.unshift('## Todo');
      todoInsertIndex = 1; // Insert directly after the heading
    } else {
      // Insert directly after the Todo heading
      todoInsertIndex = structure.todoSectionStart + 1;
      
      // Remove any blank lines immediately after the header to ensure clean insertion
      while (todoInsertIndex < newLines.length && 
             todoInsertIndex <= structure.todoSectionEnd &&
             newLines[todoInsertIndex].trim() === '') {
        newLines.splice(todoInsertIndex, 1);
        // Update the structure end since we removed a line
        structure.todoSectionEnd--;
      }
    }
    
    // Insert the line as-is
    newLines.splice(todoInsertIndex, 0, line);
    
    setContent(newLines.join('\n'));
  };

  // Demote: Move line to top of Inbox list (like Done button behavior)
  const demoteFromTodo = () => {
    const lines = content.split('\n');
    const { lineIndex, line } = getCurrentLineInfo();
    
    if (!line.trim()) return; // Don't move empty lines

    const structure = parseStructure(content);
    const newLines = [...lines];

    // Remove the item from current location
    newLines.splice(lineIndex, 1);

    // Ensure Inbox section exists
    let inboxInsertIndex: number;
    if (structure.inboxSectionStart === -1) {
      // Create Inbox section at the end
      newLines.push('## Inbox');
      inboxInsertIndex = newLines.length;
    } else {
      // Insert directly after the Inbox header (as the first item)
      inboxInsertIndex = structure.inboxSectionStart + 1;
      
      // Remove any blank lines immediately after the header to ensure clean insertion
      while (inboxInsertIndex < newLines.length && 
             inboxInsertIndex <= structure.inboxSectionEnd &&
             newLines[inboxInsertIndex].trim() === '') {
        newLines.splice(inboxInsertIndex, 1);
        // Update the structure end since we removed a line
        structure.inboxSectionEnd--;
      }
    }
    
    // Insert the line as-is
    newLines.splice(inboxInsertIndex, 0, line);
    
    setContent(newLines.join('\n'));
  };

  // Delete current line (commented out - not used in current UI)
  /* const deleteCurrentLine = () => {
    const { lineIndex } = getCurrentLineInfo();
    const lines = content.split('\n');
    
    if (lineIndex < 0 || lineIndex >= lines.length) return;
    
    const newLines = [...lines];
    newLines.splice(lineIndex, 1);
    
    setContent(newLines.join('\n'));
    
    // Position cursor at the same line index or previous line if at end
    setTimeout(() => {
      if (textareaRef.current) {
        const adjustedLineIndex = Math.min(lineIndex, newLines.length - 1);
        const newCursorPos = newLines.slice(0, adjustedLineIndex).join('\n').length + (adjustedLineIndex > 0 ? 1 : 0);
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        textareaRef.current.focus();
      }
    }, 0);
  }; */

  // Ensure proper spacing around headings
  const formatContent = (text: string) => {
    const lines = text.split('\n');
    const formattedLines = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const isHeading = line.trim().match(/^##\s/);
      
      if (isHeading) {
        // Add blank line before heading if previous line isn't empty
        if (i > 0 && lines[i - 1].trim() !== '') {
          formattedLines.push('');
        }
        formattedLines.push(line);
        // Add blank line after heading if next line exists and isn't empty
        if (i < lines.length - 1 && lines[i + 1].trim() !== '') {
          formattedLines.push('');
        }
      } else {
        formattedLines.push(line);
      }
    }
    
    return formattedLines.join('\n');
  };

  // Add new tab
  const addNewTab = () => {
    const newTab: any = {
      id: `tab_${Date.now()}`,
      name: `Tab ${tabs.length}`,
      content: '',
      isDeletable: true,
      isRenameable: true
    };
    setTabs(prevTabs => [...prevTabs, newTab]);
    setActiveTabId(newTab.id);
  };

  // Delete tab
  const deleteCurrentTab = () => {
    if (!activeTab?.isDeletable) return;
    
    const remainingTabs = tabs.filter(tab => tab.id !== activeTabId);
    setTabs(remainingTabs);
    setActiveTabId('todo'); // Switch back to Todo tab
  };


  // Start renaming
  const startRename = (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (tab) {
      setIsRenaming(tabId);
      setRenameValue(tab.name);
    }
  };

  // Finish renaming
  const finishRename = () => {
    if (isRenaming && renameValue.trim()) {
      setTabs(prevTabs => 
        prevTabs.map(tab => 
          tab.id === isRenaming 
            ? { ...tab, name: renameValue.trim() }
            : tab
        )
      );
    }
    setIsRenaming(null);
    setRenameValue('');
  };


  const handleSave = () => {
    // Save the Todo tab content (maintain backward compatibility)
    const todoTab = tabs.find(tab => tab.id === 'todo');
    const formattedContent = todoTab ? formatContent(todoTab.content) : '';
    onSave(formattedContent);
    // Don't close the window - let user continue working
  };

  if (!isOpen) return null;
  console.log('NotepadDialog rendered');
  return (
    <div
      style={{
        position: 'fixed',
        top: panelPos.top,
        left: panelPos.left,
        zIndex: 1000,
        width: '100%',
        maxWidth: '48rem', // max-w-3xl
        minWidth: 0,
        height: '650px',
        minHeight: '500px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
        cursor: dragging ? 'move' : 'default',
        display: 'flex',
        flexDirection: 'column',
      }}
      className="bg-card border border-border shadow-lg rounded-lg p-0"
    >
      <div
        className="flex items-center justify-between px-4 py-2 rounded-t-lg cursor-move bg-muted border-b border-border"
        style={{ userSelect: 'none' }}
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2">
          <span className="font-semibold text-primary">Notepad</span>
        </div>
        <Button size="icon" variant="ghost" onClick={onClose} title="Close Notepad">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </Button>
      </div>
      <div className="flex-1 flex flex-col min-h-0 h-full" style={{overflow: 'hidden'}}>
        {/* Tab Navigation using shadcn Tabs */}
        <Tabs value={activeTabId} onValueChange={setActiveTabId} className="flex-1 flex flex-col h-full min-h-0">
          <div className="flex items-center justify-between px-4 pt-2 flex-shrink-0">
            <div className="flex items-center gap-4">
              <TabsList className="h-auto p-0 bg-transparent border-none shadow-none">
                {tabs.map((tab) => {
                  return (
                    <ContextMenu key={tab.id}>
                      <ContextMenuTrigger asChild>
                        <div className="relative">
                          <TabsTrigger
                            value={tab.id}
                            className="relative text-foreground data-[state=active]:bg-primary/20 data-[state=active]:text-primary font-medium rounded-none px-4 py-2 border-b-2 border-transparent data-[state=active]:border-primary transition-colors"
                            style={{ minWidth: 80 }}
                          >
                            {isRenaming === tab.id ? (
                              <input
                                type="text"
                                value={renameValue}
                                onChange={(e) => setRenameValue(e.target.value)}
                                onBlur={finishRename}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') finishRename();
                                  if (e.key === 'Escape') {
                                    setIsRenaming(null);
                                    setRenameValue('');
                                  }
                                }}
                                className="h-7 px-2 text-xs bg-muted border border-border rounded-md text-foreground min-w-[80px] focus:outline-none focus:ring-2 focus:ring-primary absolute left-0 top-0 z-10"
                                autoFocus
                              />
                            ) : (
                              tab.name
                            )}
                          </TabsTrigger>
                        </div>
                      </ContextMenuTrigger>
                      <ContextMenuContent className="bg-card border-border">
                        <ContextMenuItem 
                          onClick={() => startRename(tab.id)}
                          className="text-foreground hover:bg-muted cursor-pointer"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Rename
                        </ContextMenuItem>
                      </ContextMenuContent>
                    </ContextMenu>
                  );
                })}
              </TabsList>
            </div>
            {/* Plus button to add new tab */}
            <Button
              variant="outline"
              size="sm"
              onClick={addNewTab}
              className="ml-2 h-7 w-7 p-0 bg-card border border-border text-foreground hover:bg-muted/80"
              title="Add new tab"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </Button>
          </div>
          {/* Only render the active tab's content to avoid layout conflicts */}
          {(() => {
            const tab = tabs.find(t => t.id === activeTabId);
            if (!tab) return null;
            return (
              <TabsContent
                key={tab.id}
                value={tab.id}
                className="flex-1 flex flex-col h-full min-h-0 p-0 m-0 bg-card"
              >
                <div className="flex-1 flex flex-col h-full min-h-0">
                  <Textarea
                    ref={textareaRef}
                    className="w-full flex-1 min-h-0 p-3 font-mono text-xs resize-none text-foreground bg-transparent border-0 rounded-none placeholder:text-muted-foreground focus:outline-none focus:ring-0"
                    value={tab.content}
                    onChange={(e) => {
                      setTabs(prevTabs => prevTabs.map(t => t.id === tab.id ? { ...t, content: e.target.value } : t));
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="Start writing your notes in markdown...\n\nUse ## Todo, ## Que, ## Done, and ## Inbox sections for task management."
                  />
                </div>
                <div className="flex gap-2 items-center p-2 bg-card border-t border-border w-full flex-shrink-0">
                  {/* Promote, Demote, Done */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={promoteToTodo}
                      title="Promote to Todo section"
                      className="text-xs h-7 bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                      Promote
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={demoteFromTodo}
                      title="Demote to top of Inbox"
                      className="text-xs h-7 bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17h-8m0 0V9m0 8l8-8 4 4 6-6" />
                      </svg>
                      Demote
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={moveToDone}
                      title="Move to top of Done section"
                      className="text-xs h-7 bg-card border border-green-500/50 text-green-500 hover:bg-muted/80"
                    >
                      <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Done
                    </Button>
                  </div>
                  <div className="w-px h-6 bg-border"></div>
                  {/* Move Up, Move Down */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={moveLineUp}
                      title="Move line up"
                      className="text-xs h-7 bg-card border border-border text-foreground hover:bg-muted/80"
                    >
                      <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                      Move Up
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={moveLineDown}
                      title="Move line down"
                      className="text-xs h-7 bg-card border border-border text-foreground hover:bg-muted/80"
                    >
                      <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                      Move Down
                    </Button>
                  </div>
                  {/* Spacer */}
                  <div className="flex-1"></div>
                  {/* Delete Tab (if deletable) */}
                  {tab.isDeletable && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={deleteCurrentTab}
                      title="Delete current tab"
                      className="text-xs h-7 bg-card border border-red-500/50 text-red-500 hover:bg-muted/80"
                    >
                      <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete Tab
                    </Button>
                  )}
                  {/* Save Button */}
                  <Button
                    onClick={handleSave}
                    size="sm"
                    className="text-xs h-7 bg-card border border-primary text-foreground hover:bg-muted/80 font-semibold"
                  >
                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Save
                  </Button>
                </div>
              </TabsContent>
            );
          })()}
        </Tabs>
      </div>
    </div>
  );
};

export default NotepadDialog;