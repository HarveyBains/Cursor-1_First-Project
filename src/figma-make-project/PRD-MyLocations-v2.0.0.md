# My Locations v2.0.0 - Product Requirements Document

## Version Information
- **Version**: 2.0.0 (Local)
- **Date**: December 2024
- **Type**: GPS Location Tracker & Manager
- **Platform**: React Web Application with Tailwind CSS v4

## Application Overview

### Purpose
A comprehensive GPS location tracking and management application that allows users to save, organize, and manage geographic locations with rich metadata. The application provides both GPS-based location capture and manual coordinate entry with automatic address lookup.

### Core Value Proposition
- **Simplicity**: Ultra-compact, user-friendly interface optimized for efficiency
- **Flexibility**: Multiple ways to add locations (GPS, coordinate paste, manual entry)
- **Organization**: Robust categorization and favorites system with filtering
- **Accessibility**: Fully responsive design with light/dark themes
- **Reliability**: Local storage with automatic backup and sample data system

## Technical Architecture

### Technology Stack
- **Frontend**: React 18+ with TypeScript
- **Styling**: Tailwind CSS v4 with custom design system
- **Storage**: Browser localStorage for data persistence
- **Geolocation**: Browser Geolocation API + OpenStreetMap Nominatim API
- **Build System**: Modern React build environment

### Data Model

#### Location Entity
```typescript
interface AppLocation {
  id: string                    // Unique identifier (timestamp + random)
  name: string                  // Display name (required)
  latitude: number              // GPS latitude (-90 to 90)
  longitude: number             // GPS longitude (-180 to 180)
  timestamp: number             // Creation timestamp (epoch)
  description?: string          // Optional user description
  isFavorite?: boolean          // Favorite status (default: false)
  group?: string               // Category name
  address?: string             // Reverse-geocoded address
  icon?: string                // Icon key from predefined set
}
```

#### Storage Schema
- **Key**: `locations` → Array of AppLocation objects
- **Key**: `theme` → String ('light' | 'dark')

## Core Features

### 1. Location Capture Methods

#### GPS Location Capture
- **Trigger**: "Use My Current Location" button in add form
- **Process**: 
  1. Request browser geolocation permission
  2. Capture high-accuracy coordinates
  3. Automatically reverse-geocode to get readable address
  4. Pre-populate form with coordinates and address
  5. Extract location name from address if possible
- **Error Handling**: Clear user feedback for permission denied, unavailable, timeout
- **Specifications**:
  - High accuracy mode enabled
  - 10-second timeout
  - No maximum age for cached location

#### Manual Coordinate Entry
- **Interface**: "Quick Coordinate Entry" panel
- **Supported Formats**:
  - Standard: `53.40951801008527, -2.594964090720223`
  - Labeled: `Latitude: 53.409, Longitude: -2.594`
  - Reverse: `Longitude: -2.594, Latitude: 53.409`
  - Space-separated: `53.409 -2.594`
- **Features**:
  - Auto-parse on complete coordinate detection
  - Enter key support for quick submission
  - Real-time validation and error feedback
  - Automatic reverse geocoding for addresses
  - Visual status indicators (success/error/loading)

#### Form-Based Entry
- **Fields**: Name (required), Category, Description, Icon, Coordinates
- **Validation**: Coordinate range validation, required field enforcement
- **UX**: Modal overlay with responsive design

### 2. Location Management (CRUD)

#### Create
- **Methods**: GPS capture, coordinate paste, manual form entry
- **Auto-population**: Intelligent name extraction from addresses
- **Default Values**: Icon (other), Category (Local), Favorite (false)

#### Read/Display
- **List View**: Compact cards with drag indicators and action buttons
- **Information Display**: Name (orange), description, icon with label
- **Visual Hierarchy**: Primary name, secondary description
- **Responsive Design**: Mobile and desktop optimized

#### Update
- **Trigger**: Edit button (✏️) on location cards
- **Form**: Same modal form as create, pre-populated with existing data
- **Preservation**: Maintains timestamp and ID, updates all other fields

#### Delete
- **Trigger**: Delete button (🗑️) on location cards
- **Confirmation**: Modal dialog with location name confirmation
- **Safety**: Cannot be undone warning

### 3. Organization & Categorization

#### Dynamic Categories
- **Default Categories**: Local, Work, Scenic, Biking
- **Custom Categories**: Users can create new categories in-line
- **Auto-Creation**: New categories added via "New Category" field
- **Auto-Selection**: Newly created categories automatically selected
- **Auto-Cleanup**: Categories with no locations are automatically removed

#### Category Management
- **Interface**: Dropdown for existing + text field for new
- **Validation**: Prevents duplicate categories
- **Keyboard Support**: Enter key creates and selects new category
- **Blur Events**: Auto-create on field blur

### 4. Favorites System

#### Favorite Management
- **Toggle**: Star button (★) on each location card
- **Visual**: Filled yellow star for favorites, outline for non-favorites
- **Storage**: Boolean flag in location object

#### Favorites View
- **Navigation**: Star button in header with count badge
- **Filtering**: Shows only favorited locations
- **Categories**: Full category filtering available in favorites view
- **Controls**: Horizontal pill buttons for category selection

### 5. User Interface Design

#### Design System
- **Theme**: Light (warm cream/orange) and Dark (obsidian/violet) modes
- **Colors**:
  - Light: Background #faf9f7, Primary #f77536 (orange), Card #ffffff
  - Dark: Background #0d1117, Primary #8b5cf6 (violet), Card #161b22
- **Typography**: Inter font family, hierarchical sizing
- **Spacing**: Consistent gap system, ultra-compact cards

#### Layout Components

##### Header
- **Left**: Favorites toggle button with count badge (conditional)
- **Center**: App title "My Locations" + subtitle
- **Right**: Theme toggle button (🌙/☀️)

##### Add Location Panel
- **Design**: Orange border, shadow, 25% narrower than full width
- **Icon**: Map pin (🗺️) 
- **Content**: Title, subtitle, call-to-action button
- **Positioning**: Centered with max-width constraint

##### Location Cards
- **Layout**: Icon column + content + action buttons
- **Icon Section**: Drag handle, emoji icon, icon label (fixed 48px width)
- **Content**: Name (orange), description (gray, truncated)
- **Actions**: Favorite (★), Maps (🗺️), Edit (✏️), Delete (🗑️)
- **Spacing**: 24px gaps between action buttons for touch-friendly interaction

##### Forms
- **Design**: Modal overlay with backdrop
- **Structure**: GPS button → Coordinate helper → Name → Category row → Description → Icons → Actions
- **Icon Grid**: 3 rows × 6 columns of location icons
- **Category Row**: Dropdown + new category input (side-by-side)

### 6. Data Persistence & Management

#### Local Storage
- **Primary Storage**: Browser localStorage for all user data
- **Backup Strategy**: Auto-save on every change
- **Format**: JSON serialization of location arrays

#### Sample Data System
- **Trigger**: Activated when no existing locations found
- **Content**: 3 sample locations (Home, Office, Grocery Store)
- **Purpose**: Onboarding and demonstration
- **Cleanup**: Managed same as user data

#### Data Migration
- **Fallback**: Graceful handling of corrupted data
- **Recovery**: Sample data restoration if all locations lost
- **Versioning**: Future-proof data structure

### 7. External Integrations

#### OpenStreetMap Nominatim API
- **Purpose**: Reverse geocoding (coordinates → addresses)
- **Endpoint**: `https://nominatim.openstreetmap.org/reverse`
- **Authentication**: None required
- **User-Agent**: `MyLocationsApp/2.0.0`
- **Rate Limiting**: Respectful usage, no bulk operations
- **Response Handling**: Formatted address creation from structured data

#### Google Maps Integration
- **Purpose**: External location viewing
- **URL Pattern**: `https://www.google.com/maps/place/{lat},{lng}/@{lat},{lng},17z`
- **Trigger**: Maps button (🗺️) on location cards
- **Behavior**: Opens in new tab

#### Browser Geolocation API
- **Purpose**: GPS coordinate capture
- **Options**: High accuracy, 10s timeout, no cached results
- **Permissions**: Handled gracefully with user feedback

### 8. User Experience Features

#### Drag & Drop Reordering
- **Implementation**: HTML5 drag and drop API
- **Visual Feedback**: Cursor changes, hover states
- **Scope**: Works within current filter/view
- **Persistence**: Order maintained in storage

#### Responsive Design
- **Breakpoints**: Mobile-first approach
- **Adaptations**: Touch-friendly buttons, appropriate spacing
- **Cross-Platform**: Desktop and mobile optimized

#### Accessibility
- **Keyboard Navigation**: Full keyboard support
- **Screen Readers**: Semantic HTML and ARIA labels
- **Visual Feedback**: Clear focus states and interactions
- **Error Handling**: Descriptive error messages

#### Performance
- **Local-First**: No network dependencies for core functionality
- **Efficient Rendering**: React optimization patterns
- **Memory Management**: Efficient state updates

## Implementation Guidelines

### File Structure
```
/App.tsx                    # Main application component
/styles/globals.css         # Tailwind v4 configuration and theme
```

### Component Architecture
- **Monolithic Structure**: Single-file implementation for simplicity
- **Functional Components**: React hooks for state management
- **Event Handlers**: Comprehensive CRUD operations
- **State Management**: useState and useEffect patterns

### Styling Approach
- **Tailwind Classes**: Utility-first CSS
- **Custom Properties**: CSS variables for theming
- **Component Styling**: Inline class application
- **Responsive Utilities**: Mobile-first breakpoints

### Data Flow
- **State Management**: Centralized in main App component
- **Event Propagation**: Props-based communication
- **Storage Operations**: Direct localStorage integration
- **Error Boundaries**: Try-catch for external API calls

## Quality Assurance

### Testing Considerations
- **Geolocation**: Test permission handling and error states
- **Data Persistence**: Verify localStorage operations
- **Responsive Design**: Cross-device testing
- **External APIs**: Network failure handling

### Performance Targets
- **Load Time**: < 2 seconds initial render
- **Interaction Response**: < 100ms for UI updates
- **Memory Usage**: Efficient for 1000+ locations
- **Battery Impact**: Minimal GPS usage

### Browser Compatibility
- **Modern Browsers**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Features**: ES2020+, CSS Grid, Flexbox, localStorage
- **Fallbacks**: Graceful degradation for unsupported features

## Future Enhancement Opportunities

### Data Features
- **Import/Export**: JSON file operations
- **Search**: Text-based location search
- **Statistics**: Usage analytics and insights
- **Batch Operations**: Multi-select for bulk actions

### UI/UX Improvements
- **Map View**: Interactive map display of all locations
- **Route Planning**: Integration with mapping services
- **Photo Attachments**: Image support for locations
- **Custom Icons**: User-uploaded icon support

### Advanced Features
- **Sharing**: Location sharing capabilities
- **Backup**: Cloud storage integration options
- **Offline Maps**: Cached map tiles
- **Geofencing**: Location-based notifications

## Development Notes

### Critical Implementation Details
1. **Coordinate Validation**: Strict lat/lng range checking
2. **Error Handling**: User-friendly error messages for all failure modes
3. **Performance**: Efficient list rendering for large datasets
4. **Accessibility**: Full keyboard navigation and screen reader support
5. **Data Integrity**: Robust localStorage error handling

### API Usage Notes
- **Nominatim**: Respect usage policies, implement request throttling
- **Geolocation**: Handle all permission states gracefully
- **Google Maps**: Use standard URL format for broad compatibility

This PRD serves as the complete specification for rebuilding the My Locations application. All features, interfaces, and behaviors are documented to enable faithful reproduction by any development tool or team.