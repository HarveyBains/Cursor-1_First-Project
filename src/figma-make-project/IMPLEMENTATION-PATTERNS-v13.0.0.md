# Implementation Patterns & Code Structures - Dream-Notions v13.0.0

**Detailed Code Patterns for Feature Regeneration**

## Table of Contents

1. [React Component Patterns](#react-component-patterns)
2. [State Management Patterns](#state-management-patterns)
3. [Firebase Integration Patterns](#firebase-integration-patterns)
4. [UI Component Patterns](#ui-component-patterns)
5. [Data Processing Patterns](#data-processing-patterns)
6. [Event Handling Patterns](#event-handling-patterns)
7. [Error Handling Patterns](#error-handling-patterns)
8. [Performance Patterns](#performance-patterns)
9. [Styling Patterns](#styling-patterns)
10. [Mobile Optimization Patterns](#mobile-optimization-patterns)

## React Component Patterns

### 1. Main Application Component Structure

```typescript
// App.tsx - Main component structure
import React, { useState, useEffect, useRef } from 'react'
import { User, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth'
import { collection, doc, getDocs, addDoc, updateDoc, deleteDoc, query, onSnapshot, where, setDoc, getDoc } from 'firebase/firestore'

// Core interfaces
interface DreamEntry {
  id: string
  name: string
  timestamp: number
  description?: string
  isFavorite?: boolean
  tags?: string[]
  icon?: string
  displayOrder?: number
  userId?: string
}

// Main component with comprehensive state management
const App: React.FC = () => {
  // Authentication state
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isSigningIn, setIsSigningIn] = useState(false)
  
  // Dream data state
  const [dreams, setDreams] = useState<DreamEntry[]>([])
  const [isLoadingDreams, setIsLoadingDreams] = useState(true)
  
  // UI state
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingDream, setEditingDream] = useState<DreamEntry | null>(null)
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  
  // Filter and search state
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [sortOrder, setSortOrder] = useState<'manual' | 'desc' | 'asc'>('manual')
  
  // Component implementation...
}
```

### 2. Modal Component Pattern

```typescript
// Modal component with proper state management
const DreamModal: React.FC<{
  isOpen: boolean
  onClose: () => void
  dream?: DreamEntry
  onSave: (dream: DreamEntry) => void
}> = ({ isOpen, onClose, dream, onSave }) => {
  const [formData, setFormData] = useState<Partial<DreamEntry>>({
    name: '',
    description: '',
    tags: [],
    icon: 'neutral',
    isFavorite: false
  })
  
  useEffect(() => {
    if (dream) {
      setFormData(dream)
    } else {
      setFormData({
        name: generateDreamTitle(dreams),
        description: '',
        tags: [],
        icon: 'neutral',
        isFavorite: false
      })
    }
  }, [dream, isOpen])
  
  const handleSave = () => {
    const dreamToSave: DreamEntry = {
      ...formData,
      id: dream?.id || generateId(),
      timestamp: dream?.timestamp || Date.now()
    } as DreamEntry
    
    onSave(dreamToSave)
    onClose()
  }
  
  if (!isOpen) return null
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-lg p-6 w-full max-w-2xl mx-4">
        {/* Modal content */}
      </div>
    </div>
  )
}
```

### 3. Custom Hook Patterns

```typescript
// Custom hooks for reusable logic
const useLocalStorage = <T>(key: string, defaultValue: T) => {
  const [value, setValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : defaultValue
    } catch (error) {
      return defaultValue
    }
  })
  
  const setStoredValue = (newValue: T) => {
    try {
      setValue(newValue)
      localStorage.setItem(key, JSON.stringify(newValue))
    } catch (error) {
      console.error('Error saving to localStorage:', error)
    }
  }
  
  return [value, setStoredValue] as const
}

// Firebase authentication hook
const useAuth = () => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user)
      setLoading(false)
    })
    
    return unsubscribe
  }, [])
  
  return { user, loading }
}
```

## State Management Patterns

### 1. Dream Management State

```typescript
// Comprehensive dream state management
const [dreams, setDreams] = useState<DreamEntry[]>([])
const [originalDreams, setOriginalDreams] = useState<DreamEntry[]>([])
const [isLoadingDreams, setIsLoadingDreams] = useState(true)
const [dreamStats, setDreamStats] = useState({
  total: 0,
  favorites: 0,
  recentEntries: 0
})

// State update patterns
const addDream = (newDream: DreamEntry) => {
  setDreams(prev => {
    const updated = [...prev, newDream]
    setOriginalDreams(updated)
    return updated
  })
}

const updateDream = (updatedDream: DreamEntry) => {
  setDreams(prev => {
    const updated = prev.map(dream => 
      dream.id === updatedDream.id ? updatedDream : dream
    )
    setOriginalDreams(updated)
    return updated
  })
}

const deleteDream = (dreamId: string) => {
  setDreams(prev => {
    const updated = prev.filter(dream => dream.id !== dreamId)
    setOriginalDreams(updated)
    return updated
  })
}
```

### 2. Filter and Search State

```typescript
// Search and filter state management
const [activeFilters, setActiveFilters] = useState({
  searchTerm: '',
  selectedTags: [] as string[],
  dateRange: null as { start: Date; end: Date } | null,
  showFavorites: false,
  showRecent: false
})

const [filterStats, setFilterStats] = useState({
  totalResults: 0,
  appliedFilters: 0
})

// Filter application pattern
const applyFilters = useCallback(() => {
  let filtered = [...originalDreams]
  
  // Apply search filter
  if (activeFilters.searchTerm) {
    filtered = filtered.filter(dream => 
      dream.name.toLowerCase().includes(activeFilters.searchTerm.toLowerCase()) ||
      dream.description?.toLowerCase().includes(activeFilters.searchTerm.toLowerCase())
    )
  }
  
  // Apply tag filter
  if (activeFilters.selectedTags.length > 0) {
    filtered = filtered.filter(dream => 
      activeFilters.selectedTags.every(tag => 
        dream.tags?.includes(tag)
      )
    )
  }
  
  // Apply other filters...
  
  setDreams(filtered)
  setFilterStats({
    totalResults: filtered.length,
    appliedFilters: Object.values(activeFilters).filter(Boolean).length
  })
}, [originalDreams, activeFilters])
```

### 3. UI State Management

```typescript
// UI state management patterns
const [uiState, setUiState] = useState({
  showAddModal: false,
  showImportModal: false,
  showSettingsModal: false,
  selectedDream: null as DreamEntry | null,
  isEditing: false,
  isSaving: false,
  lastSaved: null as Date | null
})

// UI state updates
const openAddModal = () => {
  setUiState(prev => ({
    ...prev,
    showAddModal: true,
    selectedDream: null,
    isEditing: false
  }))
}

const openEditModal = (dream: DreamEntry) => {
  setUiState(prev => ({
    ...prev,
    showAddModal: true,
    selectedDream: dream,
    isEditing: true
  }))
}

const closeModal = () => {
  setUiState(prev => ({
    ...prev,
    showAddModal: false,
    selectedDream: null,
    isEditing: false
  }))
}
```

## Firebase Integration Patterns

### 1. Authentication Pattern

```typescript
// Firebase authentication integration
const handleGoogleSignIn = async () => {
  try {
    setIsSigningIn(true)
    setFirebaseError(null)
    
    const result = await signInWithPopup(auth, googleProvider)
    const user = result.user
    
    // Set user state
    setCurrentUser(user)
    
    // Initialize user data
    await initializeUserData(user)
    
    // Start real-time listeners
    setupFirestoreListeners(user)
    
  } catch (error: any) {
    console.error('Authentication error:', error)
    setFirebaseError(error)
    
    // Handle specific error types
    if (error.code === 'auth/popup-closed-by-user') {
      // User closed popup - silent fail
    } else if (error.code === 'auth/network-request-failed') {
      // Network error - show offline message
    }
  } finally {
    setIsSigningIn(false)
  }
}

const handleSignOut = async () => {
  try {
    // Clean up listeners
    cleanupFirestoreListeners()
    
    // Sign out from Firebase
    await signOut(auth)
    
    // Reset application state
    setCurrentUser(null)
    setDreams([])
    setSelectedTags([])
    
  } catch (error) {
    console.error('Sign out error:', error)
  }
}
```

### 2. Firestore Data Operations

```typescript
// Firestore CRUD operations
const saveDreamToFirestore = async (dream: DreamEntry) => {
  try {
    if (!currentUser) throw new Error('User not authenticated')
    
    const dreamWithUser = {
      ...dream,
      userId: currentUser.uid
    }
    
    if (isClientGeneratedId(dream.id)) {
      // New dream - add to collection
      const docRef = await addDoc(collection(db, 'dreams'), dreamWithUser)
      return { ...dreamWithUser, id: docRef.id }
    } else {
      // Existing dream - update document
      await updateDoc(doc(db, 'dreams', dream.id), dreamWithUser)
      return dreamWithUser
    }
  } catch (error) {
    console.error('Error saving dream:', error)
    
    // Fallback to local storage
    saveToLocalStorage(`dream_${dream.id}`, dream)
    throw error
  }
}

const deleteDreamFromFirestore = async (dreamId: string) => {
  try {
    if (!currentUser) throw new Error('User not authenticated')
    
    await deleteDoc(doc(db, 'dreams', dreamId))
    
    // Remove from local storage as well
    localStorage.removeItem(`dream_${dreamId}`)
    
  } catch (error) {
    console.error('Error deleting dream:', error)
    throw error
  }
}
```

### 3. Real-time Data Sync

```typescript
// Real-time Firestore listeners
const setupFirestoreListeners = (user: User) => {
  const dreamsQuery = query(
    collection(db, 'dreams'),
    where('userId', '==', user.uid)
  )
  
  const unsubscribe = onSnapshot(
    dreamsQuery,
    (snapshot) => {
      const firestoreDreams = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as DreamEntry[]
      
      // Merge with local storage dreams
      const localDreams = loadDreamsFromLocalStorage()
      const mergedDreams = mergeDreams(firestoreDreams, localDreams)
      
      setDreams(mergedDreams)
      setOriginalDreams(mergedDreams)
      setIsLoadingDreams(false)
    },
    (error) => {
      console.error('Firestore listener error:', error)
      setFirebaseError(error)
      
      // Fallback to local storage
      const localDreams = loadDreamsFromLocalStorage()
      setDreams(localDreams)
      setOriginalDreams(localDreams)
      setIsLoadingDreams(false)
    }
  )
  
  // Store unsubscribe function
  firestoreUnsubscribers.current.push(unsubscribe)
}

// Cleanup listeners
const cleanupFirestoreListeners = () => {
  firestoreUnsubscribers.current.forEach(unsubscribe => {
    unsubscribe()
  })
  firestoreUnsubscribers.current = []
}
```

## UI Component Patterns

### 1. Dream Entry Card Component

```typescript
// Dream entry card with comprehensive features
const DreamCard: React.FC<{
  dream: DreamEntry
  onEdit: (dream: DreamEntry) => void
  onDelete: (dreamId: string) => void
  onToggleFavorite: (dreamId: string) => void
  isRecent: boolean
}> = ({ dream, onEdit, onDelete, onToggleFavorite, isRecent }) => {
  const [showActions, setShowActions] = useState(false)
  
  const handleClick = () => {
    setShowActions(!showActions)
  }
  
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }
  
  return (
    <div className={`
      bg-card border border-border rounded-lg p-4 cursor-pointer
      transition-all duration-200 hover:shadow-md
      ${isRecent ? 'ring-2 ring-primary/20' : ''}
    `} onClick={handleClick}>
      
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${DEFAULT_DREAM_ICONS[dream.icon || 'neutral']}`} />
          <h3 className="font-medium text-foreground">{dream.name}</h3>
        </div>
        
        <div className="flex items-center gap-1">
          {dream.isFavorite && (
            <span className="text-yellow-500">⭐</span>
          )}
          {isRecent && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
              New
            </span>
          )}
        </div>
      </div>
      
      {/* Description */}
      <p className="text-sm text-muted-foreground mb-3 line-clamp-3">
        {dream.description || 'No description'}
      </p>
      
      {/* Tags */}
      {dream.tags && dream.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {dream.tags.map(tag => (
            <span key={tag} className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full">
              {tag}
            </span>
          ))}
        </div>
      )}
      
      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{formatDate(dream.timestamp)}</span>
        
        {showActions && (
          <div className="flex items-center gap-2">
            <button 
              onClick={(e) => {
                e.stopPropagation()
                onToggleFavorite(dream.id)
              }}
              className="hover:text-yellow-500"
            >
              {dream.isFavorite ? '★' : '☆'}
            </button>
            
            <button 
              onClick={(e) => {
                e.stopPropagation()
                onEdit(dream)
              }}
              className="hover:text-primary"
            >
              Edit
            </button>
            
            <button 
              onClick={(e) => {
                e.stopPropagation()
                onDelete(dream.id)
              }}
              className="hover:text-destructive"
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
```

### 2. Tag System Component

```typescript
// Advanced tag system with hierarchy support
const TagSystem: React.FC<{
  availableTags: string[]
  selectedTags: string[]
  onTagSelect: (tag: string) => void
  onTagDeselect: (tag: string) => void
  dreams: DreamEntry[]
}> = ({ availableTags, selectedTags, onTagSelect, onTagDeselect, dreams }) => {
  const [searchTerm, setSearchTerm] = useState('')
  
  // Build tag hierarchy
  const tagHierarchy = buildTagHierarchy(availableTags, dreams)
  
  // Filter tags based on search
  const filteredTags = tagHierarchy.filter(tag =>
    tag.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tag.fullPath.toLowerCase().includes(searchTerm.toLowerCase())
  )
  
  const renderTag = (tag: TagNode, level: number = 0) => {
    const isSelected = selectedTags.includes(tag.fullPath)
    const truncatedName = tag.name.length > 25 ? 
      tag.name.substring(0, 25) + '...' : tag.name
    
    return (
      <div key={tag.fullPath} className="tag-container">
        <div 
          className={`
            flex items-center justify-between px-2 py-1 rounded cursor-pointer
            transition-colors duration-200
            ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted-foreground/10'}
            ${level > 0 ? `ml-${level * 4}` : ''}
          `}
          onClick={() => isSelected ? onTagDeselect(tag.fullPath) : onTagSelect(tag.fullPath)}
          title={tag.fullPath}
        >
          <span className="text-sm">{truncatedName}</span>
          <span className="text-xs text-muted-foreground">
            {tag.count}
          </span>
        </div>
        
        {/* Render child tags */}
        {tag.children.map(child => renderTag(child, level + 1))}
      </div>
    )
  }
  
  return (
    <div className="tag-system">
      {/* Search */}
      <div className="mb-3">
        <input
          type="text"
          placeholder="Search tags..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 border border-border rounded-lg"
        />
      </div>
      
      {/* Selected Tags */}
      {selectedTags.length > 0 && (
        <div className="mb-3">
          <h4 className="text-sm font-medium mb-2">Selected Tags:</h4>
          <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto tag-scroll-area">
            {selectedTags.map(tag => (
              <span 
                key={tag} 
                className="bg-primary text-primary-foreground px-2 py-1 rounded text-sm cursor-pointer"
                onClick={() => onTagDeselect(tag)}
                title={`Remove ${tag}`}
              >
                {tag} ×
              </span>
            ))}
          </div>
        </div>
      )}
      
      {/* Available Tags */}
      <div className="available-tags">
        <h4 className="text-sm font-medium mb-2">Available Tags:</h4>
        <div className="max-h-32 overflow-y-auto tag-scroll-area">
          {filteredTags.map(tag => renderTag(tag))}
        </div>
      </div>
    </div>
  )
}
```

### 3. Responsive Navigation Component

```typescript
// Mobile-optimized navigation
const NavigationBar: React.FC<{
  onAddDream: () => void
  onShowSearch: () => void
  onShowFilters: () => void
  dreamCount: number
  hasFilters: boolean
}> = ({ onAddDream, onShowSearch, onShowFilters, dreamCount, hasFilters }) => {
  const [isMobile, setIsMobile] = useState(false)
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])
  
  return (
    <nav className="bg-card border-b border-border px-4 py-3">
      <div className="flex items-center justify-between">
        {/* Logo/Title */}
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold">Dream-Notions</h1>
          <span className="text-xs text-muted-foreground">
            {dreamCount} dreams
          </span>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <button 
            onClick={onShowSearch}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            title="Search dreams"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          
          {/* Filters */}
          <button 
            onClick={onShowFilters}
            className={`
              p-2 rounded-lg transition-colors relative
              ${hasFilters ? 'bg-primary/10 text-primary' : 'hover:bg-muted'}
            `}
            title="Filter dreams"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z" />
            </svg>
            {hasFilters && (
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
            )}
          </button>
          
          {/* Add Dream */}
          <button 
            onClick={onAddDream}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            {!isMobile && 'New Entry'}
          </button>
        </div>
      </div>
    </nav>
  )
}
```

## Data Processing Patterns

### 1. Dream Text Processing

```typescript
// Intelligent dream text enhancement
const enhanceDreamText = (text: string): string => {
  // Step 1: Basic cleanup
  let enhanced = text.trim()
  if (!enhanced) return enhanced
  
  // Step 2: Convert to lowercase for processing
  enhanced = enhanced.toLowerCase()
  
  // Step 3: Apply spell corrections
  const corrections = {
    'flyin': 'flying', 'runing': 'running', 'fallin': 'falling',
    'swimmin': 'swimming', 'walkng': 'walking', 'talkin': 'talking',
    'freind': 'friend', 'wierd': 'weird', 'scarry': 'scary',
    'beatiful': 'beautiful', 'familar': 'familiar'
  }
  
  Object.entries(corrections).forEach(([wrong, correct]) => {
    const regex = new RegExp(`\\b${wrong}\\b`, 'gi')
    enhanced = enhanced.replace(regex, correct)
  })
  
  // Step 4: Fix grammar
  enhanced = enhanced.replace(/\bi\b/g, 'I')
  enhanced = enhanced.replace(/\bim\b/g, "I'm")
  enhanced = enhanced.replace(/\bcant\b/g, "can't")
  enhanced = enhanced.replace(/\bdont\b/g, "don't")
  
  // Step 5: Capitalize first letter
  enhanced = enhanced.charAt(0).toUpperCase() + enhanced.slice(1)
  
  // Step 6: Fix spacing and punctuation
  enhanced = enhanced.replace(/\s+/g, ' ')
  enhanced = enhanced.replace(/\s+([,.!?])/g, '$1')
  
  // Step 7: Add period if missing
  if (!enhanced.match(/[.!?]$/)) {
    enhanced += '.'
  }
  
  // Step 8: Convert to first-person narrative if needed
  const hasFirstPerson = /\b(I|me|my|myself)\b/i.test(enhanced)
  if (!hasFirstPerson && enhanced.length < 100) {
    if (enhanced.match(/^(flying|running|walking|swimming|falling|driving)/i)) {
      enhanced = `I was ${enhanced}`
    } else if (enhanced.match(/^(saw|found|met|heard|felt)/i)) {
      enhanced = `I ${enhanced}`
    } else {
      enhanced = `I dreamed that ${enhanced}`
    }
  }
  
  return enhanced
}
```

### 2. Tag Processing System

```typescript
// Advanced tag processing with hierarchy
const processTagHierarchy = (tags: string[], dreams: DreamEntry[]) => {
  // Count tag usage
  const tagUsage = new Map<string, number>()
  const tagPaths = new Set<string>()
  
  dreams.forEach(dream => {
    dream.tags?.forEach(tag => {
      const parts = tag.split('/')
      
      // Add all parent paths
      for (let i = 1; i <= parts.length; i++) {
        const path = parts.slice(0, i).join('/')
        tagPaths.add(path)
        tagUsage.set(path, (tagUsage.get(path) || 0) + 1)
      }
    })
  })
  
  // Build hierarchy
  const buildHierarchy = (paths: string[], level: number = 0): TagNode[] => {
    const nodes: TagNode[] = []
    const processed = new Set<string>()
    
    paths.forEach(path => {
      if (processed.has(path)) return
      
      const parts = path.split('/')
      if (parts.length !== level + 1) return
      
      processed.add(path)
      
      const childPaths = paths.filter(p => 
        p.startsWith(path + '/') && 
        p.split('/').length === parts.length + 1
      )
      
      const node: TagNode = {
        name: parts[parts.length - 1],
        fullPath: path,
        children: buildHierarchy(paths, level + 1).filter(child => 
          child.fullPath.startsWith(path + '/')
        ),
        count: tagUsage.get(path) || 0,
        level
      }
      
      nodes.push(node)
    })
    
    // Sort by usage count (descending)
    return nodes.sort((a, b) => b.count - a.count)
  }
  
  return buildHierarchy(Array.from(tagPaths).sort())
}
```

### 3. Date Processing Pattern

```typescript
// Smart date extraction and processing
const extractDateFromTitle = (title: string): Date | null => {
  // Pattern 1: DD/MM/YYYY format
  const fullDateMatch = title.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s*-/)
  if (fullDateMatch) {
    const day = parseInt(fullDateMatch[1], 10)
    const month = parseInt(fullDateMatch[2], 10) - 1
    let year = parseInt(fullDateMatch[3], 10)
    
    // Handle 2-digit years
    if (year < 100) {
      year = year >= 50 ? 1900 + year : 2000 + year
    }
    
    const date = new Date(year, month, day)
    if (!isNaN(date.getTime()) && day >= 1 && day <= 31 && month >= 0 && month <= 11) {
      return date
    }
  }
  
  // Pattern 2: DD/MM format (assume current year)
  const dateMatch = title.match(/^(\d{1,2})\/(\d{1,2})\s*-/)
  if (dateMatch) {
    const day = parseInt(dateMatch[1], 10)
    const month = parseInt(dateMatch[2], 10) - 1
    const year = new Date().getFullYear()
    
    const date = new Date(year, month, day)
    if (!isNaN(date.getTime()) && day >= 1 && day <= 31 && month >= 0 && month <= 11) {
      return date
    }
  }
  
  return null
}

// Combine title date with original timestamp
const getEffectiveDate = (dream: DreamEntry): Date => {
  const titleDate = extractDateFromTitle(dream.name)
  
  if (titleDate) {
    const originalDate = new Date(dream.timestamp)
    titleDate.setHours(
      originalDate.getHours(),
      originalDate.getMinutes(),
      originalDate.getSeconds(),
      originalDate.getMilliseconds()
    )
    return titleDate
  }
  
  return new Date(dream.timestamp)
}
```

## Error Handling Patterns

### 1. Firebase Error Handling

```typescript
// Comprehensive Firebase error handling
const handleFirebaseError = (error: any, operation: string) => {
  console.error(`Firebase ${operation} error:`, error)
  
  // Categorize errors
  if (error.code === 'permission-denied') {
    return {
      type: 'permission',
      message: 'You don\'t have permission to perform this action',
      shouldRetry: false
    }
  }
  
  if (error.code === 'unavailable' || error.message?.includes('offline')) {
    return {
      type: 'network',
      message: 'You appear to be offline. Changes will sync when you reconnect.',
      shouldRetry: true
    }
  }
  
  if (error.code === 'unauthenticated') {
    return {
      type: 'auth',
      message: 'Please sign in to continue',
      shouldRetry: false
    }
  }
  
  // Default error
  return {
    type: 'unknown',
    message: 'An unexpected error occurred. Please try again.',
    shouldRetry: true
  }
}

// Error recovery pattern
const withErrorRecovery = async <T>(
  operation: () => Promise<T>,
  fallback: () => T,
  retries = 3
): Promise<T> => {
  for (let i = 0; i < retries; i++) {
    try {
      return await operation()
    } catch (error) {
      if (i === retries - 1) {
        console.error('Operation failed after retries:', error)
        return fallback()
      }
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000))
    }
  }
  
  return fallback()
}
```

### 2. Form Validation Pattern

```typescript
// Form validation with error handling
const validateDreamForm = (formData: Partial<DreamEntry>): {
  isValid: boolean
  errors: { [key: string]: string }
} => {
  const errors: { [key: string]: string } = {}
  
  // Validate name
  if (!formData.name?.trim()) {
    errors.name = 'Dream title is required'
  } else if (formData.name.length > 200) {
    errors.name = 'Dream title must be less than 200 characters'
  }
  
  // Validate description
  if (!formData.description?.trim()) {
    errors.description = 'Dream description is required'
  } else if (formData.description.length > 10000) {
    errors.description = 'Dream description must be less than 10,000 characters'
  }
  
  // Validate tags
  if (formData.tags && formData.tags.length > 20) {
    errors.tags = 'Maximum 20 tags allowed'
  }
  
  if (formData.tags) {
    formData.tags.forEach(tag => {
      if (tag.length > 50) {
        errors.tags = 'Tag names must be less than 50 characters'
      }
    })
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}
```

## Performance Patterns

### 1. Debounced Search Pattern

```typescript
// Debounced search for performance
const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState(value)
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)
    
    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])
  
  return debouncedValue
}

// Usage in search component
const SearchComponent: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearchTerm = useDebounce(searchTerm, 300)
  
  useEffect(() => {
    if (debouncedSearchTerm) {
      performSearch(debouncedSearchTerm)
    }
  }, [debouncedSearchTerm])
  
  return (
    <input
      type="text"
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      placeholder="Search dreams..."
    />
  )
}
```

### 2. Memoization Pattern

```typescript
// Memoized components for performance
const DreamList = React.memo<{
  dreams: DreamEntry[]
  onDreamSelect: (dream: DreamEntry) => void
}>(({ dreams, onDreamSelect }) => {
  return (
    <div className="dream-list">
      {dreams.map(dream => (
        <DreamCard
          key={dream.id}
          dream={dream}
          onSelect={onDreamSelect}
        />
      ))}
    </div>
  )
})

// Memoized calculations
const DreamStats = React.memo<{ dreams: DreamEntry[] }>(({ dreams }) => {
  const stats = useMemo(() => {
    return {
      total: dreams.length,
      favorites: dreams.filter(d => d.isFavorite).length,
      recent: dreams.filter(d => isRecentEntry(d)).length,
      tags: [...new Set(dreams.flatMap(d => d.tags || []))].length
    }
  }, [dreams])
  
  return <div>{/* Render stats */}</div>
})
```

This comprehensive documentation provides all the implementation patterns and code structures used in Dream-Notions v13.0.0. Each pattern includes detailed code examples and explanations that would allow another AI to accurately regenerate any feature of the application.