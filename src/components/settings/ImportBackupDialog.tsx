import React, { useRef, useState } from 'react';
import { ShieldAlert, Upload } from 'lucide-react';
import { BackupImportMode } from '@/services/backupService';
import { showToast } from '@/components/ui/Toast';

interface ImportBackupDialogProps {
  isOpen: boolean;
  importMode: BackupImportMode;
  isImporting: boolean;
  onImportModeChange: (mode: BackupImportMode) => void;
  onImportFile: (file: File) => Promise<void>;
  onClose: () => void;
}

export const ImportBackupDialog: React.FC<ImportBackupDialogProps> = ({
  isOpen,
  importMode,
  isImporting,
  onImportModeChange,
  onImportFile,
  onClose,
}) => {
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDraggingOver) setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    const file = e.dataTransfer.files?.[0];
    if (file && (file.type === 'application/json' || file.name.toLowerCase().endsWith('.json'))) {
      await onImportFile(file);
    } else {
      showToast('Please drop a valid JSON backup file', 'error');
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await onImportFile(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="modal-enter w-full max-w-lg rounded-2xl border border-blue-200 bg-white p-5 shadow-2xl space-y-4">
        <div className="flex items-center gap-3 text-blue-700 font-bold">
          <Upload size={20} />
          <span>Import Data Backup</span>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-semibold text-gray-700">Import Mode:</p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => onImportModeChange('replace')}
              className={`flex-1 p-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                importMode === 'replace'
                  ? 'border-rose-500 bg-rose-50 text-rose-700'
                  : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300'
              }`}
            >
              <div className="font-bold mb-1">Replace</div>
              <div className="text-xs font-normal">Delete existing data</div>
            </button>
            <button
              type="button"
              onClick={() => onImportModeChange('merge')}
              className={`flex-1 p-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                importMode === 'merge'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300'
              }`}
            >
              <div className="font-bold mb-1">Merge</div>
              <div className="text-xs font-normal">Add to existing data</div>
            </button>
          </div>
        </div>

        <div
          className={`${
            importMode === 'replace' ? 'bg-rose-50 border-rose-200' : 'bg-blue-50 border-blue-200'
          } border rounded-xl p-3`}
        >
          <p
            className={`text-xs font-semibold flex items-start gap-2 ${
              importMode === 'replace' ? 'text-rose-800' : 'text-blue-800'
            }`}
          >
            <ShieldAlert size={14} className="mt-0.5 flex-shrink-0" />
            <span>
              <span
                className={`font-bold ${
                  importMode === 'replace' ? 'text-rose-900' : 'text-blue-900'
                }`}
              >
                {importMode === 'replace' ? 'Warning:' : 'Merge Info:'}
              </span>{' '}
              {importMode === 'replace'
                ? 'This will delete all your existing data and replace it with the backup file. This action cannot be undone.'
                : 'This will merge backup data into your existing data. Matching routines and periods will be merged directly, existing items will be updated without duplicates, and any new items will be added.'}
            </span>
          </p>
        </div>

        <div
          className={`border-2 border-dashed rounded-xl p-6 text-center transition-all min-h-[140px] flex items-center justify-center ${
            isImporting
              ? 'border-blue-500 bg-blue-100'
              : isDraggingOver
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 bg-gray-50'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {isImporting ? (
            <div className="w-full">
              <div className="animate-spin mx-auto mb-2">
                <Upload size={32} className="text-blue-500" />
              </div>
              <p className="text-sm font-semibold text-blue-700">Importing backup file...</p>
              <p className="text-xs text-gray-500 mt-1">Please wait while we restore your data</p>
            </div>
          ) : isDraggingOver ? (
            <div className="w-full">
              <Upload size={32} className="mx-auto text-blue-500 mb-2" />
              <p className="text-sm font-semibold text-blue-700">Drop your backup file here</p>
            </div>
          ) : (
            <div className="w-full">
              <Upload size={32} className="mx-auto text-gray-400 mb-2" />
              <p className="text-sm font-medium text-gray-600 mb-2">
                Drag and drop your backup file here
              </p>
              <p className="text-xs text-gray-500">or</p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-all"
              >
                Select File
              </button>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          onChange={handleFileSelect}
          className="hidden"
          aria-label="Import backup file"
        />

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isImporting}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
