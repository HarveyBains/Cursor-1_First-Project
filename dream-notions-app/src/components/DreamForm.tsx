import React, { useState, useEffect } from 'react';
import type { DreamEntry } from '../types/DreamEntry';

const ICON_COLORS = [
  '#F77536', // Primary Orange
  '#8A2BE2', // Blue Violet (similar to primary purple)
  '#32CD32', // Lime Green
  '#1E90FF', // Dodger Blue
  '#FFD700', // Gold
  '#FF69B4', // Hot Pink
  '#00CED1', // Dark Turquoise
  '#FF4500', // Orange Red
  '#9370DB', // Medium Purple
  '#20B2AA', // Light Sea Green
];

interface DreamFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (dream: DreamEntry) => void;
  dreamToEdit?: DreamEntry | null;
}

const DreamForm: React.FC<DreamFormProps> = ({ isOpen, onClose, onSave, dreamToEdit }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [tags, setTags] = useState('');
  const [iconColor, setIconColor] = useState(''); // Default to no color

  useEffect(() => {
    if (isOpen) {
      console.log('DreamForm opened. dreamToEdit:', dreamToEdit);
      if (dreamToEdit) {
        setName(dreamToEdit.name);
        setDescription(dreamToEdit.description || '');
        setIsFavorite(dreamToEdit.isFavorite || false);
        setTags(dreamToEdit.tags ? dreamToEdit.tags.join(', ') : '');
        setIconColor(dreamToEdit.iconColor || '');
      } else {
        // Reset form for new dream
        const today = new Date();
        const formattedDate = today.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
        setName(`${formattedDate} - `);
        setDescription('');
        setIsFavorite(false);
        setTags('');
        setIconColor('');
      }
    }
  }, [isOpen, dreamToEdit]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const dreamData: DreamEntry = {
      id: dreamToEdit?.id || Date.now().toString(),
      name: name.trim(),
      timestamp: dreamToEdit?.timestamp || Date.now(),
      description: description.trim() || undefined,
      isFavorite,
      tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag !== ''),
      iconColor,
    };
    onSave(dreamData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-card p-6 rounded-lg shadow-xl w-full max-w-md border border-border">
        <h2 className="text-xl font-semibold mb-4 text-foreground">{dreamToEdit ? 'Edit Dream' : 'Add New Dream'}</h2>
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
              style={{ color: 'black' }}
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
              style={{ color: 'black' }}
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
          <div className="mb-4">
            <label className="block text-sm font-medium text-muted-foreground mb-1">Icon Color</label>
            <div className="flex gap-2">
              {ICON_COLORS.map((color) => (
                <div
                  key={color}
                  className={`w-8 h-8 rounded-full cursor-pointer border-2 ${iconColor === color ? 'border-primary' : 'border-transparent'}`}
                  style={{ backgroundColor: color }}
                  onClick={() => setIconColor(color)}
                ></div>
              ))}
            </div>
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
              style={{ color: 'black' }}
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
