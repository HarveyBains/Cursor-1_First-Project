import React from 'react';

interface TagBreadcrumbsProps {
  activeTagFilter: string | null;
  setActiveTagFilter: (tag: string | null) => void;
  recordCount: number;
}

const TagBreadcrumbs: React.FC<TagBreadcrumbsProps> = ({ activeTagFilter, setActiveTagFilter, recordCount }) => {
  const pathParts = activeTagFilter ? activeTagFilter.split('/') : [];

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between text-sm text-muted-foreground">
      <div className="flex flex-wrap items-center gap-1">
        <button
          onClick={() => setActiveTagFilter(null)}
          className={`px-2 py-1 rounded-md transition-colors ${!activeTagFilter ? 'bg-muted text-foreground' : 'hover:bg-muted hover:text-foreground'}`}
        >
          All
        </button>
        {
          pathParts.map((part, index) => {
            const currentPath = pathParts.slice(0, index + 1).join('/');
            const isLast = index === pathParts.length - 1;
            return (
              <React.Fragment key={currentPath}>
                <span>/</span>
                <button
                  onClick={() => setActiveTagFilter(currentPath)}
                  className={`px-2 py-1 rounded-md transition-colors ${isLast ? 'bg-muted text-foreground' : 'hover:bg-muted hover:text-foreground'}`}
                >
                  {part}
                </button>
              </React.Fragment>
            );
          })
        }
      </div>
      <div className="text-right text-muted-foreground">
        {recordCount} records
      </div>
    </div>
  );
};

export default TagBreadcrumbs;
