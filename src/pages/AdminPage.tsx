import { useState, useEffect } from 'react';
import { Users, Settings, Shield, Database, RefreshCw, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format } from '../lib/date-fns';
import { ROLE_LABELS } from '../types';
import type { Profile, UserRole } from '../types';

interface SystemStats {
  users: number;
  documents: number;
  chats: number;
  reviews: number;
}

export default function AdminPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [stats, setStats] = useState<SystemStats>({ users: 0, documents: 0, chats: 0, reviews: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'system'>('users');
  const [seedingStatus, setSeedingStatus] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [profilesRes, docs, chats, reviews] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('knowledge_documents').select('id', { count: 'exact', head: true }),
      supabase.from('chat_sessions').select('id', { count: 'exact', head: true }),
      supabase.from('governance_reviews').select('id', { count: 'exact', head: true }),
    ]);
    if (profilesRes.data) setProfiles(profilesRes.data);
    setStats({ users: profilesRes.data?.length ?? 0, documents: docs.count ?? 0, chats: chats.count ?? 0, reviews: reviews.count ?? 0 });
    setLoading(false);
  };

  const handleReseed = async () => {
    setSeeding(true);
    setSeedingStatus(null);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/seed-demo-users`,
        { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` } }
      );
      const data = await res.json();
      setSeedingStatus(data.success ? 'Demo users seeded successfully.' : 'Seed failed: ' + data.error);
      if (data.success) loadData();
    } catch {
      setSeedingStatus('Network error — seed failed.');
    }
    setSeeding(false);
  };

  const ROLE_COLORS: Record<UserRole, string> = {
    admin: 'bg-red-100 text-red-700',
    hse_manager: 'bg-purple-100 text-purple-700',
    hse_advisor: 'bg-blue-100 text-blue-700',
    supervisor: 'bg-orange-100 text-orange-700',
    field_worker: 'bg-green-100 text-green-700',
    contractor: 'bg-yellow-100 text-yellow-700',
    auditor: 'bg-gray-100 text-gray-700',
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-bold text-navy-900">Administration</h1>
        <p className="text-gray-500 text-sm mt-0.5">System management, user administration, and platform configuration</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Users', value: stats.users, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Documents', value: stats.documents, icon: Database, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Conversations', value: stats.chats, icon: Shield, color: 'text-flame-600', bg: 'bg-flame-50' },
          { label: 'Gov. Reviews', value: stats.reviews, icon: Settings, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map(card => (
          <div key={card.label} className="card p-4">
            <div className={`w-8 h-8 rounded-lg ${card.bg} flex items-center justify-center mb-2`}>
              <card.icon className={`w-4 h-4 ${card.color}`} />
            </div>
            {loading ? <div className="h-7 w-10 bg-gray-100 rounded animate-pulse mb-1" /> : <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>}
            <div className="text-gray-500 text-xs">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {(['users', 'system'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 ${activeTab === tab ? 'border-flame-500 text-flame-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>{tab}</button>
        ))}
      </div>

      {activeTab === 'users' && (
        <div>
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="card h-16 animate-pulse bg-gray-50" />)}</div>
          ) : (
            <div className="space-y-2">
              {profiles.map(p => (
                <div key={p.id} className="card p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-navy-100 rounded-lg flex items-center justify-center flex-shrink-0 text-navy-700 font-bold text-sm">
                      {p.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-navy-900 font-semibold text-sm">{p.full_name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${ROLE_COLORS[p.role]}`}>{ROLE_LABELS[p.role]}</span>
                      </div>
                      <div className="text-gray-400 text-xs mt-0.5">{p.employee_id} &middot; {p.department} &middot; {p.location}</div>
                    </div>
                    {p.is_active ? (
                      <span className="flex items-center gap-1 text-xs text-green-600"><CheckCircle className="w-3 h-3" /> Active</span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-red-500"><AlertCircle className="w-3 h-3" /> Inactive</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'system' && (
        <div className="space-y-4">
          <div className="card p-4">
            <h3 className="text-navy-900 font-semibold text-sm mb-3 flex items-center gap-2"><Database className="w-4 h-4 text-flame-500" /> Demo Data Management</h3>
            <p className="text-gray-500 text-sm mb-4">Re-seed demo user accounts. This is idempotent — existing users will be skipped.</p>
            <button onClick={handleReseed} disabled={seeding} className="btn-primary text-sm">
              {seeding ? <><Loader2 className="w-4 h-4 animate-spin" /> Seeding...</> : <><RefreshCw className="w-4 h-4" /> Re-seed Demo Users</>}
            </button>
            {seedingStatus && (
              <div className={`mt-3 flex items-center gap-2 text-sm rounded-lg px-3 py-2 ${seedingStatus.includes('success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {seedingStatus.includes('success') ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {seedingStatus}
              </div>
            )}
          </div>

          <div className="card p-4">
            <h3 className="text-navy-900 font-semibold text-sm mb-3 flex items-center gap-2"><Settings className="w-4 h-4 text-flame-500" /> System Information</h3>
            <div className="space-y-2 text-xs">
              {[
                { label: 'Platform', value: 'HSE OPS AI v1.0' },
                { label: 'Organization', value: 'NEPL HSE Division' },
                { label: 'Database', value: 'Supabase PostgreSQL' },
                { label: 'AI Backend', value: 'Mock AI (Phase 1)' },
                { label: 'Compliance', value: 'NUPRC & NOSDRA Standards' },
                { label: 'Current Date', value: format(new Date(), 'dd MMMM yyyy') },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between py-1 border-b border-gray-50 last:border-0">
                  <span className="text-gray-500">{row.label}</span>
                  <span className="text-navy-900 font-medium">{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
