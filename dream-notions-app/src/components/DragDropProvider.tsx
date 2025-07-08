import React, { type ReactNode } from 'react'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { TouchBackend } from 'react-dnd-touch-backend'

interface DragDropProviderProps {
  children: ReactNode
}

// Detect if we're on a touch device
const isTouchDevice = () => {
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    // @ts-ignore
    navigator.msMaxTouchPoints > 0
  )
}

export const DragDropProvider: React.FC<DragDropProviderProps> = ({ children }) => {
  // Use touch backend for mobile devices, HTML5 backend for desktop
  const backend = isTouchDevice() ? TouchBackend : HTML5Backend
  
  const options = isTouchDevice() 
    ? {
        enableMouseEvents: true,
        delayTouchStart: 200,
        delayMouseStart: 0,
        touchSlop: 5
      }
    : {}

  return (
    <DndProvider backend={backend} options={options}>
      {children}
    </DndProvider>
  )
}