import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (count: number | null | 'today') => void;
  totalRecords: number;
  latestDateCount: number;
}

const ExportDialog: React.FC<ExportDialogProps> = ({ isOpen, onClose, onExport, totalRecords, latestDateCount }) => {
  const [exportType, setExportType] = useState<'today' | 'all' | 'custom'>('today');
  const [customCount, setCustomCount] = useState('');
  const [panelPos, setPanelPos] = useState({ top: 120, left: 120 });
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (isOpen) {
      const width = 500;
      const height = 400;
      const top = Math.max(40, window.innerHeight / 2 - height / 2);
      const left = Math.max(40, window.innerWidth / 2 - width / 2);
      setPanelPos({ top, left });
    }
  }, [isOpen]);

  useEffect(() => {
    if (!dragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      setPanelPos(pos => ({
        top: Math.max(0, e.clientY - dragOffset.current.y),
        left: Math.max(0, e.clientX - dragOffset.current.x),
      }));
    };
    const handleMouseUp = () => {
      setDragging(false);
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (exportType === 'today') {
      onExport('today');
    } else if (exportType === 'all') {
      onExport(null);
    } else {
      const requestedCount = parseInt(customCount.trim(), 10);
      
      if (isNaN(requestedCount) || requestedCount <= 0) {
        alert('Please enter a valid positive number.');
        return;
      }
      
      if (requestedCount > totalRecords) {
        alert(`You only have ${totalRecords} records available. Exporting all ${totalRecords} records.`);
        onExport(null);
        return;
      }
      
      onExport(requestedCount);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    dragOffset.current = {
      x: e.clientX - panelPos.left,
      y: e.clientY - panelPos.top,
    };
    document.body.style.userSelect = 'none';
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: panelPos.top,
        left: panelPos.left,
        zIndex: 1000,
        minWidth: 400,
        maxWidth: 600,
        width: 500,
        height: 420,
        minHeight: 320,
        boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
        cursor: dragging ? 'move' : 'default',
        display: 'flex',
        flexDirection: 'column',
      }}
      className="bg-card border border-border shadow-lg rounded-lg p-0"
    >
      <div
        className="flex items-center justify-between px-4 py-2 rounded-t-lg cursor-move bg-muted border-b border-border"
        style={{ userSelect: 'none' }}
        onMouseDown={handleMouseDown}
      >
        <span className="font-semibold text-primary">Export Dreams</span>
        <Button size="icon" variant="ghost" onClick={onClose} title="Close Export Dialog">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </Button>
      </div>
      <div className="flex-1 flex flex-col min-h-0 p-4 overflow-auto">
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <div className="mb-6 flex-1 overflow-auto">
            <p className="text-sm text-muted-foreground mb-4 text-center">
              Choose what to export:
            </p>
            <div className="space-y-3">
              {/* Today Option */}
              <label className="flex items-center p-3 border border-border rounded-md cursor-pointer hover:bg-muted/20 transition-colors">
                <input
                  type="radio"
                  name="exportType"
                  value="today"
                  checked={exportType === 'today'}
                  onChange={(e) => setExportType(e.target.value as 'today')}
                  className="mr-3 text-primary focus:ring-primary"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-foreground">Last Day's Dreams</div>
                  <div className="text-xs text-muted-foreground">{latestDateCount} records from last day with dreams</div>
                </div>
              </label>
              {/* All Option */}
              <label className="flex items-center p-3 border border-border rounded-md cursor-pointer hover:bg-muted/20 transition-colors">
                <input
                  type="radio"
                  name="exportType"
                  value="all"
                  checked={exportType === 'all'}
                  onChange={(e) => setExportType(e.target.value as 'all')}
                  className="mr-3 text-primary focus:ring-primary"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-foreground">All Dreams</div>
                  <div className="text-xs text-muted-foreground">{totalRecords} total records</div>
                </div>
              </label>
              {/* Custom Number Option */}
              <label className="flex items-center p-3 border border-border rounded-md cursor-pointer hover:bg-muted/20 transition-colors">
                <input
                  type="radio"
                  name="exportType"
                  value="custom"
                  checked={exportType === 'custom'}
                  onChange={(e) => setExportType(e.target.value as 'custom')}
                  className="mr-3 text-primary focus:ring-primary"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-foreground">Custom Amount</div>
                  <div className="text-xs text-muted-foreground">Choose how many records</div>
                </div>
              </label>
            </div>
            {exportType === 'custom' && (
              <div className="mt-4">
                <input
                  type="number"
                  className="w-full p-2 border border-border rounded-md bg-input text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  value={customCount}
                  onChange={(e) => setCustomCount(e.target.value)}
                  placeholder="Enter number of records"
                  min="1"
                  max={totalRecords}
                  required
                />
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3 mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
            >
              Export
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ExportDialog;