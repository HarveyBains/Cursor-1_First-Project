
import React from 'react';

interface DebugDialogProps {
  isOpen: boolean;
  onClose: () => void;
  debugLogs: string[];
  onClearLogs: () => void;
  onCopyDebug: () => void;
  userInfo: {
    status: string;
    dreamsCount: number;
    dataSource: string;
    userId: string;
  };
}

const DebugDialog: React.FC<DebugDialogProps> = ({
  isOpen,
  onClose,
  debugLogs,
  onClearLogs,
  onCopyDebug,
  userInfo,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-lg shadow-lg max-w-2xl w-full mx-4 p-6 text-foreground"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-primary flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              <path d="M12 4.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm-3 6c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm6 0c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm-3 6c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5z" />
            </svg>
            Debug Console
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={onClearLogs}
              className="px-3 py-1.5 text-xs rounded-md font-medium transition-colors border border-primary/20 bg-primary/10 text-primary hover:bg-primary/20"
            >
              Clear
            </button>
            <button
              onClick={onCopyDebug}
              className="px-3 py-1.5 text-xs rounded-md font-medium transition-colors border border-primary/20 bg-primary/10 text-primary hover:bg-primary/20"
              title="Copy debug info to clipboard"
            >
              📋 Copy
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs rounded-md font-medium transition-colors border border-primary/20 bg-primary/10 text-primary hover:bg-primary/20"
            >
              Close
            </button>
          </div>
        </div>

        <div className="bg-muted/50 rounded-lg border border-border p-4 max-h-96 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 mb-4">
            <div className="text-xs text-muted-foreground">
              <strong className="text-foreground">User Status:</strong> {userInfo.status}
            </div>
            <div className="text-xs text-muted-foreground">
              <strong className="text-foreground">Dreams Count:</strong> {userInfo.dreamsCount}
            </div>
            <div className="text-xs text-muted-foreground">
              <strong className="text-foreground">Data Source:</strong> {userInfo.dataSource}
            </div>
            <div className="text-xs text-muted-foreground">
              <strong className="text-foreground">User ID:</strong> {userInfo.userId}
            </div>
          </div>

          <div className="border-t border-border pt-3">
            <strong className="text-sm text-foreground">Logs:</strong>
            <div className="mt-2 space-y-1.5 font-mono text-xs">
              {debugLogs.length === 0 ? (
                <div className="text-muted-foreground italic">No logs yet...</div>
              ) : (
                debugLogs.slice(-50).reverse().map((log, index) => (
                  <div key={index} className="text-muted-foreground break-words">
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DebugDialog;
