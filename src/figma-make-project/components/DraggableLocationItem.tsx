import React from 'react'
import { useDrag, useDrop } from 'react-dnd'
import { Star, MapPin, Clock, Edit, Trash2, ExternalLink } from 'lucide-react'
import { AppLocation } from '../types/location'
import { formatCoordinates, generateGoogleMapsURL } from '../utils/locationUtils'
import { formatAccuracy } from '../hooks/useGeolocation'
import { Button } from './ui/button'
import { Badge } from './ui/badge'

interface DraggableLocationItemProps {
  location: AppLocation
  index: number
  onMove: (dragIndex: number, hoverIndex: number) => void
  onEdit: (location: AppLocation) => void
  onDelete: (location: AppLocation) => void
  onToggleFavorite: (location: AppLocation) => void
  isDragging?: boolean
}

interface DragItem {
  type: string
  index: number
  id: string
}

const ITEM_TYPE = 'LOCATION_ITEM'

export const DraggableLocationItem: React.FC<DraggableLocationItemProps> = ({
  location,
  index,
  onMove,
  onEdit,
  onDelete,
  onToggleFavorite,
}) => {
  const [{ isDragging }, drag] = useDrag({
    type: ITEM_TYPE,
    item: { type: ITEM_TYPE, index, id: location.id },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  })

  const [, drop] = useDrop({
    accept: ITEM_TYPE,
    hover: (item: DragItem) => {
      if (!item) return
      
      const dragIndex = item.index
      const hoverIndex = index

      if (dragIndex === hoverIndex) return

      onMove(dragIndex, hoverIndex)
      item.index = hoverIndex
    },
  })

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`
    } else if (diffInHours < 24 * 7) {
      return `${Math.floor(diffInHours / 24)}d ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  const openInGoogleMaps = () => {
    const url = generateGoogleMapsURL(location.latitude, location.longitude)
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div
      ref={(node) => drag(drop(node))}
      className={`
        bg-card border border-border rounded-lg p-3 mb-2 
        cursor-move hover:border-primary/50 transition-all duration-200
        hover:shadow-md hover:-translate-y-0.5
        ${isDragging ? 'opacity-50 rotate-2' : ''}
        ${location.isSample ? 'border-dashed' : ''}
      `}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center space-x-2 flex-1 min-w-0">
          <span className="text-lg" title="Location type">{location.icon || '📍'}</span>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium truncate">{location.name}</h3>
            {location.group && (
              <Badge variant="secondary" className="text-xs mt-1">
                {location.group}
              </Badge>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-1 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleFavorite(location)}
            className={`h-7 w-7 p-0 ${location.isFavorite ? 'text-yellow-500 hover:text-yellow-600' : 'text-muted-foreground hover:text-foreground'}`}
            title={location.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Star className={`h-3.5 w-3.5 ${location.isFavorite ? 'fill-current' : ''}`} />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={openInGoogleMaps}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            title="Open in Google Maps"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(location)}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            title="Edit location"
          >
            <Edit className="h-3.5 w-3.5" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(location)}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
            title="Delete location"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {location.description && (
        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{location.description}</p>
      )}

      <div className="space-y-1">
        <div className="flex items-center text-xs text-muted-foreground">
          <MapPin className="h-3 w-3 mr-1" />
          <span className="font-mono">{formatCoordinates(location.latitude, location.longitude)}</span>
          {location.accuracy && (
            <span className="ml-2 text-green-600">
              {formatAccuracy(location.accuracy)}
            </span>
          )}
        </div>
        
        {location.address && (
          <p className="text-xs text-muted-foreground truncate" title={location.address}>
            {location.address}
          </p>
        )}
        
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center">
            <Clock className="h-3 w-3 mr-1" />
            <span>{formatTimestamp(location.timestamp)}</span>
          </div>
          {location.isSample && (
            <Badge variant="outline" className="text-xs py-0">
              Sample
            </Badge>
          )}
        </div>
      </div>
    </div>
  )
}