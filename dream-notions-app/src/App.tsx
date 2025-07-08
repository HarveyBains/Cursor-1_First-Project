import { useEffect, useState, useCallback, useMemo } from 'react';
import DreamItem from './components/DreamItem';
import ImportDialog from './components/ImportDialog';
import DreamForm from './components/DreamForm';
import { DragDropProvider } from './components/DragDropProvider';
import { saveToLocalStorage, loadFromLocalStorage } from './utils/localStorageUtils';
import { exportDreams } from './utils/importExportUtils';
import './index.css';
import type { DreamEntry } from './types/DreamEntry';
import { useAuth } from './components/AuthProvider';

function App() {
  const { user, signInWithGoogle, signOutUser } = useAuth();
  const [dreams, setDreams] = useState<DreamEntry[]>(() => {
    const loadedDreams = loadFromLocalStorage('dreams_local', []);
    return loadedDreams;
  });
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showAddDreamForm, setShowAddDreamForm] = useState(false);
  const [selectedDream, setSelectedDream] = useState<DreamEntry | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Initialize from localStorage or default to true (dark mode)
    const savedTheme = localStorage.getItem('theme');
    return savedTheme ? JSON.parse(savedTheme) : true;
  });
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'favorites', 'recents'
  const [sortOrder, setSortOrder] = useState('manual'); // 'manual', 'newest', 'oldest'
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);
  const [currentVisibleTags, setCurrentVisibleTags] = useState<string[]>([]);

  const allUniqueTags = useMemo(() => {
    return Array.from(new Set(dreams.flatMap(dream => dream.tags || [])));
  }, [dreams]);

  const allTags = useMemo(() => {
    return Array.from(new Set(dreams.flatMap(dream => dream.tags || [])));
  }, [dreams]);

  const taskTitles = useMemo(() => {
    const tasks = dreams.filter(dream => dream.tags?.some(tag => tag.startsWith('Tasks')));
    return Array.from(new Set(tasks.map(task => task.name)));
  }, [dreams]);

  useEffect(() => {
    // Initialize visible tags with top-level tags when component mounts or dreams change
    setCurrentVisibleTags(getTopLevelTags(allUniqueTags));
  }, [allUniqueTags]);

  // Helper to get top-level tags
  const getTopLevelTags = (tags: string[]): string[] => {
    const topLevels = new Set<string>();
    tags.forEach(tag => {
      topLevels.add(tag.split('/')[0]);
    });
    return Array.from(topLevels).sort();
  };

  // Helper to get direct children of a given parent tag
  const getChildTags = (tags: string[], parentTag: string): string[] => {
    const children = new Set<string>();
    tags.forEach(tag => {
      if (tag.startsWith(`${parentTag}/`)) {
        const parts = tag.split('/');
        if (parts.length > parentTag.split('/').length) {
          children.add(parts.slice(0, parentTag.split('/').length + 1).join('/'));
        }
      }
    });
    return Array.from(children).sort();
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

  useEffect(() => {
    saveToLocalStorage('dreams_local', dreams);
  }, [dreams]);

  const handleImportDreams = (importedDreams: DreamEntry[]) => {
    setDreams(importedDreams);
    setShowImportDialog(false);
  };

  const handleResetAllDreams = () => {
    setDreams([]);
  };

  const handleAddDream = (newDream: DreamEntry) => {
    setDreams((prevDreams) => {
      if (newDream.id && prevDreams.some(d => d.id === newDream.id)) {
        // Update existing dream
        return prevDreams.map(dream => dream.id === newDream.id ? newDream : dream);
      } else {
        // Add new dream
        return [...prevDreams, { ...newDream, id: Date.now().toString(), timestamp: Date.now() }];
      }
    });
    setShowAddDreamForm(false);
    setSelectedDream(null);
  };

  const handleClearAllDreams = () => {
    setDreams([]);
  };

  const handleToggleFavorite = (id: string) => {
    setDreams(prevDreams =>
      prevDreams.map(dream =>
        dream.id === id ? { ...dream, isFavorite: !dream.isFavorite } : dream
      )
    );
  };

  const handleExportDreams = () => {
    // Ensure exported dreams are always sorted newest first
    const dreamsToExport = [...filteredDreams].sort((a, b) => b.timestamp - a.timestamp);
    exportDreams(dreamsToExport);
  };

  const toggleTheme = () => {
    setIsDarkMode((prevMode: boolean) => !prevMode);
  };

  const toggleSortOrder = () => {
    setSortOrder(prevOrder => {
      if (prevOrder === 'manual') return 'newest';
      if (prevOrder === 'newest') return 'oldest';
      return 'manual';
    });
  };

  const moveDream = useCallback((dragIndex: number, hoverIndex: number) => {
    setDreams((prevDreams) => {
      const newDreams = [...prevDreams];
      const [draggedDream] = newDreams.splice(dragIndex, 1);
      newDreams.splice(hoverIndex, 0, draggedDream);
      return newDreams.map((dream, index) => ({ ...dream, displayOrder: index }));
    });
  }, []);

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
    }
    return currentDreams;
  }, [dreams, activeFilter, sortOrder, activeTagFilter]);

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
              <h1 className="text-lg font-semibold text-primary">Dream-Notions</h1>
            </div>
            <p className="text-xs text-muted-foreground">Record and organize your dreams - v13.0.2</p>
          </div>

          {/* Right side with settings icon and user avatar */}
          <div className="flex items-center gap-2 w-16 sm:w-20 sm:min-w-[120px] justify-end flex-shrink-0">
            {/* List Planner notepad icon */}
            <button
              onClick={() => alert('List Planner functionality coming soon!')}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="List Planner"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </button>

            {/* User Avatar / Sign In Button */}
            <button
              onClick={user ? signOutUser : signInWithGoogle}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded transition-colors text-xs whitespace-nowrap"
            >
              <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span className="hidden sm:inline">{user ? 'Sign Out' : 'Sign In'}</span>
              <span className="sm:hidden">{user ? 'Out' : 'Sync'}</span>
            </button>
          </div>
        </div>
      </header>

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
                {/* Delete All Dreams Button */}
                <button
                  onClick={handleClearAllDreams}
                  className="px-3 py-2 rounded-lg text-xs transition-colors font-medium flex items-center gap-1.5 border bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span className="hidden sm:inline">Delete All</span>
                </button>
              </div>
              {/* Add Notion Button */}
              <button
                onClick={() => { setSelectedDream(null); setShowAddDreamForm(true); }}
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg text-sm transition-colors font-medium whitespace-nowrap"
              >
                Add Notion
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
                <span className="px-1.5 py-0.5 text-xs rounded-full font-medium bg-primary/20 text-primary">{dreams.length}</span>
              </button>
              {/* Favorites Button */}
              <button
                onClick={() => setActiveFilter(activeFilter === 'favorites' ? 'all' : 'favorites')}
                className={`px-3 py-1 text-xs rounded-full transition-colors flex items-center gap-1.5 ${activeFilter === 'favorites' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'}`}
              >
                <span>★ Favorites</span>
                <span className="px-1.5 py-0.5 text-xs rounded-full font-medium bg-primary/20 text-primary">{dreams.filter(d => d.isFavorite).length}</span>
              </button>
              {/* Sort Toggle Button */}
              <button
                onClick={toggleSortOrder}
                className="px-3 py-1 text-xs rounded-full transition-colors flex items-center gap-1.5 bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              >
                <span>⋮⋮</span>
                <span>{sortOrder.charAt(0).toUpperCase() + sortOrder.slice(1)}</span>
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
            {currentVisibleTags.map(tag => (
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
                className={`px-3 py-1 text-xs rounded-full transition-colors ${activeTagFilter === tag ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'}`}
              >
                {tag.split('/').pop()}
              </button>
            ))}
          </div>
        </div>

        {/* Dream List */}
        <DragDropProvider>
          <div>
            {filteredDreams.map((dream, index) => (
              <DreamItem
              key={dream.id}
              dream={dream}
              index={index}
              onToggleFavorite={handleToggleFavorite}
              onMove={moveDream}
              onEdit={(dreamToEdit) => { setSelectedDream(dreamToEdit); setShowAddDreamForm(true); }}
            />
            ))}
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
      />
    </div>
  );
}

export default App;