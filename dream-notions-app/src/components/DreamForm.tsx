import React, { useState, useEffect } from 'react';
import type { DreamEntry } from '../types/DreamEntry';
import { aiService } from '../services/aiService';

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

  // Add state for editable date and time if editing
  const [editDate, setEditDate] = useState(() => {
    if (dreamToEdit && dreamToEdit.timestamp) {
      const d = new Date(dreamToEdit.timestamp);
      return d.toISOString().slice(0, 10); // YYYY-MM-DD
    }
    return '';
  });
  const [editTime, setEditTime] = useState(() => {
    if (dreamToEdit && dreamToEdit.timestamp) {
      const d = new Date(dreamToEdit.timestamp);
      return d.toTimeString().slice(0, 5); // HH:MM
    }
    return '';
  });

  // States for text cleanup feature
  const [showCleanupModal, setShowCleanupModal] = useState(false);
  const [cleanedText, setCleanedText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number }>({ 
    visible: false, x: 0, y: 0 
  });

  // States for title suggestion feature
  const [titleContextMenu, setTitleContextMenu] = useState<{ visible: boolean; x: number; y: number }>({ 
    visible: false, x: 0, y: 0 
  });
  const [showTitleSuggestionModal, setShowTitleSuggestionModal] = useState(false);
  const [suggestedTitles, setSuggestedTitles] = useState<string[]>([]);
  const [isGeneratingTitles, setIsGeneratingTitles] = useState(false);
  
  // States for iterative title refinement
  const [selectedTitleIndex, setSelectedTitleIndex] = useState<number>(-1);
  const [titleHistory, setTitleHistory] = useState<string[][]>([]);
  const [currentTitleSet, setCurrentTitleSet] = useState(0);
  
  // States for title editing
  const [editingTitleIndex, setEditingTitleIndex] = useState<number>(-1);
  const [editingTitleText, setEditingTitleText] = useState<string>('');
  const [titleEditMenu, setTitleEditMenu] = useState<{ 
    visible: boolean; 
    x: number; 
    y: number; 
    titleIndex: number;
  }>({ 
    visible: false, x: 0, y: 0, titleIndex: -1 
  });

  // Close context menus when clicking elsewhere
  useEffect(() => {
    const handleClick = () => {
      setContextMenu({ visible: false, x: 0, y: 0 });
      setTitleContextMenu({ visible: false, x: 0, y: 0 });
      setTitleEditMenu({ visible: false, x: 0, y: 0, titleIndex: -1 });
    };
    if (contextMenu.visible || titleContextMenu.visible || titleEditMenu.visible) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [contextMenu.visible, titleContextMenu.visible, titleEditMenu.visible]);

  // When editing, update date/time state if dreamToEdit changes
  useEffect(() => {
    if (dreamToEdit && dreamToEdit.timestamp) {
      const d = new Date(dreamToEdit.timestamp);
      setEditDate(d.toISOString().slice(0, 10));
      setEditTime(d.toTimeString().slice(0, 5));
    }
  }, [dreamToEdit]);

  // Handle right-click context menu for description textarea
  const handleDescriptionContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (description.trim()) {
      // Load AI config to check if it's available
      aiService.loadConfig();
      setContextMenu({
        visible: true,
        x: e.clientX,
        y: e.clientY
      });
    }
  };

  // Handle right-click context menu for title input
  const handleTitleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (description.trim()) {
      // Load AI config to check if it's available
      aiService.loadConfig();
      setTitleContextMenu({
        visible: true,
        x: e.clientX,
        y: e.clientY
      });
    }
  };

  // Clean up text using AI service
  const handleCleanupText = async () => {
    setContextMenu({ visible: false, x: 0, y: 0 });
    setIsProcessing(true);
    setShowCleanupModal(true);
    
    // Load AI configuration
    aiService.loadConfig();
    
    try {
      const result = await aiService.cleanupText(description);
      
      if (result.error) {
        setCleanedText(`Error: ${result.error}`);
      } else {
        setCleanedText(result.cleanedText);
      }
    } catch (error) {
      console.error('Error cleaning up text:', error);
      setCleanedText('Error processing text. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Replace original text with cleaned version
  const handleReplaceText = () => {
    setDescription(cleanedText);
    setShowCleanupModal(false);
    setCleanedText('');
  };

  // Generate title suggestions using AI
  const handleGenerateTitleSuggestions = async () => {
    setTitleContextMenu({ visible: false, x: 0, y: 0 });
    setIsGeneratingTitles(true);
    setShowTitleSuggestionModal(true);
    setSuggestedTitles([]);
    
    // Reset history, selection, and editing for new generation
    setTitleHistory([]);
    setCurrentTitleSet(0);
    setSelectedTitleIndex(-1);
    setEditingTitleIndex(-1);
    setEditingTitleText('');
    
    // Load AI configuration
    aiService.loadConfig();
    
    try {
      const titlePrompt = `Based on the following dream description, suggest 5 concise, evocative dream titles that capture the essence and mood of the dream. Each title should be creative, memorable, and no more than 6-8 words. Make them poetic but clear.

Dream description:
${description}

Please respond with just the 5 titles, one per line, without numbers or bullets.`;

      const result = await aiService.cleanupText(titlePrompt, true);
      
      if (result.error) {
        setSuggestedTitles([`Error: ${result.error}`]);
      } else {
        // Parse the AI response into individual titles
        const titles = result.cleanedText
          .split('\n')
          .map(title => title.trim())
          .filter(title => title.length > 0 && !title.match(/^\d+\.?\s*/)) // Remove numbered lines
          .slice(0, 5); // Limit to 5 titles
        
        const finalTitles = titles.length > 0 ? titles : ['No titles generated'];
        setSuggestedTitles(finalTitles);
        
        // Add to history
        setTitleHistory([finalTitles]);
      }
    } catch (error) {
      console.error('Error generating titles:', error);
      setSuggestedTitles(['Error generating titles. Please try again.']);
    } finally {
      setIsGeneratingTitles(false);
    }
  };

  // Handle title selection (not replacement yet)
  const handleTitleSelect = (index: number) => {
    setSelectedTitleIndex(index);
  };

  // Replace current title with selected suggestion
  const handleReplaceWithSelectedTitle = () => {
    if (selectedTitleIndex >= 0 && selectedTitleIndex < suggestedTitles.length) {
      const selectedTitle = suggestedTitles[selectedTitleIndex];
      setName(selectedTitle);
      setShowTitleSuggestionModal(false);
      setSuggestedTitles([]);
      setTitleHistory([]);
      setCurrentTitleSet(0);
      setSelectedTitleIndex(-1);
    }
  };

  // Generate similar titles based on selected title
  const handleGenerateSimilarTitles = async (title: string) => {
    setIsGeneratingTitles(true);
    
    // Load AI configuration
    aiService.loadConfig();
    
    try {
      const refinementPrompt = `Based on this dream title: "${title}"

Generate 5 new dream titles that are similar in style, tone, and mood to the example above. Keep the same creative approach and poetic feeling, but create variations that explore different word choices and phrasings while maintaining the same essence.

Please respond with just the 5 titles, one per line, without numbers or bullets.`;

      const result = await aiService.cleanupText(refinementPrompt, true);
      
      if (result.error) {
        setSuggestedTitles([`Error: ${result.error}`]);
      } else {
        // Parse the AI response into individual titles
        const titles = result.cleanedText
          .split('\n')
          .map(title => title.trim())
          .filter(title => title.length > 0 && !title.match(/^\d+\.?\s*/)) // Remove numbered lines
          .slice(0, 5); // Limit to 5 titles
        
        const finalTitles = titles.length > 0 ? titles : ['No titles generated'];
        setSuggestedTitles(finalTitles);
        
        // Add to history and increment set counter
        const newHistory = [...titleHistory, finalTitles];
        setTitleHistory(newHistory);
        setCurrentTitleSet(newHistory.length - 1);
        
        // Reset selection to first item of new set
        setSelectedTitleIndex(0);
      }
    } catch (error) {
      console.error('Error generating similar titles:', error);
      setSuggestedTitles(['Error generating titles. Please try again.']);
    } finally {
      setIsGeneratingTitles(false);
    }
  };

  // Navigate back to previous title set
  const handleBackToPreviousSet = () => {
    if (currentTitleSet > 0) {
      const previousSet = currentTitleSet - 1;
      setCurrentTitleSet(previousSet);
      setSuggestedTitles(titleHistory[previousSet]);
      setSelectedTitleIndex(0); // Select first item when going back
      setEditingTitleIndex(-1); // Exit edit mode
      setEditingTitleText('');
    }
  };

  // Handle right-click on title for editing
  const handleTitleRightClick = (e: React.MouseEvent, titleIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!suggestedTitles[titleIndex].startsWith('Error')) {
      setTitleEditMenu({
        visible: true,
        x: e.clientX,
        y: e.clientY,
        titleIndex: titleIndex
      });
    }
  };

  // Start editing a title
  const handleStartEditTitle = () => {
    const titleIndex = titleEditMenu.titleIndex;
    if (titleIndex >= 0 && titleIndex < suggestedTitles.length) {
      setEditingTitleIndex(titleIndex);
      setEditingTitleText(suggestedTitles[titleIndex]);
      setTitleEditMenu({ visible: false, x: 0, y: 0, titleIndex: -1 });
    }
  };

  // Save edited title
  const handleSaveEditedTitle = () => {
    if (editingTitleIndex >= 0 && editingTitleText.trim()) {
      const newTitles = [...suggestedTitles];
      newTitles[editingTitleIndex] = editingTitleText.trim();
      setSuggestedTitles(newTitles);
      
      // Update the history with the edited version
      const newHistory = [...titleHistory];
      newHistory[currentTitleSet] = newTitles;
      setTitleHistory(newHistory);
      
      setEditingTitleIndex(-1);
      setEditingTitleText('');
    }
  };

  // Cancel editing
  const handleCancelEditTitle = () => {
    setEditingTitleIndex(-1);
    setEditingTitleText('');
  };

  // Generate similar titles using the current title (which might be edited)
  const handleGenerateSimilarTitlesFromCurrent = (titleIndex: number) => {
    const currentTitle = suggestedTitles[titleIndex];
    handleGenerateSimilarTitles(currentTitle);
  };

  // When saving, use the edited date/time if present
  const handleSave = () => {
    let timestamp = dreamToEdit?.timestamp ?? Date.now();
    if (editDate && editTime) {
      // Reconstruct the original date/time string from dreamToEdit
      let originalDate = '', originalTime = '';
      if (dreamToEdit && dreamToEdit.timestamp) {
        const d = new Date(dreamToEdit.timestamp);
        originalDate = d.toISOString().slice(0, 10);
        originalTime = d.toTimeString().slice(0, 5);
      }
      // Only update timestamp if date or time changed
      if (editDate !== originalDate || editTime !== originalTime) {
        const [year, month, day] = editDate.split('-').map(Number);
        const [hour, minute] = editTime.split(':').map(Number);
        timestamp = new Date(year, month - 1, day, hour, minute).getTime();
      }
    }
    const updatedDream = {
      ...dreamToEdit,
      id: dreamToEdit?.id ?? Date.now().toString(), // Ensure id is always a string
      name,
      description,
      isFavorite,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      iconColor,
      timestamp,
      displayOrder: dreamToEdit?.displayOrder,
    };
    onSave(updatedDream);
  };

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
      displayOrder: dreamToEdit?.displayOrder,
    };
    onSave(dreamData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-card p-6 rounded-lg shadow-xl w-full max-w-4xl border border-border">
        <h2 className="text-xl mb-4 text-foreground text-center">{dreamToEdit ? 'Edit Dream' : 'Add New Dream'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4" style={{ display: 'none' }}>
            <input
              type="date"
              id="dreamDate"
              className="w-full p-2 border border-border rounded-md bg-background text-foreground text-sm"
              value={dreamDate}
              onChange={(e) => setDreamDate(e.target.value)}
              required
            />
          </div>
          {/* Show sequence number, date, and time on the same line if editing an existing dream */}
          {dreamToEdit && (
            <div className="mb-2 text-xs text-muted-foreground flex gap-4 items-center justify-between">
              <div className="flex gap-4 items-center">
                <label>Date: <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} className="border border-border rounded px-1 py-0.5 ml-1 bg-muted text-foreground" /></label>
                <label>Time: <input type="time" value={editTime} onChange={e => setEditTime(e.target.value)} className="border border-border rounded px-1 py-0.5 ml-1 bg-muted text-foreground" /></label>
              </div>
              {typeof dreamToEdit.displayOrder === 'number' && (
                <span className="ml-auto">Sequence #: {dreamToEdit.displayOrder}</span>
              )}
            </div>
          )}
          <div className="mb-4">
            <input
              type="text"
              id="name"
              className="w-full p-2 border border-border rounded-md bg-background text-foreground text-sm"
              value={name}
              onChange={handleNameChange}
              onContextMenu={handleTitleContextMenu}
              placeholder="Dream Title (right-click for AI suggestions when you have description)"
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
          <div className="mb-4 relative">
            <textarea
              id="description"
              rows={12}
              className="w-full p-2 border border-border rounded-md bg-background text-foreground text-sm"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onContextMenu={handleDescriptionContextMenu}
              placeholder="Description (right-click for AI cleanup when you have text)"
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
              type="button"
              className="bg-primary text-primary-foreground px-4 py-2 rounded hover:bg-primary/90"
              onClick={handleSave}
            >
              Save
            </button>
          </div>
        </form>

        {/* Context Menu for Description Textarea */}
        {contextMenu.visible && (
          <div
            className="fixed bg-background border border-border rounded-md shadow-lg py-1 z-50 min-w-[160px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleCleanupText}
              disabled={!aiService.isConfigured()}
              className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <div className="flex flex-col">
                <span>Clean up text with AI</span>
                {!aiService.isConfigured() && (
                  <span className="text-xs text-muted-foreground">Configure AI in Settings first</span>
                )}
              </div>
            </button>
          </div>
        )}

        {/* Context Menu for Title Input */}
        {titleContextMenu.visible && (
          <div
            className="fixed bg-background border border-border rounded-md shadow-lg py-1 z-50 min-w-[180px]"
            style={{ left: titleContextMenu.x, top: titleContextMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleGenerateTitleSuggestions}
              disabled={!aiService.isConfigured() || !description.trim()}
              className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <div className="flex flex-col">
                <span>Suggest dream titles with AI</span>
                {!aiService.isConfigured() && (
                  <span className="text-xs text-muted-foreground">Configure AI in Settings first</span>
                )}
                {aiService.isConfigured() && !description.trim() && (
                  <span className="text-xs text-muted-foreground">Add dream description first</span>
                )}
              </div>
            </button>
          </div>
        )}

        {/* Context Menu for Title Editing */}
        {titleEditMenu.visible && (
          <div
            className="fixed bg-background border border-border rounded-md shadow-lg py-1 z-50 min-w-[160px]"
            style={{ left: titleEditMenu.x, top: titleEditMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleStartEditTitle}
              className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span>Edit this title</span>
            </button>
          </div>
        )}


        {/* Text Cleanup Modal */}
        {showCleanupModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-card p-8 rounded-lg shadow-xl w-full max-w-7xl border border-border h-[90vh] flex flex-col">
              <h3 className="text-lg mb-4 text-foreground text-center">AI Text Cleanup</h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
                {/* Original Text */}
                <div className="flex flex-col min-h-0">
                  <h4 className="text-sm font-medium text-foreground mb-3">Original Text:</h4>
                  <div className="p-4 border border-border rounded-md bg-muted/50 text-sm flex-1 overflow-y-auto">
                    <div className="whitespace-pre-wrap">{description}</div>
                  </div>
                </div>
                
                {/* Cleaned Text */}
                <div className="flex flex-col min-h-0">
                  <h4 className="text-sm font-medium text-foreground mb-3">
                    AI Enhanced Text:
                    {isProcessing && (
                      <span className="ml-2 text-xs text-muted-foreground">Processing...</span>
                    )}
                    {!isProcessing && cleanedText && (
                      <span className="ml-2 text-xs text-muted-foreground">(editable - make changes as needed)</span>
                    )}
                  </h4>
                  {isProcessing ? (
                    <div className="p-4 border border-border rounded-md bg-background text-sm flex-1 flex items-center justify-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        <span className="text-muted-foreground">Processing your dream with AI...</span>
                      </div>
                    </div>
                  ) : (
                    <textarea
                      className="w-full p-4 border border-border rounded-md bg-background text-foreground text-sm flex-1 resize-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      value={cleanedText}
                      onChange={(e) => setCleanedText(e.target.value)}
                      placeholder="AI-enhanced text will appear here. You can edit this text before replacing your original..."
                      style={{ fontFamily: 'inherit', lineHeight: '1.5' }}
                    />
                  )}
                </div>
              </div>
              
              <div className="flex items-center justify-between pt-6 border-t border-border mt-6">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>💡 Tip: You can edit the AI text directly before replacing</span>
                  {cleanedText && (
                    <span className="px-2 py-1 rounded bg-primary/10 text-primary">
                      {cleanedText.length} characters
                    </span>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCleanupModal(false);
                      setCleanedText('');
                    }}
                    className="px-6 py-3 rounded-md text-sm font-medium transition-colors border border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleReplaceText}
                    disabled={isProcessing || !cleanedText.trim()}
                    className="bg-primary text-primary-foreground px-6 py-3 rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Replace with Enhanced Version
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Title Suggestion Modal */}
        {showTitleSuggestionModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-card p-6 rounded-lg shadow-xl w-full max-w-2xl border border-border max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg text-foreground">AI Dream Title Suggestions</h3>
                <div className="flex items-center gap-2">
                  {titleHistory.length > 1 && (
                    <span className="text-sm text-muted-foreground">
                      Set {currentTitleSet + 1} of {titleHistory.length}
                    </span>
                  )}
                  {currentTitleSet > 0 && (
                    <button
                      onClick={handleBackToPreviousSet}
                      className="px-3 py-1 text-xs rounded-md bg-muted hover:bg-muted/80 transition-colors flex items-center gap-1"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Back
                    </button>
                  )}
                </div>
              </div>
              
              {isGeneratingTitles ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
                  <span className="text-muted-foreground">Generating creative titles for your dream...</span>
                </div>
              ) : (
                <div className="space-y-3 mb-6">
                  {suggestedTitles.map((title, index) => (
                    <div
                      key={index}
                      className={`w-full p-4 border rounded-md transition-colors ${
                        title.startsWith('Error') 
                          ? 'border-red-500/50 bg-red-500/10 opacity-50' 
                          : selectedTitleIndex === index
                            ? 'border-primary bg-primary/10' 
                            : 'border-border bg-background hover:bg-muted'
                      }`}
                    >
                      {editingTitleIndex === index ? (
                        // Edit mode
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editingTitleText}
                            onChange={(e) => setEditingTitleText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleSaveEditedTitle();
                              } else if (e.key === 'Escape') {
                                handleCancelEditTitle();
                              }
                            }}
                            className="flex-1 p-2 border border-border rounded-md bg-background text-foreground text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                            autoFocus
                          />
                          <button
                            onClick={handleSaveEditedTitle}
                            className="p-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                            title="Save (Enter)"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                          <button
                            onClick={handleCancelEditTitle}
                            className="p-2 rounded-md bg-muted text-foreground hover:bg-muted/80 transition-colors"
                            title="Cancel (Escape)"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        // Display mode
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => handleTitleSelect(index)}
                            onContextMenu={(e) => handleTitleRightClick(e, index)}
                            disabled={title.startsWith('Error')}
                            className="text-foreground font-medium flex-1 text-left disabled:cursor-not-allowed"
                          >
                            {title}
                          </button>
                          
                          {!title.startsWith('Error') && (
                            <button
                              onClick={() => handleGenerateSimilarTitlesFromCurrent(index)}
                              disabled={isGeneratingTitles}
                              className="ml-4 p-2 rounded-md hover:bg-primary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
                              title="Generate similar titles"
                            >
                              <span className="text-xs">Similar</span>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {suggestedTitles.length === 0 && !isGeneratingTitles && (
                    <div className="text-center text-muted-foreground py-8">
                      No titles generated. Please try again.
                    </div>
                  )}
                </div>
              )}
              
              <div className="flex justify-between items-center pt-4 border-t border-border">
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">
                    💡 Click to select • Right-click to edit • "Similar" for variations
                  </span>
                  {titleHistory.length > 1 && (
                    <span className="text-xs text-muted-foreground mt-1">
                      🔄 Navigate between title sets using the Back button
                    </span>
                  )}
                  {selectedTitleIndex >= 0 && editingTitleIndex === -1 && (
                    <span className="text-xs text-primary mt-1 font-medium">
                      ✓ Selected: "{suggestedTitles[selectedTitleIndex]}"
                    </span>
                  )}
                  {editingTitleIndex >= 0 && (
                    <span className="text-xs text-orange-600 mt-1 font-medium">
                      ✏️ Editing: Press Enter to save, Escape to cancel
                    </span>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowTitleSuggestionModal(false);
                      setSuggestedTitles([]);
                      setTitleHistory([]);
                      setCurrentTitleSet(0);
                      setSelectedTitleIndex(-1);
                      setEditingTitleIndex(-1);
                      setEditingTitleText('');
                    }}
                    className="px-4 py-2 rounded-md text-sm font-medium transition-colors border border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground"
                  >
                    Cancel
                  </button>
                  {!isGeneratingTitles && suggestedTitles.length > 0 && !suggestedTitles[0].startsWith('Error') && (
                    <button
                      type="button"
                      onClick={handleGenerateTitleSuggestions}
                      className="px-4 py-2 rounded-md text-sm font-medium transition-colors border border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground"
                    >
                      Generate New Titles
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleReplaceWithSelectedTitle}
                    disabled={selectedTitleIndex < 0}
                    className="bg-primary text-primary-foreground px-6 py-2 rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Replace Title
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DreamForm;
