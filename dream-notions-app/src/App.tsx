import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import DreamItem from './components/DreamItem';
import ImportDialog from './components/ImportDialog';
import DreamForm from './components/DreamForm';
import DeleteConfirmDialog from './components/DeleteConfirmDialog';
import RenameTagDialog from './components/RenameTagDialog';
import TagBreadcrumbs from './components/TagBreadcrumbs';
import NotepadDialog from './components/NotepadDialog';
import ExportDialog from './components/ExportDialog';
import { DragDropProvider } from './components/DragDropProvider';
import { saveToLocalStorage, loadFromLocalStorage } from './utils/localStorageUtils';
import { exportDreams } from './utils/importExportUtils';
import { firestoreService } from './services/firestore-service';
import './index.css';
import type { DreamEntry } from './types/DreamEntry';
import { useAuth } from './components/AuthProvider';

// Tab interface for notepad
interface Tab {
  id: string;
  name: string;
  content: string;
  isDeletable: boolean;
}

// VersionEditor component
interface VersionEditorProps {
  initialVersion: string;
  onSave: (version: string) => void;
  onCancel: () => void;
}

const VersionEditor: React.FC<VersionEditorProps> = ({ initialVersion, onSave, onCancel }) => {
  const [value, setValue] = useState(initialVersion);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(value.trim() || initialVersion);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="inline-flex items-center">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleSubmit}
        className="text-xs bg-background border border-border rounded px-1 py-0.5 text-foreground min-w-0 w-16"
        style={{ width: `${Math.max(value.length * 0.6, 3)}rem` }}
      />
    </form>
  );
};

// Utility to clean tags and ensure iconColor
function cleanDreamTagsAndColors(dreams: DreamEntry[]) {
  return dreams.map(dream => ({
    ...dream,
    tags: dream.tags ? dream.tags
      .filter(tag => tag !== '★' && tag !== 'star' && tag !== 'favorites')
      .map(tag => tag.startsWith('#') ? tag.substring(1) : tag) : [],
    iconColor: dream.iconColor || '#6B7280',
  }));
}

function App() {
  const { user, signInWithGoogle, signOutUser, signInWithGoogleRedirect } = useAuth();
  // Initialize dreams state (will be synced with Firestore when user is authenticated)
  const [dreams, setDreams] = useState<DreamEntry[]>(() => {
    // Start with localStorage data by default - will be replaced by Firestore if user is authenticated
    const loadedDreams = loadFromLocalStorage('dreams_local', []);
    const cleanedDreams = cleanDreamTagsAndColors(loadedDreams);
    // Save back cleaned dreams if any were changed
    if (JSON.stringify(loadedDreams) !== JSON.stringify(cleanedDreams)) {
      saveToLocalStorage('dreams_local', cleanedDreams);
    }
    return cleanedDreams;
  });
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showAddDreamForm, setShowAddDreamForm] = useState(false);
  const [selectedDream, setSelectedDream] = useState<DreamEntry | null>(null);
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [dreamToDeleteId, setDreamToDeleteId] = useState<string | null>(null);
  const [showDeleteAllConfirmDialog, setShowDeleteAllConfirmDialog] = useState(false);
  const [showNotepadDialog, setShowNotepadDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [version, setVersion] = useState(() => {
    return loadFromLocalStorage('app_version', 'v13.0.2');
  });
  const [isEditingVersion, setIsEditingVersion] = useState(false);
  const [subheader, setSubheader] = useState(() => {
    return loadFromLocalStorage('app_subheader', 'Record and organize your dreams');
  });
  const [isEditingSubheader, setIsEditingSubheader] = useState(false);
  const [notepadTabs, setNotepadTabs] = useState<Tab[]>(() => {
    // Start with default tabs - Firebase will override them if user is authenticated
    const defaultTabs = [
      { id: 'todo', name: 'To Do', content: '', isDeletable: false },
      { id: 'notes', name: 'Notes', content: '', isDeletable: true }
    ];
    
    // For unauthenticated users, try to load from localStorage
    const savedTabs = loadFromLocalStorage('notepad_tabs', null);
    if (savedTabs) {
      return savedTabs;
    }
    
    // Migration: convert old notepad_content to new tab structure
    const oldContent = loadFromLocalStorage('notepad_content', '');
    if (oldContent) {
      return [
        { id: 'todo', name: 'To Do', content: oldContent, isDeletable: false },
        { id: 'notes', name: 'Notes', content: '', isDeletable: true }
      ];
    }
    
    return defaultTabs;
  });
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Initialize from localStorage or default to true (dark mode)
    const savedTheme = localStorage.getItem('theme');
    return savedTheme ? JSON.parse(savedTheme) : true;
  });
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'favorites', 'recents'
  const [sortOrder, setSortOrder] = useState('newest'); // 'manual', 'newest', 'oldest'
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);
  
  // Debug panel state
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [currentVisibleTags, setCurrentVisibleTags] = useState<string[]>([]);
  const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number; tag: string | null }>({ visible: false, x: 0, y: 0, tag: null });
  const [showRenameTagDialog, setShowRenameTagDialog] = useState(false);
  const [tagToRename, setTagToRename] = useState<string | null>(null);
  
  const [isUpdatingFromFirebase, setIsUpdatingFromFirebase] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [firebaseDataLoaded, setFirebaseDataLoaded] = useState(false);
  const [lastSavedNotepadData, setLastSavedNotepadData] = useState<string>('');
  const [initialLoadDelayComplete, setInitialLoadDelayComplete] = useState(false);

  const [activeNotepadTabId, setActiveNotepadTabId] = useState<string>('');


  const allUniqueTags = useMemo(() => {
    // Get all tags and normalize them to prevent duplicates
    const allTags = dreams.flatMap(dream => dream.tags || []);
    const normalizedTags = new Set<string>();
    
    allTags.forEach(tag => {
      // Skip invalid tags
      if (tag === '★' || tag === 'star' || tag === 'favorites' || !tag) {
        return;
      }
      
      // Normalize tag format: Remove # prefix from all tags
      // All tags should be stored without # prefix
      let normalizedTag = tag;
      
      if (tag.startsWith('#')) {
        normalizedTag = tag.substring(1);
      }
      
      normalizedTags.add(normalizedTag);
    });
    
    const result = Array.from(normalizedTags);
    console.log('=== TAG NORMALIZATION ===');
    console.log('Original tags count:', allTags.length);
    console.log('Normalized unique tags count:', result.length);
    console.log('Normalized tags:', result.sort());
    console.log('========================');
    
    return result;
  }, [dreams]);

  // Count of dreams from today
  const todaysCount = useMemo(() => {
    const today = new Date().toDateString();
    return dreams.filter(dream => new Date(dream.timestamp).toDateString() === today).length;
  }, [dreams]);

  // Count of favorite dreams
  const favoritesCount = useMemo(() => {
    return dreams.filter(dream => dream.isFavorite).length;
  }, [dreams]);

  // Debug logging function
  const addDebugLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    console.log(logEntry);
    setDebugLogs(prev => [...prev.slice(-49), logEntry]); // Keep last 50 logs
  }, []);

  // Copy debug info to clipboard
  const copyDebugToClipboard = useCallback(async () => {
    const debugInfo = {
      userStatus: user ? `✅ ${user.displayName} (${user.email})` : '❌ Not signed in',
      userId: user?.uid || 'None',
      dreamsCount: dreams.length,
      dataSource: user ? '🔥 Firebase' : '💾 localStorage',
      timestamp: new Date().toISOString(),
      debugLogs: debugLogs.slice(-20), // Last 20 logs
      firstFewDreams: dreams.slice(0, 3).map(d => ({
        id: d.id,
        name: d.name,
        userId: d.userId,
        hasUserId: !!d.userId
      }))
    };

    const text = `🕷️ Debug Information\n\n${JSON.stringify(debugInfo, null, 2)}`;
    
    try {
      await navigator.clipboard.writeText(text);
      addDebugLog('📋 Debug info copied to clipboard');
    } catch (error) {
      addDebugLog('❌ Failed to copy to clipboard');
      console.error('Copy failed:', error);
    }
  }, [user, dreams, debugLogs, addDebugLog]);

  const allTags = useMemo(() => {
    return Array.from(new Set(dreams.flatMap(dream => dream.tags || []))).filter(tag => tag !== '★' && tag !== 'star' && tag !== 'favorites');
  }, [dreams]);

  const taskTitles = useMemo(() => {
    const tasks = dreams.filter(dream => dream.tags?.some(tag => tag.startsWith('Tasks')));
    return Array.from(new Set(tasks.map(task => task.name)));
  }, [dreams]);

  useEffect(() => {
    // Initialize visible tags with top-level tags when component mounts or activeTagFilter is null
    if (!activeTagFilter) {
      const topLevelTags = getTopLevelTags(allUniqueTags);
      console.log('Setting top-level tags:', topLevelTags);
      console.log('All unique tags:', allUniqueTags);
      setCurrentVisibleTags(topLevelTags);
    } else {
      // If a tag filter is active, ensure currentVisibleTags reflects its children or itself
      const children = getChildTags(allUniqueTags, activeTagFilter);
      console.log(`Children of "${activeTagFilter}":`, children);
      if (children.length > 0) {
        setCurrentVisibleTags(children);
      } else {
        setCurrentVisibleTags([activeTagFilter]);
      }
    }
  }, [allUniqueTags, activeTagFilter]);

  // Helper to get top-level tags (only level 1 tags, no children)
  const getTopLevelTags = (tags: string[]): string[] => {
    const rootTags = new Set<string>();
    
    // Extract all possible hierarchy levels
    const allHierarchyLevels = new Set<string>();
    tags.forEach(tag => {
      if (tag.includes('/')) {
        const parts = tag.split('/');
        // Add all possible levels: Dreams, Dreams/Activity, Dreams/Activity/Work
        for (let i = 1; i <= parts.length; i++) {
          allHierarchyLevels.add(parts.slice(0, i).join('/'));
        }
      }
    });
    
    // Get true root parts (level 1 only)
    const hierarchicalRoots = new Set<string>();
    tags.forEach(tag => {
      if (tag.includes('/')) {
        const rootPart = tag.split('/')[0];
        hierarchicalRoots.add(rootPart);
      }
    });
    
    tags.forEach(tag => {
      // Skip invalid tags
      if (!tag || tag === '★' || tag === 'star' || tag === 'favorites') {
        return;
      }
      
      // For hierarchical tags (containing /), only include the root part (level 1)
      if (tag.includes('/')) {
        const rootPart = tag.split('/')[0];
        rootTags.add(rootPart);
        return;
      }
      
      // For # tags, always include them as root level
      if (tag.startsWith('#')) {
        rootTags.add(tag);
        return;
      }
      
      // For standalone tags, only include if they're not part of any hierarchical structure
      // and they're not intermediate levels of a hierarchy
      const isPartOfHierarchy = hierarchicalRoots.has(tag) || allHierarchyLevels.has(tag);
      if (!isPartOfHierarchy) {
        rootTags.add(tag);
      }
    });
    
    // Calculate tag usage frequency for sorting
    const tagUsageCount = new Map<string, number>();
    Array.from(rootTags).forEach(tag => {
      const count = dreams.filter(dream => 
        dream.tags?.some(dreamTag => 
          dreamTag === tag || dreamTag.startsWith(tag + '/')
        )
      ).length;
      tagUsageCount.set(tag, count);
    });
    
    // Sort by frequency (descending), then alphabetically
    const result = Array.from(rootTags).sort((a, b) => {
      const countA = tagUsageCount.get(a) || 0;
      const countB = tagUsageCount.get(b) || 0;
      if (countA !== countB) {
        return countB - countA; // Most frequent first
      }
      return a.localeCompare(b); // Alphabetical for same frequency
    });
    console.log('=== TAG FILTERING DEBUG (INFINITE HIERARCHY) ===');
    console.log('All input tags:', tags);
    console.log('All hierarchy levels found:', Array.from(allHierarchyLevels).sort());
    console.log('Root level tags (level 1):', Array.from(hierarchicalRoots));
    console.log('Final root tags to display:', result);
    console.log('================================================');
    return result;
  };

  // Helper to get direct children of a given parent tag
  const getChildTags = (tags: string[], parentTag: string): string[] => {
    const children = new Set<string>();
    const parentParts = parentTag.split('/');
    const parentLevel = parentParts.length;
    
    // Extract all possible hierarchy levels from existing tags
    const allHierarchyLevels = new Set<string>();
    tags.forEach(tag => {
      if (tag.includes('/')) {
        const parts = tag.split('/');
        // Add all possible levels: Dreams, Dreams/Activity, Dreams/Activity/Work
        for (let i = 1; i <= parts.length; i++) {
          allHierarchyLevels.add(parts.slice(0, i).join('/'));
        }
      }
    });
    
    // Find direct children (exactly one level deeper)
    Array.from(allHierarchyLevels).forEach(hierarchyLevel => {
      if (hierarchyLevel.startsWith(`${parentTag}/`)) {
        const parts = hierarchyLevel.split('/');
        // Only include if it's exactly one level deeper
        if (parts.length === parentLevel + 1) {
          children.add(hierarchyLevel);
        }
      }
    });
    
    // Also include any full tags that are direct children
    tags.forEach(tag => {
      if (tag.startsWith(`${parentTag}/`)) {
        const parts = tag.split('/');
        // If this tag is exactly one level deeper, include it
        if (parts.length === parentLevel + 1) {
          children.add(tag);
        }
      }
    });
    
    // Calculate tag usage frequency for child tags
    const tagUsageCount = new Map<string, number>();
    Array.from(children).forEach(tag => {
      const count = dreams.filter(dream => 
        dream.tags?.some(dreamTag => 
          dreamTag === tag || dreamTag.startsWith(tag + '/')
        )
      ).length;
      tagUsageCount.set(tag, count);
    });
    
    // Sort by frequency (descending), then alphabetically
    const result = Array.from(children).sort((a, b) => {
      const countA = tagUsageCount.get(a) || 0;
      const countB = tagUsageCount.get(b) || 0;
      if (countA !== countB) {
        return countB - countA; // Most frequent first
      }
      return a.localeCompare(b); // Alphabetical for same frequency
    });
    console.log(`Children for "${parentTag}" (level ${parentLevel}):`, result);
    return result;
  };

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      console.log('Applying dark mode');
    } else {
      document.documentElement.classList.remove('dark');
      console.log('Applying light mode');
    }
    localStorage.setItem('theme', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  // Simple Firebase sync - load data when user signs in
  useEffect(() => {
    let dreamsUnsubscribe: (() => void) | null = null;
    let notepadUnsubscribe: (() => void) | null = null;

    if (user) {
      addDebugLog(`🔥 Setting up Firebase for user: ${user.uid}`);
      
      // Simple one-time migration: only if Firebase is empty and localStorage has data
      const migrateIfNeeded = async () => {
        try {
          const localDreams = loadFromLocalStorage('dreams_local', []);
          const cleanedLocalDreams = cleanDreamTagsAndColors(localDreams);
          
          if (cleanedLocalDreams.length > 0) {
            const firestoreDreams = await firestoreService.getUserDreams(user.uid);
            
            if (firestoreDreams.length === 0) {
              addDebugLog(`🔄 One-time migration: ${cleanedLocalDreams.length} dreams to Firebase`);
              
              for (const dream of cleanedLocalDreams) {
                await firestoreService.saveDreamWithId({
                  ...dream,
                  iconColor: dream.iconColor || '#6B7280'
                }, user.uid);
              }
              
              localStorage.removeItem('dreams_local');
              addDebugLog(`✅ Migration complete, localStorage cleared`);
            }
          }
        } catch (error) {
          addDebugLog(`❌ Migration error: ${error}`);
        }
      };

      migrateIfNeeded();
      
      // Simple subscription to Firebase data
      dreamsUnsubscribe = firestoreService.subscribeToUserDreams(user.uid, (firestoreDreams) => {
        addDebugLog(`📥 Firebase data: ${firestoreDreams.length} dreams`);
        setDreams(cleanDreamTagsAndColors(firestoreDreams));
        setFirebaseDataLoaded(true);
      });

      // Subscribe to real-time updates from Firestore for notepad
      notepadUnsubscribe = firestoreService.subscribeToNotepadTabs(user.uid, (firebaseNotepadTabs) => {
        addDebugLog(`📝 Received notepad update from Firebase: ${firebaseNotepadTabs.length} tabs`);
        addDebugLog(`📝 User ID: ${user.uid}`);
        addDebugLog(`📝 Current time: ${new Date().toISOString()}`);
        
        // Add a delay during initial load to prevent overwriting local data
        if (isInitialLoad && !initialLoadDelayComplete) {
          addDebugLog(`📝 Initial load detected, delaying Firebase update by 2 seconds...`);
          setTimeout(() => {
            addDebugLog(`📝 Processing delayed Firebase update...`);
            setInitialLoadDelayComplete(true);
            processFirebaseNotepadUpdate(firebaseNotepadTabs);
          }, 2000);
          return;
        }
        
        processFirebaseNotepadUpdate(firebaseNotepadTabs);
      });
    } else {
      addDebugLog('❌ No user, loading from localStorage');
      
      // Before loading from localStorage, check if we have current Firebase data to sync
      if (dreams.length > 0 && dreams[0]?.userId) {
        addDebugLog(`🔄 Syncing ${dreams.length} dreams from Firebase to localStorage before switching to local mode`);
        // Remove userId from dreams before saving to localStorage
        const localDreams = dreams.map(dream => {
          const { userId, ...dreamWithoutUserId } = dream;
          return dreamWithoutUserId;
        });
        saveToLocalStorage('dreams_local', localDreams);
      }
      
      // If we have current notepad data, sync it to localStorage
      if (notepadTabs.length > 0) {
        addDebugLog(`🔄 Syncing ${notepadTabs.length} notepad tabs from Firebase to localStorage`);
        saveToLocalStorage('notepad_tabs', notepadTabs);
      }
      
      // Load from localStorage
      const loadedDreams = loadFromLocalStorage('dreams_local', []);
      const cleanedDreams = cleanDreamTagsAndColors(loadedDreams);
      addDebugLog(`💾 Loaded ${cleanedDreams.length} dreams from localStorage`);
      setDreams(cleanedDreams);
      
      // Load notepad tabs from localStorage
      const localTabs = loadFromLocalStorage('notepad_tabs', null);
      if (localTabs) {
        setNotepadTabs(localTabs);
      }
    }
    
    return () => {
      if (dreamsUnsubscribe) {
        dreamsUnsubscribe();
      }
      if (notepadUnsubscribe) {
        notepadUnsubscribe();
      }
    };
  }, [user, addDebugLog, notepadTabs.length, isInitialLoad]);

  useEffect(() => {
    // Only save to localStorage for unauthenticated users
    if (!user) {
      saveToLocalStorage('dreams_local', dreams);
    }
  }, [dreams, user]);

  useEffect(() => {
    saveToLocalStorage('app_version', version);
  }, [version]);



  useEffect(() => {
    saveToLocalStorage('app_subheader', subheader);
  }, [subheader]);

  // Effect to save notepad changes
  useEffect(() => {
    // Save to localStorage for both authenticated and unauthenticated users
    const backupData = {
      tabs: notepadTabs,
      timestamp: new Date().toISOString(),
    };
    saveToLocalStorage('notepad_tabs_backup', backupData);

    if (user) {
      // For authenticated users, save to Firebase
      addDebugLog('[SYNC] Local change detected. Saving to Firebase.');
      firestoreService.saveNotepadTabs(notepadTabs, user.uid);
    } else {
      // For unauthenticated users, save to the primary localStorage key
      saveToLocalStorage('notepad_tabs', notepadTabs);
    }
  }, [notepadTabs, user, addDebugLog]);

  const handleImportDreams = async (importedDreams: DreamEntry[]) => {
    const cleanedDreams = cleanDreamTagsAndColors(importedDreams);
    
    if (user) {
      // For Firebase users, save each imported dream to Firebase
      try {
        addDebugLog(`📤 Importing ${cleanedDreams.length} dreams to Firebase`);
        
        for (const dream of cleanedDreams) {
          // Check if dream already exists by ID
          const existingDream = dreams.find(d => d.id === dream.id);
          
          if (existingDream) {
            // Generate new ID for duplicate and save as new dream
            const newId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const dreamData = { ...dream, id: newId, userId: user.uid };
            await firestoreService.saveDream(dreamData, user.uid);
            addDebugLog(`✅ Imported dream with new ID: ${newId}`);
          } else {
            // Save with original ID
            const dreamData = { ...dream, userId: user.uid };
            await firestoreService.saveDream(dreamData, user.uid);
            addDebugLog(`✅ Imported dream: ${dream.name}`);
          }
        }
        
        addDebugLog(`✅ Successfully imported ${cleanedDreams.length} dreams to Firebase`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        addDebugLog(`❌ Error importing dreams: ${errorMsg}`);
        console.error('Error importing dreams to Firebase:', error);
      }
    } else {
      // For localStorage users, add imported dreams to existing ones
      setDreams(prevDreams => {
        const existingIds = new Set(prevDreams.map(dream => dream.id));
        const newDreams = cleanedDreams.map(dream => {
          // Handle duplicate IDs by generating new ones
          if (existingIds.has(dream.id)) {
            const newId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            return { ...dream, id: newId };
          }
          return dream;
        });
        
        // Combine existing dreams with new imported dreams
        return cleanDreamTagsAndColors([...prevDreams, ...newDreams]);
      });
      
      addDebugLog(`✅ Successfully imported ${cleanedDreams.length} dreams to localStorage`);
    }
    
    setShowImportDialog(false);
  };

  const handleResetAllDreams = () => {
    setDreams([]);
    setShowImportDialog(false);
  };

  const handleAddDream = async (newDream: DreamEntry) => {
    if (user) {
      // Use Firebase for authenticated users
      try {
        if (newDream.id && dreams.some(d => d.id === newDream.id)) {
          // Update existing dream
          addDebugLog(`✏️ Updating dream: ${newDream.name}`);
          await firestoreService.updateDream(newDream.id, newDream);
          addDebugLog(`✅ Dream updated successfully`);
        } else {
          // Add new dream
          addDebugLog(`➕ Adding new dream: ${newDream.name}`);
          const dreamId = await firestoreService.saveDream({
            ...newDream,
            timestamp: Date.now()
          }, user.uid);
          addDebugLog(`✅ Dream saved with ID: ${dreamId}`);
        }
      } catch (error) {
        addDebugLog(`❌ Error saving dream: ${error}`);
        console.error('Error saving dream to Firebase:', error);
      }
    } else {
      // Use localStorage for unauthenticated users
      addDebugLog(`💾 Saving dream to localStorage: ${newDream.name}`);
      setDreams((prevDreams) => {
        if (newDream.id && prevDreams.some(d => d.id === newDream.id)) {
          // Update existing dream
          return prevDreams.map(dream => dream.id === newDream.id ? newDream : dream);
        } else {
          // Add new dream
          const newDreamData = { 
            ...newDream, 
            id: Date.now().toString(), 
            timestamp: Date.now()
          };
          return [...prevDreams, newDreamData];
        }
      });
    }
    setShowAddDreamForm(false);
    setSelectedDream(null);
  };

  const handleClearAllDreams = async () => {
    if (user) {
      // Use Firebase for authenticated users
      try {
        await firestoreService.deleteAllUserDreams(user.uid);
      } catch (error) {
        console.error('Error deleting all dreams from Firebase:', error);
      }
    } else {
      // Use localStorage for unauthenticated users
      setDreams([]);
    }
    setShowDeleteAllConfirmDialog(false);
  };


  const handleVersionEdit = (newVersion: string) => {
    setVersion(newVersion);
    setIsEditingVersion(false);
  };

  const handleVersionRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsEditingVersion(true);
  };

  const handleSubheaderEdit = (newSubheader: string) => {
    setSubheader(newSubheader);
    setIsEditingSubheader(false);
  };

  const handleSubheaderRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsEditingSubheader(true);
  };

  const handleDeleteDream = async () => {
    if (dreamToDeleteId) {
      addDebugLog(`🗑️ Starting delete for dream ID: ${dreamToDeleteId}`);
      addDebugLog(`🔍 Dream ID type: ${typeof dreamToDeleteId}`);
      addDebugLog(`🔍 Dream ID length: ${dreamToDeleteId.length}`);
      
      if (user) {
        // Use Firebase for authenticated users
        try {
          addDebugLog(`🔥 Deleting from Firebase: ${dreamToDeleteId}`);
          
          // Log the dream details before deletion
          const dreamToDelete = dreams.find(d => d.id === dreamToDeleteId);
          if (dreamToDelete) {
            addDebugLog(`📋 Dream details: ${JSON.stringify(dreamToDelete)}`);
          } else {
            addDebugLog(`❌ Dream not found in local state with ID: ${dreamToDeleteId}`);
          }
          
          await firestoreService.deleteDream(dreamToDeleteId);
          addDebugLog(`✅ Dream deleted successfully from Firebase`);
          
          // Verify the deletion actually worked
          setTimeout(async () => {
            try {
              const wasDeleted = await firestoreService.verifyDreamDeleted(dreamToDeleteId);
              if (wasDeleted) {
                addDebugLog(`✅ Verification: Dream was actually deleted from Firebase`);
              } else {
                addDebugLog(`❌ Verification: Dream still exists in Firebase!`);
              }
            } catch (error) {
              addDebugLog(`❌ Verification failed: ${error}`);
            }
          }, 1000);
          
          // Immediately update local state to reflect the deletion
          setDreams(prevDreams => {
            const filtered = prevDreams.filter(dream => dream.id !== dreamToDeleteId);
            addDebugLog(`🔄 Updated local state: ${prevDreams.length} → ${filtered.length} dreams`);
            return filtered;
          });
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          const errorCode = error && typeof error === 'object' && 'code' in error ? error.code : 'unknown';
          addDebugLog(`❌ Error deleting from Firebase: ${errorCode} - ${errorMsg}`);
          console.error('Error deleting dream from Firebase:', error);
        }
      } else {
        // Use localStorage for unauthenticated users
        addDebugLog(`💾 Deleting from localStorage: ${dreamToDeleteId}`);
        setDreams(prevDreams => prevDreams.filter(dream => dream.id !== dreamToDeleteId));
      }
      setDreamToDeleteId(null);
      setShowDeleteConfirmDialog(false);
    }
  };

  const confirmDeleteDream = (id: string) => {
    setDreamToDeleteId(id);
    setShowDeleteConfirmDialog(true);
  };


  const handleExportDreams = () => {
    setShowExportDialog(true);
  };

  const handleExportConfirm = (count: number | null | 'today') => {
    // Ensure exported dreams are always sorted newest first
    const allDreamsToExport = [...filteredDreams].sort((a, b) => b.timestamp - a.timestamp);
    
    let recordsToExport = allDreamsToExport;
    
    if (count === 'today') {
      // Export only today's dreams
      const today = new Date().toDateString();
      recordsToExport = allDreamsToExport.filter(dream => 
        new Date(dream.timestamp).toDateString() === today
      );
    } else if (typeof count === 'number') {
      recordsToExport = allDreamsToExport.slice(0, count);
    }
    
    exportDreams(recordsToExport);
    setShowExportDialog(false);
  };

  const handleSaveNotepad = (tabs: Tab[]) => {
    setNotepadTabs(tabs);
    setShowNotepadDialog(false);
  };

  const handleDeleteTag = (tagToDelete: string) => {
    setDreams(prevDreams => 
      prevDreams.map(dream => ({
        ...dream,
        tags: dream.tags ? dream.tags.filter(tag => tag !== tagToDelete) : []
      }))
    );
  };

  const toggleTheme = () => {
    setIsDarkMode((prevMode: boolean) => !prevMode);
  };

  const toggleSortOrder = () => {
    setSortOrder(prevOrder => {
      if (prevOrder === 'manual') return 'newest';
      if (prevOrder === 'newest') return 'oldest';
      if (prevOrder === 'oldest') return 'manual';
      return 'newest'; // Fallback
    });
  };

  const getSortOrderLabel = (order: string) => {
    switch (order) {
      case 'newest': return 'Latest';
      case 'oldest': return 'Oldest First';
      case 'manual': return 'Manual Sort';
      default: return 'Latest';
    }
  };

  // Get count of dreams for a specific tag (including hierarchical children)
  const getTagCount = (tag: string) => {
    return dreams.filter(dream => 
      dream.tags?.some(dreamTag => 
        dreamTag === tag || dreamTag.startsWith(tag + '/')
      )
    ).length;
  };

  const moveDream = useCallback((dragIndex: number, hoverIndex: number) => {
    setDreams((prevDreams) => {
      const newDreams = [...prevDreams];
      const [draggedDream] = newDreams.splice(dragIndex, 1);
      newDreams.splice(hoverIndex, 0, draggedDream);
      return newDreams.map((dream, index) => ({ ...dream, displayOrder: index }));
    });
  }, []);

  const handleRenameTag = (oldTag: string, newTag: string) => {
    setDreams(prevDreams => prevDreams.map(dream => ({
      ...dream,
      tags: dream.tags?.map(tag => tag === oldTag ? newTag : tag) || [],
    })));

    // Update active filter if the renamed tag was active
    if (activeTagFilter === oldTag) {
      setActiveTagFilter(newTag);
    }
    // Update visible tags if the renamed tag was visible
    setCurrentVisibleTags(prevVisibleTags => prevVisibleTags.map(tag => tag === oldTag ? newTag : tag));

    setContextMenu({ visible: false, x: 0, y: 0, tag: null });
    setShowRenameTagDialog(false);
    setTagToRename(null);
  };

  const filteredDreams = useMemo(() => {
    let currentDreams = dreams.filter(dream => {
      if (activeFilter === 'favorites') {
        return dream.isFavorite;
      } else if (activeFilter === 'recents') {
        const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
        return dream.timestamp >= twentyFourHoursAgo;
      }
      return true; // 'all' filter
    });

    if (activeTagFilter) {
      currentDreams = currentDreams.filter(dream => 
        dream.tags?.some(tag => tag.startsWith(activeTagFilter))
      );
    }

    if (sortOrder === 'newest') {
      currentDreams.sort((a, b) => b.timestamp - a.timestamp);
    } else if (sortOrder === 'oldest') {
      currentDreams.sort((a, b) => a.timestamp - b.timestamp);
    } else if (sortOrder === 'manual') {
      currentDreams.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
    }
    return currentDreams;
  }, [dreams, activeFilter, sortOrder, activeTagFilter]);

  const handleRepairDreams = async () => {
    if (!user) {
      addDebugLog('❌ No user logged in - cannot repair dreams');
      return;
    }

    addDebugLog('🔧 Starting comprehensive dream repair...');
    addDebugLog(`👤 User ID: ${user.uid}`);
    
    try {
      // First, try to get all dreams to see what we're working with
      const allDreams = await firestoreService.getAllDreamsForRepair();
      addDebugLog(`📋 Found ${allDreams.length} total dreams in database`);
      
      // Count dreams by userId status
      const dreamsWithUserId = allDreams.filter(d => d.userId);
      const dreamsWithoutUserId = allDreams.filter(d => !d.userId);
      const userDreams = allDreams.filter(d => d.userId === user.uid);
      
      addDebugLog(`📊 Dreams with userId: ${dreamsWithUserId.length}`);
      addDebugLog(`📊 Dreams without userId: ${dreamsWithoutUserId.length}`);
      addDebugLog(`📊 Your dreams: ${userDreams.length}`);
      
      if (dreamsWithoutUserId.length > 0) {
        addDebugLog('🔧 Attempting to repair dreams without userId...');
        await firestoreService.repairDreamsWithoutUserId(user.uid);
        addDebugLog('✅ Repair completed');
      } else {
        addDebugLog('✅ No dreams need repair');
      }
      
      // Check if we can now access our dreams
      const updatedDreams = await firestoreService.getUserDreams(user.uid);
      addDebugLog(`📋 After repair: ${updatedDreams.length} dreams accessible`);
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      addDebugLog(`❌ Repair failed: ${errorMsg}`);
      addDebugLog('💡 This might be due to Firebase security rules');
      addDebugLog('💡 Try updating Firebase rules to allow all operations temporarily');
    }
  };

  const handleDiagnoseDreams = async () => {
    if (!user) {
      addDebugLog('❌ No user logged in - cannot diagnose dreams');
      return;
    }

    addDebugLog('🔍 Starting dream ID diagnosis...');
    addDebugLog(`👤 User ID: ${user.uid}`);
    
    try {
      await firestoreService.diagnoseDreamIds(user.uid);
      addDebugLog('✅ Diagnosis completed - check browser console for details');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      addDebugLog(`❌ Diagnosis failed: ${errorMsg}`);
    }
  };

  const handleTestDelete = async () => {
    if (!user || dreams.length === 0) {
      addDebugLog('❌ No user or no dreams to test with');
      return;
    }

    const testDream = dreams[0];
    addDebugLog(`🧪 Testing delete with dream: ${testDream.name} (ID: ${testDream.id})`);
    
    try {
      await firestoreService.deleteDream(testDream.id);
      addDebugLog('✅ Test delete completed');
      
      // Verify the deletion
      setTimeout(async () => {
        const wasDeleted = await firestoreService.verifyDreamDeleted(testDream.id);
        addDebugLog(`🔍 Verification result: ${wasDeleted ? 'DELETED' : 'STILL EXISTS'}`);
      }, 2000);
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      addDebugLog(`❌ Test delete failed: ${errorMsg}`);
    }
  };

  const handleTestFirebase = async () => {
    addDebugLog('🧪 Testing Firebase connection and permissions...');
    
    try {
      await firestoreService.testFirebaseConnection();
      addDebugLog('✅ Firebase test completed - check browser console for details');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      addDebugLog(`❌ Firebase test failed: ${errorMsg}`);
    }
  };

  const handleTestNotepadSync = async () => {
    if (!user) {
      addDebugLog('❌ No user logged in - cannot test notepad sync');
      return;
    }

    addDebugLog('🧪 Testing notepad synchronization...');
    addDebugLog(`👤 User ID: ${user.uid}`);
    addDebugLog(`📝 Current notepad tabs: ${notepadTabs.length}`);
    
    try {
      // Test 1: Save current notepad data
      addDebugLog('📤 Saving current notepad data to Firebase...');
      await firestoreService.saveNotepadTabs(notepadTabs, user.uid);
      addDebugLog('✅ Notepad data saved successfully');
      
      // Test 2: Read notepad data back
      addDebugLog('📥 Reading notepad data from Firebase...');
      const retrievedTabs = await firestoreService.getNotepadTabs(user.uid);
      addDebugLog(`📝 Retrieved ${retrievedTabs.length} tabs from Firebase`);
      
      // Test 3: Compare data
      const currentData = JSON.stringify(notepadTabs);
      const retrievedData = JSON.stringify(retrievedTabs);
      
      if (currentData === retrievedData) {
        addDebugLog('✅ Notepad data matches between local and Firebase');
      } else {
        addDebugLog('❌ Notepad data mismatch between local and Firebase');
        addDebugLog(`📋 Local data: ${currentData}`);
        addDebugLog(`📋 Firebase data: ${retrievedData}`);
      }
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      addDebugLog(`❌ Notepad sync test failed: ${errorMsg}`);
    }
  };

  const handleForceNotepadSync = async () => {
    if (!user) {
      addDebugLog('❌ No user logged in - cannot force notepad sync');
      return;
    }

    addDebugLog('🔄 Force syncing notepad data to Firebase...');
    addDebugLog(`📝 Local tabs: ${notepadTabs.length}`);
    addDebugLog(`📝 Local content: ${JSON.stringify(notepadTabs.map(t => ({ id: t.id, name: t.name, contentLength: t.content.length })))}`);
    
    try {
      // Temporarily disable Firebase updates
      setIsUpdatingFromFirebase(true);
      
      // Force save current local data to Firebase
      await firestoreService.saveNotepadTabs(notepadTabs, user.uid);
      addDebugLog(`✅ Force sync completed - local data saved to Firebase`);
      
      // Reset flags after a delay
      setTimeout(() => {
        setIsUpdatingFromFirebase(false);
        setIsInitialLoad(false);
        addDebugLog(`🔄 Firebase sync re-enabled`);
      }, 2000);
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      addDebugLog(`❌ Force sync failed: ${errorMsg}`);
      setIsUpdatingFromFirebase(false);
    }
  };

  const handleTestNotepadData = async () => {
    if (!user) {
      addDebugLog('❌ No user logged in - cannot test notepad data');
      return;
    }

    addDebugLog('🧪 Testing notepad data persistence...');
    
    try {
      // Test 1: Read current data from Firebase
      addDebugLog('📥 Reading notepad data from Firebase...');
      const firebaseTabs = await firestoreService.getNotepadTabs(user.uid);
      addDebugLog(`📝 Found ${firebaseTabs.length} tabs in Firebase`);
      
      // Test 2: Compare with local data
      addDebugLog(`📝 Local has ${notepadTabs.length} tabs`);
      
      if (firebaseTabs.length === 0 && notepadTabs.length > 0) {
        addDebugLog('⚠️ Firebase has no data but local does - this indicates a save issue');
      } else if (firebaseTabs.length > 0 && notepadTabs.length === 0) {
        addDebugLog('⚠️ Firebase has data but local doesn\'t - this indicates a load issue');
      } else if (firebaseTabs.length === notepadTabs.length) {
        addDebugLog('✅ Tab counts match between local and Firebase');
      } else {
        addDebugLog('❌ Tab counts don\'t match between local and Firebase');
      }
      
      // Test 3: Show data details
      addDebugLog(`📋 Local tabs: ${JSON.stringify(notepadTabs.map(t => ({ id: t.id, name: t.name, contentLength: t.content.length })))}`);
      addDebugLog(`📋 Firebase tabs: ${JSON.stringify(firebaseTabs.map(t => ({ id: t.id, name: t.name, contentLength: t.content.length })))}`);
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      addDebugLog(`❌ Notepad data test failed: ${errorMsg}`);
    }
  };

  const handleCheckFirebaseNotepad = async () => {
    if (!user) {
      addDebugLog('❌ No user logged in - cannot check Firebase notepad');
      return;
    }

    addDebugLog('🔍 Checking Firebase notepad data directly...');
    
    try {
      const firebaseTabs = await firestoreService.getNotepadTabs(user.uid);
      addDebugLog(`📝 Firebase has ${firebaseTabs.length} tabs`);
      
      if (firebaseTabs.length > 0) {
        firebaseTabs.forEach((tab, index) => {
          addDebugLog(`📝 Tab ${index + 1}: ${tab.name} (${tab.content.length} chars)`);
          if (tab.content.length > 0) {
            addDebugLog(`📝 Content preview: ${tab.content.substring(0, 100)}...`);
          }
        });
      } else {
        addDebugLog('📝 No tabs found in Firebase');
      }
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      addDebugLog(`❌ Failed to check Firebase notepad: ${errorMsg}`);
    }
  };

  const handleTroubleshootAuth = () => {
    addDebugLog('🔍 Troubleshooting authentication...');
    addDebugLog(`🔍 Current URL: ${window.location.href}`);
    addDebugLog(`🔍 User agent: ${navigator.userAgent}`);
    addDebugLog(`🔍 Popup blocker test: ${window.open('about:blank', '_blank') ? 'Popup allowed' : 'Popup blocked'}`);
    
    // Check if we're on localhost or IP
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const isIP = /^\d+\.\d+\.\d+\.\d+$/.test(window.location.hostname);
    
    addDebugLog(`🔍 Hostname: ${window.location.hostname}`);
    addDebugLog(`🔍 Is localhost: ${isLocalhost}`);
    addDebugLog(`🔍 Is IP address: ${isIP}`);
    
    if (isIP) {
      addDebugLog('⚠️ You are accessing via IP address - this may cause auth issues');
      addDebugLog('💡 Try accessing via localhost instead');
    }
  };

  const handleTestCrossDeviceSync = async () => {
    if (!user) {
      addDebugLog('❌ No user logged in - cannot test cross-device sync');
      return;
    }

    addDebugLog('🧪 Testing cross-device notepad sync...');
    addDebugLog(`👤 User ID: ${user.uid}`);
    addDebugLog(`📱 Device: ${navigator.userAgent}`);
    addDebugLog(`🌐 URL: ${window.location.href}`);
    
    try {
      // Create a test entry with timestamp
      const testTabs = [
        {
          id: 'test-sync',
          name: 'Test Sync',
          content: `Cross-device sync test - ${new Date().toISOString()}\n\nThis should appear on all your devices.`,
          isDeletable: true
        }
      ];
      
      addDebugLog(`📝 Creating test notepad entry...`);
      await firestoreService.saveNotepadTabs(testTabs, user.uid);
      addDebugLog(`✅ Test entry created successfully`);
      addDebugLog(`💡 Check your other devices to see if this appears`);
      addDebugLog(`💡 If it doesn't appear, there may be a subscription issue`);
      
      // Wait 5 seconds then check if it was saved
      setTimeout(async () => {
        try {
          const retrievedTabs = await firestoreService.getNotepadTabs(user.uid);
          const testTab = retrievedTabs.find(tab => tab.id === 'test-sync');
          if (testTab) {
            addDebugLog(`✅ Test entry found in Firebase: ${testTab.content.substring(0, 50)}...`);
          } else {
            addDebugLog(`❌ Test entry not found in Firebase`);
          }
        } catch (error) {
          addDebugLog(`❌ Error checking test entry: ${error}`);
        }
      }, 5000);
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      addDebugLog(`❌ Cross-device sync test failed: ${errorMsg}`);
    }
  };

  const handleRestoreFromBackup = async () => {
    if (!user) {
      addDebugLog('❌ No user logged in - cannot restore from backup');
      return;
    }

    addDebugLog('🔄 Restoring notepad data from localStorage backup...');
    
    const backupTabs = loadFromLocalStorage('notepad_tabs_backup', null);
    if (backupTabs && backupTabs.length > 0) {
      addDebugLog(`📝 Found backup with ${backupTabs.length} tabs`);
      addDebugLog(`📝 Backup content: ${JSON.stringify(backupTabs.map((t: any) => ({ id: t.id, name: t.name, contentLength: t.content.length })))}`);
      
      // Restore local state
      setNotepadTabs(backupTabs);
      
      // Save to Firebase
      try {
        await firestoreService.saveNotepadTabs(backupTabs, user.uid);
        addDebugLog(`✅ Backup restored to Firebase successfully`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        addDebugLog(`❌ Failed to save backup to Firebase: ${errorMsg}`);
      }
    } else {
      addDebugLog(`📝 No backup found in localStorage`);
    }
  };

  const processFirebaseNotepadUpdate = (firebaseNotepadTabs: any[]) => {
    // Check if we have recent local changes that should be preserved
    const localBackup = loadFromLocalStorage('notepad_tabs_backup', null);
    const currentTabsString = JSON.stringify(notepadTabs);
    const firebaseTabsString = JSON.stringify(firebaseNotepadTabs);
    
    // Deep comparison of just the tab content, ignoring metadata
    const currentTabsForComparison = notepadTabs.map(tab => ({
      id: tab.id,
      name: tab.name,
      content: tab.content,
      isDeletable: tab.isDeletable
    }));
    const firebaseTabsForComparison = firebaseNotepadTabs.map((tab: any) => ({
      id: tab.id,
      name: tab.name,
      content: tab.content,
      isDeletable: tab.isDeletable
    }));
    
    const currentTabsStringClean = JSON.stringify(currentTabsForComparison);
    const firebaseTabsStringClean = JSON.stringify(firebaseTabsForComparison);
    
    // If we have local data and Firebase data is different, preserve local data
    if (notepadTabs.length > 0 && currentTabsStringClean !== firebaseTabsStringClean) {
      addDebugLog(`📝 Local data differs from Firebase - preserving local data`);
      addDebugLog(`📝 Local tabs: ${notepadTabs.length}, Firebase tabs: ${firebaseNotepadTabs.length}`);
      
      // Save local data to Firebase to override
      if (!isUpdatingFromFirebase && user) {
        addDebugLog(`📤 Saving local data to Firebase to override...`);
        setIsUpdatingFromFirebase(true);
        firestoreService.saveNotepadTabs(notepadTabs, user.uid).then(() => {
          addDebugLog(`✅ Local data saved to Firebase successfully`);
          setTimeout(() => setIsUpdatingFromFirebase(false), 1000);
        }).catch(error => {
          addDebugLog(`❌ Failed to save local data: ${error}`);
          setIsUpdatingFromFirebase(false);
        });
      }
      return;
    }
    
    // Only update if the data has actually changed and we don't have local data
    if (currentTabsStringClean !== firebaseTabsStringClean) {
      addDebugLog(`📝 Data has changed, updating from Firebase`);
      addDebugLog(`📝 Firebase tabs content: ${JSON.stringify(firebaseNotepadTabs.map((t: any) => ({ id: t.id, name: t.name, contentLength: t.content.length })))}`);
      
      setIsUpdatingFromFirebase(true);
      setNotepadTabs(firebaseNotepadTabs);
      setFirebaseDataLoaded(true);
      setIsInitialLoad(false);
      // Reset the flag after a short delay
      setTimeout(() => setIsUpdatingFromFirebase(false), 1000);
    } else {
      addDebugLog(`📝 No change detected, skipping update`);
      if (isInitialLoad) {
        setIsInitialLoad(false);
      }
    }
    
    if (firebaseNotepadTabs.length === 0) {
      // Check if we have local notepad data to migrate
      const localTabs = loadFromLocalStorage('notepad_tabs', null);
      if (localTabs && localTabs.length > 0) {
        addDebugLog(`🔄 Migrating ${localTabs.length} notepad tabs from localStorage to Firebase`);
        // Save local tabs to Firebase
        if (user) {
          firestoreService.saveNotepadTabs(localTabs, user.uid).then(() => {
            addDebugLog(`✅ Successfully migrated notepad tabs to Firebase`);
            setNotepadTabs(localTabs);
            setFirebaseDataLoaded(true);
          }).catch(error => {
            addDebugLog(`❌ Failed to migrate notepad tabs: ${error}`);
            // Fall back to local tabs if migration fails
            setNotepadTabs(localTabs);
            setFirebaseDataLoaded(true);
          });
        } else {
          // Fall back to local tabs if no user
          setNotepadTabs(localTabs);
          setFirebaseDataLoaded(true);
        }
      } else {
        addDebugLog(`📝 No notepad data found, using default tabs`);
        // Set default tabs if no data exists, but don't save to Firebase yet
        // Only save when user actually makes changes
        const defaultTabs = [
          { id: 'todo', name: 'To Do', content: '', isDeletable: false },
          { id: 'notes', name: 'Notes', content: '', isDeletable: true }
        ];
        setNotepadTabs(defaultTabs);
        setFirebaseDataLoaded(true);
      }
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="bg-card border-b border-border px-4 py-3 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto flex items-center">
          {/* Left side - Theme Toggle */}
          <div className="w-16 sm:w-20 flex justify-start flex-shrink-0">
            <button 
              onClick={toggleTheme}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDarkMode ? (
                <svg className="w-4 h-4 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM10 18a1 1 0 01-1 1v1a1 1 0 112 0v-1a1 1 0 01-1-1zM3 10a1 1 0 01-1-1V8a1 1 0 112 0v1a1 1 0 01-1 1zm-.707 4.293a1 1 0 001.414 1.414l.707-.707a1 1 0 00-1.414-1.414l-.707.707zM17 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zm.707-4.293a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707z" />
                </svg>
              )}
            </button>
          </div>

          {/* UPDATED: App title with version in description */}
          <div className="flex-1 text-center px-2 min-w-0">
            <div className="flex items-center justify-center mb-1">
              <h1 className="text-lg font-semibold text-primary truncate max-w-full">Dream-Notions</h1>
            </div>
            <p className="text-xs text-muted-foreground truncate max-w-full">
              {isEditingSubheader ? (
                <VersionEditor
                  initialVersion={subheader}
                  onSave={handleSubheaderEdit}
                  onCancel={() => setIsEditingSubheader(false)}
                />
              ) : (
                <span
                  onContextMenu={handleSubheaderRightClick}
                  className="cursor-pointer hover:text-primary transition-colors"
                  title="Right-click to edit description"
                >
                  {subheader}
                </span>
              )} - {isEditingVersion ? (
                <VersionEditor
                  initialVersion={version}
                  onSave={handleVersionEdit}
                  onCancel={() => setIsEditingVersion(false)}
                />
              ) : (
                <span
                  onContextMenu={handleVersionRightClick}
                  className="cursor-pointer hover:text-primary transition-colors"
                  title="Right-click to edit version"
                >
                  {version}
                </span>
              )}
            </p>
          </div>

          {/* Right side with user avatar */}
          <div className="flex items-center gap-2 w-16 sm:w-20 sm:min-w-[unset] justify-end flex-shrink-0">
            {/* User Avatar / Sign In Button */}
            {user ? (
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-1.5">
                  {user.photoURL && (
                    <img src={user.photoURL} alt="User Avatar" className="w-6 h-6 rounded-full border border-primary/20" />
                  )}
                  <span className="text-xs font-medium text-primary">{user.displayName?.split(' ')[0] || 'User'}</span>
                </div>
                <button
                  onClick={signOutUser}
                  className="px-2 py-1 rounded text-xs transition-colors font-medium border bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={signInWithGoogle}
                className="p-2 rounded-lg text-xs transition-colors font-medium flex items-center gap-1.5 border bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 whitespace-nowrap"
              >
                <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Debug Panel */}
      {showDebugPanel && (
        <div className="bg-muted/50 border-b border-border">
          <div className="max-w-3xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  <path d="M12 4.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm-3 6c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm6 0c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm-3 6c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5z"/>
                </svg>
                Debug Panel
              </h3>
              <div className="flex items-center gap-2">
                {user && (
                  <>
                    <button
                      onClick={handleRepairDreams}
                      className="px-2 py-1 text-xs bg-muted text-muted-foreground rounded hover:bg-muted/80"
                    >
                      Repair
                    </button>
                    <button
                      onClick={handleDiagnoseDreams}
                      className="px-2 py-1 text-xs bg-muted text-muted-foreground rounded hover:bg-muted/80"
                    >
                      Diagnose
                    </button>
                    <button
                      onClick={handleTestDelete}
                      className="px-2 py-1 text-xs bg-muted text-muted-foreground rounded hover:bg-muted/80"
                    >
                      Test Delete
                    </button>
                    <button
                      onClick={handleTestFirebase}
                      className="px-2 py-1 text-xs bg-muted text-muted-foreground rounded hover:bg-muted/80"
                    >
                      Test Firebase
                    </button>
                    <button
                      onClick={handleTestNotepadSync}
                      className="px-2 py-1 text-xs bg-muted text-muted-foreground rounded hover:bg-muted/80"
                    >
                      Test Notepad Sync
                    </button>
                    <button
                      onClick={handleForceNotepadSync}
                      className="px-2 py-1 text-xs bg-muted text-muted-foreground rounded hover:bg-muted/80"
                    >
                      Force Notepad Sync
                    </button>
                    <button
                      onClick={handleTestNotepadData}
                      className="px-2 py-1 text-xs bg-muted text-muted-foreground rounded hover:bg-muted/80"
                    >
                      Test Notepad Data
                    </button>
                    <button
                      onClick={handleCheckFirebaseNotepad}
                      className="px-2 py-1 text-xs bg-muted text-muted-foreground rounded hover:bg-muted/80"
                    >
                      Check Firebase Notepad
                    </button>
                    <button
                      onClick={handleTestCrossDeviceSync}
                      className="px-2 py-1 text-xs bg-muted text-muted-foreground rounded hover:bg-muted/80"
                    >
                      Test Cross-Device Sync
                    </button>
                    <button
                      onClick={handleRestoreFromBackup}
                      className="px-2 py-1 text-xs bg-muted text-muted-foreground rounded hover:bg-muted/80"
                    >
                      Restore From Backup
                    </button>
                    {/* Delete All Dreams button for legacy cleanup */}
                    <button
                      onClick={async () => {
                        if (window.confirm('Are you sure you want to delete ALL your dreams from Firebase? This cannot be undone.')) {
                          await firestoreService.deleteAllUserDreams(user.uid);
                          addDebugLog('🗑️ All dreams deleted from Firebase for this user.');
                        }
                      }}
                      className="px-2 py-1 text-xs rounded font-medium transition-colors border border-red-500 text-red-500 hover:bg-red-500/10 hover:text-red-600"
                    >
                      Delete All Dreams (Firebase)
                    </button>
                  </>
                )}
                {!user && (
                  <>
                    <button
                      onClick={signInWithGoogle}
                      className="px-2 py-1 text-xs bg-muted text-muted-foreground rounded hover:bg-muted/80"
                    >
                      Sign In (Popup)
                    </button>
                    <button
                      onClick={signInWithGoogleRedirect}
                      className="px-2 py-1 text-xs bg-muted text-muted-foreground rounded hover:bg-muted/80"
                    >
                      Sign In (Redirect)
                    </button>
                    <button
                      onClick={handleTroubleshootAuth}
                      className="px-2 py-1 text-xs bg-muted text-muted-foreground rounded hover:bg-muted/80"
                    >
                      Troubleshoot Auth
                    </button>
                    {/* Delete All Dreams (Local) button for localStorage cleanup */}
                    <button
                      onClick={() => {
                        if (window.confirm('Are you sure you want to delete ALL your dreams from localStorage? This cannot be undone.')) {
                          setDreams([]);
                          localStorage.removeItem('dreams_local');
                          addDebugLog('🗑️ All dreams deleted from localStorage.');
                        }
                      }}
                      className="px-2 py-1 text-xs rounded font-medium transition-colors border border-red-500 text-red-500 hover:bg-red-500/10 hover:text-red-600"
                    >
                      Delete All Dreams (Local)
                    </button>
                  </>
                )}
                <button
                  onClick={copyDebugToClipboard}
                  className="px-2 py-1 text-xs rounded font-medium transition-colors border border-primary text-primary hover:bg-primary/10 hover:text-primary-foreground"
                  title="Copy debug info to clipboard"
                >
                  📋 Copy
                </button>
                <button
                  onClick={() => setDebugLogs([])}
                  className="px-2 py-1 text-xs rounded font-medium transition-colors border border-primary text-primary hover:bg-primary/10 hover:text-primary-foreground"
                >
                  Clear
                </button>
                <button
                  onClick={() => setShowDebugPanel(false)}
                  className="px-2 py-1 text-xs rounded font-medium transition-colors border border-primary text-primary hover:bg-primary/10 hover:text-primary-foreground"
                >
                  Close
                </button>
              </div>
            </div>
            
            <div className="bg-card rounded-lg border border-border p-3 max-h-64 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                <div className="text-xs text-muted-foreground">
                  <strong className="text-foreground">User Status:</strong> {user ? `✅ ${user.displayName}` : '❌ Not signed in'}
                </div>
                <div className="text-xs text-muted-foreground">
                  <strong className="text-foreground">Dreams Count:</strong> {dreams.length}
                </div>
                <div className="text-xs text-muted-foreground">
                  <strong className="text-foreground">Data Source:</strong> {user ? '🔥 Firebase' : '💾 localStorage'}
                </div>
                <div className="text-xs text-muted-foreground">
                  <strong className="text-foreground">User ID:</strong> {user?.uid || 'None'}
                </div>
              </div>
              
              <div className="border-t border-border pt-3">
                <strong className="text-xs text-foreground">Debug Logs:</strong>
                <div className="mt-2 space-y-1 font-mono text-xs">
                  {debugLogs.length === 0 ? (
                    <div className="text-muted-foreground italic">No logs yet...</div>
                  ) : (
                    debugLogs.slice(-20).reverse().map((log, index) => (
                      <div key={index} className="text-muted-foreground">
                        {log}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-3xl mx-auto px-4 py-6">
        {/* Control Panel */}
        <div className="mt-6 mb-8">
          <div className="bg-card border border-border shadow-lg rounded-lg p-4 max-w-xl mx-auto">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {/* Import Button */}
                <button
                  onClick={() => setShowImportDialog(true)}
                  className="px-3 py-2 rounded-lg text-xs transition-colors font-medium flex items-center gap-1.5 border bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="hidden sm:inline">Import</span>
                </button>
                {/* Export Button */}
                <button
                  onClick={handleExportDreams}
                  className="px-3 py-2 rounded-lg text-xs transition-colors font-medium flex items-center gap-1.5 border bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span className="hidden sm:inline">Export</span>
                </button>
                {/* Notepad Button */}
                <button
                  onClick={() => setShowNotepadDialog(true)}
                  className="px-3 py-2 rounded-lg text-xs transition-colors font-medium flex items-center gap-1.5 border bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 ml-2"
                  title="List Planner"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                  <span className="hidden sm:inline">Notepad</span>
                </button>
                
                {/* Debug Panel Button */}
                <button
                  onClick={() => setShowDebugPanel(!showDebugPanel)}
                  className="px-3 py-2 rounded-lg text-xs transition-colors font-medium flex items-center gap-1.5 border bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                  title="Debug Panel"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    {/* Bug body */}
                    <ellipse cx="12" cy="12" rx="3" ry="6"/>
                    {/* Bug head */}
                    <circle cx="12" cy="6" r="2"/>
                    {/* Antennae */}
                    <path d="M10 4l-1-2M14 4l1-2"/>
                    {/* Wings */}
                    <ellipse cx="9" cy="10" rx="2" ry="3" transform="rotate(-20 9 10)" opacity="0.7"/>
                    <ellipse cx="15" cy="10" rx="2" ry="3" transform="rotate(20 15 10)" opacity="0.7"/>
                    {/* Legs */}
                    <path d="M9 9l-3-1M15 9l3-1M9 12l-3 0M15 12l3 0M9 15l-3 1M15 15l3 1" stroke="currentColor" strokeWidth="1" fill="none"/>
                  </svg>
                  <span className="hidden sm:inline">Debug</span>
                </button>
              </div>
              {/* Add Button */}
              <button
                onClick={() => { setSelectedDream(null); setShowAddDreamForm(true); }}
                className="px-3 py-2 rounded-lg text-xs transition-colors font-medium flex items-center gap-1.5 border bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add
              </button>
            </div>
          </div>
        </div>

        {/* Filter/Sort Controls */}
        <div className="mb-8">
          <div className="flex justify-center mb-6">
            <div className="flex items-center gap-3">
              {/* Recents Button */}
              <button
                onClick={() => setActiveFilter(activeFilter === 'recents' ? 'all' : 'recents')}
                className={`px-3 py-1 text-xs rounded-full transition-colors flex items-center gap-1.5 ${activeFilter === 'recents' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'}`}
              >
                <span>🕐 Recents</span>
                <span className="px-1.5 py-0.5 text-xs rounded-full font-medium bg-primary/20 text-primary">{todaysCount}</span>
              </button>
              {/* Favorites Button */}
              <button
                onClick={() => setActiveFilter(activeFilter === 'favorites' ? 'all' : 'favorites')}
                className={`px-3 py-1 text-xs rounded-full transition-colors flex items-center gap-1.5 ${activeFilter === 'favorites' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'}`}
              >
                <span>Favorites</span>
                <span className="px-1.5 py-0.5 text-xs rounded-full font-medium bg-primary/20 text-primary">{favoritesCount}</span>
              </button>
              {/* Sort Toggle Button */}
              <button
                onClick={toggleSortOrder}
                className="px-3 py-1 text-xs rounded-full transition-colors flex items-center gap-1.5 bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              >
                <span>⋮⋮</span>
                <span>{getSortOrderLabel(sortOrder)}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tag Filters */}
        <div className="mb-8">
          <div className="flex flex-wrap justify-center gap-2">
            {activeTagFilter && (
              <button
                onClick={() => {
                  const parentTag = activeTagFilter.includes('/')
                    ? activeTagFilter.substring(0, activeTagFilter.lastIndexOf('/'))
                    : null;
                  setActiveTagFilter(parentTag);
                  setCurrentVisibleTags(parentTag ? getChildTags(allUniqueTags, parentTag) : getTopLevelTags(allUniqueTags));
                }}
                className="px-3 py-1 text-xs rounded-full transition-colors bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              >
                ← Back
              </button>
            )}
            {currentVisibleTags
              .filter(tag => tag !== '★') // Hide the star icon from tag filter UI
              .map(tag => (
                <button
                  key={tag}
                  onClick={() => {
                    if (activeTagFilter === tag) {
                      setActiveTagFilter(null);
                      setCurrentVisibleTags(getTopLevelTags(allUniqueTags));
                    } else {
                      setActiveTagFilter(tag);
                      const children = getChildTags(allUniqueTags, tag);
                      if (children.length > 0) {
                        setCurrentVisibleTags(children);
                      } else {
                        // If no children, stay on current level but filter
                        // The filter will apply based on activeTagFilter
                      }
                    }
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setContextMenu({ visible: true, x: e.clientX, y: e.clientY, tag });
                  }}
                  className={`px-3 py-1 text-xs rounded-full transition-colors flex items-center gap-1.5 ${activeTagFilter === tag ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'}`}
                >
                  <span>{tag.split('/').pop()}</span>
                  <span className="px-1.5 py-0.5 text-xs rounded-full font-medium bg-primary/20 text-primary">{getTagCount(tag)}</span>
                </button>
              ))}
          </div>
        </div>

        {/* Tag Breadcrumbs */}
        <TagBreadcrumbs activeTagFilter={activeTagFilter} setActiveTagFilter={setActiveTagFilter} recordCount={filteredDreams.length} />

        {/* Dream List */}
        <DragDropProvider>
          <div>
            {filteredDreams.map((dream, index) => {
              const dreamDate = new Date(dream.timestamp).toDateString();
              const prevDreamDate = index > 0 ? new Date(filteredDreams[index - 1].timestamp).toDateString() : '';
              const currentDate = new Date().toDateString();
              
              // Show divider if:
              // 1. Date changed AND there are multiple dreams on the previous date, OR
              // 2. This is the first non-current-day entry (separating current day from older entries)
              const showDivider = index > 0 && dreamDate !== prevDreamDate && (() => {
                const prevDateCount = filteredDreams.filter(d => new Date(d.timestamp).toDateString() === prevDreamDate).length;
                const isPrevDateCurrent = prevDreamDate === currentDate;
                const isCurrentDateNonCurrent = dreamDate !== currentDate;
                
                // Show divider if previous date had multiple dreams OR we're transitioning from current day to older days
                return prevDateCount > 1 || (isPrevDateCurrent && isCurrentDateNonCurrent);
              })();

              return (
                <React.Fragment key={dream.id}>
                  {showDivider && <hr className="my-4 border-t border-border" />}
                  <DreamItem
                    dream={dream}
                    index={index}
                    onMove={moveDream}
                    onEdit={(dreamToEdit) => { setSelectedDream(dreamToEdit); setShowAddDreamForm(true); }}
                    onDelete={confirmDeleteDream}
                  />
                </React.Fragment>
              );
            })}
          </div>
        </DragDropProvider>
      </main>

      {/* Import Dialog */}
      <ImportDialog
        isOpen={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        onImport={handleImportDreams}
        onReset={handleResetAllDreams}
        hasDreams={dreams.length > 0}
      />

      {/* Add Dream Form */}
      <DreamForm
        isOpen={showAddDreamForm}
        onClose={() => { setShowAddDreamForm(false); setSelectedDream(null); }}
        onSave={handleAddDream}
        dreamToEdit={selectedDream}
        taskTitles={taskTitles}
        allTags={allTags}
        allDreams={dreams}
        onDeleteTag={handleDeleteTag}
        activeTagFilter={activeTagFilter}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        isOpen={showDeleteConfirmDialog}
        onClose={() => setShowDeleteConfirmDialog(false)}
        onConfirm={handleDeleteDream}
      />

      {/* Delete All Confirmation Dialog */}
      <DeleteConfirmDialog
        isOpen={showDeleteAllConfirmDialog}
        onClose={() => setShowDeleteAllConfirmDialog(false)}
        onConfirm={handleClearAllDreams}
      />

      {/* Rename Tag Dialog */}
      <RenameTagDialog
        isOpen={showRenameTagDialog}
        onClose={() => { setShowRenameTagDialog(false); setTagToRename(null); }}
        onRename={handleRenameTag}
        tagToRename={tagToRename}
      />

      {/* Notepad Dialog */}
      <NotepadDialog
        isOpen={showNotepadDialog}
        onClose={() => setShowNotepadDialog(false)}
        onSave={handleSaveNotepad}
        initialTabs={notepadTabs}
      />

      {/* Export Dialog */}
      <ExportDialog
        isOpen={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        onExport={handleExportConfirm}
        totalRecords={filteredDreams.length}
        todayCount={todaysCount}
      />

      {/* Custom Context Menu */}
      {contextMenu.visible && contextMenu.tag && (
        <div
          style={{
            position: 'absolute',
            top: contextMenu.y,
            left: contextMenu.x,
            zIndex: 1000,
            backgroundColor: 'var(--color-card)',
            border: '1px solid var(--color-border)',
            borderRadius: '0.5rem',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            padding: '0.5rem 0',
          }}
          onMouseLeave={() => setContextMenu({ visible: false, x: 0, y: 0, tag: null })} // Hide on mouse leave
        >
          <button
            onClick={() => {
              setTagToRename(contextMenu.tag);
              setShowRenameTagDialog(true);
              setContextMenu({ visible: false, x: 0, y: 0, tag: null });
            }}
            className="block w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted"
          >
            Rename Tag
          </button>
        </div>
      )}
    </div>
  );
}

export default App;