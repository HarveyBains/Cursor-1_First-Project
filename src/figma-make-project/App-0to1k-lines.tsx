import React, { useState, useEffect, useRef } from 'react'
import { User, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth'
import { collection, doc, getDocs, addDoc, updateDoc, deleteDoc, query, onSnapshot, where, setDoc, getDoc } from 'firebase/firestore'

// Import Firebase services from centralized config
import { auth, db, googleProvider } from './services/firebase-config'

// Version 13.0.2 - UI Text Updates and Task Tag Styling
// Complete dream journaling platform with advanced features

// Dream entry interface - core data structure for dream records
interface DreamEntry {
  id: string
  name: string
  timestamp: number
  description?: string
  isFavorite?: boolean
  tags?: string[] // Hierarchical paths like "people/nick", "work/projects/app"
  icon?: string
  displayOrder?: number
  userId?: string
}

// Interface for custom icon configuration
interface CustomIconConfig {
  order: string[]
  names: { [key: string]: string }
}

// Interface for hierarchical tag structure
interface TagNode {
  name: string
  fullPath: string
  children: TagNode[]
  count: number
  level: number
}

// Component prop interfaces
interface ThemeToggleProps {
  theme: string
  onToggle: () => void
}

interface TooltipProps {
  children: React.ReactNode
  content: string
  position?: 'top' | 'bottom' | 'left' | 'right'
}

interface UserAvatarProps {
  user: User
  onSignOut: () => void
  isOnline: boolean
  hasFirebaseError: boolean
}

// Import Dialog Props
interface ImportDialogProps {
  isOpen: boolean
  onClose: () => void
  onImport: (dreams: DreamEntry[]) => void
  onReset: () => void
  hasDreams: boolean
}

// Settings Dialog Props
interface SettingsDialogProps {
  isOpen: boolean
  onClose: () => void
  textContent: string
  onTextChange: (content: string) => void
}

// Three-state sorting type
type SortOrder = 'manual' | 'desc' | 'asc'

// Optimized 6-Color Palette for dream categorization - one row with diverse, theme-compatible colors
const DEFAULT_DREAM_ICONS = {
  neutral: 'bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600',
  azure: 'bg-blue-500 dark:bg-blue-400',
  emerald: 'bg-green-500 dark:bg-green-400',
  crimson: 'bg-red-500 dark:bg-red-400',
  amethyst: 'bg-purple-500 dark:bg-purple-400',
  amber: 'bg-yellow-500 dark:bg-yellow-400'
}

// Default icon names - blank by default but customizable
const DEFAULT_ICON_NAMES: { [key: string]: string } = {
  neutral: '', azure: '', emerald: '', crimson: '', amethyst: '', amber: ''
}

// Default icon order in 1 row of 6
const DEFAULT_ICON_ORDER: string[] = [
  'neutral', 'azure', 'emerald', 'crimson', 'amethyst', 'amber'
]

// Utility functions
const generateId = (): string => `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
const isClientGeneratedId = (id: string): boolean => id.includes('_')
const isCorsError = (error: any): boolean => {
  return error.message?.includes('access control') || 
         error.message?.includes('CORS') ||
         error.code === 'unavailable' ||
         error.message?.includes('Failed to fetch')
}

// Storage utility functions - centralized localStorage management
const saveToLocalStorage = (key: string, data: any): void => {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch (e) {
    // Silent fail on quota exceeded
  }
}

const loadFromLocalStorage = (key: string, defaultValue: any): any => {
  try {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : defaultValue
  } catch (e) {
    return defaultValue
  }
}

// Function to check if a dream was created in the last 24 hours
const isRecentEntry = (dream: DreamEntry): boolean => {
  const now = Date.now()
  const twentyFourHoursAgo = now - (24 * 60 * 60 * 1000)
  return dream.timestamp >= twentyFourHoursAgo
}

// Hierarchical tag utility functions
const parseTagPath = (tagPath: string): string[] => {
  return tagPath.split('/').filter(part => part.trim())
}

const getTagParent = (tagPath: string): string | null => {
  const parts = parseTagPath(tagPath)
  return parts.length > 1 ? parts.slice(0, -1).join('/') : null
}

const getTagName = (tagPath: string): string => {
  const parts = parseTagPath(tagPath)
  return parts[parts.length - 1] || tagPath
}

const buildTagHierarchy = (tags: string[], dreams: DreamEntry[], selectedTagPath: string = ''): TagNode[] => {
  const tagCounts: { [key: string]: number } = {}
  const allPaths = new Set<string>()

  // Count all tag paths and build hierarchy
  dreams.forEach(dream => {
    if (dream.tags) {
      dream.tags.forEach(tag => {
        const parts = parseTagPath(tag)
        // Add all parent paths
        for (let i = 1; i <= parts.length; i++) {
          const path = parts.slice(0, i).join('/')
          allPaths.add(path)
          tagCounts[path] = (tagCounts[path] || 0) + 1
        }
      })
    }
  })

  // Convert to array and sort
  const sortedPaths = Array.from(allPaths).sort()

  // Build tree structure
  const buildTree = (paths: string[], level: number = 0, parentPath: string = ''): TagNode[] => {
    const nodes: TagNode[] = []
    const processed = new Set<string>()

    paths.forEach(path => {
      if (processed.has(path)) return

      const parts = parseTagPath(path)
      if (parts.length !== level + 1) return
      if (parentPath && !path.startsWith(parentPath + '/')) return
      if (parentPath && path === parentPath) return

      processed.add(path)

      const childPaths = paths.filter(p => 
        p.startsWith(path + '/') && parseTagPath(p).length === parts.length + 1
      )

      const node: TagNode = {
        name: getTagName(path),
        fullPath: path,
        children: buildTree(paths, level + 1, path),
        count: tagCounts[path] || 0,
        level
      }

      nodes.push(node)
    })

    return nodes
  }

  return buildTree(sortedPaths)
}

// Function to extract dream date from title
const extractDreamDateFromTitle = (dreamName: string): number => {
  // Try to match different date formats:
  // DD/MM/YYYY, DD/MM/YY, DD/M/YYYY, D/MM/YYYY, D/M/YYYY, etc.
  
  // Pattern 1: Full format with year (DD/MM/YYYY or D/M/YYYY)
  const fullDateMatch = dreamName.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s*-/)
  
  if (fullDateMatch) {
    const day = parseInt(fullDateMatch[1], 10)
    const month = parseInt(fullDateMatch[2], 10) - 1 // JS months are 0-indexed
    let year = parseInt(fullDateMatch[3], 10)
    
    // Handle 2-digit years (assume 1900s for years 50-99, 2000s for years 00-49)
    if (year < 100) {
      year = year >= 50 ? 1900 + year : 2000 + year
    }
    
    // Create date object
    const dreamDate = new Date(year, month, day)
    
    // Validate the date is reasonable
    if (!isNaN(dreamDate.getTime()) && day >= 1 && day <= 31 && month >= 0 && month <= 11) {
      return dreamDate.getTime()
    }
  }
  
  // Pattern 2: Current format without year (DD/MM or D/M) - assume current year
  const dateMatch = dreamName.match(/^(\d{1,2})\/(\d{1,2})\s*-/)
  
  if (dateMatch) {
    const day = parseInt(dateMatch[1], 10)
    const month = parseInt(dateMatch[2], 10) - 1 // JS months are 0-indexed
    const currentYear = new Date().getFullYear()
    
    // Create date object for this year
    const dreamDate = new Date(currentYear, month, day)
    
    // Validate the date is reasonable
    if (!isNaN(dreamDate.getTime()) && day >= 1 && day <= 31 && month >= 0 && month <= 11) {
      return dreamDate.getTime()
    }
  }
  
  // If no valid date found in title, return 0 (will fall back to timestamp)
  return 0
}

// Function to get the effective date for sorting (now uses full timestamp for time precision)
const getEffectiveDateForSorting = (dream: DreamEntry): number => {
  const titleDate = extractDreamDateFromTitle(dream.name)
  
  // If we found a valid date in the title, use it, but preserve the time from timestamp
  if (titleDate > 0) {
    // Extract time from the original timestamp
    const originalDate = new Date(dream.timestamp)
    const titleDateObj = new Date(titleDate)
    
    // Combine title date with original time
    titleDateObj.setHours(originalDate.getHours(), originalDate.getMinutes(), originalDate.getSeconds(), originalDate.getMilliseconds())
    return titleDateObj.getTime()
  }
  
  // Otherwise use the full creation timestamp (includes both date and time)
  return dream.timestamp
}

// Export Functions - sorts by full timestamp in descending order
const exportDreamsToMarkdown = (dreams: DreamEntry[]): string => {
  // Sort by full timestamp in descending order (newest first)
  const sortedDreams = [...dreams].sort((a, b) => b.timestamp - a.timestamp)
  
  // Start with header
  let markdown = '# Dreams Journal Export\n'
  
  sortedDreams.forEach((dream, index) => {
    const dreamDate = new Date(dream.timestamp)
    const fullDate = dreamDate.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).replace(/\//g, '')
    const time = dreamDate.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    })
    
    const tags = dream.tags && dream.tags.length > 0 ? dream.tags.join(', ') : '#default'
    const favorite = dream.isFavorite ? ', ⭐' : ''
    
    // Entry format: Name, Date: DDMMYYYY - HH:MM, Tags: tag1, tag2
    markdown += `${dream.name}, Date: ${fullDate} - ${time}, Tags: ${tags}${favorite}\n`
    markdown += `${dream.description || ''}\n`
    
    // Add separator between dreams (except for last one)
    if (index < sortedDreams.length - 1) {
      markdown += `---\n`
    }
  })
  
  markdown += `\n*Generated by Dream-Notions App - v13.0.2*`
  return markdown
}

const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      textArea.style.top = '-999999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      const copied = document.execCommand('copy')
      document.body.removeChild(textArea)
      return copied
    }
  } catch (error) {
    return false
  }
}

// Import Functions
const parseImportMarkdown = (markdownText: string): DreamEntry[] => {
  const dreams: DreamEntry[] = []
  const lines = markdownText.split('\n')
  
  let currentDream: Partial<DreamEntry> | null = null
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    
    // Skip header, empty lines, separators, and footer
    if (!line || 
        line.startsWith('# Dreams Journal Export') || 
        line === '---' || 
        line.startsWith('*Generated by')) {
      
      // Save current dream when hitting separator or end
      if ((line === '---' || line.startsWith('*Generated by')) && 
          currentDream && currentDream.name && currentDream.description) {
        dreams.push({
          id: generateId(),
          name: currentDream.name,
          timestamp: currentDream.timestamp || Date.now(),
          description: currentDream.description.trim(),
          isFavorite: currentDream.isFavorite || false,
          tags: currentDream.tags || ['#default'],
          icon: 'neutral',
          displayOrder: dreams.length * 1000
        } as DreamEntry)
        currentDream = null
      }
      continue
    }
    
    // Parse dream header format
    if (line.includes(' - Dream-') && line.includes(', Date: ') && line.includes(', Tags: ')) {
      // Save previous dream if exists
      if (currentDream && currentDream.name && currentDream.description) {
        dreams.push({
          id: generateId(),
          name: currentDream.name,
          timestamp: currentDream.timestamp || Date.now(),
          description: currentDream.description.trim(),
          isFavorite: currentDream.isFavorite || false,
          tags: currentDream.tags || ['#default'],
          icon: 'neutral',
          displayOrder: dreams.length * 1000
        } as DreamEntry)
      }
      
      // Parse new dream entry
      const parts = line.split(', ')
      
      if (parts.length >= 3) {
        const dreamName = parts[0]
        const datePart = parts[1] // "Date: DDMMYYYY - HH:MM"
        const tagsPart = parts.slice(2).join(', ') // "Tags: tag1, tag2" (may include ⭐)
        
        // Extract timestamp
        let timestamp = Date.now()
        const dateMatch = datePart.match(/Date: (\d{8}) - (\d{2}):(\d{2})/)
        if (dateMatch) {
          const dateStr = dateMatch[1] // DDMMYYYY
          const hours = parseInt(dateMatch[2])
          const minutes = parseInt(dateMatch[3])
          
          const day = parseInt(dateStr.substring(0, 2))
          const month = parseInt(dateStr.substring(2, 4)) - 1 // JS months are 0-indexed
          const year = parseInt(dateStr.substring(4, 8))
          
          const date = new Date(year, month, day, hours, minutes)
          if (!isNaN(date.getTime())) {
            timestamp = date.getTime()
          }
        }
        
        // Extract tags and favorite status
        let tags = ['#default']
        let isFavorite = false
        
        if (tagsPart.includes('⭐')) {
          isFavorite = true
        }
        
        const tagsMatch = tagsPart.match(/Tags: ([^⭐]+)/)
        if (tagsMatch) {
          const tagString = tagsMatch[1].trim()
          if (tagString) {
            tags = tagString.split(',').map(tag => tag.trim()).filter(tag => tag)
          }
        }
        
        currentDream = {
          name: dreamName,
          timestamp,
          tags,
          isFavorite,
          description: ''
        }
      }
    } else if (currentDream) {
      // Accumulate dream content
      if (currentDream.description) {
        currentDream.description += ' ' + line
      } else {
        currentDream.description = line
      }
    }
  }
  
  // Save final dream
  if (currentDream && currentDream.name && currentDream.description) {
    dreams.push({
      id: generateId(),
      name: currentDream.name,
      timestamp: currentDream.timestamp || Date.now(),
      description: currentDream.description.trim(),
      isFavorite: currentDream.isFavorite || false,
      tags: currentDream.tags || ['#default'],
      icon: 'neutral',
      displayOrder: dreams.length * 1000
    } as DreamEntry)
  }
  
  return dreams
}

// Dream text cleanup function
const cleanupDreamText = (dreamText: string): string => {
  let cleaned = dreamText.trim()
  
  if (!cleaned) return cleaned
  
  // Convert to lowercase for processing, then fix capitalization
  cleaned = cleaned.toLowerCase()
  
  // Basic spell check corrections (common dream-related words)
  const spellCorrections: { [key: string]: string } = {
    'flyin': 'flying', 'flyng': 'flying', 'fying': 'flying',
    'runing': 'running', 'runnning': 'running',
    'fallin': 'falling', 'falling': 'falling',
    'swimmin': 'swimming', 'swiming': 'swimming',
    'walkng': 'walking', 'wakling': 'walking',
    'talkin': 'talking', 'takign': 'talking',
    'house': 'house', 'buiding': 'building', 'bulding': 'building',
    'freind': 'friend', 'frend': 'friend',
    'wierd': 'weird', 'werd': 'weird',
    'scarry': 'scary', 'scray': 'scary',
    'beatiful': 'beautiful', 'beutiful': 'beautiful',
    'familar': 'familiar', 'familer': 'familiar',
    'remeber': 'remember', 'rember': 'remember',
    'diffrent': 'different', 'diferent': 'different',
    'intresting': 'interesting', 'intersting': 'interesting'
  }
  
  // Apply spell corrections
  Object.entries(spellCorrections).forEach(([wrong, correct]) => {
    const regex = new RegExp(`\\b${wrong}\\b`, 'gi')
    cleaned = cleaned.replace(regex, correct)
  })
  
  // Fix common grammar patterns
  cleaned = cleaned.replace(/\bi\b/g, 'I') // Capitalize "I"
  cleaned = cleaned.replace(/\bim\b/g, "I'm") // Fix "im" to "I'm"
  cleaned = cleaned.replace(/\bcant\b/g, "can't") // Fix "cant" to "can't"
  cleaned = cleaned.replace(/\bdont\b/g, "don't") // Fix "dont" to "don't"
  cleaned = cleaned.replace(/\bwont\b/g, "won't") // Fix "wont" to "won't"
  cleaned = cleaned.replace(/\bisnt\b/g, "isn't") // Fix "isnt" to "isn't"
  cleaned = cleaned.replace(/\bwasnt\b/g, "wasn't") // Fix "wasnt" to "wasn't"
  cleaned = cleaned.replace(/\bcouldnt\b/g, "couldn't") // Fix "couldnt" to "couldn't"
  cleaned = cleaned.replace(/\bwouldnt\b/g, "wouldn't") // Fix "wouldnt" to "wouldn't"
  
  // Capitalize first letter of sentence
  cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
  
  // Fix spacing issues
  cleaned = cleaned.replace(/\s+/g, ' ') // Multiple spaces to single
  cleaned = cleaned.replace(/\s+([,.!?])/g, '$1') // Remove spaces before punctuation
  cleaned = cleaned.replace(/([.!?])\s*([a-z])/g, '$1 $2') // Ensure space after sentences
  cleaned = cleaned.replace(/([.!?])\s*I\s/g, '$1 I ') // Capitalize "I" after sentences
  
  // Add period at end if missing
  if (!cleaned.match(/[.!?]$/)) {
    cleaned += '.'
  }
  
  // Convert to narrative style if needed
  const hasFirstPerson = /\b(I|me|my|myself)\b/i.test(cleaned)
  if (!hasFirstPerson && cleaned.length < 100) {
    // Transform fragments into first-person dream narrative
    if (cleaned.match(/^(flying|running|walking|swimming|falling|driving)/i)) {
      cleaned = `I was ${cleaned}`
    } else if (cleaned.match(/^(saw|found|met|heard|felt)/i)) {
      cleaned = `I ${cleaned}`
    } else {
      cleaned = `I dreamed that ${cleaned}`
    }
  }
  
  // Final capitalization pass
  cleaned = cleaned.replace(/([.!?]\s+)([a-z])/g, (match, punctuation, letter) => {
    return punctuation + letter.toUpperCase()
  })
  
  return cleaned
}

// Smart Dream Title Generation - DD/MM format
const generateDreamTitle = (existingDreams: DreamEntry[]): string => {
  const today = new Date()
  const shortDate = today.toLocaleDateString('en-GB', { 
    day: 'numeric',
    month: 'numeric' 
  }) // e.g., "25/12" (DD/MM format)
  
  // Find existing dreams for today
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)
  
  const todaysDreams = existingDreams.filter(dream => {
    const dreamDate = new Date(dream.timestamp)
    return dreamDate >= todayStart && dreamDate < todayEnd
  })
  
  // Find the highest dream number for today
  let maxDreamNumber = 0
  todaysDreams.forEach(dream => {
    const match = dream.name.match(new RegExp(`${shortDate.replace('/', '\\/')} - Dream-(\\d+)`))
    if (match) {
      const dreamNumber = parseInt(match[1], 10)
      if (dreamNumber > maxDreamNumber) {
        maxDreamNumber = dreamNumber
      }
    }
  })
  
  // Return next dream number in DD/MM format
  return `${shortDate} - Dream-${maxDreamNumber + 1}`
}

// Theme Toggle Component
const ThemeToggle: React.FC<ThemeToggleProps> = ({ theme, onToggle }) => {
  return (
    <button 
      onClick={onToggle}
      className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'light' ? (
        // Sun icon for light mode
        <svg className="w-4 h-4 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
        </svg>
      ) : (
        // Moon icon for dark mode
        <svg className="w-4 h-4 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
          <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
        </svg>
      )}
    </button>
  )
}

// Tooltip Component
const Tooltip: React.FC<TooltipProps> = ({ children, content, position = 'top' }) => {
  const [isVisible, setIsVisible] = useState(false)

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        {children}
      </div>
      {isVisible && (
        <div className={`absolute z-50 px-2 py-1 text-xs text-white bg-gray-900 dark:bg-gray-700 rounded shadow-lg whitespace-nowrap ${
          position === 'top' ? '-top-8 left-1/2 transform -translate-x-1/2' :
          position === 'bottom' ? '-bottom-8 left-1/2 transform -translate-x-1/2' :
          position === 'left' ? 'top-1/2 -left-2 transform -translate-y-1/2 -translate-x-full' :
          'top-1/2 -right-2 transform -translate-y-1/2 translate-x-full'
        }`}>
          {content}
          <div className={`absolute w-1 h-1 bg-gray-900 dark:bg-gray-700 transform rotate-45 ${
            position === 'top' ? 'top-full left-1/2 -translate-x-1/2 -translate-y-1/2' :
            position === 'bottom' ? 'bottom-full left-1/2 -translate-x-1/2 translate-y-1/2' :
            position === 'left' ? 'left-full top-1/2 -translate-x-1/2 -translate-y-1/2' :
            'right-full top-1/2 translate-x-1/2 -translate-y-1/2'
          }`} />
        </div>
      )}
    </div>
  )
}

// User Avatar Component
const UserAvatar: React.FC<UserAvatarProps> = ({ user, onSignOut, isOnline, hasFirebaseError }) => {
  const [showDropdown, setShowDropdown] = useState(false)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showDropdown && !(event.target as Element)?.closest('.user-avatar-container')) {
        setShowDropdown(false)
      }
    }
    
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [showDropdown])

  return (
    <div className="relative user-avatar-container">
      <div className="relative">
        <img
          src={user.photoURL || ''}
          alt={user.displayName || 'User'}
          className="w-8 h-8 rounded-full border border-border cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all"
          referrerPolicy="no-referrer"
          onClick={() => setShowDropdown(!showDropdown)}
          title="Tap for account options"
        />
        <div className={`absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card ${
          isOnline && !hasFirebaseError ? 'bg-green-500 animate-pulse' : hasFirebaseError ? 'bg-yellow-500' : 'bg-red-500'
        }`} />
      </div>
      
      {showDropdown && (
        <div className="absolute right-0 top-10 bg-card border border-border rounded-lg shadow-lg py-1 z-50 min-w-[180px]">
          <div className="px-3 py-2 border-b border-border">
            <p className="text-sm font-medium text-foreground truncate">{user.displayName}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
          <button
            onClick={() => {
              onSignOut()
              setShowDropdown(false)
            }}
            className="w-full px-3 py-2 text-sm text-left hover:bg-muted transition-colors flex items-center gap-2"
          >
            <span className="text-xs">🚪</span>
            Sign Out
          </button>
        </div>
      )}
    </div>
  )
}

// Dream Input Helper Component
const DreamInputHelper: React.FC<{ 
  onDreamSet: (dreamText: string) => void
  currentDescription: string 
}> = ({ onDreamSet, currentDescription }) => {
  const [inputText, setInputText] = useState('')
  const [convertStatus, setConvertStatus] = useState<'success' | 'error' | 'processing' | null>(null)

  const handleAppend = async (): Promise<void> => {
    const dreamText = inputText.trim()
    
    if (dreamText) {
      setConvertStatus('processing')
      
      // Simulate brief processing delay
      setTimeout(() => {
        // Append text on a new line
        const newDescription = currentDescription 
          ? `${currentDescription}\n${dreamText}`
          : dreamText
        onDreamSet(newDescription)
        setConvertStatus('success')
        setInputText('')
        setTimeout(() => setConvertStatus(null), 3000)
      }, 500)
    } else {
      setConvertStatus('error')
      setTimeout(() => setConvertStatus(null), 3000)
    }
  }

  const getStatusBorderColor = (): string => {
    if (convertStatus === 'success') return 'border-orange-400 dark:border-purple-400'
    if (convertStatus === 'error') return 'border-red-400'
    if (convertStatus === 'processing') return 'border-blue-400'
    return 'border-border'
  }

  const getStatusMessage = (): string | null => {
    if (convertStatus === 'success') return '✅ Text appended to description!'
    if (convertStatus === 'error') return '❌ Please enter your dream'
    if (convertStatus === 'processing') return '📝 Appending text to description...'
    return null
  }

  return (
    <div className={`bg-muted border-2 ${getStatusBorderColor()} rounded-lg p-3 transition-colors flex-1`}>
      <div className="flex gap-2 mb-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="dream quick input"
          disabled={convertStatus === 'processing'}
          className={`flex-1 px-2 py-1 border rounded text-xs bg-input-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring ${
            convertStatus === 'error' ? 'border-red-500' : 'border-border'
          } ${convertStatus === 'processing' ? 'opacity-50' : ''}`}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && convertStatus !== 'processing') {
              e.preventDefault()
              handleAppend()
            }
          }}
        />
        <button
          type="button"
          onClick={handleAppend}
          disabled={convertStatus === 'processing'}
          className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
            convertStatus === 'success' 
              ? 'bg-orange-600 hover:bg-orange-700 dark:bg-purple-600 dark:hover:bg-purple-700 text-white' 
              : convertStatus === 'processing'
              ? 'bg-blue-600 text-white cursor-not-allowed opacity-75'
              : 'bg-primary hover:bg-primary/90 text-primary-foreground'
          }`}
          title="Append text to description area"
        >
          {convertStatus === 'success' ? '✅' : convertStatus === 'processing' ? '📝' : 'Append'}
        </button>
      </div>

      {getStatusMessage() && (
        <div className={`px-2 py-1 rounded text-xs font-medium mt-1 ${
          convertStatus === 'success' 
            ? 'bg-orange-100 dark:bg-purple-900 text-orange-800 dark:text-purple-100' 
            : convertStatus === 'error'
            ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100'
            : convertStatus === 'processing'
            ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100'
            : 'bg-primary/10 text-primary'
        }`}>
          {getStatusMessage()}
        </div>
      )}
    </div>
  )
}

// Import Dialog Component
const ImportDialog: React.FC<ImportDialogProps> = ({ isOpen, onClose, onImport, onReset, hasDreams }) => {
  const [importText, setImportText] = useState('')
  const [parseStatus, setParseStatus] = useState<'idle' | 'parsing' | 'success' | 'error'>('idle')
  const [parsedCount, setParsedCount] = useState(0)

  const handleImport = (): void => {
    if (!importText.trim()) {
      alert('Please paste your dream journal content')
      return
    }

    setParseStatus('parsing')

    try {
      const dreams = parseImportMarkdown(importText.trim())
      
      if (dreams.length === 0) {
        setParseStatus('error')
        alert('No valid dreams found in the text. Please check the format.')
        return
      }

      setParsedCount(dreams.length)
      setParseStatus('success')
      
      setTimeout(() => {
        onImport(dreams)
        setImportText('')
        setParseStatus('idle')
        setParsedCount(0)
        onClose()
      }, 1500)
      
    } catch (error) {
      setParseStatus('error')
      alert('Error parsing dreams. Please check the format and try again.')
    }
  }

  const handleClose = (): void => {
    setImportText('')
    setParseStatus('idle')
    setParsedCount(0)
    onClose()
  }

  const handleReset = (): void => {
    if (confirm('This will permanently delete all your dream records. This action cannot be undone. Are you sure?')) {
      onReset()
      handleClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-card border-2 border-orange-200 dark:border-purple-500 rounded-lg p-5 max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-primary">
            Dream Import Panel
          </h2>
          
          {/* Reset button in upper right */}
          <Tooltip content="Reset all dreams (dangerous!)">
            <button
              onClick={handleReset}
              disabled={!hasDreams}
              className={`px-3 py-2 rounded-lg text-xs transition-colors font-medium flex items-center gap-1.5 border ${
                !hasDreams
                  ? 'bg-gray-50 dark:bg-gray-900/20 text-gray-500 dark:text-gray-500 border-gray-300 dark:border-gray-700 cursor-not-allowed'
                  : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-600 hover:bg-red-100 dark:hover:bg-red-900/30'
              }`}
            >
              🗑️
              <span className="hidden sm:inline">Reset</span>
            </button>
          </Tooltip>
        </div>

        <div className="space-y-4">
          <div>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="Please paste in your dream journal content here"
              className="w-full h-64 px-3 py-2 border border-border rounded bg-input-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring font-mono text-xs resize-none"
              disabled={parseStatus === 'parsing'}
            />
          </div>

          {parseStatus === 'success' && (
            <div className="px-3 py-2 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 rounded text-sm">
              ✅ Found {parsedCount} dreams! Importing now...
            </div>
          )}

          {parseStatus === 'parsing' && (
            <div className="px-3 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 rounded text-sm">
              🔄 Parsing dreams...
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={parseStatus === 'parsing'}
              className="flex-1 px-4 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={parseStatus === 'parsing' || !importText.trim()}
              className={`flex-1 px-4 py-2 rounded transition-colors font-medium ${
                parseStatus === 'success'
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : parseStatus === 'parsing'
                  ? 'bg-blue-600 text-white cursor-not-allowed'
                  : 'bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
            >
              {parseStatus === 'success' ? '✅ Importing...' : parseStatus === 'parsing' ? '🔄 Parsing...' : 'Import Dreams'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Enhanced Notes Editor Component with Todo Management
const EnhancedNotesEditor: React.FC<{
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}> = ({ value, onChange, placeholder, className }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [selectionStart, setSelectionStart] = useState(0)
  const [selectionEnd, setSelectionEnd] = useState(0)

  // Parse sections in the text
  const parseStructure = (text: string) => {
    try {
      const lines = text.split('\n')
      const structure = {
        todoSectionStart: -1,
        todoSectionEnd: -1,
        doneSectionStart: -1,
        doneSectionEnd: -1,
        otherSections: [] as Array<{start: number, end: number, title: string}>
      }

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]?.trim() || ''
        if (line.match(/^#+\s*todo$/i)) {
          structure.todoSectionStart = i
          // Find the end of todo section
          for (let j = i + 1; j < lines.length; j++) {
            if (lines[j]?.match(/^#+\s/)) {
              structure.todoSectionEnd = j - 1
              break
            }
            if (j === lines.length - 1) {
              structure.todoSectionEnd = j
            }
          }
        } else if (line.match(/^#+\s*done$/i)) {
          structure.doneSectionStart = i
          // Find the end of done section
          for (let j = i + 1; j < lines.length; j++) {
            if (lines[j]?.match(/^#+\s/)) {
              structure.doneSectionEnd = j - 1
              break
            }
            if (j === lines.length - 1) {
              structure.doneSectionEnd = j
            }
          }
        }
      }

      return structure
    } catch (error) {
      // Return safe defaults if parsing fails
      return {
        todoSectionStart: -1,
        todoSectionEnd: -1,
        doneSectionStart: -1,
        doneSectionEnd: -1,
        otherSections: []
      }
    }
  }

  // Handle key press for auto-list continuation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter') {
      const textarea = e.currentTarget
      const cursorPosition = textarea.selectionStart
      const textBeforeCursor = value.substring(0, cursorPosition)
      const textAfterCursor = value.substring(cursorPosition)
      
      // Find the current line
      const lines = textBeforeCursor.split('\n')
      const currentLine = lines[lines.length - 1]
      
      // Check if current line starts with a dash (list item)
      const listMatch = currentLine.match(/^(\s*)-\s*(.*)$/)
      
      if (listMatch) {
        e.preventDefault()
        const indent = listMatch[1] // Preserve indentation
        const content = listMatch[2].trim()
        