import React, { useState, useEffect } from 'react';

interface NotepadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (content: string) => void;
  initialContent: string;
}

const NotepadDialog: React.FC<NotepadDialogProps> = ({ isOpen, onClose, onSave, initialContent }) => {
  const [content, setContent] = useState(initialContent);
  const [selectionStart, setSelectionStart] = useState(0);

  // Helper to parse content into sections
  const parseSections = (text: string) => {
    const lines = text.split('\n');
    const sections = { todo: [] as string[], next: [] as string[], inbox: [] as string[], done: [] as string[] };
    let currentSection: 'todo' | 'next' | 'inbox' | 'done' | null = null;

    for (const line of lines) {
      if (line.startsWith('## Todo')) {
        currentSection = 'todo';
        sections.todo.push(line); // Include section header
      } else if (line.startsWith('## Next')) {
        currentSection = 'next';
        sections.next.push(line); // Include section header
      } else if (line.startsWith('## Inbox')) {
        currentSection = 'inbox';
        sections.inbox.push(line); // Include section header
      } else if (line.startsWith('## Done')) {
        currentSection = 'done';
        sections.done.push(line); // Include section header
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

  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

  const handleSave = () => {
    onSave(content);
    onClose();
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
  };

  const handleSelectionChange = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    setSelectionStart(e.currentTarget.selectionStart);
  };

  const getSelectedLineInfo = () => {
    const lines = content.split('\n');
    let startLineIndex = 0;
    let charCount = 0;

    for (let i = 0; i < lines.length; i++) {
      charCount += lines[i].length + 1; // +1 for newline character
      if (selectionStart < charCount) {
        startLineIndex = i;
        break;
      }
    }

    const selectedLine = lines[startLineIndex];
    let currentSection: 'todo' | 'next' | 'inbox' | null = null;
    let sectionStartIndex = -1;

    // Determine current section and its start index
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
    const { selectedLine, currentSection } = getSelectedLineInfo();
    if (!currentSection || selectedLine.trim() === '' || selectedLine.startsWith('##')) return; // Cannot promote empty lines or section headers

    const sections = parseSections(content);
    let newContent = content;

    if (currentSection === 'next' || currentSection === 'inbox') {
      // Remove from current section
      sections[currentSection] = sections[currentSection].filter(line => line !== selectedLine);
      // Add to top of Todo section (after header)
      sections.todo.splice(1, 0, selectedLine);
      newContent = reconstructContent(sections);
    }
    setContent(newContent);
  };

  const demoteLine = () => {
    const { selectedLine, currentSection } = getSelectedLineInfo();
    if (currentSection !== 'todo' || selectedLine.trim() === '' || selectedLine.startsWith('##')) return; // Can only demote from Todo

    const sections = parseSections(content);
    let newContent = content;

    // Remove from Todo section
    sections.todo = sections.todo.filter(line => line !== selectedLine);
    // Add to top of Inbox section (after header)
    sections.inbox.splice(1, 0, selectedLine);
    newContent = reconstructContent(sections);
    setContent(newContent);
  };

  const moveLine = (direction: 'up' | 'down') => {
    const { lines, startLineIndex } = getSelectedLineInfo();
    const selectedLines = [lines[startLineIndex]]; // For single line movement

    if (direction === 'up' && startLineIndex > 0) {
      const newLines = [...lines];
      newLines.splice(startLineIndex - 1, 0, ...selectedLines);
      newLines.splice(startLineIndex + 1, selectedLines.length); // Remove old position
      setContent(newLines.join('\n'));
    } else if (direction === 'down' && startLineIndex < lines.length - 1) {
      const newLines = [...lines];
      newLines.splice(startLineIndex + 2, 0, ...selectedLines);
      newLines.splice(startLineIndex, selectedLines.length); // Remove old position
      setContent(newLines.join('\n'));
    }
  };

  const doneLine = () => {
    const { selectedLine, currentSection } = getSelectedLineInfo();
    if (!currentSection || selectedLine.trim() === '' || selectedLine.startsWith('##')) return; // Cannot mark empty lines or section headers as done

    const sections = parseSections(content);
    let newContent = content;

    // Remove from current section
    sections[currentSection] = sections[currentSection].filter(line => line !== selectedLine);
    // If Done section doesn't exist, add header
    if (sections.done.length === 0 || !sections.done[0].startsWith('## Done')) {
      sections.done.unshift('## Done');
    }
    // Add to top of Done section (after header)
    sections.done.splice(1, 0, selectedLine);
    newContent = reconstructContent(sections);
    setContent(newContent);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-muted p-6 rounded-lg shadow-xl w-full max-w-2xl h-3/4 flex flex-col border border-border">
        <h2 className="text-xl mb-4 text-foreground">Notepad</h2>
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
        <textarea
          className="flex-1 w-full p-2 border border-border rounded-md bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary font-mono text-xs"
          value={content}
          onChange={handleContentChange}
          onSelect={handleSelectionChange}
          placeholder="Start writing your notes in markdown..."
        ></textarea>
        <div className="flex justify-end gap-3 mt-4">
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
  );
};

export default NotepadDialog;