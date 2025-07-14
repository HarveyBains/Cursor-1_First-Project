import React, { useState, useEffect, useRef } from 'react';
import { type Tab } from '../types/Tab';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  const [tabs, setTabs] = useState<Tab[]>([
    {
      id: 'todo',
      name: 'Todo',
      content: initialContent,
      isDeletable: false
    }
  ]);
  const [activeTabId, setActiveTabId] = useState('todo');
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
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl h-[75vh] p-0 gap-0 bg-gray-900 border-gray-700">
        {/* Tab Navigation using shadcn Tabs */}
        <Tabs value={activeTabId} onValueChange={setActiveTabId} className="flex-1 flex flex-col">
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700 bg-gray-800">
            <div className="flex items-center gap-4">
              <DialogTitle className="text-base font-semibold text-white">Notepad</DialogTitle>
              <TabsList className="h-auto p-1 bg-gray-700/50 border border-gray-600">
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
                        className="h-9 px-3 text-sm bg-gray-800 border border-gray-600 rounded-md text-white min-w-[80px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      />
                    ) : tab.isDeletable ? (
                      <ContextMenu>
                        <ContextMenuTrigger asChild>
                          <TabsTrigger
                            value={tab.id}
                            className="relative text-white data-[state=active]:bg-gray-600 data-[state=active]:text-white hover:bg-gray-600/50 hover:text-white"
                          >
                            {tab.name}
                          </TabsTrigger>
                        </ContextMenuTrigger>
                        <ContextMenuContent className="bg-gray-800 border-gray-600">
                          <ContextMenuItem 
                            onClick={() => startRename(tab.id)}
                            className="text-white hover:bg-gray-700 hover:text-white cursor-pointer"
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Rename
                          </ContextMenuItem>
                        </ContextMenuContent>
                      </ContextMenu>
                    ) : (
                      <TabsTrigger
                        value={tab.id}
                        className="relative text-white data-[state=active]:bg-gray-600 data-[state=active]:text-white hover:bg-gray-600/50 hover:text-white"
                      >
                        {tab.name}
                      </TabsTrigger>
                    )}
                  </div>
                ))}
              </TabsList>
            </div>
            
            {/* Plus button to add new tab */}
            <Button
              variant="outline"
              size="sm"
              onClick={addNewTab}
              className="ml-2 h-7 w-7 p-0 bg-gray-700 border-gray-600 text-white hover:bg-gray-600 hover:text-white"
              title="Add new tab"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </Button>
          </div>
          
          {tabs.map((tab) => (
            <TabsContent key={tab.id} value={tab.id} className="flex-1 flex flex-col px-3 py-2 mt-0 bg-gray-900">
              {/* Controls - Top Row */}
              <div className="flex items-center gap-2 mb-2 p-2 bg-gray-800 rounded-lg border border-gray-700">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={moveLineUp}
                    title="Move line up"
                    className="text-xs h-7 bg-gray-700 border-gray-600 text-white hover:bg-gray-600 hover:text-white"
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
                    className="text-xs h-7 bg-gray-700 border-gray-600 text-white hover:bg-gray-600 hover:text-white"
                  >
                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    Move Down
                  </Button>
                </div>
                
                <div className="w-px h-6 bg-gray-600"></div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={promoteToTodo}
                    title="Promote to Todo section"
                    className="text-xs h-7 bg-gray-700 border-blue-500/50 text-blue-400 hover:bg-blue-500/20 hover:text-blue-300"
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
                    className="text-xs h-7 bg-gray-700 border-orange-500/50 text-orange-400 hover:bg-orange-500/20 hover:text-orange-300"
                  >
                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17h-8m0 0V9m0 8l8-8 4 4 6-6" />
                    </svg>
                    Demote
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={deleteCurrentLine}
                    title="Delete current line"
                    className="text-xs h-7 bg-gray-700 border-red-500/50 text-red-400 hover:bg-red-500/20 hover:text-red-300"
                  >
                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                  </Button>
                </div>
                
                {/* Spacer to push Done button to far right */}
                <div className="flex-1"></div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={moveToDone}
                  title="Move to top of Done section"
                  className="text-xs h-7 bg-gray-700 border-green-500/50 text-green-400 hover:bg-green-500/20 hover:text-green-300"
                >
                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Done
                </Button>
              </div>
              
              <div className="flex-1 relative">
                <Textarea
                  ref={textareaRef}
                  className="w-full h-full p-3 font-mono text-sm resize-none text-white bg-gray-900 border-gray-700 placeholder:text-gray-400"
                  value={tab.id === activeTabId ? content : tab.content}
                  onChange={(e) => {
                    if (tab.id === activeTabId) {
                      setContent(e.target.value);
                    }
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Start writing your notes in markdown...&#10;&#10;Use ## Todo, ## Que, ## Done, and ## Inbox sections for task management."
                />
              </div>
            </TabsContent>
          ))}
        
        {/* Footer */}
        <div className="flex justify-between items-center px-4 py-3 border-t border-gray-700 bg-gray-800">
          {/* Delete tab button (only show for deletable tabs) */}
          {activeTab?.isDeletable && (
            <Button
              variant="outline"
              onClick={deleteCurrentTab}
              className="bg-gray-700 border-red-500/50 text-red-400 hover:bg-red-500/20 hover:text-red-300"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete Tab
            </Button>
          )}
          
          {/* Spacer if no delete button */}
          {!activeTab?.isDeletable && <div></div>}
          
          <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Save Changes
          </Button>
        </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default NotepadDialog;