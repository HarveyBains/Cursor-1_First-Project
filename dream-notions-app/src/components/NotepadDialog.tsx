import React, { useState, useEffect, useRef } from 'react';

interface NotepadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (content: string) => void;
  onDelete: () => void;
  initialContent: string;
}

const NotepadDialog: React.FC<NotepadDialogProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  onDelete,
  initialContent,
}) => {
  const [content, setContent] = useState(initialContent);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

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

  // Determine current section
  const getCurrentSection = () => {
    const { lineIndex } = getCurrentLineInfo();
    const structure = parseStructure(content);
    
    if (structure.todoSectionStart !== -1 && 
        lineIndex >= structure.todoSectionStart && 
        lineIndex <= structure.todoSectionEnd) {
      return 'todo';
    } else if (structure.queSectionStart !== -1 && 
               lineIndex >= structure.queSectionStart && 
               lineIndex <= structure.queSectionEnd) {
      return 'que';
    } else if (structure.inboxSectionStart !== -1 && 
               lineIndex >= structure.inboxSectionStart && 
               lineIndex <= structure.inboxSectionEnd) {
      return 'inbox';
    } else if (structure.doneSectionStart !== -1 && 
               lineIndex >= structure.doneSectionStart && 
               lineIndex <= structure.doneSectionEnd) {
      return 'done';
    }
    return 'other';
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

  // Move item to Todo section (legacy function)
  const moveToTodo = () => {
    const lines = content.split('\n');
    const { lineIndex, isListItem, line } = getCurrentLineInfo();
    
    if (!isListItem) return;
    
    const structure = parseStructure(content);
    const newLines = [...lines];
    
    // Remove the item from current location
    newLines.splice(lineIndex, 1);
    
    // Ensure Todo section exists
    let todoInsertIndex: number;
    if (structure.todoSectionStart === -1) {
      // Create Todo section at the top
      newLines.unshift('## Todo', '');
      todoInsertIndex = 1;
    } else {
      // Insert at the top of existing Todo section
      todoInsertIndex = structure.todoSectionStart + 1;
      // Skip any empty lines right after the header
      while (todoInsertIndex < newLines.length && newLines[todoInsertIndex].trim() === '') {
        todoInsertIndex++;
      }
    }
    
    // Insert the item at the top of Todo section
    newLines.splice(todoInsertIndex, 0, line);
    
    setContent(newLines.join('\n'));
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

  const handleSave = () => {
    const formattedContent = formatContent(content);
    onSave(formattedContent);
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-muted p-6 rounded-lg shadow-xl w-full max-w-2xl h-3/4 flex flex-col border border-border">
        <h2 className="text-xl mb-4 text-foreground">Notepad</h2>
        
        <div className="flex-1 flex flex-col">
          {/* Controls - Top Row */}
          <div className="flex items-center gap-2 mb-3 p-2 bg-muted/30 rounded-md">
            <button
              onClick={moveLineUp}
              title="Move line up"
              className="px-3 py-1 rounded transition-colors bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground text-xs font-medium"
            >
              ⬆️ Move Up
            </button>
            
            <button
              onClick={moveLineDown}
              title="Move line down"
              className="px-3 py-1 rounded transition-colors bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground text-xs font-medium"
            >
              ⬇️ Move Down
            </button>
            
            <button
              onClick={promoteToTodo}
              title="Promote to Todo section"
              className="px-3 py-1 rounded transition-colors bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-medium"
            >
              📈 Promote
            </button>
            
            <button
              onClick={demoteFromTodo}
              title="Demote to top of Inbox"
              className="px-3 py-1 rounded transition-colors bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 text-xs font-medium"
            >
              📉 Demote
            </button>
            
            <button
              onClick={deleteCurrentLine}
              title="Delete current line"
              className="px-3 py-1 rounded transition-colors bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium"
            >
              🗑️ Delete
            </button>
            
            {/* Spacer to push Done button to far right */}
            <div className="flex-1"></div>
            
            <button
              onClick={moveToDone}
              title="Move to top of Done section"
              className="px-3 py-1 rounded transition-colors bg-green-500/10 hover:bg-green-500/20 text-green-600 dark:text-green-400 text-xs font-medium"
            >
              ✅ Done
            </button>
          </div>
          
          <textarea
            ref={textareaRef}
            className="flex-1 w-full p-2 border border-border rounded-md bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary font-mono text-xs resize-none"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Start writing your notes in markdown...\n\nUse ## Todo, ## Que, and ## Inbox sections for task management.\nAll tasks automatically get hyphen prefixes."
          />
        </div>
        
        <div className="flex justify-end items-center mt-4">
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotepadDialog;