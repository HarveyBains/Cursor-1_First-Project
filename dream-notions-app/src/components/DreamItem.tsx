import React, { useRef } from 'react';
import type { DreamEntry } from '../types/DreamEntry';
import { useDrag, useDrop } from 'react-dnd';

interface DreamItemProps {
  dream: DreamEntry;
  index: number;
  onToggleFavorite: (id: string) => void;
  onMove: (dragIndex: number, hoverIndex: number) => void;
  onEdit: (dream: DreamEntry) => void;
  onDelete: (id: string) => void;
}

interface DragItem {
  index: number;
  id: string;
  type: string;
}

const ITEM_TYPE = 'dream';

const DreamItem: React.FC<DreamItemProps> = ({ dream, index, onToggleFavorite, onMove, onEdit, onDelete }) => {
  const ref = useRef<HTMLDivElement>(null);

  const [{ handlerId }, drop] = useDrop<DragItem, void, { handlerId: string | symbol | null }>({ // Explicitly define the type for the collected properties
    accept: ITEM_TYPE,
    collect(monitor) {
      return {
        handlerId: monitor.getHandlerId(),
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
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;

      // Determine mouse position
      const clientOffset = monitor.getClientOffset();

      // Get pixels to the top
      const hoverClientY = clientOffset!.y - hoverBoundingRect.top;

      // Only perform the move when the mouse has crossed half of the items height
      // When dragging downwards, only move when the cursor is below 50%
      // When dragging upwards, only move when the cursor is above 50%

      // Dragging downwards
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return;
      }

      // Dragging upwards
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
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

  const opacity = isDragging ? 0 : 1;
  drag(drop(ref));

  // Format date to DD/MM/YY
  const date = new Date(dream.timestamp);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  const formattedDate = `${day}/${month}/${year}`;

  return (
    <div ref={ref} style={{ opacity }} data-handler-id={handlerId} className="bg-card border border-border rounded-lg p-1.5 mb-1.5 shadow-sm hover:shadow-md transition-shadow cursor-move">
      <div className="flex items-center gap-1.5">
        <div className="flex-shrink-0 w-12 flex flex-col items-center">
          <div className="text-muted-foreground text-xs leading-none mb-0.5">⋮⋮</div>
          <div className="w-5 h-5 rounded-full flex items-center justify-center mb-0.5 flex-shrink-0 overflow-hidden text-white"
            style={dream.iconColor ? { backgroundColor: dream.iconColor } : {}} // Apply background only if color is set
          >
          </div>
          
        </div>
        <div className="flex-1 ml-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex-1 flex flex-col flex-grow">
              <h3 className="font-semibold text-primary text-sm leading-tight break-words whitespace-normal mb-0.5">
                {formattedDate} - {dream.name}
              </h3>
              <div className="flex items-center gap-1 mb-0.5 overflow-hidden">
                <div className="flex gap-1 min-w-0 flex-shrink">
                  {dream.tags && dream.tags.map((tag, index) => (
                    <span key={index} className="px-1.5 py-0.5 text-xs rounded-full font-medium whitespace-nowrap flex-shrink-0 bg-primary/10 text-primary border border-primary/20">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <p className="text-muted-foreground text-xs mt-0.5 line-clamp-1 leading-tight min-w-0">
                {dream.description}
              </p>
            </div>
            <div className="flex items-center gap-8 ml-5 flex-shrink-0">
              <button 
                onClick={() => onToggleFavorite(dream.id)}
                className={`p-1 rounded-full transition-colors ${dream.isFavorite ? 'text-yellow-400 hover:text-yellow-500' : 'text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400'} hover:bg-gray-50 dark:hover:bg-gray-900/20`}
              >
                <span className="text-sm">★</span>
              </button>
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
  );
};

export default DreamItem;
