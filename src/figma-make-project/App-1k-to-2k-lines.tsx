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
