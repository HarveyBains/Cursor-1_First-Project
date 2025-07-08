# LocationForm Component - Product Requirements Document

## Component Overview

### Purpose
A comprehensive modal form component for creating and editing location entries with GPS integration, coordinate parsing, dynamic categorization, and icon selection. This form serves as the primary data entry interface for location management applications.

### Key Features
- **Modal Overlay Design**: Full-screen overlay with centered form
- **GPS Integration**: One-click current location capture with reverse geocoding
- **Coordinate Parsing**: Intelligent parsing of various coordinate formats
- **Dynamic Categories**: Existing category dropdown + new category creation
- **Icon Selection**: Visual grid-based icon picker (3 rows × 6 columns)
- **Smart Validation**: Real-time validation with user-friendly error messages
- **Auto-Population**: Intelligent field population from GPS and coordinate data
- **Responsive Design**: Mobile and desktop optimized with proper touch targets

## Visual Design Specifications

### Modal Container
```css
/* Overlay */
position: fixed
inset: 0
background: rgba(0, 0, 0, 0.5)  /* bg-black/50 */
display: flex
align-items: center
justify-content: center
padding: 1rem                    /* p-4 */
z-index: 50                      /* z-50 */

/* Form Container */
background: var(--color-card)    /* bg-card */
border-radius: 0.5rem            /* rounded-lg */
padding: 1.25rem                 /* p-5 */
max-width: 28rem                 /* max-w-md */
width: 100%                      /* w-full */
max-height: 85vh                 /* max-h-[85vh] */
overflow-y: auto                 /* overflow-y-auto */
```

### Form Layout Structure
```
┌─────────────────────────────────────────┐
│ [Add New Location / Edit Location]      │  ← Header (18px, semibold)
├─────────────────────────────────────────┤
│ [📍 Use My Current Location] (full-width)│  ← GPS Button (new only)
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │ 📍 Quick Coordinate Entry           │ │  ← Coordinate Helper (new only)
│ │ Copy coordinates from Google Maps   │ │
│ │ [input field] [Parse]               │ │
│ └─────────────────────────────────────┘ │
├─────────────────────────────────────────┤
│ Name * [input field - full width]       │  ← Name Field
├─────────────────────────────────────────┤
│ Category      │ New Category            │  ← Category Row (grid 2 cols)
│ [dropdown]    │ [text input]            │
├─────────────────────────────────────────┤
│ Description                             │  ← Description Field
│ [textarea - multi-line]                 │
├─────────────────────────────────────────┤
│ Location Icon *                         │  ← Icon Selector
│ [🏠] [🏢] [🛍️] [☕] [🍽️] [💪]         │  (3 rows × 6 cols)
│ [🏥] [🅿️] [🌳] [🏫] [🏦] [⛽]         │
│ [🏨] [🏖️] [✈️] [🚂] [🍻] [📍]         │
├─────────────────────────────────────────┤
│ [Cancel]              [Save/Update]     │  ← Action Buttons
└─────────────────────────────────────────┘
```

## Field Specifications

### 1. Form Header
```typescript
interface HeaderProps {
  title: string  // "Add New Location" | "Edit Location"
  isEditing: boolean
}
```
- **Typography**: 18px (text-lg), semibold (font-semibold), 12px bottom margin
- **Color**: --color-foreground
- **Logic**: Title changes based on editing state

### 2. GPS Location Button (New Locations Only)
```typescript
interface GPSButtonProps {
  isGettingLocation: boolean
  isLookingUpAddress: boolean
  onLocationCapture: () => void
}
```
- **Visibility**: Only shown when `!editingLocation`
- **Design**: Full width, green background, white text, rounded corners
- **States**:
  - Default: "📍 Use My Current Location"
  - Loading: "⏳ Getting location..." or "⏳ Looking up address..."
  - Disabled: Gray background when loading
- **Functionality**: Triggers `navigator.geolocation.getCurrentPosition()`

### 3. Coordinate Helper Panel (New Locations Only)
```typescript
interface CoordinateHelperProps {
  onCoordinatesSet: (lat: number, lng: number, address?: string) => void
  theme: 'light' | 'dark'
}
```

#### Visual Design
- **Container**: Light blue background with colored border
- **Header**: "📍 Quick Coordinate Entry" (14px, semibold)
- **Subtitle**: Instructions text (12px, blue-gray)
- **Input Layout**: Flex row with input + button

#### Supported Coordinate Formats
1. **Primary**: `53.40951801008527, -2.594964090720223`
2. **Labeled**: `Latitude: 53.409, Longitude: -2.594`
3. **Reverse**: `Longitude: -2.594, Latitude: 53.409`
4. **Numbers**: Any two decimal numbers separated by non-digits
5. **Space**: `53.409 -2.594`

#### Interaction Patterns
- **Auto-parse**: Triggers on complete coordinate detection (500ms delay)
- **Enter key**: Manual parsing trigger
- **Paste events**: Immediate parsing for high-confidence formats
- **Status feedback**: Color-coded borders and status messages

#### Status States
```typescript
type ParseStatus = 'success' | 'error' | 'loading' | null
```
- **Success**: Green border, "✅ Coordinates and address found!"
- **Error**: Red border, "❌ Could not parse coordinates..."
- **Loading**: Blue border, "🔍 Looking up address..."
- **Default**: Gray border, no message

### 4. Name Field
```typescript
interface NameFieldProps {
  value: string
  onChange: (value: string) => void
  required: true
}
```
- **Layout**: Full width, required field
- **Validation**: Must be non-empty after trim
- **Auto-population**: Populated from GPS address or coordinate helper
- **Styling**: Standard input field with focus ring

### 5. Category Section (Grid Layout)
```typescript
interface CategorySectionProps {
  selectedCategory: string
  newCategory: string
  availableCategories: string[]
  onCategoryChange: (category: string) => void
  onNewCategoryChange: (category: string) => void
}
```

#### Layout Structure
- **Grid**: 2 columns with 12px gap (`grid grid-cols-2 gap-3`)
- **Left Column**: Category dropdown
- **Right Column**: New category input

#### Category Dropdown
- **Styling**: Custom dropdown with SVG arrow
- **Options**: Dynamic list from `availableCategories`
- **Default**: "Local"
- **Arrow Icon**: Custom SVG arrow positioned right

#### New Category Input
- **Placeholder**: "Add new category"
- **Validation**: Prevents duplicates
- **Triggers**:
  - Enter key: Creates and selects new category
  - Blur event: Auto-creates on field exit
- **Clearing**: Field clears after successful creation

### 6. Description Field
```typescript
interface DescriptionFieldProps {
  value: string
  onChange: (value: string) => void
  placeholder: string
}
```
- **Type**: Multi-line textarea
- **Minimum Height**: 60px (`min-h-[60px]`)
- **Optional**: Not required for form submission
- **Placeholder**: "Optional description or notes"

### 7. Icon Selection Grid
```typescript
interface IconSelectorProps {
  selectedIcon: string
  onIconSelect: (iconKey: string) => void
}
```

#### Grid Layout
- **Structure**: 3 rows × 6 columns (`grid grid-cols-6 gap-2`)
- **Total Icons**: 18 predefined location icons
- **Selection State**: Visual highlight with primary color ring

#### Icon Button Design
```css
/* Icon Button */
padding: 0.5rem                  /* p-2 */
border-radius: 0.5rem            /* rounded-lg */
border: 1px solid var(--color-border)
transition: all 0.2s
display: flex
flex-direction: column
align-items: center
gap: 0.25rem

/* Selected State */
background: rgba(var(--color-primary), 0.1)
border-color: var(--color-primary)
ring: 2px solid rgba(var(--color-primary), 0.2)

/* Hover Effect */
transform: scale(1.05)           /* hover:scale-105 */
background: var(--color-muted)   /* hover:bg-muted */
```

#### Icon Data Structure
```typescript
const COMMON_LOCATION_ICONS = {
  home: '🏠', work: '🏢', shop: '🛍️',
  coffee: '☕', restaurant: '🍽️', gym: '💪',
  hospital: '🏥', parking: '🅿️', park: '🌳',
  school: '🏫', bank: '🏦', gas: '⛽',
  hotel: '🏨', beach: '🏖️', airport: '✈️',
  train: '🚂', bar: '🍻', other: '📍'
}
```

### 8. Action Buttons
```typescript
interface ActionButtonsProps {
  onCancel: () => void
  onSubmit: () => void
  isEditing: boolean
}
```

#### Layout
- **Container**: Flex row with 12px gap (`flex gap-3 pt-2`)
- **Sizing**: Equal width buttons (`flex-1`)
- **Top Padding**: 8px spacing from content above

#### Button Specifications
- **Cancel Button**:
  - Background: --color-secondary
  - Text: --color-secondary-foreground
  - Hover: Reduced opacity
- **Submit Button**:
  - Background: --color-primary
  - Text: --color-primary-foreground
  - Label: "Save" (new) | "Update" (edit)

## Form Behavior & Logic

### Form State Management
```typescript
interface FormState {
  name: string
  description: string
  group: string
  newCategory: string
  latitude: string
  longitude: string
  address: string
  icon: string
  isGettingLocation: boolean
  isLookingUpAddress: boolean
}
```

### Initialization Logic
```typescript
// New Location (Default State)
{
  name: '',
  description: '',
  group: 'Local',
  newCategory: '',
  latitude: '',
  longitude: '',
  address: '',
  icon: 'other',
  isGettingLocation: false,
  isLookingUpAddress: false
}

// Edit Location (Populated State)
{
  name: editingLocation.name,
  description: editingLocation.description || '',
  group: editingLocation.group || 'Local',
  newCategory: '',
  latitude: editingLocation.latitude.toString(),
  longitude: editingLocation.longitude.toString(),
  address: editingLocation.address || '',
  icon: editingLocation.icon || 'other',
  isGettingLocation: false,
  isLookingUpAddress: false
}
```

### Validation Rules

#### Form Submission Validation
1. **Name**: Required, non-empty after trim
2. **Coordinates**: Valid latitude/longitude ranges
   - Latitude: -90 to 90
   - Longitude: -180 to 180
   - Must parse as valid numbers
3. **Category**: Uses new category if provided, otherwise selected category

#### Error Messages
```typescript
const VALIDATION_MESSAGES = {
  nameRequired: 'Please enter a location name',
  invalidCoordinates: 'Please enter valid coordinates',
  coordinateRange: 'Invalid coordinates. Latitude must be between -90 and 90, longitude between -180 and 180.'
}
```

### Auto-Population Behavior

#### GPS Location Flow
1. User clicks "Use My Current Location"
2. Request browser geolocation with high accuracy
3. Set coordinates in form fields
4. If name is empty, set to "My Current Location"
5. Trigger reverse geocoding for address
6. If address found, populate address field
7. Extract better name from address if current name is default

#### Coordinate Helper Flow
1. User pastes or types coordinates
2. Parse coordinates using regex patterns
3. Validate coordinate ranges
4. If valid, trigger reverse geocoding
5. Populate coordinates, address, and smart name extraction
6. Clear input field and show success status

#### Smart Name Extraction
```typescript
const extractNameFromAddress = (address: string): string => {
  const addressParts = address.split(',')
  if (addressParts.length > 0) {
    const firstPart = addressParts[0].trim()
    return firstPart || 'Location from Maps'
  }
  return 'Location from Maps'
}
```

## Technical Implementation

### Component Interface
```typescript
interface LocationFormProps {
  isOpen: boolean
  onClose: () => void
  onSave: (location: AppLocation) => void
  editingLocation?: AppLocation | null
  theme: 'light' | 'dark'
  availableCategories: string[]
}
```

### Required Dependencies
- **React**: useState, useEffect hooks
- **Browser APIs**: Geolocation API
- **External APIs**: OpenStreetMap Nominatim for reverse geocoding
- **Styling**: Tailwind CSS with custom design tokens

### API Integration
```typescript
// OpenStreetMap Nominatim Reverse Geocoding
const NOMINATIM_ENDPOINT = 'https://nominatim.openstreetmap.org/reverse'
const USER_AGENT = 'MyLocationsApp/2.0.0'

const reverseGeocode = async (lat: number, lng: number): Promise<string | null> => {
  const url = `${NOMINATIM_ENDPOINT}?format=json&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=en`
  // Implementation details...
}
```

### Geolocation Configuration
```typescript
const GEOLOCATION_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 0
}
```

## Accessibility & UX

### Keyboard Navigation
- **Tab Order**: Logical flow through all interactive elements
- **Enter Key**: Submits coordinate parsing, creates new categories
- **Escape Key**: Closes modal (recommended)
- **Focus Management**: Proper focus trapping within modal

### Touch Interactions
- **Button Sizing**: Minimum 44px touch targets
- **Icon Grid**: Adequate spacing for precise selection
- **Scroll Behavior**: Smooth scrolling for overflow content

### Error Handling
- **Geolocation Errors**: Specific error messages for different failure types
- **Network Errors**: Graceful degradation when geocoding fails
- **Validation Errors**: Inline feedback with specific guidance

### Loading States
- **GPS Loading**: Visual feedback during location acquisition
- **Address Loading**: Status indicator during reverse geocoding
- **Button States**: Disabled states with visual feedback

## Styling Guidelines

### CSS Custom Properties
```css
/* Form-specific tokens */
--form-spacing: 1rem                    /* space-y-4 */
--form-padding: 1.25rem                 /* p-5 */
--input-padding: 0.75rem 1rem           /* px-3 py-2 */
--button-padding: 0.5rem 1rem           /* px-4 py-2 */
--modal-backdrop: rgba(0, 0, 0, 0.5)    /* bg-black/50 */
--modal-border-radius: 0.5rem           /* rounded-lg */
```

### Component-Specific Classes
```css
/* Modal overlay */
.location-form-overlay {
  @apply fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50;
}

/* Form container */
.location-form-container {
  @apply bg-card rounded-lg p-5 max-w-md w-full max-h-[85vh] overflow-y-auto;
}

/* Field spacing */
.location-form-fields {
  @apply space-y-4;
}

/* Category grid */
.category-grid {
  @apply grid grid-cols-2 gap-3;
}

/* Icon grid */
.icon-grid {
  @apply grid grid-cols-6 gap-2;
}

/* Icon button */
.icon-button {
  @apply p-2 rounded-lg border transition-all hover:scale-105 flex flex-col items-center gap-1;
}

.icon-button.selected {
  @apply bg-primary/10 border-primary ring-2 ring-primary/20;
}

.icon-button:not(.selected) {
  @apply bg-card border-border hover:bg-muted;
}
```

## Integration Requirements

### Parent Component Integration
```typescript
// Required props from parent
const [showForm, setShowForm] = useState(false)
const [editingLocation, setEditingLocation] = useState<AppLocation | null>(null)
const [availableCategories, setAvailableCategories] = useState<string[]>([])
const [theme, setTheme] = useState<'light' | 'dark'>('light')

// Event handlers
const handleSave = (location: AppLocation) => {
  // Save logic implementation
}

const handleClose = () => {
  setShowForm(false)
  setEditingLocation(null)
}
```

### Data Structure Requirements
```typescript
interface AppLocation {
  id: string
  name: string
  latitude: number
  longitude: number
  timestamp: number
  description?: string
  isFavorite?: boolean
  group?: string
  address?: string
  icon?: string
}
```

This comprehensive specification ensures that the LocationForm component can be faithfully recreated with all its sophisticated features, interactions, and visual design intact. The form represents a complete location data entry solution with intelligent automation, user-friendly design, and robust validation.