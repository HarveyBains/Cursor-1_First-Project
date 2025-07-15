import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import DreamItem from './components/DreamItem';
import ImportDialog from './components/ImportDialog';
import DreamForm from './components/DreamForm';
import DeleteConfirmDialog from './components/DeleteConfirmDialog';
import RenameTagDialog from './components/RenameTagDialog';
import TagBreadcrumbs from './components/TagBreadcrumbs';
import ExportDialog from './components/ExportDialog';
import { DragDropProvider } from './components/DragDropProvider';
import { saveToLocalStorage, loadFromLocalStorage } from './utils/localStorageUtils';
import { exportDreams } from './utils/importExportUtils';
import { firestoreService } from './services/firestore-service';
import './index.css';
import type { DreamEntry } from './types/DreamEntry';
import { useAuth } from './components/AuthProvider';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { type Tab } from './types/Tab';
import NotepadDialog from './components/NotepadDialog';
import AISettings from './components/AISettings';
import { v4 as uuidv4 } from 'uuid';


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
  const { user, signInWithGoogle, signOutUser } = useAuth();
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
  const [showAISettings, setShowAISettings] = useState(false);
  
  // Multi-select functionality
  const [selectedDreamIds, setSelectedDreamIds] = useState<Set<string>>(new Set());
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [multiSelectContextMenu, setMultiSelectContextMenu] = useState<{ 
    visible: boolean; 
    x: number; 
    y: number; 
  }>({ 
    visible: false, x: 0, y: 0 
  });
  // Multi-tab Notepad state
  const [notepadTabs, setNotepadTabs] = useState<Tab[]>(() => {
    // Try to load from localStorage or migrate from old single notepadContent
    const saved = loadFromLocalStorage('notepad_tabs', null);
    if (Array.isArray(saved) && saved.length > 0) {
      return saved;
    }
    // Migrate from old single notepadContent if present
    const legacy = localStorage.getItem('notepad_content');
    if (legacy) {
      return [{ id: uuidv4(), name: 'Todo', content: legacy, isDeletable: false }];
    }
    // Default single tab
    return [{ id: uuidv4(), name: 'Todo', content: '', isDeletable: false }];
  });
  const [activeTabId, setActiveTabId] = useState(() => notepadTabs[0]?.id || '');
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Initialize from localStorage or default to true (dark mode)
    const savedTheme = localStorage.getItem('theme');
    return savedTheme ? JSON.parse(savedTheme) : true;
  });
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'favorites', 'recents'
  const [sortOrder, setSortOrder] = useState('newest'); // 'newest', 'oldest' - removed 'manual'
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);
  
  // Debug panel state
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [currentVisibleTags, setCurrentVisibleTags] = useState<string[]>([]);
  const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number; tag: string | null }>({ visible: false, x: 0, y: 0, tag: null });
  const [showRenameTagDialog, setShowRenameTagDialog] = useState(false);
  const [tagToRename, setTagToRename] = useState<string | null>(null);
  const [debugPanelOpen, setDebugPanelOpen] = useState(false); // closed by default

  // Debug panel position state
  const [debugPanelPos, setDebugPanelPos] = useState({ top: 80, left: 80 });
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });


  // Track if dreams are loaded from Firebase
  const [dreamsReady, setDreamsReady] = useState(false);

  // Mouse event handlers for dragging
  const handleDebugPanelMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    dragOffset.current = {
      x: e.clientX - debugPanelPos.left,
      y: e.clientY - debugPanelPos.top,
    };
    document.body.style.userSelect = 'none';
  };
  useEffect(() => {
    if (!dragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      setDebugPanelPos(_ => ({
        top: Math.max(0, e.clientY - dragOffset.current.y),
        left: Math.max(0, e.clientX - dragOffset.current.x),
      }));
    };
    const handleMouseUp = () => {
      setDragging(false);
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging]);



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

  // Count of dreams from latest date
  const latestDateCount = useMemo(() => {
    if (dreams.length === 0) return 0;
    
    // Find the most recent date in the dreams
    const sortedDreams = [...dreams].sort((a, b) => b.timestamp - a.timestamp);
    const latestDate = new Date(sortedDreams[0].timestamp).toDateString();
    
    return dreams.filter(dream => new Date(dream.timestamp).toDateString() === latestDate).length;
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

  // Manual Firebase sync: fetch all dreams on load or refresh
  const fetchDreamsFromFirebase = useCallback(async () => {
    if (user) {
      addDebugLog('🔄 Fetching dreams from Firebase...');
      const dreamsFromDb = await firestoreService.getUserDreams(user.uid);
      setDreams(dreamsFromDb);
      setDreamsReady(true);
      addDebugLog(`📥 Received ${dreamsFromDb.length} dreams from Firebase.`);
    }
  }, [user]);

  // Fetch dreams on initial load or when user changes
  useEffect(() => {
    fetchDreamsFromFirebase();
  }, [fetchDreamsFromFirebase]);

  useEffect(() => {
    // Only save to localStorage for unauthenticated users
    if (!user) {
      saveToLocalStorage('dreams_local', dreams);
    }
  }, [dreams, user]);



  const [notepadTabsLoaded, setNotepadTabsLoaded] = useState(false);

  // Load tabs from Firebase/localStorage on user change
  useEffect(() => {
    setNotepadTabsLoaded(false); // Reset on user change
    addDebugLog(`🔄 [Notepad] User changed: ${user ? user.uid : 'signed out'}`);
    if (user) {
      firestoreService.getNotepadTabs?.(user.uid).then(tabs => {
        if (Array.isArray(tabs) && tabs.length > 0) {
          setNotepadTabs(tabs);
          setActiveTabId(tabs[0].id);
          addDebugLog(`⬇️ [Notepad] Loaded tabs FROM Firebase (${tabs.length} tabs)`);
        } else {
          addDebugLog('⬇️ [Notepad] No tabs found in Firebase');
        }
        setNotepadTabsLoaded(true); // Set loaded after fetch
      });
    } else {
      const saved = loadFromLocalStorage('notepad_tabs', null);
      if (Array.isArray(saved) && saved.length > 0) {
        setNotepadTabs(saved);
        setActiveTabId(saved[0].id);
        addDebugLog(`⬇️ [Notepad] Loaded tabs FROM localStorage (${saved.length} tabs)`);
      } else {
        addDebugLog('⬇️ [Notepad] No tabs found in localStorage');
      }
      setNotepadTabsLoaded(true); // Set loaded after fetch
    }
  }, [user]);

  // Save tabs to localStorage/Firebase on change, but only after initial load
  useEffect(() => {
    if (!notepadTabsLoaded) return; // Don't save until loaded
    addDebugLog(`🔄 [Notepad] Tabs state changed. Saving...`);
    if (user && typeof firestoreService.saveNotepadTabs === 'function') {
      firestoreService.saveNotepadTabs(notepadTabs, user.uid).then(() => {
        addDebugLog(`⬆️ [Notepad] Saved tabs TO Firebase (${notepadTabs.length} tabs)`);
      }).catch((err) => {
        addDebugLog(`❌ [Notepad] Failed to save tabs TO Firebase: ${err}`);
      });
    } else {
      saveToLocalStorage('notepad_tabs', notepadTabs);
      addDebugLog(`⬆️ [Notepad] Saved tabs TO localStorage (${notepadTabs.length} tabs)`);
    }
  }, [notepadTabs, user, notepadTabsLoaded]);

  // Tab handlers
  const handleTabChange = (tabId: string) => setActiveTabId(tabId);
  const handleTabContentChange = (content: string) => {
    setNotepadTabs(tabs => tabs.map(tab => tab.id === activeTabId ? { ...tab, content } : tab));
  };
  const handleTabRename = (tabId: string, newName: string) => {
    setNotepadTabs(tabs => tabs.map(tab => tab.id === tabId ? { ...tab, name: newName } : tab));
  };
  const handleTabAdd = () => {
    const newTab = { id: uuidv4(), name: `Tab ${notepadTabs.length + 1}`, content: '', isDeletable: true };
    setNotepadTabs(tabs => [...tabs, newTab]);
    setActiveTabId(newTab.id);
  };
  const handleTabDelete = (tabId: string) => {
    setNotepadTabs(tabs => {
      const idx = tabs.findIndex(tab => tab.id === tabId);
      if (idx === -1) return tabs;
      const newTabs = tabs.filter(tab => tab.id !== tabId);
      // If deleting active tab, switch to previous or next
      if (tabId === activeTabId) {
        setActiveTabId(newTabs[idx - 1]?.id || newTabs[0]?.id || '');
      }
      return newTabs;
    });
  };
  const handleTabReorder = (fromIdx: number, toIdx: number) => {
    setNotepadTabs(tabs => {
      const arr = [...tabs];
      const [moved] = arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, moved);
      return arr;
    });
  };

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

  const handleResetAllDreams = async () => {
    try {
      if (user) {
        // Delete all dreams from Firebase for authenticated users
        await firestoreService.deleteAllUserDreams(user.uid);
        console.log('✅ All dreams deleted from Firebase');
      } else {
        // Clear localStorage for unauthenticated users
        saveToLocalStorage('dreams_local', []);
        console.log('✅ All dreams cleared from localStorage');
      }
      
      // Update local state
      setDreams([]);
      setShowImportDialog(false);
    } catch (error) {
      console.error('❌ Error deleting all dreams:', error);
      alert('Failed to delete all dreams. Please try again.');
    }
  };

  const handleAddDream = async (newDream: DreamEntry) => {
    if (user) {
      // Use Firebase for authenticated users
      try {
        if (newDream.id && dreams.some(d => d.id === newDream.id)) {
          // Update existing dream
          addDebugLog(`✏️ Updating dream: ${newDream.name}`);
          await firestoreService.updateDream(newDream.id, newDream);
          // Update local state immediately
          setDreams(prevDreams => prevDreams.map(dream => dream.id === newDream.id ? newDream : dream));
          addDebugLog(`✅ Dream updated successfully`);
        } else {
          // Add new dream
          addDebugLog(`➕ Adding new dream: ${newDream.name}`);
          const dreamId = await firestoreService.saveDream({
            ...newDream,
            timestamp: Date.now()
          }, user.uid);
          // Add to local state immediately
          setDreams(prevDreams => [...prevDreams, { ...newDream, id: dreamId, timestamp: Date.now() }]);
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
      // Export only last day's worth of dreams (most recent date with dream records)
      if (allDreamsToExport.length > 0) {
        const latestDate = new Date(allDreamsToExport[0].timestamp).toDateString();
        recordsToExport = allDreamsToExport.filter(dream => 
          new Date(dream.timestamp).toDateString() === latestDate
        );
      }
    } else if (typeof count === 'number') {
      recordsToExport = allDreamsToExport.slice(0, count);
    }
    
    exportDreams(recordsToExport);
    setShowExportDialog(false);
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
      if (prevOrder === 'newest') return 'oldest';
      return 'newest'; // Fallback
    });
  };

  const getSortOrderLabel = (order: string) => {
    switch (order) {
      case 'newest': return 'Latest';
      case 'oldest': return 'Oldest First';
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

  // Helper to get currently displayed dreams (filtered and sorted)
  const getDisplayedDreams = (dreamsList: DreamEntry[]) => {
    let currentDreams = dreamsList.filter(dream => {
      if (activeFilter === 'favorites') {
        return dream.isFavorite;
      } else if (activeFilter === 'recents') {
        const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
        return dream.timestamp >= twentyFourHoursAgo;
      }
      return true;
    });
    if (activeTagFilter) {
      currentDreams = currentDreams.filter(dream =>
        dream.tags?.some(tag => tag.startsWith(activeTagFilter))
      );
    }
    // Always group by date, then sort by displayOrder (if set for all) or timestamp (latest first)
    const groupedByDate = new Map<string, DreamEntry[]>();
    currentDreams.forEach(dream => {
      const dateKey = new Date(dream.timestamp).toDateString();
      if (!groupedByDate.has(dateKey)) {
        groupedByDate.set(dateKey, []);
      }
      groupedByDate.get(dateKey)!.push(dream);
    });
    // Sort date groups (newest or oldest first)
    const sortedDateKeys = Array.from(groupedByDate.keys()).sort((a, b) => {
      const dateA = new Date(a).getTime();
      const dateB = new Date(b).getTime();
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });
    // Sort within each group by displayOrder (if set for all) or timestamp (latest first)
    const sortedGroups = sortedDateKeys.map(dateKey => {
      const group = groupedByDate.get(dateKey)!;
      const allHaveDisplayOrder = group.every(d => d.displayOrder !== undefined);
      return group.sort((a, b) => {
        if (allHaveDisplayOrder) {
          return a.displayOrder! - b.displayOrder!;
        }
        return b.timestamp - a.timestamp;
      });
    });
    return sortedGroups.flat();
  };

  // Multi-select handlers
  const handleDreamSelect = useCallback((dreamId: string, isSelected: boolean) => {
    setSelectedDreamIds(prev => {
      const newSet = new Set(prev);
      if (isSelected) {
        newSet.add(dreamId);
      } else {
        newSet.delete(dreamId);
      }
      
      // Exit multi-select mode if no dreams are selected
      if (newSet.size === 0) {
        setMultiSelectMode(false);
      }
      
      return newSet;
    });
  }, []);

  const handleEnterMultiSelectMode = useCallback((dreamId: string) => {
    setMultiSelectMode(true);
    setSelectedDreamIds(new Set([dreamId]));
  }, []);

  const handleExitMultiSelectMode = useCallback(() => {
    setMultiSelectMode(false);
    setSelectedDreamIds(new Set());
    setMultiSelectContextMenu({ visible: false, x: 0, y: 0 });
  }, []);

  const handleMultiSelectContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (selectedDreamIds.size > 0) {
      setMultiSelectContextMenu({
        visible: true,
        x: e.clientX,
        y: e.clientY
      });
    }
  }, [selectedDreamIds.size]);

  const handleCopySelectedDescriptions = useCallback(async () => {
    if (selectedDreamIds.size === 0) return;
    
    const selectedDreams = dreams.filter(dream => selectedDreamIds.has(dream.id));
    const descriptions = selectedDreams.map(dream => {
      const date = new Date(dream.timestamp).toLocaleDateString();
      const title = dream.name;
      const description = dream.description || '';
      return `${date} - ${title}\n${description}`;
    }).join('\n\n---\n\n');
    
    try {
      await navigator.clipboard.writeText(descriptions);
      // You could add a toast notification here
      console.log('Descriptions copied to clipboard');
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      // Fallback: You could show a modal with the text to manually copy
    }
    
    setMultiSelectContextMenu({ visible: false, x: 0, y: 0 });
  }, [selectedDreamIds, dreams]);

  // Close context menu when clicking elsewhere
  useEffect(() => {
    const handleClick = () => {
      setMultiSelectContextMenu({ visible: false, x: 0, y: 0 });
    };
    
    if (multiSelectContextMenu.visible) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [multiSelectContextMenu.visible]);

  const moveDream = useCallback((displayedFrom: number, displayedTo: number) => {
    if (!dreamsReady) {
      addDebugLog('⏳ Dreams not ready yet, move ignored.');
      return;
    }
    setDreams(prevDreams => {
      // Get the currently displayed dreams (filtered/sorted)
      const displayedDreams = getDisplayedDreams(prevDreams);
      if (
        displayedFrom < 0 ||
        displayedTo < 0 ||
        displayedFrom >= displayedDreams.length ||
        displayedTo >= displayedDreams.length ||
        displayedFrom === displayedTo
      ) {
        addDebugLog(`[Move] Invalid move: from ${displayedFrom} to ${displayedTo}`);
        return prevDreams;
      }
      // Find the two dreams to swap
      const dreamA = displayedDreams[displayedFrom];
      const dreamB = displayedDreams[displayedTo];
      if (!dreamA || !dreamB) return prevDreams;
      // Swap their displayOrder
      const newDisplayOrderA = dreamB.displayOrder;
      const newDisplayOrderB = dreamA.displayOrder;
      // Update in the main dreams array
      const newDreams = prevDreams.map(dream => {
        if (dream.id === dreamA.id) return { ...dream, displayOrder: newDisplayOrderA };
        if (dream.id === dreamB.id) return { ...dream, displayOrder: newDisplayOrderB };
        return dream;
      });
      // Save only the two changed dreams to Firebase (if authenticated)
      if (user) {
        firestoreService.updateDream(dreamA.id, { ...dreamA, displayOrder: newDisplayOrderA });
        firestoreService.updateDream(dreamB.id, { ...dreamB, displayOrder: newDisplayOrderB });
        addDebugLog(`⬆️ [Dreams] Swapped displayOrder: '${dreamA.name}' (Seq #${newDisplayOrderA}) <-> '${dreamB.name}' (Seq #${newDisplayOrderB}) to Firebase`);
      }
      return newDreams;
    });
  }, [dreamsReady, user, getDisplayedDreams, addDebugLog]);

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

    // Always group by date, then sort by displayOrder (if set for all) or timestamp (latest first)
    const groupedByDate = new Map<string, DreamEntry[]>();
    currentDreams.forEach(dream => {
      const dateKey = new Date(dream.timestamp).toDateString();
      if (!groupedByDate.has(dateKey)) {
        groupedByDate.set(dateKey, []);
      }
      groupedByDate.get(dateKey)!.push(dream);
    });

    // Sort date groups (newest or oldest first)
    const sortedDateKeys = Array.from(groupedByDate.keys()).sort((a, b) => {
      const dateA = new Date(a).getTime();
      const dateB = new Date(b).getTime();
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

    // Sort within each group and normalize displayOrder to 1-based sequence
    const sortedGroups = sortedDateKeys.map(dateKey => {
      const group = groupedByDate.get(dateKey)!;
      // If all dreams in the group have displayOrder, sort by it; otherwise, by timestamp DESC
      const allHaveDisplayOrder = group.every(d => d.displayOrder !== undefined);
      let sortedGroup = group.slice();
      if (allHaveDisplayOrder) {
        sortedGroup.sort((a, b) => a.displayOrder! - b.displayOrder!);
      } else {
        sortedGroup.sort((a, b) => b.timestamp - a.timestamp);
      }
      // Normalize displayOrder to 1-based sequence
      sortedGroup = sortedGroup.map((d, i) => ({ ...d, displayOrder: i + 1 }));
      return sortedGroup;
    });

    return sortedGroups.flat();
  }, [dreams, activeFilter, sortOrder, activeTagFilter]);

  

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="bg-card border-b border-border px-4 py-4 sticky top-0 z-40 shadow-sm">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between">
            {/* Left side - Theme Toggle and Settings */}
            <div className="flex items-center gap-3">
              <Button 
                variant="outline"
                size="sm"
                onClick={toggleTheme}
                className="p-2"
                title="Toggle Theme"
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
              </Button>
              <Button 
                variant="outline"
                size="sm"
                onClick={() => setShowAISettings(true)}
                className="p-2"
                title="AI Settings"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </Button>
            </div>

            {/* Center - App title with version in description */}
            <div className="flex-1 text-center px-4 min-w-0">
              <div className="flex items-center justify-center gap-2 mb-1">
                <h1 className="text-lg font-semibold text-primary truncate max-w-full">Dream-Notions</h1>
              </div>
              <div className="text-xs text-muted-foreground">
                Your Dream Notions Organizer
              </div>
            </div>

            {/* Right side with user avatar */}
            <div className="flex items-center gap-3">
              {user ? (
                <div className="flex items-center gap-2">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={user.photoURL || undefined} alt="User Avatar" />
                    <AvatarFallback className="text-sm bg-primary/10 text-primary">
                      {user.displayName?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start">
                    <span className="text-sm font-medium text-primary">{user.displayName?.split(' ')[0] || 'User'}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={signOutUser}
                      className="p-0 h-auto text-xs text-muted-foreground hover:text-primary"
                    >
                      Sign Out
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="default"
                  size="sm"
                  onClick={signInWithGoogle}
                  className="flex items-center gap-2"
                >
                  <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Sign In with Google
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Debug Panel - now as a movable pop-up */}
      {debugPanelOpen && (
        <div
          style={{
            position: 'fixed',
            top: debugPanelPos.top,
            left: debugPanelPos.left,
            zIndex: 1000,
            minWidth: 600, // wider minimum
            maxWidth: 900, // wider maximum
            width: 700,    // default width
            boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
            cursor: dragging ? 'move' : 'default',
            resize: 'vertical',
            minHeight: 300,
            maxHeight: 900,
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column',
          }}
          className="bg-card border border-border shadow-lg rounded-lg p-0"
        >
          <div
            className="flex items-center justify-between mb-2 px-4 py-2 rounded-t-lg cursor-move bg-muted border-b border-border"
            style={{ userSelect: 'none' }}
            onMouseDown={handleDebugPanelMouseDown}
          >
            <div className="flex items-center gap-2">
              <span className="font-semibold text-primary">Debug Panel</span>
              <Badge variant="secondary">{user ? 'Firebase' : 'Local'}</Badge>
            </div>
            <Button size="icon" variant="ghost" onClick={() => setDebugPanelOpen(false)} title="Close Debug Panel">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </Button>
          </div>
          <div className="px-4 pb-4 pt-2 flex flex-col h-full min-h-0" style={{flex: 1, minHeight: 0}}>
            <div className="mb-2 text-xs text-muted-foreground">
              <div>User: {user ? `${user.displayName} (${user.email})` : 'Not signed in'}</div>
              <div>Dreams: {dreams.length}</div>
              <div>Data Source: {user ? '🔥 Firebase' : '💾 localStorage'}</div>
            </div>
            <Separator className="my-2" />
            <div className="mb-2 flex-1 min-h-0 flex flex-col">
              <div className="font-medium text-sm mb-1">Recent Logs</div>
              <div className="flex-1 min-h-0 overflow-y-auto bg-muted/40 rounded p-2 text-xs font-mono" style={{overflowX: 'auto', whiteSpace: 'nowrap', fontFamily: 'monospace'}}>
                {debugLogs.length === 0 ? (
                  <div className="text-muted-foreground">No logs yet.</div>
                ) : (
                  debugLogs.slice(-50).reverse().map((log, idx) => (
                    <div key={idx} className="whitespace-pre-line">{log}</div>
                  ))
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              <Button size="sm" variant="outline" onClick={copyDebugToClipboard}>Copy</Button>
              <Button size="sm" variant="outline" onClick={() => setDebugLogs([])}>Clear</Button>
            </div>
          </div>
          {/* Custom resize handle for easier vertical resizing */}
          <div
            style={{
              position: 'absolute',
              right: 0,
              bottom: 0,
              width: 32,
              height: 24,
              cursor: 'ns-resize',
              zIndex: 1100,
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'flex-end',
              pointerEvents: 'auto',
            }}
            onMouseDown={e => {
              e.stopPropagation();
              // Start vertical resize
              const parent = e.currentTarget.parentElement;
              if (!parent) return;
              const startY = e.clientY;
              const startHeight = parent.offsetHeight;
              const panel = parent;
              const onMove = (moveEvent: MouseEvent) => {
                if (!panel) return;
                const newHeight = Math.max(200, Math.min(900, startHeight + (moveEvent.clientY - startY)));
                panel.style.height = newHeight + 'px';
              };
              const onUp = () => {
                window.removeEventListener('mousemove', onMove);
                window.removeEventListener('mouseup', onUp);
              };
              window.addEventListener('mousemove', onMove);
              window.addEventListener('mouseup', onUp);
            }}
          >
            <svg width="32" height="24" viewBox="0 0 32 24">
              <rect x="8" y="16" width="16" height="6" rx="2" fill="#888" />
              <rect x="12" y="20" width="8" height="2" rx="1" fill="#bbb" />
            </svg>
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
                  className="px-3 py-2 rounded-lg text-xs transition-colors font-medium flex items-center gap-1.5 border bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <span className="hidden sm:inline">Notepad</span>
                </button>
                {/* Debug Button */}
                <button
                  onClick={() => setDebugPanelOpen(true)}
                  className="px-3 py-2 rounded-lg text-xs transition-colors font-medium flex items-center gap-1.5 border bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 ml-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 13v-2a7 7 0 00-14 0v2m14 0a2 2 0 01-2 2h-2a2 2 0 01-2-2m6 0a2 2 0 01-2 2h-2a2 2 0 01-2-2m6 0V9a2 2 0 00-2-2m-6 0V9a2 2 0 002 2m0 0a2 2 0 002-2V7a2 2 0 00-2-2m0 0a2 2 0 00-2 2v2a2 2 0 002 2z" />
                  </svg>
                  <span className="hidden sm:inline">Debug</span>
                </button>
              </div>
              {/* Right side - Add Dream Button with spacer */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setShowAddDreamForm(true); setSelectedDream(null); }}
                  className="px-3 py-2 rounded-lg text-xs transition-colors font-medium flex items-center gap-1.5 border bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 ml-4"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="hidden sm:inline">Add Notion</span>
                </button>
              </div>
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
                <span className="px-1.5 py-0.5 text-xs rounded-full font-medium bg-primary/20 text-primary">{latestDateCount}</span>
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
                <span>{sortOrder === 'newest' ? '📅↓' : '📅↑'}</span>
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

        {/* Multi-select header */}
        {multiSelectMode && (
          <div className="mb-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-primary">
                  {selectedDreamIds.size} dream{selectedDreamIds.size !== 1 ? 's' : ''} selected
                </span>
                <span className="text-xs text-muted-foreground">
                  Right-click selected dreams for actions • Ctrl+click to add more
                </span>
              </div>
              <button
                onClick={handleExitMultiSelectMode}
                className="px-3 py-1 text-xs rounded-md bg-muted text-foreground hover:bg-muted/80 transition-colors"
              >
                Exit Multi-Select
              </button>
            </div>
          </div>
        )}

        {/* Dream List or Welcome Page */}
        {filteredDreams.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold text-foreground mb-2">No dreams recorded yet</h3>
            <p className="text-muted-foreground mb-4">Start by adding your first dream!</p>
            <button
              onClick={() => { setShowAddDreamForm(true); setSelectedDream(null); }}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded transition-colors"
            >
              Add Your First Dream
            </button>
          </div>
        ) : (
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
                      totalItems={filteredDreams.length}
                      isSelected={selectedDreamIds.has(dream.id)}
                      multiSelectMode={multiSelectMode}
                      onSelect={handleDreamSelect}
                      onEnterMultiSelectMode={handleEnterMultiSelectMode}
                      onMultiSelectContextMenu={handleMultiSelectContextMenu}
                    />
                  </React.Fragment>
                );
              })}
            </div>
          </DragDropProvider>
        )}
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
        isOpen={showAddDreamForm || !!selectedDream}
        onClose={() => { setShowAddDreamForm(false); setSelectedDream(null); }}
        onSave={handleAddDream}
        dreamToEdit={selectedDream ? filteredDreams.find(d => d.id === selectedDream.id) : null}
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
        tabs={notepadTabs}
        activeTabId={activeTabId}
        onTabChange={handleTabChange}
        onTabContentChange={handleTabContentChange}
        onTabRename={handleTabRename}
        onTabAdd={handleTabAdd}
        onTabDelete={handleTabDelete}
        onTabReorder={handleTabReorder}
      />

      {/* Export Dialog */}
      <ExportDialog
        isOpen={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        onExport={handleExportConfirm}
        totalRecords={filteredDreams.length}
        latestDateCount={latestDateCount}
      />

      {/* AI Settings Dialog */}
      <AISettings
        isOpen={showAISettings}
        onClose={() => setShowAISettings(false)}
      />

      {/* Multi-select Context Menu */}
      {multiSelectContextMenu.visible && (
        <div
          className="fixed bg-background border border-border rounded-md shadow-lg py-1 z-50 min-w-[200px]"
          style={{ left: multiSelectContextMenu.x, top: multiSelectContextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleCopySelectedDescriptions}
            className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <div className="flex flex-col">
              <span>Copy descriptions to clipboard</span>
              <span className="text-xs text-muted-foreground">
                {selectedDreamIds.size} dream{selectedDreamIds.size !== 1 ? 's' : ''} selected
              </span>
            </div>
          </button>
        </div>
      )}

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