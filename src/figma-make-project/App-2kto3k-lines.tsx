
return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-card border-2 border-orange-200 dark:border-purple-500 rounded-lg p-5 max-w-md md:max-w-lg lg:max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-lg">
        <h2 className="text-lg font-semibold mb-4 text-center text-primary">
          Edit Notion
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Dream Title Input */}
          <input
            type="text"
            value={dreamTitle}
            onChange={(e) => setDreamTitle(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded bg-input-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring font-light"
            placeholder="Dream title"
            required
          />

          {/* Dream Input Helper */}
          {!editingDream && (
            <DreamInputHelper 
              onDreamSet={handleDreamSet} 
              currentDescription={description}
            />
          )}

          {/* Dream Description */}
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded min-h-[180px] bg-input-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring font-light resize-y"
            placeholder="dream description"
            required
          />

          <IconSelector
            selectedIcon={icon}
            onIconSelect={setIcon}
            customIconConfig={customIconConfig}
            onUpdateIconConfig={onUpdateIconConfig}
          />

          <TagSelector
            selectedTags={selectedTags}
            availableTags={availableTags}
            onTagsChange={setSelectedTags}
            dreams={existingDreams}
          />

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded transition-colors"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// UPDATED: Dream Item Component with horizontal tag display
const DreamItem: React.FC<{
  dream: DreamEntry
  index: number
  onEdit: (dream: DreamEntry) => void
  onDelete: (dream: DreamEntry) => void
  onToggleFavorite: (dream: DreamEntry) => void
  onDragStart: (e: React.DragEvent, index: number) => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent, index: number) => void
  customIconConfig: CustomIconConfig
}> = ({ dream, index, onEdit, onDelete, onToggleFavorite, onDragStart, onDragOver, onDrop, customIconConfig }) => {
  // Get custom icon name or fall back to default (blank)
  const getIconName = (iconKey: string): string => {
    const customName = customIconConfig?.names?.[iconKey]
    if (customName !== undefined) {
      return customName // Return custom name (even if empty)
    }
    return DEFAULT_ICON_NAMES[iconKey] || '' // Return default (which is blank) or empty
  }

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, index)}
      className="bg-card border border-border rounded-lg p-1.5 mb-1.5 shadow-sm hover:shadow-md transition-shadow cursor-move"
    >
      <div className="flex items-center gap-1.5">
        {/* Icon Column */}
        <div className="flex-shrink-0 w-12 flex flex-col items-center">
          <div className="text-muted-foreground text-xs leading-none mb-0.5">⋮⋮</div>
          
          <div className="w-7 h-7 rounded-full flex items-center justify-center mb-0.5 flex-shrink-0 overflow-hidden">
            <div className={`w-5 h-5 rounded-full ${DEFAULT_DREAM_ICONS[dream.icon] || DEFAULT_DREAM_ICONS.neutral} shadow-sm`} />
          </div>
          
          <span className="text-xs text-muted-foreground text-center leading-none w-12 truncate min-h-[1em]">
            {getIconName(dream.icon)}
          </span>
        </div>

        <div className="flex-1 min-w-0 ml-1">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h3 className="font-semibold text-primary text-sm truncate leading-tight">
                  {dream.name}
                </h3>
              </div>
              
              {/* UPDATED: Horizontal Tags Display with ellipsis */}
              {dream.tags && dream.tags.length > 0 && (
                <div className="flex items-center gap-1 mb-0.5 overflow-hidden">
                  <div className="flex gap-1 min-w-0 flex-shrink">
                    {dream.tags.slice(0, 3).map((tag, tagIndex) => {
                      // Special styling for tasks tags - purple color
                      const isTasksTag = tag.toLowerCase() === 'tasks' || tag.toLowerCase().startsWith('tasks/')
                      
                      return (
                        <span 
                          key={tagIndex} 
                          className={`px-1.5 py-0.5 text-xs rounded-full font-medium whitespace-nowrap flex-shrink-0 ${
                            isTasksTag 
                              ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-600'
                              : 'bg-primary/10 text-primary border border-primary/20'
                          }`}
                        >
                          {tag}
                        </span>
                      )
                    })}
                  </div>
                  {dream.tags.length > 3 && (
                    <span className="text-xs text-muted-foreground flex-shrink-0">...</span>
                  )}
                </div>
              )}
              
              {dream.description && (
                <p className="text-muted-foreground text-xs mt-0.5 line-clamp-1 leading-tight">
                  {dream.description}
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-8 ml-5 flex-shrink-0">
              <Tooltip content={dream.isFavorite ? 'Remove from favorites' : 'Add to favorites'}>
                <button
                  onClick={() => onToggleFavorite(dream)}
                  className={`p-1 rounded-full transition-colors ${
                    dream.isFavorite 
                      ? 'text-orange-500 hover:bg-orange-50 hover:text-orange-600 dark:text-purple-400 dark:hover:text-purple-300 dark:hover:bg-purple-900/20' 
                      : 'text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900/20'
                  }`}
                >
                  <span className="text-sm">★</span>
                </button>
              </Tooltip>
              
              <Tooltip content="Edit dream">
                <button
                  onClick={() => onEdit(dream)}
                  className="p-1 rounded-full hover:bg-orange-50 dark:hover:bg-purple-900/20 text-orange-600 hover:text-orange-700 dark:text-purple-400 dark:hover:text-purple-300 transition-colors"
                >
                  <span className="text-xs">✏️</span>
                </button>
              </Tooltip>
              
              <Tooltip content="Delete dream">
                <button
                  onClick={() => onDelete(dream)}
                  className="p-1 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                >
                  <span className="text-xs">🗑️</span>
                </button>
              </Tooltip>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Hierarchical Tag Navigation Component
const HierarchicalTagNavigation: React.FC<{
  dreams: DreamEntry[]
  selectedTagPath: string
  showFavoritesOnly: boolean
  onTagSelect: (tagPath: string) => void
  onTagRename: (oldPath: string, newPath: string) => void
}> = ({ dreams, selectedTagPath, showFavoritesOnly, onTagSelect, onTagRename }) => {
  const [tagContextMenu, setTagContextMenu] = useState<{ x: number; y: number; tagPath: string } | null>(null)
  const [renamingTag, setRenamingTag] = useState<string | null>(null)
  const [newTagName, setNewTagName] = useState('')

  // Build hierarchical tag structure
  const allTags = dreams.flatMap(dream => dream.tags || [])
  const uniqueTags = Array.from(new Set(allTags))
  const tagHierarchy = buildTagHierarchy(uniqueTags, dreams, selectedTagPath)

  // Get current level tags to display
  const getCurrentLevelTags = (): TagNode[] => {
    if (!selectedTagPath) {
      // Show root level tags
      return tagHierarchy
    }
    
    // Find the selected tag and show its children
    const findNode = (nodes: TagNode[], path: string): TagNode | null => {
      for (const node of nodes) {
        if (node.fullPath === path) return node
        const found = findNode(node.children, path)
        if (found) return found
      }
      return null
    }
    
    const selectedNode = findNode(tagHierarchy, selectedTagPath)
    return selectedNode ? selectedNode.children : tagHierarchy
  }

  // Get breadcrumb path
  const getBreadcrumbs = (): { name: string; path: string }[] => {
    if (!selectedTagPath) return []
    
    const parts = parseTagPath(selectedTagPath)
    const breadcrumbs: { name: string; path: string }[] = []
    
    for (let i = 0; i < parts.length; i++) {
      const path = parts.slice(0, i + 1).join('/')
      breadcrumbs.push({ name: parts[i], path })
    }
    
    return breadcrumbs
  }

  const currentTags = getCurrentLevelTags()
  const breadcrumbs = getBreadcrumbs()

  // Filter tags for favorites if needed
  const getTagCount = (tagPath: string): number => {
    const matchingDreams = dreams.filter(dream => {
      if (showFavoritesOnly && !dream.isFavorite) return false
      return dream.tags?.some(tag => tag === tagPath || tag.startsWith(tagPath + '/'))
    })
    return matchingDreams.length
  }

  const handleTagRightClick = (e: React.MouseEvent, tagPath: string): void => {
    e.preventDefault()
    setTagContextMenu({
      x: e.clientX,
      y: e.clientY,
      tagPath
    })
  }

  const handleRenameTag = (tagPath: string): void => {
    setRenamingTag(tagPath)
    setNewTagName(getTagName(tagPath))
    setTagContextMenu(null)
  }

  const handleSaveTagRename = (): void => {
    if (!renamingTag || !newTagName.trim()) {
      setRenamingTag(null)
      setNewTagName('')
      return
    }

    const parent = getTagParent(renamingTag)
    const newPath = parent ? `${parent}/${newTagName.trim()}` : newTagName.trim()
    
    if (newPath !== renamingTag) {
      onTagRename(renamingTag, newPath)
    }
    
    setRenamingTag(null)
    setNewTagName('')
  }

  // Close context menu when clicking elsewhere
  useEffect(() => {
    const handleClickOutside = (): void => {
      setTagContextMenu(null)
    }
    
    if (tagContextMenu) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [tagContextMenu])

  if (currentTags.length === 0) {
    return null
  }

  return (
    <div className="mb-6 space-y-3">

      {/* Current Level Tags */}
      <div className="flex gap-2 flex-wrap items-center justify-center">
        {/* All button (only show at root level) */}
        {!selectedTagPath && (
          <button
            onClick={() => onTagSelect('')}
            className={`px-3 py-1 text-xs rounded-full transition-colors flex items-center gap-1.5 ${
              !selectedTagPath && !showFavoritesOnly
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
            }`}
          >
            <span>All</span>
            <span className={`px-1.5 py-0.5 text-xs rounded-full font-medium ${
              !selectedTagPath && !showFavoritesOnly
                ? 'bg-primary-foreground/20 text-primary-foreground'
                : 'bg-primary/20 text-primary'
            }`}>
              {showFavoritesOnly ? dreams.filter(dream => dream.isFavorite).length : dreams.length}
            </span>
          </button>
        )}

        {/* Hierarchical Tags */}
        {currentTags.map((tagNode) => {
          const count = getTagCount(tagNode.fullPath)
          if (count === 0 && showFavoritesOnly) return null
          
          return (
            <button
              key={tagNode.fullPath}
              onClick={() => onTagSelect(tagNode.fullPath)}
              onContextMenu={(e) => handleTagRightClick(e, tagNode.fullPath)}
              className={`px-3 py-1 text-xs rounded-full transition-colors relative flex items-center gap-1.5 ${
                selectedTagPath === tagNode.fullPath && !showFavoritesOnly
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
              }`}
              title="Right-click to rename"
            >
              <span className="flex items-center gap-1">
                {tagNode.name}
                {tagNode.children.length > 0 && (
                  <span className="text-xs opacity-60">▶</span>
                )}
              </span>
              <span className={`px-1.5 py-0.5 text-xs rounded-full font-medium ${
                selectedTagPath === tagNode.fullPath && !showFavoritesOnly
                  ? 'bg-primary-foreground/20 text-primary-foreground'
                  : 'bg-primary/20 text-primary'
              }`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Tag Context Menu */}
      {tagContextMenu && (
        <div 
          className="fixed bg-card border border-border rounded-lg shadow-lg py-1 z-50"
          style={{ 
            left: `${Math.min(tagContextMenu.x, window.innerWidth - 120)}px`, 
            top: `${Math.min(tagContextMenu.y, window.innerHeight - 60)}px` 
          }}
        >
          <button
            onClick={() => handleRenameTag(tagContextMenu.tagPath)}
            className="w-full px-3 py-2 text-sm text-left hover:bg-muted transition-colors"
          >
            ✏️ Rename Tag
          </button>
        </div>
      )}

      {/* Tag Rename Dialog */}
      {renamingTag && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-lg p-4 max-w-sm w-full">
            <h3 className="text-sm font-semibold mb-3 text-foreground">
              Rename Tag "{getTagName(renamingTag)}"
            </h3>
            <input
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded bg-input-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
              maxLength={30}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveTagRename()
                if (e.key === 'Escape') {
                  setRenamingTag(null)
                  setNewTagName('')
                }
              }}
            />
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => {
                  setRenamingTag(null)
                  setNewTagName('')
                }}
                className="flex-1 px-3 py-1.5 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTagRename}
                className="flex-1 px-3 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded text-sm transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Main App Component
const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null)
  const [dreams, setDreams] = useState<DreamEntry[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingDream, setEditingDream] = useState<DreamEntry | null>(null)
  const [deletingDream, setDeletingDream] = useState<DreamEntry | null>(null)
  const [selectedTag, setSelectedTag] = useState('') // hierarchical path
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
  const [showRecentOnly, setShowRecentOnly] = useState(false) // Recent entries filter
  const [theme, setTheme] = useState('dark')
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasFirebaseError, setHasFirebaseError] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [customIconConfig, setCustomIconConfig] = useState<CustomIconConfig>({ order: DEFAULT_ICON_ORDER, names: {} })
  const [customOrder, setCustomOrder] = useState<string[]>([]) // Array of dream IDs in custom order

  // Export/Import/Sort state
  const [exportStatus, setExportStatus] = useState<'idle' | 'exporting' | 'success' | 'error'>('idle')
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc') // CHANGED: Default to descending order

  // Settings state
  const [showSettingsDialog, setShowSettingsDialog] = useState(false)
  const [settingsText, setSettingsText] = useState('')

  // Get unique tags from all dreams (supports hierarchical)
  const getUniqueTags = (dreams: DreamEntry[]): string[] => {
    const allTags = dreams.flatMap(dream => dream.tags || ['#default'])
    return Array.from(new Set(allTags)).sort()
  }

  const availableTags = getUniqueTags(dreams)

  // Filter dreams with hierarchical tag support and recent entries
  let filteredDreams = [...dreams]
  
  if (showFavoritesOnly) {
    filteredDreams = filteredDreams.filter(dream => dream.isFavorite)
  }
  
  if (showRecentOnly) {
    filteredDreams = filteredDreams.filter(dream => isRecentEntry(dream))
  }
  
  if (!showFavoritesOnly && !showRecentOnly && selectedTag) {
    filteredDreams = filteredDreams.filter(dream => 
      dream.tags && dream.tags.some(tag => 
        tag === selectedTag || tag.startsWith(selectedTag + '/')
      )
    )
  }

  // Hide jobs-tagged and tasks-tagged dreams unless specifically selected
  if (!showFavoritesOnly && !showRecentOnly && (!selectedTag || (!selectedTag.toLowerCase().includes('jobs') && !selectedTag.toLowerCase().includes('tasks')))) {
    filteredDreams = filteredDreams.filter(dream => 
      !dream.tags || !dream.tags.some(tag => 
        tag.toLowerCase() === 'jobs' || tag.toLowerCase().startsWith('jobs/') ||
        tag.toLowerCase() === 'tasks' || tag.toLowerCase().startsWith('tasks/')
      )
    )
  }

  // Apply three-state sorting with persistent manual order
  if (sortOrder === 'manual') {
    // Use custom order if available, fallback to displayOrder
    if (customOrder.length > 0) {
      filteredDreams.sort((a, b) => {
        const indexA = customOrder.indexOf(a.id)
        const indexB = customOrder.indexOf(b.id)
        
        // If both are in custom order, use that
        if (indexA !== -1 && indexB !== -1) {
          return indexA - indexB
        }
        // If only one is in custom order, it comes first
        if (indexA !== -1) return -1
        if (indexB !== -1) return 1
        // If neither is in custom order, use displayOrder
        return (a.displayOrder || 0) - (b.displayOrder || 0)
      })
    } else {
      filteredDreams.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
    }
  } else {
    // Special case: when 'tasks' tag is selected, sort by tag name instead of date
    if (selectedTag && selectedTag.toLowerCase().includes('tasks')) {
      filteredDreams.sort((a, b) => {
        // Get the first tag from each dream for comparison
        const aTag = a.tags && a.tags.length > 0 ? a.tags[0] : ''
        const bTag = b.tags && b.tags.length > 0 ? b.tags[0] : ''
        
        if (sortOrder === 'desc') {
          return aTag.localeCompare(bTag) // A-Z
        } else {
          return bTag.localeCompare(aTag) // Z-A
        }
      })
    } else {
      // Default date-based sorting
      filteredDreams.sort((a, b) => {
        const dateA = getEffectiveDateForSorting(a)
        const dateB = getEffectiveDateForSorting(b)
        
        if (sortOrder === 'desc') {
          return dateB - dateA // Newest first (includes time)
        } else {
          return dateA - dateB // Oldest first (includes time)
        }
      })
    }
  }

  // Using the global storage functions (no need to redefine)

  // FIXED: Settings functions with proper localStorage key consistency
  const handleSettingsChange = (content: string): void => {
    // Always save locally first (this should never fail)
    setSettingsText(content)
    saveToLocalStorage('dream_settings_notes', content)
    
    // Try to save to Firebase asynchronously (don't await or block)
    if (user && !hasFirebaseError) {
      saveSettingsToFirestore(content).catch(() => {
        // Silent fail - local storage already saved successfully
        setHasFirebaseError(true)
      })
    }
  }

  const saveSettingsToFirestore = async (content: string): Promise<void> => {
    if (!user || hasFirebaseError) {
      throw new Error('User not authenticated or Firebase error')
    }
    
    try {
      // Use setDoc with merge option - this will create or update the document
      const configDoc = doc(db, 'userConfigs', user.uid)
      await setDoc(configDoc, { 
        userId: user.uid,
        settingsText: content,
        lastUpdated: new Date()
      }, { merge: true }) // merge: true means it will update existing fields or create if doesn't exist
      
      // Reset Firebase error state on successful save
      setHasFirebaseError(false)
    } catch (error) {
      // Mark Firebase as having an error and let the calling function handle it
      setHasFirebaseError(true)
      throw error
    }
  }

  // Export/Import/Reset handlers
  const handleExportDreams = async (): Promise<void> => {
    if (dreams.length === 0) {
      alert('No dreams to export!')
      return
    }

    setExportStatus('exporting')
    
    try {
      const markdown = exportDreamsToMarkdown(dreams)
      const success = await copyToClipboard(markdown)
      
      if (success) {
        setExportStatus('success')
        setTimeout(() => setExportStatus('idle'), 3000)
      } else {
        setExportStatus('error')
        setTimeout(() => setExportStatus('idle'), 3000)
        alert('Failed to copy to clipboard. Please try again.')
      }
    } catch (error) {
      setExportStatus('error')
      setTimeout(() => setExportStatus('idle'), 3000)
      alert('Failed to export dreams. Please try again.')
    }
  }

  const handleImportDreams = (importedDreams: DreamEntry[]): void => {
    // Add imported dreams to existing dreams
    const updatedDreams = [...dreams, ...importedDreams]
    setDreams(updatedDreams)
    saveToLocalStorage('dreams_local', updatedDreams)
    
    // Save to Firebase if authenticated
    if (user && !hasFirebaseError) {
      importedDreams.forEach(dream => saveDreamToFirestore(dream))
    }
    
    alert(`Successfully imported ${importedDreams.length} dreams!`)
  }

  const handleResetAllDreams = async (): Promise<void> => {
    // Clear local state
    setDreams([])
    saveToLocalStorage('dreams_local', [])
    
    // Clear Firebase if authenticated
    if (user && !hasFirebaseError) {
      try {
        // Get all user's dreams and delete them
        const dreamsRef = collection(db, 'dreams')
        const q = query(dreamsRef, where('userId', '==', user.uid))
        const snapshot = await getDocs(q)
        
        // Delete all documents
        const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref))
        await Promise.all(deletePromises)
        
      } catch (error) {
        // Silent fail - local storage was already cleared
      }
    }
    
    alert('All dreams have been cleared!')
  }

  // Hierarchical tag functions with persistence
  const handleTagSelect = (tagPath: string): void => {
    setSelectedTag(tagPath)
    setShowFavoritesOnly(false)
    setShowRecentOnly(false) // Clear recent filter when selecting tag
    // Save selected tag to localStorage for persistence
    saveToLocalStorage('selected_tag', tagPath)
  }

  const handleTagRename = async (oldPath: string, newPath: string): Promise<void> => {
    if (oldPath === newPath) return

    // Update all dreams that have tags matching the old path
    const updatedDreams = dreams.map(dream => {
      if (dream.tags) {
        const updatedTags = dream.tags.map(tag => {
          if (tag === oldPath) {
            return newPath
          } else if (tag.startsWith(oldPath + '/')) {
            return tag.replace(oldPath + '/', newPath + '/')
          }
          return tag
        })
        return { ...dream, tags: updatedTags }
      }
      return dream
    })

    // Update state
    setDreams(updatedDreams)
    saveToLocalStorage('dreams_local', updatedDreams)

    // Update selected tag if it was affected
    if (selectedTag === oldPath) {
      setSelectedTag(newPath)
      saveToLocalStorage('selected_tag', newPath)
    } else if (selectedTag.startsWith(oldPath + '/')) {
      const newSelectedTag = selectedTag.replace(oldPath + '/', newPath + '/')
      setSelectedTag(newSelectedTag)
      saveToLocalStorage('selected_tag', newSelectedTag)
    }

    // Save to Firebase
    if (user && !hasFirebaseError) {
      try {
        // Update each dream in Firebase with the new tags
        for (const dream of updatedDreams) {
          if (!isClientGeneratedId(dream.id)) {
            const dreamDoc = doc(db, 'dreams', dream.id)
            await updateDoc(dreamDoc, { tags: dream.tags })
          }
        }
      } catch (error) {
        // Silent fail for Firebase errors
      }
    }
  }

  // Recent entries filter handler
  const handleToggleRecent = (): void => {
    setShowRecentOnly(!showRecentOnly)
    if (!showRecentOnly) {
      setSelectedTag('')
      setShowFavoritesOnly(false)
      saveToLocalStorage('selected_tag', '')
    }
  }

  // Icon configuration functions
  const saveIconConfig = async (config: CustomIconConfig): Promise<void> => {
    // Always save locally first
    setCustomIconConfig(config)
    saveToLocalStorage('icon_config', config)
    
    // Save to Firebase if user is signed in (don't block on this)
    if (user && !hasFirebaseError) {
      try {
        const configDoc = doc(db, 'userConfigs', user.uid)
        await setDoc(configDoc, { 
          userId: user.uid,
          iconConfig: config,
          lastUpdated: new Date()
        }, { merge: true })
      } catch (error) {
        // Silent fail for Firebase errors
        setHasFirebaseError(true)
      }
    }
  }

  // Auth functions
  const handleGoogleSignIn = async (): Promise<void> => {
    try {
      const result = await signInWithPopup(auth, googleProvider)
      setHasFirebaseError(false)
    } catch (error) {
      if (isCorsError(error)) {
        setHasFirebaseError(true)
        alert('Authentication temporarily unavailable. Continuing in local mode.')
      }
    }
  }

  const handleSignOut = async (): Promise<void> => {
    try {
      await signOut(auth)
      setHasFirebaseError(false)
    } catch (error) {
      setUser(null)
    }
  }

  // Firebase functions
  const saveDreamToFirestore = async (dream: DreamEntry): Promise<void> => {
    if (!dream.displayOrder) {
      const maxOrder = Math.max(...dreams.map(d => d.displayOrder || 0))
      dream.displayOrder = maxOrder + 1000
    }

    // Update local state immediately
    setDreams(prev => {
      const existing = prev.find(d => d.id === dream.id)
      if (existing) {
        const updated = prev.map(d => d.id === dream.id ? dream : d)
        saveToLocalStorage('dreams_local', updated)
        return updated
      } else {
        const newList = [dream, ...prev]
        saveToLocalStorage('dreams_local', newList)
        return newList
      }
    })

    // Save to Firebase if authenticated
    if (user && !hasFirebaseError) {
      try {
        const dreamData = {
          name: dream.name,
          timestamp: dream.timestamp,
          tags: dream.tags || ['#default'],
          icon: dream.icon,
          isFavorite: dream.isFavorite || false,
          displayOrder: dream.displayOrder,
          userId: user.uid
        }
        
        if (dream.description) dreamData.description = dream.description
        
        if (isClientGeneratedId(dream.id)) {
          await addDoc(collection(db, 'dreams'), dreamData)
        } else {
          const dreamDoc = doc(db, 'dreams', dream.id)
          await updateDoc(dreamDoc, dreamData)
        }
        
        setHasFirebaseError(false)
      } catch (error) {
        if (isCorsError(error)) {
          setHasFirebaseError(true)
        }
      }
    }
  }

  const deleteDreamFromFirestore = async (dreamId: string): Promise<void> => {
    // Update local state immediately
    setDreams(prev => {
      const updated = prev.filter(d => d.id !== dreamId)
      saveToLocalStorage('dreams_local', updated)
      return updated
    })

    if (user && !hasFirebaseError) {
      try {
        if (!isClientGeneratedId(dreamId)) {
          const dreamDoc = doc(db, 'dreams', dreamId)
          await deleteDoc(dreamDoc)
        }
        setHasFirebaseError(false)
      } catch (error) {
        if (isCorsError(error)) {
          setHasFirebaseError(true)
        }
      }
    }
  }

  const toggleTheme = (): void => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  const handleToggleFavorites = (): void => {
    setShowFavoritesOnly(!showFavoritesOnly)
    if (!showFavoritesOnly) {
      setSelectedTag('')
      setShowRecentOnly(false) // Clear recent filter when showing favorites
      saveToLocalStorage('selected_tag', '')
    }
  }

  const handleToggleFavorite = async (dream: DreamEntry): Promise<void> => {
    const updatedDream = { ...dream, isFavorite: !dream.isFavorite }
    await saveDreamToFirestore(updatedDream)
  }

  // Three-state sort toggle function
  const handleToggleSort = (): void => {
    setSortOrder(prev => {
      if (prev === 'manual') return 'desc'
      if (prev === 'desc') return 'asc'
      return 'manual'
    })
  }

  // Get sort button content based on current state
  const getSortButtonContent = () => {
    switch (sortOrder) {
      case 'manual':
        return {
          icon: '⋮⋮',
          text: 'Manual',
          tooltip: 'Switch to newest first'
        }
      case 'desc':
        return {
          icon: '📅↓',
          text: 'Newest',
          tooltip: 'Switch to oldest first'
        }
      case 'asc':
        return {
          icon: '📅↑',
          text: 'Oldest',
          tooltip: 'Switch to manual order'
        }
      default:
        return {
          icon: '⋮⋮',
          text: 'Manual',
          tooltip: 'Switch to newest first'
        }
    }
  }

  const handleDragStart = (e: React.DragEvent, index: number): void => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent): void => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number): void => {
    e.preventDefault()
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null)
      return
    }

    const newDreams = [...filteredDreams]
    const draggedItem = newDreams[draggedIndex]
    
    newDreams.splice(draggedIndex, 1)
    const adjustedDropIndex = draggedIndex < dropIndex ? dropIndex - 1 : dropIndex
    newDreams.splice(adjustedDropIndex, 0, draggedItem)
    
    // Create new custom order based on the reordered dreams
    const newCustomOrder = newDreams.map(dream => dream.id)
    setCustomOrder(newCustomOrder)
    saveToLocalStorage('custom_dream_order', newCustomOrder)
    
    // Switch to manual sort to show the reordering
    setSortOrder('manual')
    
    setDraggedIndex(null)
  }

  const handleSaveDream = async (dream: DreamEntry): Promise<void> => {
    await saveDreamToFirestore(dream)
    setEditingDream(null)
  }

  const handleDeleteDream = async (dream: DreamEntry): Promise<void> => {
    await deleteDreamFromFirestore(dream.id)
    setDeletingDream(null)
  }

  // Effects
  useEffect(() => {
    const handleOnline = (): void => {
      setIsOnline(true)
    }
    const handleOffline = (): void => {
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    const storedTheme = localStorage.getItem('theme') || 'dark'
    setTheme(storedTheme)
    
    if (storedTheme === 'dark') {
      document.documentElement.classList.add('dark')
    }

    // Load local dreams
    const localDreams = loadFromLocalStorage('dreams_local', [])
    setDreams(localDreams)

    // Load icon configuration
    const savedIconConfig = loadFromLocalStorage('icon_config', { order: DEFAULT_ICON_ORDER, names: {} })
    setCustomIconConfig(savedIconConfig)

    // FIXED: Load settings with consistent key on app startup
    const savedSettings = loadFromLocalStorage('dream_settings_notes', '')
    setSettingsText(savedSettings)

    // Load selected tag from localStorage for persistence
    const savedSelectedTag = loadFromLocalStorage('selected_tag', '')
    setSelectedTag(savedSelectedTag)

    // Load custom order from localStorage for persistence
    const savedCustomOrder = loadFromLocalStorage('custom_dream_order', [])
    setCustomOrder(savedCustomOrder)

    // Initialize app
    localStorage.setItem('app_initialized', 'true')

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user)
        // Reset Firebase error state when user signs in successfully
        setHasFirebaseError(false)
      } else {
        setUser(null)
      }
      setIsLoading(false)
    }, (error) => {
      if (isCorsError(error)) {
        setHasFirebaseError(true)
      }
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [])