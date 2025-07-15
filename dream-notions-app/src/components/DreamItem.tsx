import React, { useRef, useState, useEffect } from 'react';
import type { DreamEntry } from '../types/DreamEntry';
import { useDrag, useDrop } from 'react-dnd';

interface DreamItemProps {
  dream: DreamEntry;
  index: number;
  onMove: (dragIndex: number, hoverIndex: number) => void;
  onEdit: (dream: DreamEntry) => void;
  onDelete: (id: string) => void;
  totalItems?: number;
  // Multi-select props
  isSelected?: boolean;
  multiSelectMode?: boolean;
  onSelect?: (dreamId: string, isSelected: boolean) => void;
  onEnterMultiSelectMode?: (dreamId: string) => void;
  onMultiSelectContextMenu?: (e: React.MouseEvent) => void;
}

interface DragItem {
  index: number;
  id: string;
  type: string;
}

const ITEM_TYPE = 'dream';

const DreamItem: React.FC<DreamItemProps> = ({ 
  dream, 
  index, 
  onMove, 
  onEdit, 
  onDelete, 
  totalItems = 0,
  isSelected = false,
  multiSelectMode = false,
  onSelect,
  onEnterMultiSelectMode,
  onMultiSelectContextMenu
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number }>({ 
    visible: false, x: 0, y: 0 
  });

  // Close context menu when clicking elsewhere
  useEffect(() => {
    const handleClick = () => setContextMenu({ visible: false, x: 0, y: 0 });
    if (contextMenu.visible) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [contextMenu.visible]);

  // Handle right-click context menu
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    
    // If in multi-select mode and this item is selected, show multi-select menu
    if (multiSelectMode && isSelected && onMultiSelectContextMenu) {
      onMultiSelectContextMenu(e);
    } else {
      // Show individual item context menu
      setContextMenu({
        visible: true,
        x: e.clientX,
        y: e.clientY
      });
    }
  };

  // Handle click with multi-select support
  const handleClick = (e: React.MouseEvent) => {
    if (multiSelectMode && onSelect) {
      // In multi-select mode, toggle selection
      onSelect(dream.id, !isSelected);
    } else if (e.ctrlKey || e.metaKey) {
      // Ctrl/Cmd+click to enter multi-select mode
      if (onEnterMultiSelectMode) {
        onEnterMultiSelectMode(dream.id);
      }
    }
    // Normal click behavior is handled by individual buttons
  };

  // Handle move up - move current item to position above
  const handleMoveUp = () => {
    if (index > 0) {
      // Move FROM current position TO the position above (index - 1)
      onMove(index, index - 1);
    }
    setContextMenu({ visible: false, x: 0, y: 0 });
  };

  // Handle move down - move current item to position below  
  const handleMoveDown = () => {
    if (index < totalItems - 1) {
      // Move FROM current position TO the position below (index + 1)
      onMove(index, index + 1);
    }
    setContextMenu({ visible: false, x: 0, y: 0 });
  };

  const [{ handlerId, isOver }, drop] = useDrop<DragItem, void, { handlerId: string | symbol | null; isOver: boolean }>({
    accept: ITEM_TYPE,
    collect(monitor) {
      return {
        handlerId: monitor.getHandlerId(),
        isOver: monitor.isOver(),
      };
    },
    hover(item, monitor) {
      if (!ref.current) {
        return;
      }
      const dragIndex = item.index;
      const hoverIndex = index;

      // Don't replace items with themselves
      if (dragIndex === hoverIndex) {
        return;
      }

      // Determine rectangle on screen
      const hoverBoundingRect = ref.current?.getBoundingClientRect();

      // Get vertical middle
      // const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;

      // Determine mouse position
      const clientOffset = monitor.getClientOffset();

      // Get pixels to the top
      const hoverClientY = clientOffset!.y - hoverBoundingRect.top;

      // More intuitive threshold - use 30% instead of 50% for better responsiveness
      const threshold = (hoverBoundingRect.bottom - hoverBoundingRect.top) * 0.3;

      // Dragging downwards
      if (dragIndex < hoverIndex && hoverClientY < threshold) {
        return;
      }

      // Dragging upwards
      if (dragIndex > hoverIndex && hoverClientY > (hoverBoundingRect.bottom - hoverBoundingRect.top) - threshold) {
        return;
      }

      // Time to actually perform the action
      onMove(dragIndex, hoverIndex);

      // Note: we're mutating the monitor item here!
      // Generally it's better to avoid mutations, but it's good here for the sake of performance
      // to avoid expensive index searches.
      item.index = hoverIndex;
    },
  });

  const [{ isDragging }, drag] = useDrag({
    type: ITEM_TYPE,
    item: () => {
      return { id: dream.id, index };
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const opacity = isDragging ? 0.5 : 1;
  const scale = isDragging ? 'scale(1.05)' : 'scale(1)';
  
  // Multi-select styling
  let borderColor = 'border-border';
  let backgroundColor = 'bg-card';
  
  if (isSelected) {
    borderColor = 'border-primary';
    backgroundColor = 'bg-primary/10';
  } else if (isOver && !isDragging) {
    borderColor = 'border-primary';
    backgroundColor = 'bg-primary/5';
  }
  
  drag(drop(ref));

  // Format date to DD/MM/YY
  const date = new Date(dream.timestamp);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  const formattedDate = `${day}/${month}/${year}`;

  return (
    <>
      <div 
        ref={ref} 
        style={{ 
          opacity, 
          transform: scale,
          transition: 'all 0.2s ease'
        }} 
        data-handler-id={handlerId} 
        className={`${backgroundColor} border ${borderColor} rounded-lg p-1.5 mb-1.5 shadow-sm hover:shadow-md transition-all ${multiSelectMode ? 'cursor-pointer' : 'cursor-move'} ${isSelected ? 'ring-2 ring-primary/30' : ''}`}
        onContextMenu={handleContextMenu}
        onClick={handleClick}
      >
      <div className="flex items-center gap-1.5">
        <div className="flex-shrink-0 w-12 flex items-center justify-center gap-1">
          {multiSelectMode ? (
            // Checkbox in multi-select mode
            <div className="w-4 h-4 rounded border-2 border-primary flex items-center justify-center bg-background">
              {isSelected && (
                <svg className="w-3 h-3 text-primary" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>
          ) : (
            // Normal drag handle
            <div className="text-muted-foreground text-xs leading-none hover:text-primary transition-colors cursor-grab active:cursor-grabbing">⋮⋮</div>
          )}
          <div 
            className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden border"
            style={{ 
              backgroundColor: dream.iconColor || '#6B7280',
              borderColor: 'rgba(255, 255, 255, 0.3)'
            }}
          >
          </div>
        </div>
        <div className="flex-1 ml-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 flex flex-col flex-grow min-w-0">
              {/* Line 1: Date and Title */}
              <div className="flex items-center gap-2 mb-0.5 min-w-0">
                <h3 className="font-semibold text-primary text-sm leading-tight break-words whitespace-normal min-w-0 flex-shrink truncate">
                  {formattedDate} - {dream.name}
                </h3>
                {typeof dream.displayOrder === 'number' && (
                  <span className="ml-2 px-2 py-0.5 rounded bg-muted text-xs text-muted-foreground border border-border" title="Sequence Number">
                    #{dream.displayOrder}
                  </span>
                )}
              </div>
              
              {/* Line 2: Tags (truncated if needed) */}
              {dream.tags && dream.tags.length > 0 && (
                <div className="flex gap-1 flex-wrap min-w-0 mb-0.5 overflow-hidden max-h-6">
                  {dream.tags.map((tag, index) => (
                    <span key={index} className="px-1.5 py-0.5 text-xs rounded-full font-medium whitespace-nowrap flex-shrink-0 bg-primary/10 text-primary border border-primary/20">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              
              {/* Line 3: Description (hidden on mobile, shown on desktop) */}
              {dream.description && (
                <p className="text-muted-foreground text-xs leading-tight min-w-0 hidden md:block truncate">
                  {dream.description}
                </p>
              )}
            </div>
            <div className="flex items-center gap-8 ml-5 flex-shrink-0">
              <button className="p-1 rounded-full hover:bg-primary/10 text-primary hover:text-primary/90 transition-colors"
                onClick={() => onEdit(dream)}
              >
                <span className="text-xs">✏️</span>
              </button>
              <button className="p-1 rounded-full hover:bg-red-500/10 text-red-500 hover:text-red-600 transition-colors"
                onClick={() => onDelete(dream.id)}
              >
                <span className="text-xs">🗑️</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* Context Menu */}
      {contextMenu.visible && (
        <div
          className="fixed bg-background border border-border rounded-md shadow-lg py-1 z-50 min-w-[140px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleMoveUp}
            disabled={index === 0}
            className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
            Move Up
          </button>
          <button
            onClick={handleMoveDown}
            disabled={index === totalItems - 1}
            className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            Move Down
          </button>
        </div>
      )}
    </>
  );
};

export default DreamItem;
