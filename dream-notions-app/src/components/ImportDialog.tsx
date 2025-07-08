import React, { useState } from 'react';

interface ImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (dreams: any[]) => void; // Will be DreamEntry[] later
  onReset: () => void;
  hasDreams: boolean;
}

const ImportDialog: React.FC<ImportDialogProps> = ({ isOpen, onClose, onImport, onReset, hasDreams }) => {
  const [importText, setImportText] = useState('');
  const [parseStatus, setParseStatus] = useState<'idle' | 'parsing' | 'success' | 'error'>('idle');
  const [parsedCount, setParsedCount] = useState(0);

  const handleImport = (): void => {
    if (!importText.trim()) {
      alert('Please paste your dream journal content');
      return;
    }

    setParseStatus('parsing');

    try {
      // Placeholder for actual parsing logic
      const dreams = importText.split('---').filter(Boolean).map(s => ({ id: Math.random().toString(), name: s.substring(0, 20) + '...' })); // Dummy parsing
      
      if (dreams.length === 0) {
        setParseStatus('error');
        alert('No valid dreams found in the text. Please check the format.');
        return;
      }

      setParsedCount(dreams.length);
      setParseStatus('success');
      
      setTimeout(() => {
        onImport(dreams);
        setImportText('');
        setParseStatus('idle');
        setParsedCount(0);
        onClose();
      }, 1500);
      
    } catch (error) {
      setParseStatus('error');
      alert('Error parsing dreams. Please check the format and try again.');
    }
  };

  const handleClose = (): void => {
    setImportText('');
    setParseStatus('idle');
    setParsedCount(0);
    onClose();
  };

  const handleReset = (): void => {
    if (confirm('This will permanently delete all your dream records. This action cannot be undone. Are you sure?')) {
      onReset();
      handleClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-card border-2 border-primary/20 rounded-lg p-5 max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-primary">
            Dream Import Panel
          </h2>
          
          <button
            onClick={handleReset}
            disabled={!hasDreams}
            className={`px-3 py-2 rounded-lg text-xs transition-colors font-medium flex items-center gap-1.5 border ${
              !hasDreams
                ? 'bg-muted/20 text-muted-foreground border-border cursor-not-allowed'
                : 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20'
            }`}
          >
            🗑️
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="Please paste in your dream journal content here"
              className="w-full h-64 px-3 py-2 border border-border rounded bg-muted/20 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm resize-none"
              disabled={parseStatus === 'parsing'}
            />
          </div>

          {parseStatus === 'success' && (
            <div className="px-3 py-2 bg-green-500/10 text-green-500 rounded text-sm">
              ✅ Found {parsedCount} dreams! Importing now...
            </div>
          )}

          {parseStatus === 'parsing' && (
            <div className="px-3 py-2 bg-primary/10 text-primary rounded text-sm">
              🔄 Parsing dreams...
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={parseStatus === 'parsing'}
              className="flex-1 px-4 py-2 bg-muted/20 hover:bg-muted/30 text-foreground rounded transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={parseStatus === 'parsing' || !importText.trim()}
              className={`flex-1 px-4 py-2 rounded transition-colors font-medium ${
                parseStatus === 'success'
                  ? 'bg-green-500 hover:bg-green-600 text-white'
                  : parseStatus === 'parsing'
                  ? 'bg-primary/50 text-primary-foreground cursor-not-allowed'
                  : 'bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
            >
              {parseStatus === 'success' ? '✅ Importing...' : parseStatus === 'parsing' ? '🔄 Parsing...' : 'Import Dreams'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportDialog;
