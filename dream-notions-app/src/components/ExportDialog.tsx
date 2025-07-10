import React, { useState, useEffect } from 'react';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (count: number | null | 'today') => void;
  totalRecords: number;
  todayCount: number;
}

const ExportDialog: React.FC<ExportDialogProps> = ({ isOpen, onClose, onExport, totalRecords, todayCount }) => {
  const [exportType, setExportType] = useState<'today' | 'all' | 'custom'>('today');
  const [customCount, setCustomCount] = useState('');

  useEffect(() => {
    if (isOpen) {
      setExportType('today');
      setCustomCount('');
    }
  }, [isOpen]);

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-card p-6 rounded-lg shadow-xl w-full max-w-md border border-border">
        <h2 className="text-lg font-semibold mb-6 text-foreground text-center">Export Dreams</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <p className="text-sm text-muted-foreground mb-4 text-center">
              Choose what to export:
            </p>
            
            {/* Export Options */}
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
                  <div className="text-sm font-medium text-foreground">Today's Dreams</div>
                  <div className="text-xs text-muted-foreground">{todayCount} records from today</div>
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

            {/* Custom Number Input */}
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

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md text-sm font-medium transition-colors border border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Export
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ExportDialog;