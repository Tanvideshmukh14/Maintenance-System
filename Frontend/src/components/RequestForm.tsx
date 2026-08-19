import React, { useState } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';
import type { CreateRequestPayload, RequestCategory, RequestPriority } from '../types';

interface RequestFormProps {
  onSubmit: (payload: CreateRequestPayload) => Promise<void>;
  onClose: () => void;
}

const CATEGORIES: RequestCategory[] = ['IT', 'Facilities', 'Infrastructure'];
const PRIORITIES: RequestPriority[] = ['Low', 'Medium', 'High'];

const empty: CreateRequestPayload = { title: '', description: '', category: 'IT', priority: 'Medium' };

export const RequestForm: React.FC<RequestFormProps> = ({ onSubmit, onClose }) => {
  const [form, setForm] = useState<CreateRequestPayload>({ ...empty });
  const [errors, setErrors] = useState<Partial<Record<keyof CreateRequestPayload, string>>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [apiError, setApiError] = useState('');

  const validate = () => {
    const e: typeof errors = {};
    if (!form.title.trim()) e.title = 'TITLE IS REQUIRED.';
    if (!form.description.trim()) e.description = 'DESCRIPTION IS REQUIRED.';
    if (!form.category) e.category = 'CATEGORY IS REQUIRED.';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setApiError('');
    try {
      await onSubmit(form);
      setSuccess(true);
      setTimeout(() => { setSuccess(false); onClose(); }, 1500);
    } catch (e) {
      setApiError(e instanceof Error ? e.message : 'SUBMISSION FAILED.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/40 backdrop-blur-md font-sans">
      <div className="bg-card/80 backdrop-blur-xl border border-white/20 dark:border-white/10 w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[90vh] ring-1 ring-black/5 dark:ring-white/5">
        
        <div className="border-b border-white/10 dark:border-white/5 p-6 bg-primary/10 text-foreground rounded-t-2xl">
          <h2 className="text-2xl font-bold tracking-tight text-primary">Raise Maintenance Request</h2>
          <p className="text-sm font-medium text-muted-foreground mt-1">Log an issue and track it in real-time.</p>
        </div>

        {success ? (
          <div className="flex flex-col items-center justify-center p-12 gap-4">
            <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
              <CheckCircle2 size={40} className="text-primary" />
            </div>
            <p className="font-bold text-2xl tracking-tight">Request Submitted</p>
            <p className="font-medium text-muted-foreground text-center">Your request has been logged successfully.</p>
          </div>
        ) : (
          <div className="p-6 overflow-y-auto">
            <form onSubmit={handleSubmit} className="space-y-6">
              {apiError && (
                <div className="p-4 rounded-xl border border-destructive/50 bg-destructive/10 text-destructive font-medium flex items-center gap-2">
                  <AlertCircle size={20} />
                  {apiError}
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="rt" className="text-sm font-semibold tracking-wide text-foreground">Title <span className="text-destructive">*</span></label>
                <input
                  id="rt"
                  placeholder="e.g. Internet not working"
                  value={form.title}
                  onChange={(e) => { setForm((p) => ({ ...p, title: e.target.value })); setErrors((p) => ({ ...p, title: undefined })); }}
                  className={`w-full p-3 rounded-xl border bg-background/50 text-foreground focus:ring-2 focus:ring-primary/50 outline-none transition-all placeholder:text-muted-foreground ${errors.title ? 'border-destructive' : 'border-border'}`}
                />
                {errors.title && <p className="text-xs font-medium text-destructive">{errors.title}</p>}
              </div>

              <div className="space-y-2">
                <label htmlFor="rd" className="text-sm font-semibold tracking-wide text-foreground">Description <span className="text-destructive">*</span></label>
                <textarea
                  id="rd"
                  placeholder="Describe the issue — location, what happened, impact..."
                  rows={4}
                  value={form.description}
                  onChange={(e) => { setForm((p) => ({ ...p, description: e.target.value })); setErrors((p) => ({ ...p, description: undefined })); }}
                  className={`w-full p-3 rounded-xl border bg-background/50 text-foreground resize-none focus:ring-2 focus:ring-primary/50 outline-none transition-all placeholder:text-muted-foreground ${errors.description ? 'border-destructive' : 'border-border'}`}
                />
                {errors.description && <p className="text-xs font-medium text-destructive">{errors.description}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold tracking-wide text-foreground">Category <span className="text-destructive">*</span></label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm((p) => ({ ...p, category: e.target.value as RequestCategory }))}
                    className={`w-full p-3 rounded-xl border bg-background/50 text-foreground appearance-none cursor-pointer outline-none focus:ring-2 focus:ring-primary/50 transition-all ${errors.category ? 'border-destructive' : 'border-border'}`}
                  >
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  {errors.category && <p className="text-xs font-medium text-destructive">{errors.category}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold tracking-wide text-foreground">Priority</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value as RequestPriority }))}
                    className="w-full p-3 rounded-xl border border-border bg-background/50 text-foreground appearance-none cursor-pointer outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  >
                    {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              <div className="border-t border-white/10 dark:border-white/5 pt-6 flex gap-4 mt-6">
                <button type="button" onClick={onClose} className="flex-1 p-3 rounded-xl font-medium hover:bg-muted transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="flex-1 p-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-all disabled:opacity-50 flex justify-center items-center gap-2 shadow-lg shadow-primary/25">
                  {loading && <LoadingSpinner inline />}
                  {loading ? 'Submitting...' : 'Raise Request'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
