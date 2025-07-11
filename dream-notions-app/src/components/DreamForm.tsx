import React, { useState, useEffect } from 'react';
import type { DreamEntry } from '../types/DreamEntry';

const ICON_COLORS = [
  '#F87171', // Red
  '#FBBF24', // Yellow/Amber
  '#34D399', // Green
  '#60A5FA', // Blue
  '#A78BFA', // Purple
  '#FFFFFF', // White
  '#F97316', // Orange
  '#2DD4BF', // Teal
];

interface DreamFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (dream: DreamEntry) => void;
  dreamToEdit?: DreamEntry | null;
  taskTitles: string[];
  allTags: string[];
  allDreams: DreamEntry[]; // Add allDreams prop
  onDeleteTag?: (tagToDelete: string) => void;
  activeTagFilter?: string | null; // Add activeTagFilter prop
}

const DreamForm: React.FC<DreamFormProps> = ({ isOpen, onClose, onSave, dreamToEdit, taskTitles, allTags, allDreams, onDeleteTag, activeTagFilter }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [tags, setTags] = useState('');
  const [iconColor, setIconColor] = useState(''); // Default to no color
  const [nameSuggestions, setNameSuggestions] = useState<string[]>([]);
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
  const [dreamDate, setDreamDate] = useState<string>(''); // YYYY-MM-DD format for input type="date"
  const [newTagInput, setNewTagInput] = useState('');

  // Hierarchical autocomplete function
  const getHierarchicalSuggestions = (input: string, availableTags: string[]): string[] => {
    const lowerInput = input.toLowerCase();
    const suggestions = new Set<string>();
    
    // Check if user is building a hierarchical path
    const parts = input.split('/');
    const isHierarchical = input.includes('/');
    const lastPart = parts[parts.length - 1].toLowerCase();
    
    if (isHierarchical) {
      // User is typing a hierarchical tag like "Dreams/O"
      const currentPath = parts.slice(0, -1).join('/');
      
      // Find all tags that start with the current path and have the next level
      availableTags.forEach(tag => {
        if (tag.toLowerCase().startsWith(currentPath.toLowerCase() + '/')) {
          const tagParts = tag.split('/');
          // We want the next level after currentPath
          const nextLevelIndex = parts.length - 1;
          
          if (tagParts.length > nextLevelIndex) {
            const nextLevelPart = tagParts[nextLevelIndex];
            
            // Check if this next level part starts with the user's input
            if (nextLevelPart.toLowerCase().startsWith(lastPart)) {
              // Build suggestion up to this level
              const suggestion = tagParts.slice(0, nextLevelIndex + 1).join('/');
              suggestions.add(suggestion);
            }
          }
        }
      });
    } else {
      // User is typing a root-level tag like "DR" or "Dreams"
      // Find matching root level tags
      availableTags.forEach(tag => {
        // Check root level matches
        const rootPart = tag.split('/')[0];
        if (rootPart.toLowerCase().startsWith(lowerInput)) {
          suggestions.add(rootPart);
        }
        
        // Also check full tag matches for standalone tags
        if (tag.toLowerCase().startsWith(lowerInput)) {
          suggestions.add(tag);
        }
      });
    }
    
    const result = Array.from(suggestions).slice(0, 10).sort();
    console.log(`Hierarchical suggestions for "${input}":`, result);
    return result;
  };

  // Compute icon color usage frequency
  const iconColorCounts: Record<string, number> = React.useMemo(() => {
    const counts: Record<string, number> = {};
    allDreams.forEach(dream => {
      if (dream.iconColor) {
        counts[dream.iconColor] = (counts[dream.iconColor] || 0) + 1;
      }
    });
    return counts;
  }, [allDreams]);

  // Sort ICON_COLORS by usage frequency (descending), unused at the end
  const sortedIconColors = React.useMemo(() => {
    return [...ICON_COLORS].sort((a, b) => {
      const countA = iconColorCounts[a] || 0;
      const countB = iconColorCounts[b] || 0;
      if (countA === countB) return 0;
      return countB - countA;
    });
  }, [iconColorCounts]);

  useEffect(() => {
    if (isOpen) {
      console.log('DreamForm opened. dreamToEdit:', dreamToEdit);
      if (dreamToEdit) {
        setName(dreamToEdit.name); // Keep the title when editing
        setDescription(dreamToEdit.description || ''); // Use existing description
        setIsFavorite(dreamToEdit.isFavorite || false);
        setTags(dreamToEdit.tags ? dreamToEdit.tags.join(', ') : '');
        setIconColor(dreamToEdit.iconColor || '');
        // Set dreamDate from existing timestamp
        const date = new Date(dreamToEdit.timestamp);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        setDreamDate(`${year}-${month}-${day}`);
      } else {
        // Reset form for new dream
        setName(''); // No default date in name anymore
        setDescription('');
        setIsFavorite(false);
        setTags(activeTagFilter || ''); // Pre-select active tag filter if available
        setIconColor('');
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        setDreamDate(`${year}-${month}-${day}`); // Default to current date
      }
      setNameSuggestions([]); // Clear suggestions when form opens
      setTagSuggestions([]);
      setNewTagInput(''); // Clear new tag input when form opens
    }
  }, [isOpen, dreamToEdit, activeTagFilter]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setName(inputValue);

    // Filter suggestions based on input value
    if (inputValue.length > 2) { // Only show suggestions after 2 characters
      const filtered = taskTitles.filter(title =>
        title.toLowerCase().includes(inputValue.toLowerCase())
      );
      setNameSuggestions(filtered);
    } else {
      setNameSuggestions([]);
    }
  };

  const handleNameSuggestionClick = (suggestion: string) => {
    setName(suggestion);
    setNameSuggestions([]); // Clear suggestions after selection
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const dreamData: DreamEntry = {
      id: dreamToEdit?.id || Date.now().toString(),
      name: name.trim(),
      timestamp: new Date(dreamDate).getTime(), // Use dreamDate for timestamp
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
        <h2 className="text-xl mb-4 text-foreground text-center">{dreamToEdit ? 'Edit Dream' : 'Add New Dream'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <input
              type="date"
              id="dreamDate"
              className="w-full p-2 border border-border rounded-md bg-background text-foreground text-sm"
              value={dreamDate}
              onChange={(e) => setDreamDate(e.target.value)}
              required
            />
          </div>
          <div className="mb-4">
            <input
              type="text"
              id="name"
              className="w-full p-2 border border-border rounded-md bg-background text-foreground text-sm"
              value={name}
              onChange={handleNameChange}
              placeholder="Dream Title"
              required
            />
            {nameSuggestions.length > 0 && (
              <div className="absolute z-10 bg-card border border-border rounded-md shadow-lg mt-1 w-full max-h-48 overflow-y-auto">
                {nameSuggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className="p-2 cursor-pointer hover:bg-muted text-foreground"
                    onClick={() => handleNameSuggestionClick(suggestion)}
                  >
                    {suggestion}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="mb-4">
            <textarea
              id="description"
              rows={12}
              className="w-full p-2 border border-border rounded-md bg-background text-foreground text-sm"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description"
            ></textarea>
          </div>
          <div className="mb-4">
            <div className="flex justify-between">
              <div
                className={`w-8 h-8 rounded-full cursor-pointer border-2 ${iconColor === '' ? 'border-primary' : 'border-transparent'} flex items-center justify-center text-muted-foreground`}
                onClick={() => setIconColor('')}
                title="No Color"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              {sortedIconColors.map((color) => (
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
            {/* Current Tags Display */}
            <div className="min-h-[2.5rem] p-2 border border-border rounded-md bg-background mb-2 flex flex-wrap gap-1">
              {tags.split(',').map(tag => tag.trim()).filter(tag => tag !== '').map((tag, index) => (
                <span
                  key={index}
                  className="px-2 py-1 text-xs rounded-full font-medium bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 inline-flex items-center gap-1"
                >
                  {tag}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      const currentTags = tags.split(',').map(t => t.trim()).filter(t => t !== '');
                      currentTags.splice(index, 1);
                      setTags(currentTags.join(', '));
                    }}
                    className="text-primary/70 hover:text-primary hover:bg-primary/20 rounded-full w-3 h-3 flex items-center justify-center text-xs leading-none"
                    title="Remove tag"
                  >
                    ×
                  </button>
                </span>
              ))}
              {tags.split(',').map(tag => tag.trim()).filter(tag => tag !== '').length === 0 && (
                <span className="text-xs text-muted-foreground">No tags yet</span>
              )}
            </div>
            
            {/* Add New Tag Input with Hierarchical Autocomplete */}
            <input
              type="text"
              className="w-full p-2 border border-border rounded-md bg-background text-foreground text-sm"
              value={newTagInput}
              onChange={(e) => {
                const inputValue = e.target.value;
                setNewTagInput(inputValue);
                
                if (inputValue.length > 0) {
                  // Get hierarchical suggestions based on current input
                  const suggestions = getHierarchicalSuggestions(inputValue, allTags);
                  setTagSuggestions(suggestions);
                } else {
                  setTagSuggestions([]);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Tab') {
                  e.preventDefault();
                  // Auto-complete with best suggestion
                  if (tagSuggestions.length > 0) {
                    const bestMatch = tagSuggestions[0];
                    setNewTagInput(bestMatch);
                    // Update suggestions for the completed part
                    const newSuggestions = getHierarchicalSuggestions(bestMatch, allTags);
                    setTagSuggestions(newSuggestions);
                  }
                } else if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault();
                  const newTag = newTagInput.trim();
                  if (newTag) {
                    const currentTags = tags.split(',').map(t => t.trim()).filter(t => t !== '');
                    if (!currentTags.includes(newTag)) {
                      currentTags.push(newTag);
                      setTags(currentTags.join(', '));
                    }
                    setNewTagInput('');
                    setTagSuggestions([]);
                  }
                }
              }}
              placeholder="Type to add tags (Tab to autocomplete, Enter/comma to add)"
            />
            
            {/* Tag Suggestions with Hierarchical Context */}
            {tagSuggestions.length > 0 && (
              <div className="absolute z-10 bg-card border border-border rounded-md shadow-lg mt-1 w-full max-h-48 overflow-y-auto">
                {tagSuggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className={`p-2 cursor-pointer hover:bg-muted text-foreground flex items-center justify-between ${index === 0 ? 'bg-primary/5' : ''}`}
                    onClick={() => {
                      const currentTags = tags.split(',').map(t => t.trim()).filter(t => t !== '');
                      if (!currentTags.includes(suggestion)) {
                        currentTags.push(suggestion);
                        setTags(currentTags.join(', '));
                      }
                      setNewTagInput('');
                      setTagSuggestions([]);
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      if (onDeleteTag && window.confirm(`Delete the tag "${suggestion}" from all dreams?`)) {
                        onDeleteTag(suggestion);
                        setTagSuggestions([]);
                      }
                    }}
                    title={index === 0 ? "Best match - Press Tab to autocomplete" : "Click to add, right-click to delete from all dreams"}
                  >
                    <span>{suggestion}</span>
                    {index === 0 && (
                      <span className="text-xs text-muted-foreground ml-2">Tab ↹</span>
                    )}
                  </div>
                ))}
                {tagSuggestions.length === 0 && newTagInput.includes('/') && (
                  <div className="p-2 text-xs text-muted-foreground">
                    Continue typing for hierarchical suggestions...
                  </div>
                )}
              </div>
            )}
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
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DreamForm;
