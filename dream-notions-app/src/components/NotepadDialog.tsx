import React, { useState, useEffect, useRef } from 'react';

interface Tab {
  id: string;
  name: string;
  content: string;
  isDeletable: boolean;
}

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
  const [tabs, setTabs] = useState<Tab[]>([
    {
      id: 'todo',
      name: 'Todo',
      content: initialContent,
      isDeletable: false
    }
  ]);
  const [activeTabId, setActiveTabId] = useState('todo');
  const [contextMenu, setContextMenu] = useState<{visible: boolean; x: number; y: number; tabId: string | null}>({
    visible: false, x: 0, y: 0, tabId: null
  });
  const [isRenaming, setIsRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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
      // Insert at the top of existing Inbox section (like Done button)
      inboxInsertIndex = structure.inboxSectionStart + 1;
      // Skip any empty lines right after the header to find first content position
      while (inboxInsertIndex < newLines.length && 
             inboxInsertIndex <= structure.inboxSectionEnd &&
             newLines[inboxInsertIndex].trim() === '') {
        inboxInsertIndex++;
      }
    }
    
    // Insert the line as-is
    newLines.splice(inboxInsertIndex, 0, line);
    
    setContent(newLines.join('\n'));
  };

  // Delete current line
  const deleteCurrentLine = () => {
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
  };

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
    const newTab: Tab = {
      id: `tab_${Date.now()}`,
      name: `Tab ${tabs.length}`,
      content: '',
      isDeletable: true
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

  // Handle right-click context menu
  const handleTabRightClick = (e: React.MouseEvent, tabId: string) => {
    e.preventDefault();
    const tab = tabs.find(t => t.id === tabId);
    if (tab?.isDeletable) {
      setContextMenu({
        visible: true,
        x: e.clientX,
        y: e.clientY,
        tabId: tabId
      });
    }
  };

  // Start renaming
  const startRename = (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (tab) {
      setIsRenaming(tabId);
      setRenameValue(tab.name);
      setContextMenu({ visible: false, x: 0, y: 0, tabId: null });
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

  // Close context menu when clicking elsewhere
  useEffect(() => {
    const handleClick = () => {
      setContextMenu({ visible: false, x: 0, y: 0, tabId: null });
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const handleSave = () => {
    // Save the Todo tab content (maintain backward compatibility)
    const todoTab = tabs.find(tab => tab.id === 'todo');
    const formattedContent = todoTab ? formatContent(todoTab.content) : '';
    onSave(formattedContent);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-background/95 backdrop-blur-md p-0 rounded-xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col border border-border/50 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
            <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <h2 className="text-lg font-semibold text-foreground ml-2">Notepad</h2>
          </div>
        </div>
        
        {/* Tab Navigation */}
        <div className="flex items-center px-6 py-3 bg-muted/20 border-b border-border/30">
          <div className="flex items-center gap-0.5">
            {tabs.map((tab) => (
              <div key={tab.id} className="relative">
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
                    className="px-3 py-2 text-sm bg-background/80 border border-border rounded-t-lg text-foreground min-w-[80px] focus:outline-none focus:ring-2 focus:ring-primary/50"
                    autoFocus
                  />
                ) : (
                  <button
                    onClick={() => setActiveTabId(tab.id)}
                    onContextMenu={(e) => handleTabRightClick(e, tab.id)}
                    className={`group relative px-4 py-2.5 text-sm font-medium transition-all duration-200 rounded-t-lg border-b-2 ${
                      tab.id === activeTabId
                        ? 'bg-background text-foreground border-primary shadow-sm'
                        : 'bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40 border-transparent'
                    }`}
                  >
                    <span className="relative z-10">{tab.name}</span>
                    {tab.id === activeTabId && (
                      <div className="absolute inset-0 bg-gradient-to-b from-background/50 to-background rounded-t-lg"></div>
                    )}
                  </button>
                )}
              </div>
            ))}
          </div>
          
          {/* Plus button to add new tab */}
          <button
            onClick={addNewTab}
            className="ml-2 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-200 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 hover:border-primary/40 hover:scale-105"
            title="Add new tab"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
        
        <div className="flex-1 flex flex-col px-6 py-4">
          {/* Controls - Top Row */}
          <div className="flex items-center gap-3 mb-4 p-3 bg-muted/20 rounded-xl border border-border/30">
            <div className="flex items-center gap-2">
              <button
                onClick={moveLineUp}
                title="Move line up"
                className="group px-3 py-2 rounded-lg transition-all duration-200 bg-background/50 hover:bg-background border border-border/30 hover:border-border text-muted-foreground hover:text-foreground text-xs font-medium shadow-sm hover:shadow-md"
              >
                <svg className="w-4 h-4 inline mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
                Move Up
              </button>
              
              <button
                onClick={moveLineDown}
                title="Move line down"
                className="group px-3 py-2 rounded-lg transition-all duration-200 bg-background/50 hover:bg-background border border-border/30 hover:border-border text-muted-foreground hover:text-foreground text-xs font-medium shadow-sm hover:shadow-md"
              >
                <svg className="w-4 h-4 inline mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                Move Down
              </button>
            </div>
            
            <div className="w-px h-6 bg-border/30"></div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={promoteToTodo}
                title="Promote to Todo section"
                className="px-3 py-2 rounded-lg transition-all duration-200 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/20 hover:border-blue-500/40 text-xs font-medium shadow-sm hover:shadow-md"
              >
                <svg className="w-4 h-4 inline mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                Promote
              </button>
              
              <button
                onClick={demoteFromTodo}
                title="Demote to top of Inbox"
                className="px-3 py-2 rounded-lg transition-all duration-200 bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/20 hover:border-orange-500/40 text-xs font-medium shadow-sm hover:shadow-md"
              >
                <svg className="w-4 h-4 inline mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17h-8m0 0V9m0 8l8-8 4 4 6-6" />
                </svg>
                Demote
              </button>
              
              <button
                onClick={deleteCurrentLine}
                title="Delete current line"
                className="px-3 py-2 rounded-lg transition-all duration-200 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/20 hover:border-red-500/40 text-xs font-medium shadow-sm hover:shadow-md"
              >
                <svg className="w-4 h-4 inline mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
            </div>
            
            {/* Spacer to push Done button to far right */}
            <div className="flex-1"></div>
            
            <button
              onClick={moveToDone}
              title="Move to top of Done section"
              className="px-4 py-2 rounded-lg transition-all duration-200 bg-green-500/10 hover:bg-green-500/20 text-green-600 dark:text-green-400 border border-green-500/20 hover:border-green-500/40 text-xs font-medium shadow-sm hover:shadow-md"
            >
              <svg className="w-4 h-4 inline mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Done
            </button>
          </div>
          
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              className="w-full h-full p-4 border border-border/30 rounded-xl bg-background/30 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 font-mono text-sm resize-none transition-all duration-200 backdrop-blur-sm"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Start writing your notes in markdown...&#10;&#10;Use ## Todo, ## Que, ## Done, and ## Inbox sections for task management."
            />
          </div>
        </div>
        
        {/* Footer */}
        <div className="flex justify-between items-center px-6 py-4 border-t border-border/30 bg-muted/20">
          {/* Delete tab button (only show for deletable tabs) */}
          {activeTab?.isDeletable && (
            <button
              type="button"
              onClick={deleteCurrentTab}
              className="group px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/20 hover:border-red-500/40 shadow-sm hover:shadow-md"
            >
              <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete Tab
            </button>
          )}
          
          {/* Spacer if no delete button */}
          {!activeTab?.isDeletable && <div></div>}
          
          <button
            type="button"
            onClick={handleSave}
            className="group px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl hover:scale-105"
          >
            <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Save Changes
          </button>
        </div>
        
        {/* Context Menu */}
        {contextMenu.visible && (
          <div
            className="fixed bg-background/95 backdrop-blur-md border border-border/50 rounded-lg shadow-2xl py-2 z-[60] min-w-[120px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              onClick={() => contextMenu.tabId && startRename(contextMenu.tabId)}
              className="w-full px-4 py-2.5 text-left text-sm hover:bg-muted/80 transition-all duration-200 text-foreground flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Rename
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotepadDialog;