import React, { useState, useEffect } from 'react';

interface RenameTagDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onRename: (oldTag: string, newTag: string) => void;
  tagToRename: string | null;
}

const RenameTagDialog: React.FC<RenameTagDialogProps> = ({ isOpen, onClose, onRename, tagToRename }) => {
  const [newTagName, setNewTagName] = useState('');

  useEffect(() => {
    if (isOpen && tagToRename) {
      setNewTagName(tagToRename);
    } else if (!isOpen) {
      setNewTagName(''); // Reset when closed
    }
  }, [isOpen, tagToRename]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tagToRename && newTagName.trim() !== '') {
      onRename(tagToRename, newTagName.trim());
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-card p-6 rounded-lg shadow-xl w-full max-w-sm border border-border">
        <h2 className="text-lg font-semibold mb-4 text-foreground">Rename Tag</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="newTagName" className="block text-sm font-medium text-muted-foreground mb-1">New Tag Name</label>
            <input
              type="text"
              id="newTagName"
              className="w-full p-2 border border-border rounded-md bg-input text-white focus:outline-none focus:ring-2 focus:ring-primary"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              required
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md text-sm font-medium transition-colors border border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Rename
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RenameTagDialog;
