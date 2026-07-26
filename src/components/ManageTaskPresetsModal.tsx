import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Edit2, Layers, Plus, Trash2, X } from 'lucide-react';
import { TaskPreset } from '@/types';

interface ManageTaskPresetsModalProps {
  isOpen: boolean;
  presets: TaskPreset[];
  activePresetId: string;
  onClose: () => void;
  onActivate: (presetId: string) => Promise<void>;
  onCreate: (name: string, color: string) => Promise<void>;
  onUpdate: (presetId: string, updates: Partial<Pick<TaskPreset, 'name' | 'color'>>) => Promise<void>;
  onDelete: (presetId: string) => Promise<void>;
}

export function ManageTaskPresetsModal({
  isOpen, presets, activePresetId, onClose, onActivate, onCreate, onUpdate, onDelete,
}: ManageTaskPresetsModalProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#C084FC');
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingPreset, setDeletingPreset] = useState<TaskPreset | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('#C084FC');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const colors = ['#FCA5A5', '#FCD34D', '#86EFAC', '#67E8F9', '#93C5FD', '#C4B5FD', '#F0ABFC', '#FDBA74'];

  if (!isOpen) return null;

  const createPreset = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    try {
      setIsSubmitting(true);
      await onCreate(name.trim(), color);
      setName('');
      setColor('#C084FC');
      setIsCreating(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const savePreset = async (presetId: string) => {
    if (!editName.trim()) return;
    try {
      setIsSubmitting(true);
      await onUpdate(presetId, { name: editName.trim(), color: editColor });
      setEditingId(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
      <div className="modal-enter w-full max-w-md overflow-hidden rounded-2xl border border-purple-100 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 bg-gradient-to-r from-purple-50 to-white px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600 text-white"><Layers className="h-5 w-5" /></div>
            <div><h2 className="font-bold text-gray-900">Manage Task Presets</h2><p className="text-xs text-gray-500">Group tasks by context or project</p></div>
          </div>
          <button onClick={onClose} aria-label="Close presets" className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-3 p-5">
          {presets.map((preset) => {
            const active = preset.id === activePresetId;
            const isEditing = preset.id === editingId;
            if (isEditing) return <div key={preset.id} className="space-y-3 rounded-xl border-2 border-purple-400 bg-white p-3">
              <input value={editName} onChange={(event) => setEditName(event.target.value)} className="w-full rounded-lg border border-purple-200 px-3 py-2 text-sm outline-none focus:border-purple-500" autoFocus />
              <div className="flex flex-wrap gap-1.5">{colors.map((value) => <button key={value} type="button" onClick={() => setEditColor(value)} aria-label={`Select ${value}`} className={`h-6 w-6 rounded-full border-2 ${editColor === value ? 'scale-110 border-purple-600' : 'border-transparent'}`} style={{ backgroundColor: value }} />)}</div>
              <div className="flex justify-end gap-2"><button type="button" onClick={() => setEditingId(null)} className="rounded-lg px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100">Cancel</button><button type="button" disabled={isSubmitting || !editName.trim()} onClick={() => savePreset(preset.id)} className="rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Save</button></div>
            </div>;
            return <div key={preset.id} className={`flex items-center justify-between rounded-xl border p-3 ${active ? 'border-purple-300 bg-purple-50' : 'border-gray-200'}`}>
              <div className="flex min-w-0 items-center gap-2"><span className="h-3 w-3 flex-shrink-0 rounded-full" style={{ backgroundColor: preset.color || '#C084FC' }} /><p className="truncate text-sm font-semibold text-gray-900">{preset.name}</p></div>
              <div className="flex items-center gap-1">
                {!active && <button disabled={isSubmitting} onClick={() => onActivate(preset.id)} className="rounded-lg bg-purple-100 px-2.5 py-1.5 text-xs font-semibold text-purple-700 hover:bg-purple-200">Open</button>}
                <button disabled={isSubmitting} onClick={() => { setEditingId(preset.id); setEditName(preset.name); setEditColor(preset.color || '#C084FC'); }} title="Rename/Recolor preset" className="rounded-lg p-1.5 text-gray-400 hover:bg-purple-50 hover:text-purple-600"><Edit2 className="h-4 w-4" /></button>
                {presets.length > 1 && <button disabled={isSubmitting} onClick={() => setDeletingPreset(preset)} title="Delete preset" className="rounded-lg p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>}
              </div>
            </div>;
          })}
          {isCreating ? (
            <form onSubmit={createPreset} className="space-y-3 border-t border-purple-200 bg-purple-50/50 pt-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-purple-900">Create New Preset</h3>
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Work, Home, Semester" className="w-full rounded-lg border border-purple-200 bg-white px-3 py-2 text-sm outline-none focus:border-purple-500" autoFocus />
              <div className="flex flex-wrap gap-1.5">{colors.map((value) => <button key={value} type="button" onClick={() => setColor(value)} aria-label={`Select ${value}`} className={`h-6 w-6 rounded-full border-2 ${color === value ? 'scale-110 border-purple-600' : 'border-transparent'}`} style={{ backgroundColor: value }} />)}</div>
              <div className="flex justify-end gap-2"><button type="button" onClick={() => setIsCreating(false)} className="rounded-lg px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100">Cancel</button><button disabled={isSubmitting || !name.trim()} className="inline-flex items-center gap-1 rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-700 disabled:opacity-50"><Plus className="h-4 w-4" />Create Preset</button></div>
            </form>
          ) : <button type="button" onClick={() => setIsCreating(true)} className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-purple-200 py-2.5 text-xs font-bold text-purple-600 transition hover:border-purple-400 hover:bg-purple-50/50"><Plus className="h-4 w-4" />Create New Preset</button>}
        </div>
      </div>
      {deletingPreset && <div className="fixed inset-0 z-[10010] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px]">
        <div className="modal-enter w-full max-w-sm space-y-4 rounded-2xl border border-rose-100 bg-white p-5 shadow-2xl">
          <div className="flex items-center gap-3"><div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600"><Trash2 className="h-5 w-5" /></div><div><h3 className="font-bold text-gray-900">Delete Preset?</h3><p className="text-xs text-gray-500">&quot;{deletingPreset.name}&quot; and all tasks in this preset will be permanently deleted.</p></div></div>
          <div className="flex justify-end gap-2"><button disabled={isSubmitting} onClick={() => setDeletingPreset(null)} className="rounded-xl px-3.5 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100">Cancel</button><button disabled={isSubmitting} onClick={async () => { try { setIsSubmitting(true); await onDelete(deletingPreset.id); setDeletingPreset(null); } finally { setIsSubmitting(false); } }} className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50">Delete</button></div>
        </div>
      </div>}
    </div>, document.body
  );
}
