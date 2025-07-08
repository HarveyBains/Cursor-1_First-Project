import { AppLocation } from '../types/location'

// Google Maps URL parsing utilities
export const parseGoogleMapsURL = (url: string): { latitude: number; longitude: number } | null => {
  try {
    // Clean up the URL
    const cleanUrl = url.trim()
    
    // Pattern 1: Standard share links (google.com/maps/@lat,lng)
    const sharePattern = /@(-?\d+\.?\d*),(-?\d+\.?\d*)/
    const shareMatch = cleanUrl.match(sharePattern)
    if (shareMatch) {
      return {
        latitude: parseFloat(shareMatch[1]),
        longitude: parseFloat(shareMatch[2])
      }
    }
    
    // Pattern 2: Place URLs with coordinates
    const placePattern = /place\/[^/]+\/@(-?\d+\.?\d*),(-?\d+\.?\d*)/
    const placeMatch = cleanUrl.match(placePattern)
    if (placeMatch) {
      return {
        latitude: parseFloat(placeMatch[1]),
        longitude: parseFloat(placeMatch[2])
      }
    }
    
    // Pattern 3: Search URLs (google.com/maps?q=lat,lng)
    const searchPattern = /[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/
    const searchMatch = cleanUrl.match(searchPattern)
    if (searchMatch) {
      return {
        latitude: parseFloat(searchMatch[1]),
        longitude: parseFloat(searchMatch[2])
      }
    }
    
    // Pattern 4: Embedded coordinates (!3dlat!4dlng)
    const embeddedPattern = /!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/
    const embeddedMatch = cleanUrl.match(embeddedPattern)
    if (embeddedMatch) {
      return {
        latitude: parseFloat(embeddedMatch[1]),
        longitude: parseFloat(embeddedMatch[2])
      }
    }
    
    // Pattern 5: Direct coordinates ("lat, lng")
    const directPattern = /(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/
    const directMatch = cleanUrl.match(directPattern)
    if (directMatch) {
      const lat = parseFloat(directMatch[1])
      const lng = parseFloat(directMatch[2])
      if (isValidCoordinate(lat, lng)) {
        return { latitude: lat, longitude: lng }
      }
    }
    
    return null
  } catch (error) {
    console.error('Error parsing Google Maps URL:', error)
    return null
  }
}

// Validate coordinate ranges
export const isValidCoordinate = (latitude: number, longitude: number): boolean => {
  return (
    latitude >= -90 && latitude <= 90 &&
    longitude >= -180 && longitude <= 180 &&
    !isNaN(latitude) && !isNaN(longitude)
  )
}

// Format coordinates for display
export const formatCoordinates = (latitude: number, longitude: number): string => {
  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
}

// Generate Google Maps URL from coordinates
export const generateGoogleMapsURL = (latitude: number, longitude: number): string => {
  return `https://www.google.com/maps/@${latitude},${longitude},15z`
}

// Reverse geocoding using OpenStreetMap Nominatim (free alternative)
export const reverseGeocode = async (latitude: number, longitude: number): Promise<string | null> => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'MyLocationsApp/1.0'
        }
      }
    )
    
    if (!response.ok) throw new Error('Geocoding failed')
    
    const data = await response.json()
    return data.display_name || null
  } catch (error) {
    console.error('Reverse geocoding error:', error)
    return null
  }
}

// Generate unique ID for locations
export const generateLocationId = (): string => {
  return `loc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Create sample locations for new users
export const createSampleLocations = (): AppLocation[] => {
  return [
    {
      id: generateLocationId(),
      name: "Downtown Coffee Shop",
      latitude: 40.7589,
      longitude: -73.9851,
      address: "123 Main Street, New York, NY",
      description: "Great coffee and free WiFi",
      icon: "☕",
      group: "Local",
      isFavorite: true,
      timestamp: Date.now() - 86400000, // 1 day ago
      isSample: true
    },
    {
      id: generateLocationId(),
      name: "Central Park",
      latitude: 40.7829,
      longitude: -73.9654,
      address: "Central Park, New York, NY",
      description: "Perfect for morning jogs",
      icon: "🌳",
      group: "Recreation",
      isFavorite: false,
      timestamp: Date.now() - 172800000, // 2 days ago
      isSample: true
    },
    {
      id: generateLocationId(),
      name: "Office Building",
      latitude: 40.7505,
      longitude: -73.9934,
      address: "456 Business Ave, New York, NY",
      description: "Main office location",
      icon: "💼",
      group: "Work",
      isFavorite: false,
      timestamp: Date.now() - 259200000, // 3 days ago
      isSample: true
    }
  ]
}

// Local storage utilities
export const STORAGE_KEYS = {
  LOCATIONS: 'savedLocations',
  GROUPS: 'locationGroups',
  THEME: 'ui-theme',
  VISITED: 'hasVisitedBefore',
  WELCOME_HIDDEN: 'hideWelcomePanel'
} as const

export const loadFromStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : defaultValue
  } catch (error) {
    console.error(`Error loading ${key} from storage:`, error)
    return defaultValue
  }
}

export const saveToStorage = <T>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.error(`Error saving ${key} to storage:`, error)
  }
}

// Distance calculation between two coordinates (Haversine formula)
export const calculateDistance = (
  lat1: number, 
  lon1: number, 
  lat2: number, 
  lon2: number
): number => {
  const R = 6371 // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1)
  const dLon = toRadians(lon2 - lon1)
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

const toRadians = (degrees: number): number => {
  return degrees * (Math.PI / 180)
}