import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Layers, Trash2, Edit2 } from 'lucide-react';
import { HabitSet } from '@/types';
import { PASTEL_HABIT_COLORS } from '@/services/habitService';

interface ManageHabitSetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  habitSets: HabitSet[];
  activeSetId: string;
  onSelectActiveSet: (setId: string) => Promise<void>;
  onCreateSet: (name: string, color?: string) => Promise<void>;
  onUpdateSet: (setId: string, updates: Partial<Pick<HabitSet, 'name' | 'color'>>) => Promise<void>;
  onDeleteSet: (setId: string) => Promise<void>;
}

export const ManageHabitSetsModal: React.FC<ManageHabitSetsModalProps> = ({
  isOpen,
  onClose,
  habitSets,
  activeSetId,
  onSelectActiveSet,
  onCreateSet,
  onUpdateSet,
  onDeleteSet,
}) => {
  const [newSetName, setNewSetName] = useState('');
  const [newSetColor, setNewSetColor] = useState(PASTEL_HABIT_COLORS[7]); // Purple default
  const [isCreating, setIsCreating] = useState(false);
  const [editingSetId, setEditingSetId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [deletingSet, setDeletingSet] = useState<HabitSet | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sortedHabitSets = React.useMemo(() => {
    return [...habitSets].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
    );
  }, [habitSets]);

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSetName.trim()) return;
    try {
      setIsSubmitting(true);
      await onCreateSet(newSetName.trim(), newSetColor);
      setNewSetName('');
      setIsCreating(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEdit = async (setId: string) => {
    if (!editName.trim()) return;
    try {
      setIsSubmitting(true);
      await onUpdateSet(setId, { name: editName.trim(), color: editColor });
      setEditingSetId(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-gradient-to-b from-slate-950/40 via-purple-950/25 to-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[10000] p-3 sm:p-4">
      <div className="modal-enter w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-purple-100 overflow-hidden flex flex-col max-h-[90dvh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-purple-50 via-pink-50/50 to-white">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900 truncate">Manage Presets</h2>
              <p className="text-xs text-gray-500 font-medium truncate">Organize your routine presets</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="h-9 w-9 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition flex items-center justify-center"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 bg-slate-50/50">
          {/* List of Habit Sets */}
          <div className="space-y-2.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
              Your Routine Presets
            </label>

            {sortedHabitSets.map((set) => {
              const isActive = set.id === activeSetId;
              const isEditing = set.id === editingSetId;

              if (isEditing) {
                return (
                  <div key={set.id} className="p-3.5 bg-white rounded-xl border-2 border-purple-400 shadow-sm space-y-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="e.g. Semester, Vacation"
                        className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-purple-200 focus:border-purple-500 focus:outline-none"
                        autoFocus
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-gray-500 font-medium mr-1">Color:</span>
                      {PASTEL_HABIT_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setEditColor(c)}
                          className={`w-6 h-6 rounded-full border ${
                            editColor === c ? 'border-purple-600 scale-110 shadow-xs' : 'border-transparent'
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setEditingSetId(null)}
                        className="px-3 py-1 text-xs rounded-lg text-gray-600 hover:bg-gray-100"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => handleSaveEdit(set.id)}
                        className="px-3.5 py-1 text-xs font-semibold rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={set.id}
                  className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                    isActive
                      ? 'bg-purple-50/90 border-purple-300 shadow-sm'
                      : 'bg-white border-gray-200 hover:border-purple-200'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span
                      className="w-4 h-4 rounded-full flex-shrink-0 shadow-xs"
                      style={{ backgroundColor: set.color || '#C084FC' }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-gray-900 truncate">{set.name}</span>
                        {isActive && (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-purple-600 text-white">
                            Active
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {!isActive && (
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => onSelectActiveSet(set.id)}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-purple-100 text-purple-700 hover:bg-purple-200 transition"
                      >
                        Activate
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setEditingSetId(set.id);
                        setEditName(set.name);
                        setEditColor(set.color || '#C084FC');
                      }}
                      className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition"
                      title="Rename/Recolor preset"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    {habitSets.length > 1 && (
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => setDeletingSet(set)}
                        className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        title="Delete preset"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Create New Preset Section */}
          {isCreating ? (
            <form onSubmit={handleCreate} className="p-3.5 bg-purple-50/50 rounded-xl border border-purple-200 space-y-3 mt-4">
              <h3 className="text-xs font-bold text-purple-900 uppercase tracking-wider">Create New Preset</h3>
              <input
                type="text"
                value={newSetName}
                onChange={(e) => setNewSetName(e.target.value)}
                placeholder="e.g. Vacation, Semester"
                className="w-full px-3 py-2 text-sm rounded-lg border border-purple-200 focus:border-purple-500 focus:outline-none bg-white"
                autoFocus
              />
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-500 font-medium mr-1">Color:</span>
                {PASTEL_HABIT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewSetColor(c)}
                    className={`w-6 h-6 rounded-full border ${
                      newSetColor === c ? 'border-purple-600 scale-110 shadow-xs' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-3 py-1.5 text-xs rounded-lg text-gray-600 hover:bg-gray-200/60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newSetName.trim()}
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
                >
                  Create Preset
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setIsCreating(true)}
              className="w-full py-2.5 border-2 border-dashed border-purple-200 hover:border-purple-400 rounded-xl text-purple-600 font-bold text-xs flex items-center justify-center gap-2 hover:bg-purple-50/50 transition truncate"
            >
              <Plus className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">Create New Preset</span>
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 bg-white flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-1.5 text-xs font-semibold rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition shadow-xs"
          >
            Done
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deletingSet && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-[2px] flex items-center justify-center z-[10010] p-4">
          <div className="modal-enter max-w-sm w-full bg-white rounded-2xl p-5 shadow-2xl border border-rose-100 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-base">Delete Preset?</h3>
                <p className="text-xs text-gray-500">"{deletingSet.name}" will be removed. Habits in this preset will move to default routine.</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setDeletingSet(null)}
                className="px-3.5 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={async () => {
                  try {
                    setIsSubmitting(true);
                    await onDeleteSet(deletingSet.id);
                    setDeletingSet(null);
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs"
              >
                Delete Preset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};
