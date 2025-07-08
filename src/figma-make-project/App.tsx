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
        
        if (content === '') {
          // If the list item is empty, remove the dash and outdent
          const newText = textBeforeCursor.replace(/(\s*)-\s*$/, '') + '\n' + textAfterCursor
          onChange(newText)
          setTimeout(() => {
            if (textareaRef.current) {
              const newPosition = cursorPosition - listMatch[0].length + 1
              textareaRef.current.setSelectionRange(newPosition, newPosition)
            }
          }, 0)
        } else {
          // Add new list item with same indentation
          const newText = textBeforeCursor + '\n' + indent + '- ' + textAfterCursor
          onChange(newText)
          setTimeout(() => {
            if (textareaRef.current) {
              const newPosition = cursorPosition + indent.length + 3
              textareaRef.current.setSelectionRange(newPosition, newPosition)
            }
          }, 0)
        }
      }
    }
  }

  // Track selection for list item operations
  const handleSelectionChange = (): void => {
    if (textareaRef.current) {
      setSelectionStart(textareaRef.current.selectionStart)
      setSelectionEnd(textareaRef.current.selectionEnd)
    }
  }

  // Get current line info
  const getCurrentLineInfo = () => {
    try {
      const lines = value.split('\n')
      const textBeforeCursor = value.substring(0, selectionStart)
      const linesBefore = textBeforeCursor.split('\n')
      const currentLineIndex = Math.max(0, linesBefore.length - 1)
      const currentLine = lines[currentLineIndex] || ''
      
      return {
        lineIndex: currentLineIndex,
        line: currentLine,
        isListItem: /^\s*-\s/.test(currentLine),
        totalLines: lines.length
      }
    } catch (error) {
      return {
        lineIndex: 0,
        line: '',
        isListItem: false,
        totalLines: 0
      }
    }
  }

  // Determine which section a line is in
  const getLineSection = (lineIndex: number) => {
    try {
      const structure = parseStructure(value)
      
      if (structure.todoSectionStart !== -1 && 
          lineIndex >= structure.todoSectionStart && 
          lineIndex <= structure.todoSectionEnd) {
        return 'todo'
      } else if (structure.doneSectionStart !== -1 && 
                 lineIndex >= structure.doneSectionStart && 
                 lineIndex <= structure.doneSectionEnd) {
        return 'done'
      }
      return 'other'
    } catch (error) {
      return 'other'
    }
  }

  // Move item to Todo section
  const moveToTodo = (): void => {
    const lines = value.split('\n')
    const { lineIndex, isListItem, line } = getCurrentLineInfo()
    
    if (!isListItem) return
    
    const structure = parseStructure(value)
    const newLines = [...lines]
    
    // Remove the item from current location
    newLines.splice(lineIndex, 1)
    
    // Ensure Todo section exists
    let todoInsertIndex: number
    if (structure.todoSectionStart === -1) {
      // Create Todo section at the top
      newLines.unshift('# Todo', '')
      todoInsertIndex = 1
    } else {
      // Insert at the top of existing Todo section
      todoInsertIndex = structure.todoSectionStart + 1
      // Skip any empty lines right after the header
      while (todoInsertIndex < newLines.length && newLines[todoInsertIndex].trim() === '') {
        todoInsertIndex++
      }
    }
    
    // Insert the item at the top of Todo section
    newLines.splice(todoInsertIndex, 0, line)
    
    const newValue = newLines.join('\n')
    onChange(newValue)
    
    // Position cursor on the moved item
    setTimeout(() => {
      if (textareaRef.current) {
        const newLineStart = newLines.slice(0, todoInsertIndex).join('\n').length + (todoInsertIndex > 0 ? 1 : 0)
        const newLineEnd = newLineStart + line.length
        textareaRef.current.setSelectionRange(newLineStart, newLineEnd)
        textareaRef.current.focus()
      }
    }, 0)
  }

  // Move item to Done section
  const moveToDone = (): void => {
    const lines = value.split('\n')
    const { lineIndex, isListItem, line } = getCurrentLineInfo()
    
    if (!isListItem) return
    
    const structure = parseStructure(value)
    const newLines = [...lines]
    
    // Remove the item from current location
    newLines.splice(lineIndex, 1)
    
    // Ensure Done section exists
    let doneInsertIndex: number
    if (structure.doneSectionStart === -1) {
      // Create Done section - place after Todo section if it exists, otherwise at end
      if (structure.todoSectionStart !== -1) {
        const insertPoint = structure.todoSectionEnd + 1
        newLines.splice(insertPoint, 0, '', '# Done', '')
        doneInsertIndex = insertPoint + 2
      } else {
        newLines.push('', '# Done', '')
        doneInsertIndex = newLines.length - 1
      }
    } else {
      // Insert at the top of existing Done section
      doneInsertIndex = structure.doneSectionStart + 1
      // Skip any empty lines right after the header
      while (doneInsertIndex < newLines.length && newLines[doneInsertIndex].trim() === '') {
        doneInsertIndex++
      }
    }
    
    // Insert the item at the top of Done section
    newLines.splice(doneInsertIndex, 0, line)
    
    const newValue = newLines.join('\n')
    onChange(newValue)
    
    // Position cursor on the moved item
    setTimeout(() => {
      if (textareaRef.current) {
        const newLineStart = newLines.slice(0, doneInsertIndex).join('\n').length + (doneInsertIndex > 0 ? 1 : 0)
        const newLineEnd = newLineStart + line.length
        textareaRef.current.setSelectionRange(newLineStart, newLineEnd)
        textareaRef.current.focus()
      }
    }, 0)
  }

  // Move list item up
  const moveListItemUp = (): void => {
    const lines = value.split('\n')
    const { lineIndex, isListItem } = getCurrentLineInfo()
    
    if (!isListItem || lineIndex === 0) return
    
    // Swap with previous line
    const newLines = [...lines]
    ;[newLines[lineIndex - 1], newLines[lineIndex]] = [newLines[lineIndex], newLines[lineIndex - 1]]
    
    const newValue = newLines.join('\n')
    onChange(newValue)
    
    // Maintain cursor position on the moved line
    setTimeout(() => {
      if (textareaRef.current) {
        const newLineStart = newLines.slice(0, lineIndex - 1).join('\n').length + (lineIndex > 1 ? 1 : 0)
        const newLineEnd = newLineStart + newLines[lineIndex - 1].length
        textareaRef.current.setSelectionRange(newLineStart, newLineEnd)
        textareaRef.current.focus()
      }
    }, 0)
  }

  // Move list item down
  const moveListItemDown = (): void => {
    const lines = value.split('\n')
    const { lineIndex, isListItem, totalLines } = getCurrentLineInfo()
    
    if (!isListItem || lineIndex === totalLines - 1) return
    
    // Swap with next line
    const newLines = [...lines]
    ;[newLines[lineIndex], newLines[lineIndex + 1]] = [newLines[lineIndex + 1], newLines[lineIndex]]
    
    const newValue = newLines.join('\n')
    onChange(newValue)
    
    // Maintain cursor position on the moved line
    setTimeout(() => {
      if (textareaRef.current) {
        const newLineStart = newLines.slice(0, lineIndex + 1).join('\n').length + 1
        const newLineEnd = newLineStart + newLines[lineIndex + 1].length
        textareaRef.current.setSelectionRange(newLineStart, newLineEnd)
        textareaRef.current.focus()
      }
    }, 0)
  }

  const { isListItem, lineIndex, totalLines } = getCurrentLineInfo()
  const currentSection = getLineSection(lineIndex)
  const canMoveUp = isListItem && lineIndex > 0
  const canMoveDown = isListItem && lineIndex < totalLines - 1

  return (
    <div className="relative flex-1 flex flex-col min-h-0">
      {/* Todo Management Controls - Centered */}
      {isListItem && (
        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 flex gap-1 z-10">
          {/* Todo/Done Action Buttons */}
          {currentSection !== 'todo' && (
            <button
              type="button"
              onClick={moveToTodo}
              title="Move to Todo"
              className="p-1 rounded transition-colors bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </button>
          )}
          
          {currentSection !== 'done' && (
            <button
              type="button"
              onClick={moveToDone}
              title="Mark as Done"
              className="p-1 rounded transition-colors bg-green-500/10 hover:bg-green-500/20 text-green-600 dark:text-green-400"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </button>
          )}
          
          {/* Divider */}
          <div className="w-px h-6 bg-border mx-1"></div>
          
          {/* Position Controls */}
          <button
            type="button"
            onClick={moveListItemUp}
            disabled={!canMoveUp}
            title="Move list item up"
            className={`p-1 rounded transition-colors ${
              canMoveUp 
                ? 'bg-primary/10 hover:bg-primary/20 text-primary' 
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
          
          <button
            type="button"
            onClick={moveListItemDown}
            disabled={!canMoveDown}
            title="Move list item down"
            className={`p-1 rounded transition-colors ${
              canMoveDown 
                ? 'bg-primary/10 hover:bg-primary/20 text-primary' 
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      )}
      
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onSelect={handleSelectionChange}
        onClick={handleSelectionChange}
        onKeyUp={handleSelectionChange}
        placeholder={placeholder}
        className={className}
      />
    </div>
  )
}

// Settings Dialog Component with enhanced notes editor
const SettingsDialog: React.FC<SettingsDialogProps> = ({ isOpen, onClose, textContent, onTextChange }) => {
  const [tempContent, setTempContent] = useState(textContent)

  // Update temp content when dialog opens
  useEffect(() => {
    if (isOpen) {
      setTempContent(textContent)
    }
  }, [isOpen, textContent])

  const handleSave = (): void => {
    onTextChange(tempContent)
    onClose()
  }

  const handleCancel = (): void => {
    setTempContent(textContent) // Reset to original content
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-card border-2 border-orange-200 dark:border-purple-500 rounded-lg p-5 max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-lg flex flex-col">
        {/* List Planner header */}
        <div className="mb-4 flex-shrink-0">
          <h2 className="text-lg font-semibold text-primary text-center">
            List Planner
          </h2>
        </div>

        <div className="flex-1 flex flex-col min-h-0">
          <div className="mb-3">
            <label className="block text-sm font-medium text-foreground mb-2">
              Notes
            </label>
            <p className="text-xs text-muted-foreground mb-3">
              Use this space for any notes, configurations, or text content. Start lines with <code>-</code> for auto-continuing lists. Use <code># Todo</code> and <code># Done</code> sections for task management.
            </p>
          </div>
          
          {/* Enhanced notes editor */}
          <EnhancedNotesEditor
            value={tempContent}
            onChange={setTempContent}
            placeholder="Add your notes here...

# Todo
- Your todo items here

# Done  
- Completed items here

Start lines with - for list items
Use action buttons to move items between sections"
            className="w-full px-3 py-3 border border-border rounded bg-input-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm resize-none min-h-[400px]"
          />
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 pt-4 flex-shrink-0">
          <button
            onClick={handleCancel}
            className="flex-1 px-4 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded transition-colors"
          >
            Cancel
          </button>
          
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}

// Icon Selector Component
const IconSelector: React.FC<{
  selectedIcon: string
  onIconSelect: (icon: string) => void
  customIconConfig: CustomIconConfig
  onUpdateIconConfig: (config: CustomIconConfig) => void
}> = ({ selectedIcon, onIconSelect, customIconConfig, onUpdateIconConfig }) => {
  const [draggedIconIndex, setDraggedIconIndex] = useState<number | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; iconKey: string } | null>(null)
  const [editingIcon, setEditingIcon] = useState<string | null>(null)
  const [newIconName, setNewIconName] = useState('')

  // Get current icon order (custom or default) - supports 6 icons
  const currentOrder = (customIconConfig?.order || DEFAULT_ICON_ORDER).slice(0, 6)

  // Get current icon names (custom or default)
  const getIconName = (iconKey: string): string => {
    const customName = customIconConfig?.names?.[iconKey]
    if (customName !== undefined) {
      return customName // Return custom name (even if empty)
    }
    return DEFAULT_ICON_NAMES[iconKey] || '' // Return default (which is blank) or empty
  }

  const handleDragStart = (e: React.DragEvent, index: number): void => {
    setDraggedIconIndex(index)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent): void => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number): void => {
    e.preventDefault()
    
    if (draggedIconIndex === null || draggedIconIndex === dropIndex) {
      setDraggedIconIndex(null)
      return
    }

    const newOrder = [...currentOrder]
    const draggedItem = newOrder[draggedIconIndex]
    
    newOrder.splice(draggedIconIndex, 1)
    const adjustedDropIndex = draggedIconIndex < dropIndex ? dropIndex - 1 : dropIndex
    newOrder.splice(adjustedDropIndex, 0, draggedItem)
    
    // Update the custom icon configuration
    const updatedConfig = {
      ...customIconConfig,
      order: newOrder
    }
    
    onUpdateIconConfig(updatedConfig)
    setDraggedIconIndex(null)
  }

  const handleRightClick = (e: React.MouseEvent, iconKey: string): void => {
    e.preventDefault()
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      iconKey
    })
  }

  const handleRename = (iconKey: string): void => {
    setEditingIcon(iconKey)
    setNewIconName(getIconName(iconKey))
    setContextMenu(null)
  }

  const handleSaveRename = (): void => {
    if (editingIcon) {
      const updatedConfig = {
        ...customIconConfig,
        names: {
          ...customIconConfig?.names,
          [editingIcon]: newIconName.trim() // Allow empty strings
        }
      }
      onUpdateIconConfig(updatedConfig)
    }
    setEditingIcon(null)
    setNewIconName('')
  }

  const handleResetToDefault = (iconKey: string): void => {
    const updatedNames = { ...customIconConfig?.names }
    delete updatedNames[iconKey]
    
    const updatedConfig = {
      ...customIconConfig,
      names: updatedNames
    }
    onUpdateIconConfig(updatedConfig)
    setContextMenu(null)
  }

  // Close context menu when clicking elsewhere
  useEffect(() => {
    const handleClickOutside = (): void => {
      setContextMenu(null)
    }
    
    if (contextMenu) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [contextMenu])

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">Choose Color</span>
        <span className="text-xs text-muted-foreground">Right-click to label</span>
      </div>
      
      {/* 1 row of 6 icons */}
      <div className="grid grid-cols-6 gap-2">
        {currentOrder.map((iconKey, index) => (
          <button
            key={iconKey}
            type="button"
            draggable
            onClick={() => onIconSelect(iconKey)}
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, index)}
            onContextMenu={(e) => handleRightClick(e, iconKey)}
            className={`p-3 rounded-lg border transition-all hover:scale-105 flex flex-col items-center gap-2 cursor-move ${
              selectedIcon === iconKey 
                ? 'bg-primary/10 border-primary ring-2 ring-primary/20' 
                : 'bg-card border-border hover:bg-muted'
            } ${draggedIconIndex === index ? 'opacity-50' : ''}`}
          >
            {/* Colored Circle */}
            <div className={`w-6 h-6 rounded-full ${DEFAULT_DREAM_ICONS[iconKey]} shadow-sm`} />
            {/* Show custom name or blank */}
            <span className="text-xs text-muted-foreground leading-none text-center truncate w-full min-h-[1em]">
              {getIconName(iconKey)}
            </span>
          </button>
        ))}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div 
          className="fixed bg-card border border-border rounded-lg shadow-lg py-1 z-[60]"
          style={{ 
            left: `${Math.min(contextMenu.x, window.innerWidth - 180)}px`, 
            top: `${Math.min(contextMenu.y, window.innerHeight - 100)}px` 
          }}
        >
          <button
            onClick={() => handleRename(contextMenu.iconKey)}
            className="w-full px-3 py-2 text-sm text-left hover:bg-muted transition-colors"
          >
            ✏️ Add Label
          </button>
          <button
            onClick={() => handleResetToDefault(contextMenu.iconKey)}
            className="w-full px-3 py-2 text-sm text-left hover:bg-muted transition-colors"
          >
            🔄 Remove Label
          </button>
        </div>
      )}

      {/* Rename Dialog */}
      {editingIcon && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[70]">
          <div className="bg-card rounded-lg p-4 max-w-sm w-full">
            <h3 className="text-sm font-semibold mb-3 text-foreground">
              Add Label for Color
            </h3>
            <input
              type="text"
              value={newIconName}
              onChange={(e) => setNewIconName(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded bg-input-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
              maxLength={15}
              placeholder="Enter custom label (optional)"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveRename()
                if (e.key === 'Escape') {
                  setEditingIcon(null)
                  setNewIconName('')
                }
              }}
            />
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => {
                  setEditingIcon(null)
                  setNewIconName('')
                }}
                className="flex-1 px-3 py-1.5 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRename}
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

// Tag Selector Component with autocomplete
const TagSelector: React.FC<{
  selectedTags: string[]
  availableTags: string[]
  onTagsChange: (tags: string[]) => void
  dreams: DreamEntry[] // Add dreams prop to calculate popularity
}> = ({ selectedTags, availableTags, onTagsChange, dreams }) => {
  const [newTag, setNewTag] = useState('')
  const [isAddingTag, setIsAddingTag] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1)

  // Function to abbreviate long tag names - increased character limit
  const abbreviateTag = (tag: string, maxLength: number = 40): string => {
    if (tag.length <= maxLength) return tag
    
    // For hierarchical tags, try to keep the end part
    if (tag.includes('/')) {
      const parts = tag.split('/')
      const lastPart = parts[parts.length - 1]
      
      // If last part is short enough, show ".../{lastPart}"
      if (lastPart.length <= maxLength - 4) {
        return `.../${lastPart}`
      }
      
      // If last part is too long, truncate it
      return `.../${lastPart.substring(0, maxLength - 7)}...`
    }
    
    // For non-hierarchical tags, simple truncation
    return tag.substring(0, maxLength - 3) + '...'
  }

  // Function to calculate tag popularity and sort
  const getSortedAvailableTags = (): string[] => {
    // Calculate tag usage count
    const tagCounts: { [key: string]: number } = {}
    
    dreams.forEach(dream => {
      if (dream.tags) {
        dream.tags.forEach(tag => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1
        })
      }
    })
    
    // Sort available tags by popularity (count), then alphabetically
    return availableTags
      .filter(tag => !selectedTags.includes(tag))
      .sort((a, b) => {
        const countA = tagCounts[a] || 0
        const countB = tagCounts[b] || 0
        
        // Sort by count descending, then alphabetically
        if (countA !== countB) {
          return countB - countA
        }
        return a.localeCompare(b)
      })
  }

  // Generate tag suggestions based on input
  const generateSuggestions = (input: string): string[] => {
    if (!input.trim()) return []
    
    const inputLower = input.toLowerCase()
    const uniqueSuggestions = new Set<string>()
    
    // Direct matches first
    availableTags.forEach(tag => {
      if (tag.toLowerCase().includes(inputLower)) {
        uniqueSuggestions.add(tag)
      }
    })
    
    // Parent path suggestions for hierarchical tags
    availableTags.forEach(tag => {
      const parts = tag.split('/')
      for (let i = 1; i <= parts.length; i++) {
        const parentPath = parts.slice(0, i).join('/')
        if (parentPath.toLowerCase().includes(inputLower)) {
          uniqueSuggestions.add(parentPath)
        }
      }
    })
    
    return Array.from(uniqueSuggestions)
      .filter(tag => !selectedTags.includes(tag))
      .slice(0, 5) // Limit to 5 suggestions
  }

  const handleTagInputChange = (value: string): void => {
    setNewTag(value)
    const newSuggestions = generateSuggestions(value)
    setSuggestions(newSuggestions)
    setShowSuggestions(newSuggestions.length > 0)
    setSelectedSuggestionIndex(-1)
  }

  const handleTagToggle = (tag: string): void => {
    if (selectedTags.includes(tag)) {
      onTagsChange(selectedTags.filter(t => t !== tag))
    } else {
      onTagsChange([...selectedTags, tag])
    }
  }

  const handleSelectSuggestion = (suggestion: string): void => {
    // Fill the input with the suggestion for further editing
    setNewTag(suggestion)
    setShowSuggestions(false)
    setSuggestions([])
    setSelectedSuggestionIndex(-1)
    
    // Show child tags if this could be a parent (after a brief delay)
    setTimeout(() => {
      const childSuggestions = availableTags.filter(tag => 
        tag.startsWith(suggestion + '/') && !selectedTags.includes(tag)
      ).slice(0, 5)
      
      if (childSuggestions.length > 0) {
        setSuggestions(childSuggestions)
        setShowSuggestions(true)
      }
    }, 100)
  }

  const handleAddNewTag = (tagToAdd?: string): void => {
    const trimmedTag = (tagToAdd || newTag).trim()
    if (trimmedTag && !selectedTags.includes(trimmedTag)) {
      onTagsChange([...selectedTags, trimmedTag])
      setNewTag('')
      setIsAddingTag(false)
      setShowSuggestions(false)
      setSuggestions([])
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (selectedSuggestionIndex >= 0 && suggestions[selectedSuggestionIndex]) {
        handleSelectSuggestion(suggestions[selectedSuggestionIndex])
      } else {
        handleAddNewTag()
      }
    } else if (e.key === 'Escape') {
      setNewTag('')
      setIsAddingTag(false)
      setShowSuggestions(false)
      setSuggestions([])
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedSuggestionIndex(prev => 
        prev < suggestions.length - 1 ? prev + 1 : prev
      )
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : -1)
    } else if (e.key === 'Tab' && selectedSuggestionIndex >= 0 && suggestions[selectedSuggestionIndex]) {
      e.preventDefault()
      handleSelectSuggestion(suggestions[selectedSuggestionIndex])
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">Tags</span>
        <button
          type="button"
          onClick={() => setIsAddingTag(true)}
          className="text-xs text-primary hover:text-primary/80 transition-colors"
        >
          + Add Tag
        </button>
      </div>

      {/* Add New Tag Input with Autocomplete - positioned ABOVE existing tags */}
      {isAddingTag && (
        <div className="relative">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={newTag}
                onChange={(e) => handleTagInputChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={(e) => {
                  // Delay hiding suggestions to allow clicking on them
                  setTimeout(() => {
                    if (!newTag.trim()) {
                      setIsAddingTag(false)
                    }
                    setShowSuggestions(false)
                  }, 200)
                }}
                onFocus={() => {
                  if (suggestions.length > 0) {
                    setShowSuggestions(true)
                  }
                }}
                className="w-full px-2 py-1 border border-border rounded bg-input-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-xs"
                placeholder="Type to search or create tags (e.g., 'People/Joe')"
                autoFocus
              />
              
              {/* Autocomplete Suggestions */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-card border border-border rounded-md shadow-lg z-50 max-h-32 overflow-y-auto">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => handleSelectSuggestion(suggestion)}
                      className={`w-full px-2 py-1 text-left text-xs hover:bg-muted transition-colors ${
                        index === selectedSuggestionIndex ? 'bg-muted' : ''
                      }`}
                      title={suggestion} // Show full tag on hover
                    >
                      <span className="text-primary">{abbreviateTag(suggestion)}</span>
                      <span className="text-muted-foreground ml-1 text-xs">← select to edit</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => handleAddNewTag()}
              className="px-2 py-1 bg-primary hover:bg-primary/90 text-primary-foreground rounded text-xs"
            >
              Add
            </button>
          </div>
        </div>
      )}

      {/* Selected Tags with Flex Wrap */}
      {selectedTags.length > 0 && (
        <div className="max-h-20 overflow-y-auto tag-scroll-area">
          <div className="flex gap-1 flex-wrap">
            {selectedTags.map((tag) => {
              // Special styling for tasks tags - purple color
              const isTasksTag = tag.toLowerCase() === 'tasks' || tag.toLowerCase().startsWith('tasks/')
              
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleTagToggle(tag)}
                  className={`px-2 py-1 text-xs rounded-full font-medium transition-colors flex items-center gap-1 whitespace-nowrap ${
                    isTasksTag
                      ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-600 hover:bg-purple-200 dark:hover:bg-purple-900/50'
                      : 'bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20'
                  }`}
                  title={tag} // Show full tag on hover
                >
                  {abbreviateTag(tag)}
                  <span className="text-xs">×</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Available Tags - Sorted by Popularity with Vertical Scroll */}
      {availableTags.length > 0 && (
        <div className="space-y-2">
          <span className="text-xs text-muted-foreground">Available Tags (most popular first):</span>
          <div className="max-h-32 overflow-y-auto border border-border rounded-md p-2 tag-scroll-area">
            <div className="flex gap-1 flex-wrap">
              {getSortedAvailableTags().map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleTagToggle(tag)}
                  className="px-2 py-1 bg-muted text-muted-foreground border border-border text-xs rounded-full hover:bg-muted/80 transition-colors whitespace-nowrap"
                  title={tag} // Show full tag on hover
                >
                  {abbreviateTag(tag)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Dream Form Component - now accepts selectedTag prop for pre-selection
const DreamForm: React.FC<{
  isOpen: boolean
  onClose: () => void
  onSave: (dream: DreamEntry) => void
  editingDream: DreamEntry | null
  availableTags: string[]
  customIconConfig: CustomIconConfig
  onUpdateIconConfig: (config: CustomIconConfig) => void
  existingDreams: DreamEntry[]
  selectedTag?: string // Optional selected tag to pre-select
}> = ({ isOpen, onClose, onSave, editingDream, availableTags, customIconConfig, onUpdateIconConfig, existingDreams, selectedTag }) => {
  const [dreamTitle, setDreamTitle] = useState('')
  const [description, setDescription] = useState('')
  const [selectedTags, setSelectedTags] = useState(['#default'])
  const [icon, setIcon] = useState('neutral')

  useEffect(() => {
    if (isOpen) {
      if (editingDream) {
        setDreamTitle(editingDream.name || '')
        setDescription(editingDream.description || '')
        setSelectedTags(editingDream.tags || ['#default'])
        setIcon(editingDream.icon || 'neutral')
      } else {
        // Generate smart title for new dreams
        const smartTitle = generateDreamTitle(existingDreams)
        setDreamTitle(smartTitle)
        setDescription('')
        
        // Pre-select tags including selected tag if available
        const initialTags = ['#default']
        if (selectedTag && selectedTag !== '' && !initialTags.includes(selectedTag)) {
          initialTags.push(selectedTag)
        }
        setSelectedTags(initialTags)
        
        setIcon('neutral')
      }
    }
  }, [editingDream, isOpen, existingDreams, selectedTag])

  const handleDreamSet = (dreamText: string): void => {
    setDescription(dreamText) // This now receives the appended text
  }

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    
    if (!dreamTitle.trim()) {
      alert('Please enter a dream title')
      return
    }
    
    if (!description.trim()) {
      alert('Please enter your dream description')
      return
    }

    const dreamId = editingDream?.id || generateId()

    const dream: DreamEntry = {
      id: dreamId,
      name: dreamTitle.trim(),
      timestamp: editingDream?.timestamp || Date.now(),
      tags: selectedTags.length > 0 ? selectedTags : ['#default'],
      icon: icon || 'neutral',
      isFavorite: editingDream?.isFavorite || false,
      displayOrder: editingDream?.displayOrder,
      description: description.trim()
    }

    onSave(dream)
    onClose()
  }

  if (!isOpen) return null

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