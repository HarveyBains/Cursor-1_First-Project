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
  onSave: (tabs: Tab[]) => void;
  initialTabs: Tab[];
}

interface RenameTabFormProps {
  currentName: string;
  onSave: (newName: string) => void;
  onCancel: () => void;
}

const RenameTabForm: React.FC<RenameTabFormProps> = ({ currentName, onSave, onCancel }) => {
  const [name, setName] = useState(currentName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (trimmedName && trimmedName !== currentName) {
      onSave(trimmedName);
    } else {
      onCancel();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-4">
        <label htmlFor="tabName" className="block text-sm font-medium text-foreground mb-2">
          Tab Name
        </label>
        <input
          ref={inputRef}
          type="text"
          id="tabName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="Enter tab name"
          maxLength={20}
        />
      </div>
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-md text-sm font-medium transition-colors border border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90"
        >
          Save
        </button>
      </div>
    </form>
  );
};

const NotepadDialog: React.FC<NotepadDialogProps> = ({ isOpen, onClose, onSave, initialTabs }) => {
  const [tabs, setTabs] = useState<Tab[]>(initialTabs);
  const [activeTabId, setActiveTabId] = useState<string>(tabs[0]?.id || '');
  const [selectionStart, setSelectionStart] = useState(0);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renamingTabId, setRenamingTabId] = useState<string | null>(null);

  useEffect(() => {
    setTabs(initialTabs);
    setActiveTabId(initialTabs[0]?.id || '');
  }, [initialTabs]);

  const activeTab = tabs.find(tab => tab.id === activeTabId);

  // Helper to parse content into sections (only for "To Do" tab)
  const parseSections = (text: string) => {
    const lines = text.split('\n');
    const sections = { todo: [] as string[], next: [] as string[], inbox: [] as string[], done: [] as string[] };
    let currentSection: 'todo' | 'next' | 'inbox' | 'done' | null = null;

    for (const line of lines) {
      if (line.startsWith('## Todo')) {
        currentSection = 'todo';
        sections.todo.push(line);
      } else if (line.startsWith('## Next')) {
        currentSection = 'next';
        sections.next.push(line);
      } else if (line.startsWith('## Inbox')) {
        currentSection = 'inbox';
        sections.inbox.push(line);
      } else if (line.startsWith('## Done')) {
        currentSection = 'done';
        sections.done.push(line);
      } else if (currentSection) {
        sections[currentSection].push(line);
      }
    }
    return sections;
  };

  // Helper to reconstruct content from sections
  const reconstructContent = (sections: { todo: string[], next: string[], inbox: string[], done: string[] }) => {
    return [...sections.todo, ...sections.next, ...sections.inbox, ...sections.done].join('\n');
  };

  const handleSave = () => {
    onSave(tabs);
    onClose();
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setTabs(prev => prev.map(tab => 
      tab.id === activeTabId ? { ...tab, content: newContent } : tab
    ));
  };

  const handleSelectionChange = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    setSelectionStart(e.currentTarget.selectionStart);
  };

  const addTab = () => {
    const newTab: Tab = {
      id: Date.now().toString(),
      name: `Tab ${tabs.length + 1}`,
      content: '',
      isDeletable: true
    };
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
  };

  const deleteTab = (tabId: string) => {
    if (tabs.length <= 1) return; // Don't delete if it's the only tab
    if (tabId === 'todo') return; // Don't delete the first tab (original "To Do")

    setTabs(prev => prev.filter(tab => tab.id !== tabId));
    
    // Switch to first tab if current tab is being deleted
    if (activeTabId === tabId) {
      const remainingTabs = tabs.filter(tab => tab.id !== tabId);
      setActiveTabId(remainingTabs[0]?.id || '');
    }
  };

  const renameTab = (tabId: string, newName: string) => {
    setTabs(prev => prev.map(tab => 
      tab.id === tabId ? { ...tab, name: newName } : tab
    ));
    setIsRenaming(false);
    setRenamingTabId(null);
  };

  const handleTabRightClick = (e: React.MouseEvent, tabId: string) => {
    e.preventDefault();
    setRenamingTabId(tabId);
    setIsRenaming(true);
  };

  // Task management functions (only for first tab - originally "To Do")
  const getSelectedLineInfo = () => {
    if (!activeTab || activeTab.id !== 'todo') return null;
    
    const lines = activeTab.content.split('\n');
    let startLineIndex = 0;
    let charCount = 0;

    for (let i = 0; i < lines.length; i++) {
      charCount += lines[i].length + 1;
      if (selectionStart < charCount) {
        startLineIndex = i;
        break;
      }
    }

    const selectedLine = lines[startLineIndex];
    let currentSection: 'todo' | 'next' | 'inbox' | null = null;
    let sectionStartIndex = -1;

    for (let i = 0; i <= startLineIndex; i++) {
      if (lines[i].startsWith('## Todo')) {
        currentSection = 'todo';
        sectionStartIndex = i;
      } else if (lines[i].startsWith('## Next')) {
        currentSection = 'next';
        sectionStartIndex = i;
      } else if (lines[i].startsWith('## Inbox')) {
        currentSection = 'inbox';
        sectionStartIndex = i;
      }
    }

    return { lines, startLineIndex, selectedLine, currentSection, sectionStartIndex };
  };

  const promoteLine = () => {
    const lineInfo = getSelectedLineInfo();
    if (!lineInfo || !activeTab) return;
    
    const { selectedLine, currentSection } = lineInfo;
    if (!currentSection || selectedLine.trim() === '' || selectedLine.startsWith('##')) return;

    const sections = parseSections(activeTab.content);
    let newContent = activeTab.content;

    if (currentSection === 'next' || currentSection === 'inbox') {
      sections[currentSection] = sections[currentSection].filter(line => line !== selectedLine);
      sections.todo.splice(1, 0, selectedLine);
      newContent = reconstructContent(sections);
    }
    
    setTabs(prev => prev.map(tab => 
      tab.id === activeTabId ? { ...tab, content: newContent } : tab
    ));
  };

  const demoteLine = () => {
    const lineInfo = getSelectedLineInfo();
    if (!lineInfo || !activeTab) return;
    
    const { selectedLine, currentSection } = lineInfo;
    if (currentSection !== 'todo' || selectedLine.trim() === '' || selectedLine.startsWith('##')) return;

    const sections = parseSections(activeTab.content);
    sections.todo = sections.todo.filter(line => line !== selectedLine);
    sections.inbox.splice(1, 0, selectedLine);
    const newContent = reconstructContent(sections);
    
    setTabs(prev => prev.map(tab => 
      tab.id === activeTabId ? { ...tab, content: newContent } : tab
    ));
  };

  const moveLine = (direction: 'up' | 'down') => {
    const lineInfo = getSelectedLineInfo();
    if (!lineInfo || !activeTab) return;
    
    const { lines, startLineIndex } = lineInfo;
    const selectedLines = [lines[startLineIndex]];

    if (direction === 'up' && startLineIndex > 0) {
      const newLines = [...lines];
      newLines.splice(startLineIndex - 1, 0, ...selectedLines);
      newLines.splice(startLineIndex + 1, selectedLines.length);
      setTabs(prev => prev.map(tab => 
        tab.id === activeTabId ? { ...tab, content: newLines.join('\n') } : tab
      ));
    } else if (direction === 'down' && startLineIndex < lines.length - 1) {
      const newLines = [...lines];
      newLines.splice(startLineIndex + 2, 0, ...selectedLines);
      newLines.splice(startLineIndex, selectedLines.length);
      setTabs(prev => prev.map(tab => 
        tab.id === activeTabId ? { ...tab, content: newLines.join('\n') } : tab
      ));
    }
  };

  const doneLine = () => {
    const lineInfo = getSelectedLineInfo();
    if (!lineInfo || !activeTab) return;
    
    const { selectedLine, currentSection } = lineInfo;
    if (!currentSection || selectedLine.trim() === '' || selectedLine.startsWith('##')) return;

    const sections = parseSections(activeTab.content);
    sections[currentSection] = sections[currentSection].filter(line => line !== selectedLine);
    
    if (sections.done.length === 0 || !sections.done[0].startsWith('## Done')) {
      sections.done.unshift('## Done');
    }
    sections.done.splice(1, 0, selectedLine);
    const newContent = reconstructContent(sections);
    
    setTabs(prev => prev.map(tab => 
      tab.id === activeTabId ? { ...tab, content: newContent } : tab
    ));
  };

  if (!isOpen) return null;

  const isToDoTab = activeTab?.id === 'todo';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-muted p-6 rounded-lg shadow-xl w-full max-w-2xl h-3/4 flex flex-col border border-border">
        <h2 className="text-xl mb-4 text-foreground">Notepad</h2>
        
        {/* Tab Bar */}
        <div className="flex items-center gap-1 mb-4 border-b border-border">
          <div className="flex gap-1 flex-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTabId(tab.id)}
                onContextMenu={(e) => handleTabRightClick(e, tab.id)}
                className={`px-3 py-2 text-sm rounded-t-md transition-colors ${
                  activeTabId === tab.id 
                    ? 'bg-background text-foreground border-b-2 border-primary' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'
                }`}
                title="Right-click to rename"
              >
                {tab.name}
              </button>
            ))}
          </div>
          <button
            onClick={addTab}
            className="px-2 py-1 text-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded transition-colors"
            title="Add new tab"
          >
            +
          </button>
        </div>

        {/* Task Management Buttons - Only for To Do tab */}
        {isToDoTab && (
          <div className="flex gap-2 mb-4 justify-between">
            <div className="flex gap-4">
              <button onClick={() => moveLine('up')} className="px-3 py-1 rounded-md text-sm transition-colors bg-muted text-muted-foreground hover:bg-muted/80 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
                <span>Up</span>
              </button>
              <button onClick={() => moveLine('down')} className="px-3 py-1 rounded-md text-sm transition-colors bg-muted text-muted-foreground hover:bg-muted/80 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
                <span>Down</span>
              </button>
              <button onClick={promoteLine} className="px-3 py-1 rounded-md text-sm transition-colors bg-muted text-muted-foreground hover:bg-muted/80 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  <line x1="4" y1="21" x2="20" y2="21" strokeLinecap="round" strokeWidth="2" />
                </svg>
                <span className="ml-1">Promote</span>
              </button>
              <button onClick={demoteLine} className="px-3 py-1 rounded-md text-sm transition-colors bg-muted text-muted-foreground hover:bg-muted/80 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  <line x1="4" y1="3" x2="20" y2="3" strokeLinecap="round" strokeWidth="2" />
                </svg>
                <span className="ml-1">Demote</span>
              </button>
            </div>
            <button onClick={doneLine} className="px-3 py-1 rounded-md text-sm transition-colors bg-muted text-muted-foreground hover:bg-muted/80 flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Done</span>
            </button>
          </div>
        )}

        <textarea
          className="flex-1 w-full p-2 border border-border rounded-md bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary font-mono text-xs"
          value={activeTab?.content || ''}
          onChange={handleContentChange}
          onSelect={handleSelectionChange}
          placeholder={isToDoTab ? "Start writing your notes in markdown..." : "Write your notes here..."}
        />
        
        <div className="flex justify-between items-center mt-4">
          {/* Delete Tab Button */}
          <div>
            {activeTab?.id !== 'todo' && tabs.length > 1 && (
              <button
                type="button"
                onClick={() => deleteTab(activeTabId)}
                className="px-3 py-2 rounded-md text-sm font-medium transition-colors border border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
              >
                Delete Tab
              </button>
            )}
          </div>
          
          {/* Save/Cancel Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md text-sm font-medium transition-colors border border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Save Notes
            </button>
          </div>
        </div>
      </div>
      
      {/* Rename Tab Modal */}
      {isRenaming && renamingTabId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
          <div className="bg-card p-6 rounded-lg shadow-xl w-full max-w-md border border-border">
            <h3 className="text-lg font-semibold mb-4 text-foreground">Rename Tab</h3>
            <RenameTabForm
              currentName={tabs.find(t => t.id === renamingTabId)?.name || ''}
              onSave={(newName) => {
                renameTab(renamingTabId, newName);
              }}
              onCancel={() => {
                setIsRenaming(false);
                setRenamingTabId(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default NotepadDialog;