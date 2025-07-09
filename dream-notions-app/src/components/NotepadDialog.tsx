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
    const sections = { todo: [] as string[], next: [] as string[], inbox: [] as string[] };
    let currentSection: 'todo' | 'next' | 'inbox' | null = null;

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
      } else if (currentSection) {
        sections[currentSection].push(line);
      }
    }
    return sections;
  };

  // Helper to reconstruct content from sections
  const reconstructContent = (sections: { todo: string[], next: string[], inbox: string[] }) => {
    return [...sections.todo, ...sections.next, ...sections.inbox].join('\n');
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

  const indentLine = () => {
    const { lines, startLineIndex } = getSelectedLineInfo();
    const newLines = [...lines];
    newLines[startLineIndex] = '  ' + newLines[startLineIndex]; // Add two spaces for indent
    setContent(newLines.join('\n'));
  };

  const outdentLine = () => {
    const { lines, startLineIndex } = getSelectedLineInfo();
    const newLines = [...lines];
    newLines[startLineIndex] = newLines[startLineIndex].replace(/^\s{2}/, ''); // Remove two leading spaces
    setContent(newLines.join('\n'));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-muted p-6 rounded-lg shadow-xl w-full max-w-2xl h-3/4 flex flex-col border border-border">
        <h2 className="text-xl font-semibold mb-4 text-foreground">Notepad</h2>
        <div className="flex gap-2 mb-4">
          <button onClick={() => moveLine('up')} className="px-3 py-1 rounded-md text-sm font-medium transition-colors bg-muted text-muted-foreground hover:bg-muted/80">↑ Move Up</button>
          <button onClick={() => moveLine('down')} className="px-3 py-1 rounded-md text-sm font-medium transition-colors bg-muted text-muted-foreground hover:bg-muted/80">↓ Move Down</button>
          <button onClick={indentLine} className="px-3 py-1 rounded-md text-sm font-medium transition-colors bg-muted text-muted-foreground hover:bg-muted/80">→ Indent</button>
          <button onClick={outdentLine} className="px-3 py-1 rounded-md text-sm font-medium transition-colors bg-muted text-muted-foreground hover:bg-muted/80">← Outdent</button>
          <button onClick={promoteLine} className="px-3 py-1 rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90">Promote</button>
          <button onClick={demoteLine} className="px-3 py-1 rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90">Demote</button>
        </div>
        <textarea
          className="flex-1 w-full p-2 border border-border rounded-md bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary font-mono"
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