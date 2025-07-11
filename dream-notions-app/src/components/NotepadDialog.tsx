import React, { useState, useEffect } from 'react';

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

  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

  const handleSave = () => {
    onSave(content);
    onClose();
  };

  const handleDelete = () => {
    onDelete();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-muted p-6 rounded-lg shadow-xl w-full max-w-2xl h-3/4 flex flex-col border border-border">
        <h2 className="text-xl mb-4 text-foreground">Notepad</h2>
        
        <textarea
          className="flex-1 w-full p-2 border border-border rounded-md bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary font-mono text-xs"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Start writing your notes in markdown..."
        />
        
        <div className="flex justify-between items-center mt-4">
          <button
            type="button"
            onClick={handleDelete}
            className="px-3 py-2 rounded-md text-sm font-medium transition-colors border border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
          >
            Delete
          </button>
          
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Save & Close
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md text-sm font-medium transition-colors border border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotepadDialog;