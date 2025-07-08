import React, { useState, useEffect } from 'react'
import { MapPin, Link, Loader2, AlertCircle, Check } from 'lucide-react'
import { AppLocation, LOCATION_ICONS, LOCATION_ICON_LABELS, DEFAULT_GROUPS } from '../types/location'
import { useGeolocation, formatAccuracy, isHTTPSRequired } from '../hooks/useGeolocation'
import { parseGoogleMapsURL, reverseGeocode, generateLocationId, isValidCoordinate } from '../utils/locationUtils'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Badge } from './ui/badge'
import { Alert, AlertDescription } from './ui/alert'
import { toast } from 'sonner@2.0.3'

interface UnifiedLocationFormProps {
  isOpen: boolean
  onClose: () => void
  onSave: (location: AppLocation) => void
  editingLocation?: AppLocation | null
  groups: string[]
  onAddGroup: (group: string) => void
}

type FormMode = 'gps' | 'google-maps'

export const UnifiedLocationForm: React.FC<UnifiedLocationFormProps> = ({
  isOpen,
  onClose,
  onSave,
  editingLocation,
  groups,
  onAddGroup
}) => {
  const [mode, setMode] = useState<FormMode>('gps')
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: '📍',
    group: 'Local',
    googleMapsUrl: ''
  })
  const [coordinates, setCoordinates] = useState<{
    latitude: number | null
    longitude: number | null
    accuracy: number | null
    address: string | null
  }>({
    latitude: null,
    longitude: null,
    accuracy: null,
    address: null
  })
  const [isProcessingUrl, setIsProcessingUrl] = useState(false)
  const [newGroup, setNewGroup] = useState('')
  const [showNewGroupInput, setShowNewGroupInput] = useState(false)

  const geolocation = useGeolocation({
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 30000
  })

  // Initialize form for editing
  useEffect(() => {
    if (editingLocation) {
      setFormData({
        name: editingLocation.name,
        description: editingLocation.description || '',
        icon: editingLocation.icon || '📍',
        group: editingLocation.group || 'Local',
        googleMapsUrl: ''
      })
      setCoordinates({
        latitude: editingLocation.latitude,
        longitude: editingLocation.longitude,
        accuracy: editingLocation.accuracy || null,
        address: editingLocation.address || null
      })
      setMode('gps') // Start in GPS mode for editing
    } else {
      // Reset form for new location
      setFormData({
        name: '',
        description: '',
        icon: '📍',
        group: 'Local',
        googleMapsUrl: ''
      })
      setCoordinates({
        latitude: null,
        longitude: null,
        accuracy: null,
        address: null
      })
      setMode('gps')
    }
    setNewGroup('')
    setShowNewGroupInput(false)
  }, [editingLocation, isOpen])

  // Handle GPS capture
  useEffect(() => {
    if (geolocation.latitude && geolocation.longitude) {
      setCoordinates({
        latitude: geolocation.latitude,
        longitude: geolocation.longitude,
        accuracy: geolocation.accuracy,
        address: null
      })
      
      // Reverse geocode to get address
      reverseGeocode(geolocation.latitude, geolocation.longitude)
        .then(address => {
          if (address) {
            setCoordinates(prev => ({ ...prev, address }))
          }
        })
        .catch(error => {
          console.error('Reverse geocoding failed:', error)
        })
    }
  }, [geolocation.latitude, geolocation.longitude])

  const handleGoogleMapsUrlChange = async (url: string) => {
    setFormData(prev => ({ ...prev, googleMapsUrl: url }))
    
    if (!url.trim()) {
      setCoordinates({
        latitude: null,
        longitude: null,
        accuracy: null,
        address: null
      })
      return
    }

    setIsProcessingUrl(true)
    
    try {
      const coords = parseGoogleMapsURL(url)
      if (coords && isValidCoordinate(coords.latitude, coords.longitude)) {
        setCoordinates({
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: null,
          address: null
        })
        
        // Reverse geocode to get address
        const address = await reverseGeocode(coords.latitude, coords.longitude)
        if (address) {
          setCoordinates(prev => ({ ...prev, address }))
        }
        
        toast.success('Coordinates extracted successfully!')
      } else {
        toast.error('Could not extract coordinates from this URL. Please check the format.')
        setCoordinates({
          latitude: null,
          longitude: null,
          accuracy: null,
          address: null
        })
      }
    } catch (error) {
      toast.error('Failed to process Google Maps URL')
      console.error('URL processing error:', error)
    } finally {
      setIsProcessingUrl(false)
    }
  }

  const handleAddNewGroup = () => {
    if (newGroup.trim() && !groups.includes(newGroup.trim())) {
      const groupName = newGroup.trim()
      onAddGroup(groupName)
      setFormData(prev => ({ ...prev, group: groupName }))
      setNewGroup('')
      setShowNewGroupInput(false)
      toast.success(`Group "${groupName}" added!`)
    }
  }

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast.error('Please enter a location name')
      return
    }
    
    if (!coordinates.latitude || !coordinates.longitude) {
      toast.error('Please capture location coordinates')
      return
    }

    const locationData: AppLocation = {
      id: editingLocation?.id || generateLocationId(),
      name: formData.name.trim(),
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      accuracy: coordinates.accuracy,
      timestamp: editingLocation?.timestamp || Date.now(),
      address: coordinates.address,
      description: formData.description.trim() || undefined,
      icon: formData.icon,
      group: formData.group,
      isFavorite: editingLocation?.isFavorite || false,
      isSample: false
    }

    onSave(locationData)
    onClose()
    toast.success(editingLocation ? 'Location updated!' : 'Location saved!')
  }

  const allGroups = [...DEFAULT_GROUPS, ...groups.filter(g => !DEFAULT_GROUPS.includes(g))]

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingLocation ? 'Edit Location' : 'Add New Location'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Mode Selection */}
          {!editingLocation && (
            <div className="flex rounded-lg border bg-muted/50 p-1">
              <Button
                variant={mode === 'gps' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setMode('gps')}
                className="flex-1 h-8"
              >
                <MapPin className="h-4 w-4 mr-2" />
                GPS Capture
              </Button>
              <Button
                variant={mode === 'google-maps' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setMode('google-maps')}
                className="flex-1 h-8"
              >
                <Link className="h-4 w-4 mr-2" />
                Google Maps
              </Button>
            </div>
          )}

          {/* GPS Mode */}
          {mode === 'gps' && !editingLocation && (
            <div className="space-y-3">
              {isHTTPSRequired() && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    GPS location requires HTTPS. This may not work on insecure connections.
                  </AlertDescription>
                </Alert>
              )}
              
              <Button
                onClick={geolocation.getCurrentPosition}
                disabled={geolocation.isLoading}
                className="w-full"
              >
                {geolocation.isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Getting Location...
                  </>
                ) : (
                  <>
                    <MapPin className="h-4 w-4 mr-2" />
                    Get Current Location
                  </>
                )}
              </Button>

              {geolocation.error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{geolocation.error}</AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Google Maps Mode */}
          {mode === 'google-maps' && !editingLocation && (
            <div className="space-y-3">
              <div>
                <Label htmlFor="googleMapsUrl">Google Maps URL or Coordinates</Label>
                <div className="relative">
                  <Input
                    id="googleMapsUrl"
                    placeholder="Paste Google Maps link or coordinates (lat, lng)"
                    value={formData.googleMapsUrl}
                    onChange={(e) => handleGoogleMapsUrlChange(e.target.value)}
                    className="pr-10"
                  />
                  {isProcessingUrl && (
                    <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Coordinates Display */}
          {(coordinates.latitude && coordinates.longitude) && (
            <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-2">
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-800 dark:text-green-400">
                  Location Captured
                </span>
              </div>
              <div className="space-y-1 text-sm">
                <p className="font-mono text-green-700 dark:text-green-300">
                  {coordinates.latitude.toFixed(6)}, {coordinates.longitude.toFixed(6)}
                </p>
                {coordinates.accuracy && (
                  <p className="text-green-600 dark:text-green-400">
                    {formatAccuracy(coordinates.accuracy)}
                  </p>
                )}
                {coordinates.address && (
                  <p className="text-green-600 dark:text-green-400">
                    {coordinates.address}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Location Details Form */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Location Name *</Label>
              <Input
                id="name"
                placeholder="Enter location name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Optional description or notes"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={2}
              />
            </div>

            {/* Icon Selection */}
            <div>
              <Label>Location Icon</Label>
              <div className="grid grid-cols-6 gap-2 mt-2 max-h-32 overflow-y-auto border rounded-lg p-2">
                {LOCATION_ICONS.map((icon, index) => (
                  <Button
                    key={icon}
                    variant={formData.icon === icon ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setFormData(prev => ({ ...prev, icon }))}
                    className="h-10 w-10 p-0 text-lg"
                    title={LOCATION_ICON_LABELS[index]}
                  >
                    {icon}
                  </Button>
                ))}
              </div>
            </div>

            {/* Group Selection */}
            <div>
              <Label>Group</Label>
              <div className="space-y-2">
                <Select
                  value={formData.group}
                  onValueChange={(value) => {
                    if (value === 'add-new') {
                      setShowNewGroupInput(true)
                    } else {
                      setFormData(prev => ({ ...prev, group: value }))
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allGroups.map(group => (
                      <SelectItem key={group} value={group}>
                        {group}
                      </SelectItem>
                    ))}
                    <SelectItem value="add-new">+ Add New Group</SelectItem>
                  </SelectContent>
                </Select>

                {showNewGroupInput && (
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Enter new group name"
                      value={newGroup}
                      onChange={(e) => setNewGroup(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddNewGroup()}
                    />
                    <Button size="sm" onClick={handleAddNewGroup}>
                      Add
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setShowNewGroupInput(false)
                        setNewGroup('')
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex space-x-2 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.name.trim() || !coordinates.latitude || !coordinates.longitude}
              className="flex-1"
            >
              {editingLocation ? 'Update Location' : 'Save Location'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}