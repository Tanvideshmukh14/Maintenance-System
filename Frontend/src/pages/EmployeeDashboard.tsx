import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, RefreshCw } from 'lucide-react';
import type { MaintenanceRequest, RequestStatus, User } from '../types';
import { getMyRequests, createRequest } from '../services/api';
import { Navbar } from '../components/Navbar';
import { RequestCard } from '../components/RequestCard';
import { RequestForm } from '../components/RequestForm';
import { EmptyState } from '../components/EmptyState';

const FILTERS: Array<RequestStatus | 'All'> = ['All', 'Pending', 'In Progress', 'Resolved', 'Escalated'];

function RequestSkeleton() {
  return (
    <div className="rounded-2xl border border-border/50 bg-card/40 backdrop-blur-sm p-6 space-y-4 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="w-1/2 h-6 bg-muted rounded-md" />
        <div className="w-20 h-6 bg-muted rounded-full" />
      </div>
      <div className="w-full h-4 bg-muted rounded-md" />
      <div className="w-3/4 h-4 bg-muted rounded-md" />
    </div>
  );
}

const EmployeeDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<RequestStatus | 'All'>('All');
  const [showForm, setShowForm] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) { navigate('/login'); return; }
    const u: User = JSON.parse(stored);
    if (u.role !== 'employee') { navigate('/admin/dashboard'); return; }
    setUser(u);
    fetchRequests();
  }, []);

  const fetchRequests = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      setRequests(await getMyRequests());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load requests.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleCreate = async (payload: Parameters<typeof createRequest>[0]) => {
    const req = await createRequest(payload, user?.name ?? 'Employee');
    setRequests((prev) => [req, ...prev]);
  };

  const counts = FILTERS.reduce<Record<string, number>>((acc, s) => {
    acc[s] = s === 'All' ? requests.length : requests.filter((r) => r.status === s).length;
    return acc;
  }, {});

  const filtered = filter === 'All' ? requests : requests.filter((r) => r.status === filter);
  const escalated = counts['Escalated'] ?? 0;

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <Navbar user={user} />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12 relative z-10">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-12">
          <div>
            <p className="text-sm font-semibold text-primary tracking-wider mb-2 flex items-center gap-2">
              <span className="w-8 h-1 rounded-full bg-primary inline-block"></span> DASHBOARD
            </p>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
              {user.name.split(' ')[0]}'s <br/> Requests
            </h1>
          </div>
          <button 
            onClick={() => setShowForm(true)} 
            className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-full text-sm font-medium hover:bg-primary/90 transition-all shadow-lg shadow-primary/25"
          >
            <Plus size={18} />
            Raise Request
          </button>
        </div>

        {/* Escalation notice */}
        {escalated > 0 && (
          <div className="mb-8 border border-destructive/50 rounded-xl bg-destructive/10 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
            <span className="text-destructive font-semibold text-sm flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive"></span>
              </span>
              {escalated} request{escalated > 1 ? 's' : ''} escalated — Admin review pending
            </span>
            <button 
              className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 transition-colors"
              onClick={() => setFilter('Escalated')}
            >
              View Now
            </button>
          </div>
        )}

        {/* Stat pills */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {(['Pending', 'In Progress', 'Resolved', 'Escalated'] as RequestStatus[]).map((s) => {
            const active = filter === s;
            const bgClass = active ? 'ring-2 ring-primary bg-card/60' : 'bg-card/40 border border-border/50 hover:border-primary/50 hover:bg-primary/5';
            return (
              <button
                key={s}
                onClick={() => setFilter(active ? 'All' : s)}
                className={`rounded-2xl p-6 text-left transition-all backdrop-blur-sm shadow-sm ${bgClass}`}
              >
                <p className="text-4xl font-bold tracking-tight mb-1">{counts[s] ?? 0}</p>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">{s}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-2 mb-8 flex-wrap border-b border-border/50 pb-4">
          {FILTERS.map((s) => {
            const active = filter === s;
            return (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-4 py-1.5 rounded-full font-medium text-sm border transition-all ${
                  active
                    ? 'bg-foreground text-background border-foreground shadow-md'
                    : 'bg-background/50 text-foreground border-border hover:bg-muted'
                }`}
              >
                {s} <span className="opacity-60 text-xs ml-1">({counts[s] ?? 0})</span>
              </button>
            );
          })}
          
          <button
            className="ml-auto flex items-center gap-2 px-4 py-1.5 rounded-full font-medium text-sm border border-border hover:bg-muted transition-colors disabled:opacity-50 shadow-sm bg-card/50 backdrop-blur-sm"
            onClick={() => fetchRequests(true)}
            disabled={refreshing}
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            Sync
          </button>
        </div>

        {/* Section heading */}
        <div className="mb-6 flex items-center gap-4">
          <h2 className="text-2xl font-bold tracking-tight">Request Log</h2>
          {filter !== 'All' && (
            <span className="bg-primary/10 text-primary px-2.5 py-1 rounded-full text-xs font-semibold">Filter: {filter}</span>
          )}
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-4">{[1, 2, 3].map((i) => <RequestSkeleton key={i} />)}</div>
        ) : error ? (
          <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-6 flex items-center justify-between">
            <span className="font-medium text-destructive">{error}</span>
            <button className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground font-medium hover:bg-destructive/90" onClick={() => fetchRequests()}>Retry</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/20 backdrop-blur-sm p-12 flex flex-col items-center text-center">
             <p className="text-xl font-semibold mb-2">No records found</p>
             <p className="text-muted-foreground text-sm mb-6">We couldn't find any requests matching the current filters.</p>
             <button onClick={() => setShowForm(true)} className="px-6 py-2.5 rounded-full bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-all shadow-md">
               Initialize Request
             </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {filtered.map((req) => (
              <RequestCard key={req.id} request={req} linkPrefix="/employee" />
            ))}
          </div>
        )}
      </main>

      {showForm && <RequestForm onSubmit={handleCreate} onClose={() => setShowForm(false)} />}
    </div>
  );
};

export default EmployeeDashboard;
