import React from 'react';
import type { DreamEntry } from '../types/DreamEntry';

const DreamItem: React.FC<{ dream: DreamEntry }> = ({ dream }) => {
  return (
    <div className="bg-card border border-border rounded-lg p-1.5 mb-1.5 shadow-sm hover:shadow-md transition-shadow cursor-move">
      <div className="flex items-center gap-1.5">
        <div className="flex-shrink-0 w-12 flex flex-col items-center">
          <div className="text-muted-foreground text-xs leading-none mb-0.5">⋮⋮</div>
          <div className="w-7 h-7 rounded-full flex items-center justify-center mb-0.5 flex-shrink-0 overflow-hidden">
            <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 shadow-sm" />
          </div>
          <span className="text-xs text-muted-foreground text-center leading-none w-12 truncate min-h-[1em]">
            {dream.icon || 'Neutral'}
          </span>
        </div>
        <div className="flex-1 min-w-0 ml-1">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h3 className="font-semibold text-primary text-sm leading-tight">
                  {dream.name}
                </h3>
              </div>
              <div className="flex items-center gap-1 mb-0.5 overflow-hidden">
                <div className="flex gap-1 min-w-0 flex-shrink">
                  {dream.tags && dream.tags.map((tag, index) => (
                    <span key={index} className="px-1.5 py-0.5 text-xs rounded-full font-medium whitespace-nowrap flex-shrink-0 bg-primary/10 text-primary border border-primary/20">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <p className="text-muted-foreground text-xs mt-0.5 line-clamp-1 leading-tight">
                {dream.description}
              </p>
            </div>
            <div className="flex items-center gap-8 ml-5 flex-shrink-0">
              <button className="p-1 rounded-full transition-colors text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900/20">
                <span className="text-sm">★</span>
              </button>
              <button className="p-1 rounded-full hover:bg-primary/10 text-primary hover:text-primary/90 transition-colors">
                <span className="text-xs">✏️</span>
              </button>
              <button className="p-1 rounded-full hover:bg-red-500/10 text-red-500 hover:text-red-600 transition-colors">
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
