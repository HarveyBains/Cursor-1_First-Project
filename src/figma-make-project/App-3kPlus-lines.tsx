
// Firebase sync
useEffect(() => {
  if (!user || hasFirebaseError) {
    return
  }

  const dreamsRef = collection(db, 'dreams')
  const q = query(
    dreamsRef, 
    where('userId', '==', user.uid)
  )
  
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const firebaseData: DreamEntry[] = []
    snapshot.forEach((doc) => {
      const data = doc.data()
      const dream: DreamEntry = { 
        id: doc.id, 
        ...data,
        timestamp: data.timestamp?.toMillis ? data.timestamp.toMillis() : data.timestamp
      } as DreamEntry
      firebaseData.push(dream)
    })
    
    // Sort client-side by timestamp descending
    firebaseData.sort((a, b) => b.timestamp - a.timestamp)
    
    // Get local dreams
    const localDreams = loadFromLocalStorage('dreams_local', [])
    
    // Merge: Firebase data takes precedence, add unsynced local data
    const mergedData = [...firebaseData]
    
    // Add local items that don't exist in Firebase (client-generated IDs)
    localDreams.forEach((localItem: DreamEntry) => {
      if (isClientGeneratedId(localItem.id) && 
          !firebaseData.some(fbItem => fbItem.name === localItem.name && 
              Math.abs(fbItem.timestamp - localItem.timestamp) < 10000)) {
        mergedData.push(localItem)
      }
    })
    
    // Sort by display order
    const sortedData = mergedData.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
    
    setDreams(sortedData)
    saveToLocalStorage('dreams_local', sortedData)
    
    setHasFirebaseError(false)
  }, (error) => {
    if (isCorsError(error)) {
      setHasFirebaseError(true)
    }
  })

  return () => {
    unsubscribe()
  }
}, [user, hasFirebaseError])

// Load user configuration from Firebase
useEffect(() => {
  if (user && !hasFirebaseError) {
    const loadUserConfig = async (): Promise<void> => {
      try {
        // Try to load from the direct document approach first (new structure)
        const userConfigDoc = doc(db, 'userConfigs', user.uid)
        const directDoc = await getDoc(userConfigDoc)
        
        if (directDoc.exists()) {
          // Load from direct document (new structure)
          const data = directDoc.data()
          if (data.iconConfig) {
            setCustomIconConfig(data.iconConfig)
            saveToLocalStorage('icon_config', data.iconConfig)
          }
          if (data.settingsText !== undefined) {
            setSettingsText(data.settingsText)
            saveToLocalStorage('dream_settings_notes', data.settingsText)
          }
        } else {
          // Fallback: try loading from collection query (old structure)
          const docSnapshot = await getDocs(query(collection(db, 'userConfigs'), where('userId', '==', user.uid)))
          docSnapshot.forEach((doc) => {
            const data = doc.data()
            if (data.iconConfig) {
              setCustomIconConfig(data.iconConfig)
              saveToLocalStorage('icon_config', data.iconConfig)
            }
            if (data.settingsText !== undefined) {
              setSettingsText(data.settingsText)
              saveToLocalStorage('dream_settings_notes', data.settingsText)
            }
          })
        }
      } catch (error) {
        // Silent fail for Firebase errors but set error state
        setHasFirebaseError(true)
      }
    }
    
    loadUserConfig()
  }
}, [user, hasFirebaseError])

if (isLoading) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="text-foreground mb-2">Loading...</div>
        <div className="text-xs text-muted-foreground">Dream-Notions v13.0.2 - UI Text Updates and Task Tag Styling</div>
      </div>
    </div>
  )
}

return (
  <div className="min-h-screen bg-background text-foreground">
    <header className="bg-card border-b border-border px-4 py-3 sticky top-0 z-40">
      <div className="max-w-3xl mx-auto flex items-center">
        {/* Left side - Theme Toggle */}
        <div className="w-16 sm:w-20 flex justify-start flex-shrink-0">
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>

        {/* UPDATED: App title with version in description */}
        <div className="flex-1 text-center px-2 min-w-0">
          <div className="flex items-center justify-center mb-1">
            <h1 className="text-lg font-semibold text-primary">Dream-Notions</h1>
          </div>
          <p className="text-xs text-muted-foreground">Record and organize your dreams - v13.0.2</p>
        </div>

        {/* Right side with settings icon */}
        <div className="flex items-center gap-2 w-16 sm:w-20 sm:min-w-[120px] justify-end flex-shrink-0">
          {/* List Planner notepad icon */}
          <Tooltip content="List Planner">
            <button
              onClick={() => setShowSettingsDialog(true)}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </button>
          </Tooltip>

          {user ? (
            <UserAvatar 
              user={user} 
              onSignOut={handleSignOut}
              isOnline={isOnline}
              hasFirebaseError={hasFirebaseError}
            />
          ) : (
            <button
              onClick={handleGoogleSignIn}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded transition-colors text-xs whitespace-nowrap"
            >
              <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span className="hidden sm:inline">Sign In</span>
              <span className="sm:hidden">Sync</span>
            </button>
          )}
        </div>
      </div>
    </header>

    <main className="max-w-3xl mx-auto px-4 py-6">

      {/* Export/Import Control Panel */}
      <div className="mt-6 mb-8">
        <div className="bg-card border border-orange-200 dark:border-purple-500/30 shadow-lg rounded-lg p-4 max-w-xl mx-auto">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {/* Export Icon - cloud upload */}
              <Tooltip content="Export all dreams to markdown">
                <button
                  onClick={handleExportDreams}
                  disabled={exportStatus === 'exporting' || dreams.length === 0}
                  className={`px-3 py-2 rounded-lg text-xs transition-colors font-medium flex items-center gap-1.5 border ${
                    exportStatus === 'success' 
                      ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700'
                      : exportStatus === 'exporting'
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-700 cursor-not-allowed'
                      : dreams.length === 0
                      ? 'bg-gray-50 dark:bg-gray-900/20 text-gray-500 dark:text-gray-500 border-gray-300 dark:border-gray-700 cursor-not-allowed'
                      : 'bg-orange-50 dark:bg-purple-900/20 text-orange-600 dark:text-purple-400 border-orange-200 dark:border-purple-600 hover:bg-orange-100 dark:hover:bg-purple-900/30'
                  }`}
                >
                  {exportStatus === 'success' ? '✅' : exportStatus === 'exporting' ? '⏳' : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  )}
                  <span className="hidden sm:inline">
                    {exportStatus === 'success' ? 'Copied!' : exportStatus === 'exporting' ? 'Exporting...' : 'Export'}
                  </span>
                </button>
              </Tooltip>
              
              {/* Import Icon - file download */}
              <Tooltip content="Import dreams from clipboard">
                <button
                  onClick={() => setShowImportDialog(true)}
                  className="px-3 py-2 rounded-lg text-xs transition-colors font-medium flex items-center gap-1.5 border bg-orange-50 dark:bg-purple-900/20 text-orange-600 dark:text-purple-400 border-orange-200 dark:border-purple-600 hover:bg-orange-100 dark:hover:bg-purple-900/30"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="hidden sm:inline">Import</span>
                </button>
              </Tooltip>
            </div>
            
            {/* Main action button */}
            <button
              onClick={() => setShowForm(true)}
              className="bg-orange-50 dark:bg-purple-900/20 hover:bg-orange-100 dark:hover:bg-purple-900/30 border-2 border-orange-500 hover:border-orange-600 text-orange-600 hover:text-orange-700 dark:text-purple-400 dark:hover:text-purple-300 dark:border-purple-500 dark:hover:border-purple-400 px-4 py-2 rounded-lg text-sm transition-colors font-medium whitespace-nowrap"
            >
              Add Notion
            </button>
          </div>
        </div>
      </div>

      {/* Navigation section - Recent Entries, Favorites and Sort Toggle */}
      <div className="mb-8">
        {(dreams.filter(dream => isRecentEntry(dream)).length > 0 || dreams.filter(dream => dream.isFavorite).length > 0 || filteredDreams.length > 0) && (
          <div className="flex justify-center mb-6">
            <div className="flex items-center gap-3">
              {/* Recent Entries Button */}
              {dreams.filter(dream => isRecentEntry(dream)).length > 0 && (
                <button
                  onClick={handleToggleRecent}
                  className={`px-3 py-1 text-xs rounded-full transition-colors flex items-center gap-1.5 ${
                    showRecentOnly
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                  }`}
                >
                  <span>🕐 Recents</span>
                  <span className={`px-1.5 py-0.5 text-xs rounded-full font-medium ${
                    showRecentOnly
                      ? 'bg-primary-foreground/20 text-primary-foreground'
                      : 'bg-primary/20 text-primary'
                  }`}>
                    {dreams.filter(dream => isRecentEntry(dream)).length}
                  </span>
                </button>
              )}

              {/* Favorites Button */}
              {dreams.filter(dream => dream.isFavorite).length > 0 && (
                <button
                  onClick={handleToggleFavorites}
                  className={`px-3 py-1 text-xs rounded-full transition-colors flex items-center gap-1.5 ${
                    showFavoritesOnly
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                  }`}
                >
                  <span>★ Favorites</span>
                  <span className={`px-1.5 py-0.5 text-xs rounded-full font-medium ${
                    showFavoritesOnly
                      ? 'bg-primary-foreground/20 text-primary-foreground'
                      : 'bg-primary/20 text-primary'
                  }`}>
                    {dreams.filter(dream => dream.isFavorite).length}
                  </span>
                </button>
              )}

              {/* Three-State Sort Toggle Button */}
              {filteredDreams.length > 0 && (
                <Tooltip content={getSortButtonContent().tooltip}>
                  <button
                    onClick={handleToggleSort}
                    className={`px-3 py-1 text-xs rounded-full transition-colors flex items-center gap-1.5 ${
                      sortOrder === 'manual' 
                        ? 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                        : 'bg-primary/10 text-primary hover:bg-primary/20'
                    }`}
                  >
                    <span>{getSortButtonContent().icon}</span>
                    <span>
                      {getSortButtonContent().text}
                    </span>
                  </button>
                </Tooltip>
              )}
            </div>
          </div>
        )}

        {/* Hierarchical Tag Navigation - only show when not filtering by recent/favorites */}
        {!showRecentOnly && !showFavoritesOnly && (
          <HierarchicalTagNavigation
            dreams={dreams}
            selectedTagPath={selectedTag}
            showFavoritesOnly={showFavoritesOnly}
            onTagSelect={handleTagSelect}
            onTagRename={handleTagRename}
          />
        )}
      </div>

      {/* Enhanced Breadcrumb Navigation - positioned above dreams list */}
      {!showRecentOnly && !showFavoritesOnly && selectedTag && (
        <div className="mb-4">
          <div className="flex items-center gap-1 text-sm">
            <button
              onClick={() => handleTagSelect('')}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              All
            </button>
            {(() => {
              const parts = selectedTag.split('/').filter(part => part.trim())
              const breadcrumbs = []
              for (let i = 0; i < parts.length; i++) {
                const path = parts.slice(0, i + 1).join('/')
                breadcrumbs.push({ name: parts[i], path })
              }
              return breadcrumbs.map((crumb, index) => (
                <React.Fragment key={crumb.path}>
                  <span className="text-muted-foreground">/</span>
                  <button
                    onClick={() => handleTagSelect(crumb.path)}
                    className={`transition-colors ${
                      index === breadcrumbs.length - 1
                        ? 'text-primary font-medium'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {crumb.name}
                  </button>
                </React.Fragment>
              ))
            })()}
          </div>
        </div>
      )}

      {/* Dreams List */}
      <div>
        {filteredDreams.map((dream, index) => (
          <DreamItem
            key={dream.id}
            dream={dream}
            index={index}
            onEdit={setEditingDream}
            onDelete={setDeletingDream}
            onToggleFavorite={handleToggleFavorite}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            customIconConfig={customIconConfig}
          />
        ))}
      </div>

      {dreams.length === 0 && (
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold text-foreground mb-2">No dreams recorded yet</h3>
          <p className="text-muted-foreground mb-4">Start by adding your first dream!</p>
          <button
            onClick={() => setShowForm(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded transition-colors"
          >
            Add Your First Dream
          </button>
        </div>
      )}
    </main>

    {/* DreamForm now receives selectedTag prop */}
    <DreamForm
      isOpen={showForm || !!editingDream}
      onClose={() => {
        setShowForm(false)
        setEditingDream(null)
      }}
      onSave={handleSaveDream}
      editingDream={editingDream}
      availableTags={availableTags}
      customIconConfig={customIconConfig}
      onUpdateIconConfig={saveIconConfig}
      existingDreams={dreams}
      selectedTag={selectedTag}
    />

    {/* Import Dialog */}
    <ImportDialog
      isOpen={showImportDialog}
      onClose={() => setShowImportDialog(false)}
      onImport={handleImportDreams}
      onReset={handleResetAllDreams}
      hasDreams={dreams.length > 0}
    />

    {/* Settings Dialog */}
    <SettingsDialog
      isOpen={showSettingsDialog}
      onClose={() => setShowSettingsDialog(false)}
      textContent={settingsText}
      onTextChange={handleSettingsChange}
    />

    {/* Delete confirmation dialog */}
    {deletingDream && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-card rounded-lg p-6 max-w-sm w-full">
          <h3 className="text-base font-semibold mb-2 text-foreground">Delete Dream</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Are you sure you want to delete "{deletingDream.name}"? This action cannot be undone.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setDeletingDream(null)}
              className="flex-1 px-4 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => handleDeleteDream(deletingDream)}
              className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 dark:bg-purple-500 dark:hover:bg-purple-600 text-white rounded transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    )}
  </div>
)
}

export default App