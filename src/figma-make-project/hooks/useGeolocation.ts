import { useState, useCallback } from 'react'

interface GeolocationState {
  latitude: number | null
  longitude: number | null
  accuracy: number | null
  error: string | null
  isLoading: boolean
}

interface GeolocationOptions {
  enableHighAccuracy?: boolean
  timeout?: number
  maximumAge?: number
}

export const useGeolocation = (options: GeolocationOptions = {}) => {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    error: null,
    isLoading: false
  })

  const getCurrentPosition = useCallback(() => {
    if (!navigator.geolocation) {
      setState(prev => ({
        ...prev,
        error: 'Geolocation is not supported by this browser.',
        isLoading: false
      }))
      return
    }

    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null
    }))

    const defaultOptions: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
      ...options
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          error: null,
          isLoading: false
        })
      },
      (error) => {
        let errorMessage = 'An unknown error occurred.'
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access was denied. Please enable location permissions in your browser settings.'
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable. Please check your internet connection and GPS settings.'
            break
          case error.TIMEOUT:
            errorMessage = 'Location request timed out. Please try again.'
            break
        }

        setState(prev => ({
          ...prev,
          error: errorMessage,
          isLoading: false
        }))
      },
      defaultOptions
    )
  }, [options])

  const reset = useCallback(() => {
    setState({
      latitude: null,
      longitude: null,
      accuracy: null,
      error: null,
      isLoading: false
    })
  }, [])

  return {
    ...state,
    getCurrentPosition,
    reset,
    isSupported: !!navigator.geolocation
  }
}

// Utility function to format accuracy
export const formatAccuracy = (accuracy: number | null): string => {
  if (accuracy === null) return ''
  if (accuracy < 10) return `±${Math.round(accuracy)}m (Excellent)`
  if (accuracy < 50) return `±${Math.round(accuracy)}m (Good)`
  if (accuracy < 100) return `±${Math.round(accuracy)}m (Fair)`
  return `±${Math.round(accuracy)}m (Poor)`
}

// Check if HTTPS is required for geolocation
export const isHTTPSRequired = (): boolean => {
  return location.protocol !== 'https:' && location.hostname !== 'localhost'
}