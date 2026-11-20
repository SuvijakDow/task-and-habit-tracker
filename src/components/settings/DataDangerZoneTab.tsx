import React from 'react';
import { Download, RotateCcw, ShieldAlert, Trash2, Upload } from 'lucide-react';

interface DataDangerZoneTabProps {
  disabled: boolean;
  isExporting: boolean;
  onExportClick: () => void;
  onImportClick: () => void;
  onResetTasksClick: () => void;
  onResetHabitsClick: () => void;
  onDeleteAccountClick: () => void;
}

export const DataDangerZoneTab: React.FC<DataDangerZoneTabProps> = ({
  disabled,
  isExporting,
  onExportClick,
  onImportClick,
  onResetTasksClick,
  onResetHabitsClick,
  onDeleteAccountClick,
}) => {
  return (
    <div className="space-y-6">
      {/* Export/Import Backup JSON Section */}
      <div className="p-4 sm:p-6 rounded-2xl bg-blue-50/70 border-2 border-blue-200/90 space-y-2.5 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
            <Download size={16} />
          </div>
          <div>
            <h3 className="font-bold text-blue-950 text-sm sm:text-base">Data Backup (JSON)</h3>
            <p className="text-xs text-blue-700 font-medium">
              Download or restore a backup file of your tasks, habits, and presets.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5">
          <button
            type="button"
            onClick={onExportClick}
            disabled={disabled}
            className="flex-1 inline-flex items-center justify-center gap-2 min-h-[38px] px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all disabled:opacity-50 text-xs sm:text-sm shadow-sm"
          >
            <Download size={15} />
            {isExporting ? 'Exporting...' : 'Export Backup'}
          </button>

          <button
            type="button"
            onClick={onImportClick}
            disabled={disabled}
            className="flex-1 inline-flex items-center justify-center gap-2 min-h-[38px] px-4 py-2 bg-white border-2 border-blue-300 text-blue-700 font-bold rounded-xl hover:bg-blue-50 transition-all disabled:opacity-50 text-xs sm:text-sm shadow-sm"
          >
            <Upload size={15} />
            Import Backup
          </button>
        </div>
      </div>

      {/* Module Data Reset */}
      <div className="p-4 rounded-2xl bg-amber-50/70 border-2 border-amber-200/90 space-y-3 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
            <RotateCcw size={16} />
          </div>
          <div>
            <h3 className="font-bold text-amber-950 text-sm sm:text-base">Module Data Reset</h3>
            <p className="text-xs text-amber-800 font-medium">
              Clear specific modules without deleting your account.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={onResetTasksClick}
            disabled={disabled}
            className="inline-flex items-center justify-center gap-1.5 min-h-[38px] px-3 py-2 bg-white border-2 border-amber-300 text-amber-900 font-bold rounded-xl hover:bg-amber-100/50 transition-all text-xs disabled:opacity-50 shadow-sm"
          >
            <RotateCcw size={13} />
            Reset All Tasks
          </button>

          <button
            type="button"
            onClick={onResetHabitsClick}
            disabled={disabled}
            className="inline-flex items-center justify-center gap-1.5 min-h-[38px] px-3 py-2 bg-white border-2 border-amber-300 text-amber-900 font-bold rounded-xl hover:bg-amber-100/50 transition-all text-xs disabled:opacity-50 shadow-sm"
          >
            <RotateCcw size={13} />
            Reset All Habits
          </button>
        </div>
      </div>

      {/* Account Danger Zone */}
      <div className="p-4 rounded-2xl bg-rose-50/70 border-2 border-rose-200/90 space-y-3 shadow-md">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
            <ShieldAlert size={17} />
          </div>
          <div>
            <h3 className="font-bold text-rose-950 text-sm sm:text-base">Account Danger Zone</h3>
            <p className="text-xs text-rose-700 font-medium">
              Permanently remove your profile and all associated data.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onDeleteAccountClick}
          disabled={disabled}
          className="w-full inline-flex items-center justify-center gap-1.5 min-h-[38px] px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm transition shadow-md disabled:opacity-50"
        >
          <Trash2 size={15} />
          Delete Account Permanently
        </button>
      </div>
    </div>
  );
};
