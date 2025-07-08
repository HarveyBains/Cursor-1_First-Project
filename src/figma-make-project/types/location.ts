export interface AppLocation {
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

export interface LocationFormData {
  name: string
  description: string
  group: string
  latitude: number
  longitude: number
  address?: string
  icon: string
}

export interface UserGroup {
  id: string
  name: string
  timestamp: number
}