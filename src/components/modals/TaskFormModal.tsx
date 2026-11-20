import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowDown, ArrowUp, ListChecks, Plus, Settings2, Sparkles, X } from 'lucide-react';
import { Category, Subtask, Task, TaskPreset } from '@/types';
import { DEFAULT_TASK_CATEGORY_NAME } from '@/constants/defaults';
import { formatToDateString, toLocalDate } from '@/utils/dateUtils';
import { findCategoryByTaskValue, getDefaultCategoryValue } from '@/utils/categoryUtils';
import { CHIP_ICON_OPTIONS, TaskSmartChip, autoDetectLinkChip } from '@/components/tasks/TaskSmartChip';
import { SubtaskDateControl } from '@/components/tasks/SubtaskDateControl';

export interface TaskFormSubmitData {
  title: string;
  description: string;
  category: string;
  dueDate: Date | null;
  setId: string | undefined;
  subtasks: Subtask[];
  linkChip?: {
    url: string;
    label?: string;
    icon?: string;
  };
}

interface TaskFormModalProps {
  isOpen: boolean;
  mode: 'add' | 'edit';
  initialTask?: Task | null;
  initialDueDate?: string;
  categories: Category[];
  presets: TaskPreset[];
  activePresetId: string;
  onClose: () => void;
  onSubmit: (data: TaskFormSubmitData) => Promise<void>;
}

interface LocalFormState {
  title: string;
  description: string;
  category: string;
  dueDate: string;
  setId: string;
  subtasks: Subtask[];
  linkUrl: string;
  linkLabel: string;
  linkIcon: string;
}

export const TaskFormModal: React.FC<TaskFormModalProps> = ({
  isOpen,
  mode,
  initialTask,
  initialDueDate = '',
  categories,
  presets,
  activePresetId,
  onClose,
  onSubmit,
}) => {
  const [formData, setFormData] = useState<LocalFormState>({
    title: '',
    description: '',
    category: DEFAULT_TASK_CATEGORY_NAME,
    dueDate: '',
    setId: '',
    subtasks: [],
    linkUrl: '',
    linkLabel: '',
    linkIcon: 'link',
  });
  const [subtaskInputText, setSubtaskInputText] = useState('');
  const [subtaskInputDueDate, setSubtaskInputDueDate] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form cleanly each time the modal opens
  useEffect(() => {
    if (!isOpen) return;

    setError(null);
    setSubtaskInputText('');
    setSubtaskInputDueDate(null);
    setIsSubmitting(false);

    if (mode === 'edit' && initialTask) {
      const matchedCategory = findCategoryByTaskValue(categories, initialTask.category);
      const localDue = toLocalDate(initialTask.dueDate);
      setFormData({
        title: initialTask.title,
        description: initialTask.description || '',
        category: matchedCategory?.id || initialTask.category || getDefaultCategoryValue(categories),
        dueDate: localDue ? formatToDateString(localDue) : '',
        setId: initialTask.setId || presets[0]?.id || activePresetId,
        subtasks: initialTask.subtasks ? initialTask.subtasks.map((st) => ({ ...st })) : [],
        linkUrl: initialTask.linkChip?.url || '',
        linkLabel: initialTask.linkChip?.label || '',
        linkIcon: initialTask.linkChip?.icon || 'link',
      });
    } else {
      setFormData({
        title: '',
        description: '',
        category: getDefaultCategoryValue(categories),
        dueDate: initialDueDate || '',
        setId: activePresetId || presets[0]?.id || '',
        subtasks: [],
        linkUrl: '',
        linkLabel: '',
        linkIcon: 'link',
      });
    }
  }, [isOpen, mode, initialTask, initialDueDate, categories, presets, activePresetId]);

  if (!isOpen) return null;

  const isEdit = mode === 'edit';
  const idPrefix = isEdit ? 'edit-' : '';

  const isEditCategoryMissing =
    isEdit &&
    !!formData.category &&
    !categories.some(
      (category) => category.id === formData.category || category.name === formData.category
    );

  const handleLinkUrlChange = (newUrl: string) => {
    const auto = autoDetectLinkChip(newUrl);
    setFormData((prev) => {
      const shouldAutoIcon = !prev.linkIcon || prev.linkIcon === 'link' || !prev.linkUrl;
      const shouldAutoLabel = !prev.linkLabel;
      return {
        ...prev,
        linkUrl: newUrl,
        linkIcon: shouldAutoIcon ? auto.icon : prev.linkIcon,
        linkLabel: shouldAutoLabel ? auto.suggestedLabel : prev.linkLabel,
      };
    });
  };

  const handleAddSubtask = () => {
    if (!subtaskInputText.trim()) return;
    const newSt: Subtask = {
      id: 'subtask_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      title: subtaskInputText.trim(),
      isCompleted: false,
      ...(subtaskInputDueDate ? { dueDate: subtaskInputDueDate } : {}),
    };
    setFormData((prev) => ({
      ...prev,
      subtasks: [...prev.subtasks, newSt],
    }));
    setSubtaskInputText('');
    setSubtaskInputDueDate(null);
  };

  const handleRemoveSubtask = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      subtasks: prev.subtasks.filter((st) => st.id !== id),
    }));
  };

  const handleToggleSubtask = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      subtasks: prev.subtasks.map((st) =>
        st.id === id ? { ...st, isCompleted: !st.isCompleted } : st
      ),
    }));
  };

  const handleUpdateSubtaskTitle = (id: string, newTitle: string) => {
    setFormData((prev) => ({
      ...prev,
      subtasks: prev.subtasks.map((st) => (st.id === id ? { ...st, title: newTitle } : st)),
    }));
  };

  const handleUpdateSubtaskDueDate = (id: string, newDueDate: string | null) => {
    setFormData((prev) => ({
      ...prev,
      subtasks: prev.subtasks.map((st) => (st.id === id ? { ...st, dueDate: newDueDate } : st)),
    }));
  };

  const handleMoveSubtaskUp = (index: number) => {
    if (index <= 0) return;
    setFormData((prev) => {
      const updated = [...prev.subtasks];
      const temp = updated[index];
      updated[index] = updated[index - 1];
      updated[index - 1] = temp;
      return { ...prev, subtasks: updated };
    });
  };

  const handleMoveSubtaskDown = (index: number) => {
    setFormData((prev) => {
      if (index >= prev.subtasks.length - 1) return prev;
      const updated = [...prev.subtasks];
      const temp = updated[index];
      updated[index] = updated[index + 1];
      updated[index + 1] = temp;
      return { ...prev, subtasks: updated };
    });
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setError('Add a task title.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const selectedCategory = findCategoryByTaskValue(categories, formData.category);
      const linkChip = formData.linkUrl.trim()
        ? {
            url: formData.linkUrl.trim(),
            label: formData.linkLabel.trim() || undefined,
            icon: formData.linkIcon || 'link',
          }
        : undefined;

      await onSubmit({
        title: formData.title,
        description: formData.description,
        category: selectedCategory?.id || formData.category || getDefaultCategoryValue(categories),
        dueDate: formData.dueDate ? new Date(formData.dueDate) : null,
        setId: formData.setId || activePresetId || undefined,
        subtasks: formData.subtasks || [],
        linkChip,
      });
    } catch (err) {
      setError(
        isEdit
          ? 'Could not save task changes. Please try again.'
          : 'Could not create the task. Check your connection and try again.'
      );
      console.error(isEdit ? 'Error updating task:' : 'Error creating task:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-slate-950/40 sm:backdrop-blur-xs flex items-end sm:items-center justify-center z-[9999] p-0 sm:p-4 overflow-hidden">
      <div className="modal-enter w-full sm:max-w-lg h-dvh sm:h-[88dvh] max-h-dvh sm:max-h-[calc(100dvh-2rem)] flex flex-col bg-white border border-white/80 rounded-none sm:rounded-3xl shadow-[0_24px_56px_rgba(120,87,255,0.28)] overflow-hidden">
        <form onSubmit={handleFormSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-5 border-b border-purple-100/80 bg-purple-50/50 shrink-0">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
              {isEdit ? (
                <>
                  <Settings2 className="w-5 h-5 text-purple-600" />
                  Edit Task
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5 text-purple-600" />
                  Add New Task
                </>
              )}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="h-8 w-8 rounded-full text-gray-400 hover:text-gray-700 hover:bg-white transition flex items-center justify-center"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Form Body */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4">
            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm">
                {error}
              </div>
            )}

            {/* Title Input */}
            <div>
              <label htmlFor={`${idPrefix}title`} className="block text-xs font-semibold text-gray-700 mb-1">
                Task Title *
              </label>
              <input
                id={`${idPrefix}title`}
                type="text"
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Enter task title"
                className="w-full min-h-[42px] rounded-xl border border-purple-200 bg-white px-3.5 py-2 text-sm text-gray-800 placeholder:text-gray-400 shadow-2xs transition focus:border-purple-500 focus:ring-2 focus:ring-purple-400/30 focus:outline-none"
                disabled={isSubmitting}
                autoFocus={!isEdit}
              />
            </div>

            {/* Description Textarea */}
            <div>
              <label htmlFor={`${idPrefix}description`} className="block text-xs font-semibold text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id={`${idPrefix}description`}
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Enter task description (optional)"
                rows={2}
                className="w-full rounded-xl border border-purple-200 bg-white px-3.5 py-2 text-sm text-gray-800 placeholder:text-gray-400 shadow-2xs transition resize-none focus:border-purple-500 focus:ring-2 focus:ring-purple-400/30 focus:outline-none"
                disabled={isSubmitting}
              />
            </div>

            {/* Link Smart Chip Section */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-purple-50/50 border border-purple-100/90 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  Link Smart Chip (Optional)
                </label>
                {formData.linkUrl && (
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, linkUrl: '', linkLabel: '', linkIcon: 'link' }))
                    }
                    className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 hover:underline"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div>
                <input
                  type="url"
                  value={formData.linkUrl}
                  onChange={(e) => handleLinkUrlChange(e.target.value)}
                  placeholder="Paste URL (e.g. https://github.com/user/repo, Drive link...)"
                  className="w-full min-h-[38px] rounded-xl border border-purple-200 bg-white px-3.5 py-1.5 text-xs sm:text-sm text-gray-800 placeholder:text-gray-400 shadow-2xs transition focus:border-purple-500 focus:ring-2 focus:ring-purple-400/30 focus:outline-none"
                  disabled={isSubmitting}
                />
              </div>

              {formData.linkUrl.trim() !== '' && (
                <div className="space-y-2 pt-1 border-t border-purple-100/70">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                      Display Text (Label)
                    </label>
                    <input
                      type="text"
                      value={formData.linkLabel}
                      onChange={(e) => setFormData((prev) => ({ ...prev, linkLabel: e.target.value }))}
                      placeholder="Display text for link (e.g. GitHub Repo)"
                      className="w-full min-h-[36px] rounded-xl border border-purple-200 bg-white px-3 py-1 text-xs text-gray-800 placeholder:text-gray-400 shadow-2xs transition focus:border-purple-500 focus:ring-2 focus:ring-purple-400/30 focus:outline-none"
                      disabled={isSubmitting}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1.5">
                      Chip Icon
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {CHIP_ICON_OPTIONS.map((opt) => {
                        const IconComp = opt.icon;
                        const isSelected = (formData.linkIcon || 'link') === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setFormData((prev) => ({ ...prev, linkIcon: opt.id }))}
                            className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-xl text-xs transition-all ${
                              isSelected
                                ? 'bg-purple-600 text-white shadow-xs font-semibold'
                                : 'bg-white text-gray-700 hover:bg-purple-100/80 border border-purple-200/90 font-medium'
                            }`}
                          >
                            <IconComp className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate text-center">{opt.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Live Chip Preview */}
                  <div className="pt-1.5 flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-gray-500">Preview:</span>
                    <TaskSmartChip
                      chip={{
                        url: formData.linkUrl,
                        label: formData.linkLabel,
                        icon: formData.linkIcon,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Grouped Grid Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Category */}
              <div>
                <label htmlFor={`${idPrefix}category`} className="block text-xs font-semibold text-gray-700 mb-1">
                  Category
                </label>
                <select
                  id={`${idPrefix}category`}
                  value={formData.category}
                  onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                  className="w-full min-h-[40px] rounded-xl border border-purple-200 bg-white px-2.5 py-2 text-xs sm:text-sm text-gray-800 shadow-2xs transition focus:border-purple-500 focus:ring-2 focus:ring-purple-400/30 focus:outline-none"
                  disabled={isSubmitting}
                >
                  {isEditCategoryMissing && (
                    <option value={formData.category}>{formData.category}</option>
                  )}
                  {categories.length === 0 ? (
                    <option value={DEFAULT_TASK_CATEGORY_NAME}>{DEFAULT_TASK_CATEGORY_NAME}</option>
                  ) : (
                    categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Task Preset */}
              <div>
                <label htmlFor={`${idPrefix}task-preset`} className="block text-xs font-semibold text-gray-700 mb-1">
                  Preset
                </label>
                <select
                  id={`${idPrefix}task-preset`}
                  value={formData.setId}
                  onChange={(e) => setFormData((prev) => ({ ...prev, setId: e.target.value }))}
                  className="w-full min-h-[40px] rounded-xl border border-purple-200 bg-white px-2.5 py-2 text-xs sm:text-sm text-gray-800 shadow-2xs transition focus:border-purple-500 focus:ring-2 focus:ring-purple-400/30 focus:outline-none"
                  disabled={isSubmitting}
                >
                  {presets.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Due Date */}
              <div>
                <label htmlFor={`${idPrefix}dueDate`} className="block text-xs font-semibold text-gray-700 mb-1">
                  Due Date
                </label>
                <input
                  id={`${idPrefix}dueDate`}
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, dueDate: e.target.value }))}
                  className="w-full min-h-[40px] rounded-xl border border-purple-200 bg-white px-2.5 py-1.5 text-xs sm:text-sm text-gray-800 shadow-2xs transition focus:border-purple-500 focus:ring-2 focus:ring-purple-400/30 focus:outline-none"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Subtasks Framed Section */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-purple-50/60 border border-purple-100/90 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                  <ListChecks className="w-4 h-4 text-purple-700" />
                  Subtasks (Checklist)
                </label>
                {formData.subtasks.length > 0 && (
                  <span className="text-[11px] font-semibold text-purple-700 bg-white/90 px-2 py-0.5 rounded-full border border-purple-200/80">
                    {formData.subtasks.filter((s) => s.isCompleted).length}/{formData.subtasks.length} Completed
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2">
                <input
                  type="text"
                  value={subtaskInputText}
                  onChange={(e) => setSubtaskInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSubtask();
                    }
                  }}
                  placeholder="Type subtask title and press Enter..."
                  className="flex-1 min-w-0 min-h-[38px] rounded-xl border border-purple-200 bg-white px-3 py-1.5 text-xs sm:text-sm text-gray-800 placeholder:text-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-400/30 focus:outline-none"
                  disabled={isSubmitting}
                />
                <SubtaskDateControl
                  variant="input"
                  dueDate={subtaskInputDueDate}
                  onChange={setSubtaskInputDueDate}
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  onClick={handleAddSubtask}
                  disabled={isSubmitting || !subtaskInputText.trim()}
                  className="min-h-[38px] px-3 text-xs font-semibold text-white bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 disabled:opacity-50 rounded-xl transition inline-flex items-center gap-1 shadow-2xs shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add
                </button>
              </div>

              {formData.subtasks.length > 0 && (
                <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                  {formData.subtasks.map((st, index) => (
                    <div
                      key={st.id}
                      className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white/90 border border-purple-100 hover:border-purple-200 transition group shadow-2xs"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={st.isCompleted}
                          onClick={() => handleToggleSubtask(st.id)}
                          className={`h-4 w-4 rounded border transition flex items-center justify-center shrink-0 ${
                            st.isCompleted
                              ? 'bg-gradient-to-br from-pink-400 to-purple-500 border-transparent text-white'
                              : 'bg-white border-purple-300 text-transparent hover:border-purple-400'
                          }`}
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                        <input
                          type="text"
                          value={st.title}
                          onChange={(e) => handleUpdateSubtaskTitle(st.id, e.target.value)}
                          className={`flex-1 min-w-0 bg-transparent text-xs sm:text-sm focus:outline-none focus:bg-white focus:ring-1 focus:ring-purple-400 rounded px-2 py-1 transition ${
                            st.isCompleted ? 'line-through text-gray-400' : 'text-gray-800 font-medium'
                          }`}
                          placeholder="Subtask title..."
                        />
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <SubtaskDateControl
                          variant="modal"
                          dueDate={st.dueDate}
                          isCompleted={st.isCompleted}
                          onChange={(newDate) => handleUpdateSubtaskDueDate(st.id, newDate)}
                          disabled={isSubmitting}
                        />
                        <div className="flex items-center gap-0.5 opacity-70 group-hover:opacity-100 transition">
                          <button
                            type="button"
                            onClick={() => handleMoveSubtaskUp(index)}
                            disabled={index === 0}
                            className="p-1 rounded text-gray-400 hover:text-purple-700 hover:bg-purple-100/70 disabled:opacity-25 disabled:hover:bg-transparent transition"
                            title="Move up"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveSubtaskDown(index)}
                            disabled={index === formData.subtasks.length - 1}
                            className="p-1 rounded text-gray-400 hover:text-purple-700 hover:bg-purple-100/70 disabled:opacity-25 disabled:hover:bg-transparent transition"
                            title="Move down"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveSubtask(st.id)}
                            className="p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded transition ml-0.5"
                            title="Remove subtask"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 p-4 sm:p-5 bg-purple-50/50 border-t border-purple-100/80 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 min-h-[42px] bg-white hover:bg-gray-50 text-gray-700 border border-purple-200/80 disabled:opacity-50 text-sm font-semibold py-2 px-4 rounded-xl transition shadow-2xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 min-h-[42px] bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 disabled:from-gray-400 disabled:to-gray-400 text-white text-sm font-semibold py-2 px-4 rounded-xl transition shadow-md"
            >
              {isSubmitting ? (isEdit ? 'Saving...' : 'Adding...') : isEdit ? 'Save Changes' : 'Add Task'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
