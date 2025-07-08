import React, { useState, useEffect } from 'react';
import type { DreamEntry } from '../types/DreamEntry';

interface DreamFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (dream: DreamEntry) => void;
}

const DreamForm: React.FC<DreamFormProps> = ({ isOpen, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [tags, setTags] = useState('');

  useEffect(() => {
    if (!isOpen) {
      // Reset form when closed
      setName('');
      setDescription('');
      setIsFavorite(false);
      setTags('');
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newDream: DreamEntry = {
      id: Date.now().toString(), // Simple unique ID
      name: name.trim(),
      timestamp: Date.now(),
      description: description.trim() || undefined,
      isFavorite,
      tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag !== ''),
    };
    onSave(newDream);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-card p-6 rounded-lg shadow-xl w-full max-w-md border border-border">
        <h2 className="text-xl font-semibold mb-4 text-foreground">Add New Dream</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="name" className="block text-sm font-medium text-muted-foreground mb-1">Dream Title</label>
            <input
              type="text"
              id="name"
              className="w-full p-2 border border-border rounded-md bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="mb-4">
            <label htmlFor="description" className="block text-sm font-medium text-muted-foreground mb-1">Description</label>
            <textarea
              id="description"
              rows={4}
              className="w-full p-2 border border-border rounded-md bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            ></textarea>
          </div>
          <div className="mb-4 flex items-center">
            <input
              type="checkbox"
              id="isFavorite"
              className="mr-2 h-4 w-4 text-primary focus:ring-primary border-border rounded"
              checked={isFavorite}
              onChange={(e) => setIsFavorite(e.target.checked)}
            />
            <label htmlFor="isFavorite" className="text-sm font-medium text-muted-foreground">Mark as Favorite</label>
          </div>
          <div className="mb-6">
            <label htmlFor="tags" className="block text-sm font-medium text-muted-foreground mb-1">Tags (comma-separated)</label>
            <input
              type="text"
              id="tags"
              className="w-full p-2 border border-border rounded-md bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g., vivid, recurring, nightmare"
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
              Save Dream
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DreamForm;
