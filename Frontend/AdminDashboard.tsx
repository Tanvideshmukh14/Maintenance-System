import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Search, X, AlertTriangle, Settings2, ChevronUp, ChevronDown as ChevronDownIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MaintenanceRequest, RequestCategory, RequestStatus, User } from '../types';
import { getAllRequests, updateRequestStatus } from '../services/api';
import { Navbar } from '../components/Navbar';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { MOCK_TECHNICIANS } from '../data/mockData';

const ALL_STATUSES: RequestStatus[] = ['Pending', 'In Progress', 'Resolved', 'Escalated'];
const ALL_CATEGORIES: RequestCategory[] = ['IT', 'Facilities', 'Infrastructure'];

const NEXT_STATUSES: Record<RequestStatus, RequestStatus[]> = {
  Pending: ['In Progress', 'Escalated'],
  'In Progress': ['Resolved', 'Escalated'],
  Resolved: [],
  Escalated: ['In Progress', 'Resolved'],
};

const PRIORITY_COLOR: Record<string, string> = {
  High: 'text-destructive',
  Medium: 'text-orange-500',
  Low: 'text-emerald-500',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── Manage Modal ─────────────────────────────────────────────────────────────
interface ManageModalProps {
  request: MaintenanceRequest;
  onClose: () => void;
  onUpdate: (id: number, status: RequestStatus, assigned_to?: string) => Promise<void>;
}

const ManageModal: React.FC<ManageModalProps> = ({ request, onClose, onUpdate }) => {
  const [status, setStatus] = useState<RequestStatus>(request.status);
  const [technician, setTechnician] = useState<string>(request.assigned_to ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const nextOptions = NEXT_STATUSES[request.status];

  const handleSave = async () => {
    setLoading(true);
    setError('');
    try {
      await onUpdate(request.id, status, technician || undefined);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/40 backdrop-blur-md font-sans">
      <div className="bg-card/80 backdrop-blur-xl border border-white/20 dark:border-white/10 w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[90vh] ring-1 ring-black/5 dark:ring-white/5">
        
        {/* Header */}
        <div className="border-b border-white/10 dark:border-white/5 p-6 flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold tracking-tighter flex items-center gap-2">
              <Settings2 size={24} /> MANAGE #{request.id}
            </h2>
            <p className="text-muted-foreground font-bold mt-1 text-sm">{request.title}</p>
          </div>
          <button onClick={onClose} className="hover:text-destructive transition-colors"><X size={24} /></button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {error && (
            <div className="p-4 border-4 border-destructive bg-destructive/10 text-destructive font-bold text-sm">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <span className="text-sm font-bold text-muted-foreground">CURRENT STATUS</span>
            <div><StatusBadge status={request.status} /></div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-muted-foreground">UPDATE STATUS</label>
            {nextOptions.length > 0 ? (
              <select 
                value={status} 
                onChange={(e) => setStatus(e.target.value as RequestStatus)}
                className="p-3 rounded-lg border border-border bg-background/50 backdrop-blur-sm text-foreground font-medium appearance-none cursor-pointer hover:bg-muted/50 transition-all focus:ring-2 focus:ring-primary/50 outline-none"
              >
                <option value={request.status}>{request.status} (CURRENT)</option>
                {nextOptions.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            ) : (
              <p className="p-3 rounded-lg border border-dashed border-border text-muted-foreground font-medium text-sm bg-muted/30">
                Request is resolved. No further transitions.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-muted-foreground">ASSIGN TECHNICIAN</label>
            <select
              value={technician || '__none__'}
              onChange={(e) => setTechnician(e.target.value === '__none__' ? '' : e.target.value)}
              className="p-3 rounded-lg border border-border bg-background/50 backdrop-blur-sm text-foreground font-medium appearance-none cursor-pointer hover:bg-muted/50 transition-all focus:ring-2 focus:ring-primary/50 outline-none"
            >
              <option value="__none__">UNASSIGNED</option>
              {MOCK_TECHNICIANS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 dark:border-white/5 flex p-6 gap-4 bg-muted/20 rounded-b-2xl">
          <button 
            onClick={onClose} 
            className="flex-1 p-3 rounded-xl font-medium hover:bg-muted transition-colors"
          >
            CANCEL
          </button>
          <button
            onClick={handleSave}
            disabled={loading || nextOptions.length === 0}
            className="flex-1 p-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-all disabled:opacity-50 flex justify-center items-center gap-2 shadow-lg shadow-primary/25"
          >
            {loading && <LoadingSpinner inline />}
            {loading ? 'SAVING...' : 'SAVE CHANGES'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Admin Dashboard ───────────────────────────────────────────────────────────
const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<RequestStatus | 'All'>('All');
  const [categoryFilter, setCategoryFilter] = useState<RequestCategory | 'All'>('All');
  const [actionRequest, setActionRequest] = useState<MaintenanceRequest | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [sortCol, setSortCol] = useState<'id' | 'status' | 'priority' | 'created_at'>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) { navigate('/login'); return; }
    const u: User = JSON.parse(stored);
    if (u.role !== 'admin') { navigate('/employee/dashboard'); return; }
    setUser(u);
    fetchAll();
  }, []);

  const fetchAll = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      setRequests(await getAllRequests());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load requests.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleUpdate = async (id: number, status: RequestStatus, assigned_to?: string) => {
    const updated = await updateRequestStatus(id, status, assigned_to);
    setRequests((prev) => prev.map((r) => (r.id === id ? updated : r)));
  };

  const toggleSort = (col: typeof sortCol) => {
    if (sortCol === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortCol(col); setSortDir('asc'); }
  };

  const counts = {
    total: requests.length,
    pending: requests.filter((r) => r.status === 'Pending').length,
    inProgress: requests.filter((r) => r.status === 'In Progress').length,
    resolved: requests.filter((r) => r.status === 'Resolved').length,
    escalated: requests.filter((r) => r.status === 'Escalated').length,
  };

  const filtered = requests
    .filter((r) => statusFilter === 'All' || r.status === statusFilter)
    .filter((r) => categoryFilter === 'All' || r.category === categoryFilter)
    .filter((r) =>
      !search ||
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.employee_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.category.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const mul = sortDir === 'asc' ? 1 : -1;
      if (sortCol === 'id') return (a.id - b.id) * mul;
      if (sortCol === 'status') return a.status.localeCompare(b.status) * mul;
      if (sortCol === 'priority') {
        const order = { High: 0, Medium: 1, Low: 2 };
        return ((order[a.priority] ?? 1) - (order[b.priority] ?? 1)) * mul;
      }
      return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * mul;
    });

  const SortIcon = ({ col }: { col: typeof sortCol }) => {
    if (sortCol !== col) return <span className="opacity-20 ml-1"><ChevronUp size={14} /></span>;
    return sortDir === 'asc' ? <ChevronUp size={14} className="ml-1 text-primary" /> : <ChevronDownIcon size={14} className="ml-1 text-primary" />;
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <Navbar user={user} />

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-12 relative z-10">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-12">
          <div>
            <p className="text-sm font-semibold text-primary tracking-wider mb-2 flex items-center gap-2">
              <span className="w-8 h-1 rounded-full bg-primary inline-block"></span> ADMINISTRATOR
            </p>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
              Maintenance <br/> Control
            </h1>
          </div>
          <button
            className="flex items-center gap-2 bg-card/50 backdrop-blur-md border border-border px-6 py-3 rounded-full text-sm font-medium hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all shadow-sm disabled:opacity-50"
            onClick={() => fetchAll(true)}
            disabled={refreshing}
          >
            <RefreshCw size={24} className={refreshing ? 'animate-spin' : ''} />
            SYNC DATA
          </button>
        </div>

        {/* Escalation alert */}
        {counts.escalated > 0 && (
          <div 
            className="mb-8 border-4 border-destructive bg-destructive/10 p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer hover:bg-destructive/20 transition-colors"
            onClick={() => setStatusFilter('Escalated')}
          >
            <div className="flex items-center gap-4">
               <AlertTriangle size={32} className="text-destructive animate-pulse" />
               <span className="text-destructive font-bold text-xl tracking-tight">
                 {counts.escalated} ESCALATED REQUEST{counts.escalated > 1 ? 'S' : ''} REQUIRE IMMEDIATE ATTENTION
               </span>
            </div>
            <span className="font-bold text-destructive underline decoration-2 underline-offset-4">FILTER →</span>
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-12">
          {[
            { label: 'Total', value: counts.total, bg: 'hover:border-primary hover:bg-primary/5', filter: 'All' },
            { label: 'Pending', value: counts.pending, bg: 'hover:border-amber-500 hover:bg-amber-500/5', filter: 'Pending' },
            { label: 'In Progress', value: counts.inProgress, bg: 'hover:border-blue-500 hover:bg-blue-500/5', filter: 'In Progress' },
            { label: 'Resolved', value: counts.resolved, bg: 'hover:border-emerald-500 hover:bg-emerald-500/5', filter: 'Resolved' },
            { label: 'Escalated', value: counts.escalated, bg: 'hover:border-destructive hover:bg-destructive/5', filter: 'Escalated' },
          ].map((s) => (
            <button 
              key={s.label} 
              onClick={() => setStatusFilter(s.filter as RequestStatus | 'All')}
              className={cn("border border-border/50 rounded-2xl p-6 text-left transition-all bg-card/40 backdrop-blur-sm shadow-sm", s.bg, statusFilter === s.filter ? 'ring-2 ring-primary border-transparent' : '')}
            >
              <p className="text-4xl font-bold tracking-tight mb-1">{s.value}</p>
              <span className="text-sm font-medium text-muted-foreground">{s.label}</span>
            </button>
          ))}
        </div>

        {/* Controls */}
        <div className="bg-card/60 backdrop-blur-md border border-border/50 rounded-2xl p-4 sm:p-6 flex flex-col xl:flex-row items-start xl:items-center gap-6 mb-8 shadow-lg">
          <div className="flex-1 w-full relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Search requests..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-12 py-3 rounded-xl border border-border bg-background/50 text-foreground font-medium placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={20} />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto">
            <div className="flex gap-2 items-center flex-wrap">
              <span className="text-sm font-medium text-muted-foreground mr-2">Status:</span>
              {(['All', ...ALL_STATUSES] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s as RequestStatus | 'All')}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    statusFilter === s
                      ? 'bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20'
                      : 'bg-background/50 text-foreground border-border hover:bg-muted'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="w-px h-8 bg-border hidden xl:block mx-2" />

            <div className="flex gap-2 items-center flex-wrap">
              <span className="text-sm font-medium text-muted-foreground mr-2">Category:</span>
              {(['All', ...ALL_CATEGORIES] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setCategoryFilter(c as RequestCategory | 'All')}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    categoryFilter === c
                      ? 'bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20'
                      : 'bg-background/50 text-foreground border-border hover:bg-muted'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="mb-4 text-sm font-medium text-muted-foreground px-2">
          Showing {filtered.length} of {requests.length} records
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 rounded-xl bg-card/40 border border-border animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-xl border border-destructive/50 p-6 bg-destructive/10 flex items-center justify-between">
            <span className="font-medium text-destructive">{error}</span>
            <button className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground font-medium hover:bg-destructive/90 transition-colors" onClick={() => fetchAll()}>Retry</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/20 backdrop-blur-sm p-16 text-center">
            <p className="text-2xl font-semibold mb-4">No records found</p>
            <button
              className="px-6 py-2 rounded-full bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-all shadow-md"
              onClick={() => { setStatusFilter('All'); setCategoryFilter('All'); setSearch(''); }}
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-md overflow-x-auto shadow-xl">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  {[
                    { key: 'id', label: 'ID', w: 'w-24' },
                    { key: null, label: 'REQUEST', w: 'w-1/3' },
                    { key: null, label: 'EMPLOYEE', w: 'w-40' },
                    { key: null, label: 'CATEGORY', w: 'w-32' },
                    { key: 'priority', label: 'PRIORITY', w: 'w-32' },
                    { key: 'status', label: 'STATUS', w: 'w-40' },
                    { key: 'created_at', label: 'CREATED', w: 'w-32' },
                    { key: null, label: 'ASSIGNED', w: 'w-40' },
                    { key: null, label: '', w: 'w-24' },
                  ].map(({ key, label, w }, i) => (
                    <th
                      key={i}
                      className={cn(
                        'p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap',
                        w,
                        key && 'cursor-pointer hover:text-foreground transition-colors'
                      )}
                      onClick={key ? () => toggleSort(key as typeof sortCol) : undefined}
                    >
                      <span className="flex items-center">
                        {label}
                        {key && <SortIcon col={key as typeof sortCol} />}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((req) => (
                  <tr
                    key={req.id}
                    className={cn(
                      'border-b border-border/50 last:border-b-0 hover:bg-muted/30 transition-colors group',
                      req.status === 'Escalated' && 'bg-destructive/5 hover:bg-destructive/10'
                    )}
                  >
                    <td className="p-4 font-medium text-sm text-muted-foreground">#{req.id}</td>
                    <td className="p-4">
                      <p className="font-semibold text-sm truncate max-w-[300px]">{req.title}</p>
                      <p className="text-muted-foreground text-xs truncate max-w-[300px] mt-1 normal-case">
                        {req.description}
                      </p>
                    </td>
                    <td className="p-4 font-medium text-sm">{req.employee_name ?? '—'}</td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-muted text-muted-foreground">
                        {req.category}
                      </span>
                    </td>
                    <td className="p-4 font-medium text-sm">
                       <span className={cn(PRIORITY_COLOR[req.priority])}>
                         {req.priority}
                       </span>
                    </td>
                    <td className="p-4">
                      <StatusBadge status={req.status} />
                    </td>
                    <td className="p-4 text-sm text-muted-foreground whitespace-nowrap">
                      {formatDate(req.created_at)}
                    </td>
                    <td className="p-4 text-sm">
                      {req.assigned_to ?? <span className="text-muted-foreground italic text-xs">Unassigned</span>}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        className="px-3 py-1.5 rounded-lg border border-border font-medium text-xs hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all flex items-center gap-1.5 opacity-0 group-hover:opacity-100 shadow-sm"
                        onClick={() => setActionRequest(req)}
                      >
                        <Settings2 size={14} /> Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {actionRequest && (
        <ManageModal
          request={actionRequest}
          onClose={() => setActionRequest(null)}
          onUpdate={handleUpdate}
        />
      )}
    </div>
  );
};

export default AdminDashboard;
