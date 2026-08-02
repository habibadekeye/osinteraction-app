import { useState, useEffect } from 'react';
import { ShieldCheck, Flag, CheckCircle, Clock, AlertTriangle, ChevronRight, Eye } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { format } from '../lib/date-fns';
import type { GovernanceReview } from '../types';

const PRIORITY_BADGE: Record<string, string> = {
  low: 'bg-green-50 text-green-700 border-green-200',
  medium: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  high: 'bg-orange-50 text-orange-700 border-orange-200',
  critical: 'bg-red-50 text-red-700 border-red-200',
};

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  in_review: 'bg-blue-100 text-blue-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  escalated: 'bg-purple-100 text-purple-700',
};

export default function GovernancePage() {
  const { user } = useAuthStore();
  const [reviews, setReviews] = useState<GovernanceReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [selected, setSelected] = useState<GovernanceReview | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => { load(); }, [statusFilter]);

  const load = async () => {
    setLoading(true);
    let q = supabase.from('governance_reviews').select('*, chat_messages(content, role)').order('created_at', { ascending: false });
    if (statusFilter) q = q.eq('status', statusFilter);
    const { data } = await q;
    if (data) setReviews(data);
    setLoading(false);
  };

  const updateStatus = async (id: string, status: string) => {
    setUpdating(true);
    await supabase.from('governance_reviews').update({ status: status, reviewed_by: user!.id, reviewed_at: new Date().toISOString() }).eq('id', id);
    setSelected(null);
    load();
    setUpdating(false);
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-bold text-navy-900">AI Governance Review</h1>
        <p className="text-gray-500 text-sm mt-0.5">Review flagged AI responses for accuracy and safety compliance</p>
      </div>

      {/* Status filter tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {[null, 'pending', 'in_review', 'approved', 'rejected'].map(s => (
          <button key={s ?? 'all'} onClick={() => setStatusFilter(s)} className={`text-xs px-3 py-1.5 rounded-full border transition-colors capitalize ${statusFilter === s ? 'bg-flame-50 text-flame-700 border-flame-200' : 'text-gray-500 border-gray-200 hover:bg-gray-50'}`}>
            {s ?? 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="card h-20 animate-pulse bg-gray-50" />)}</div>
      ) : reviews.length === 0 ? (
        <div className="card p-10 text-center">
          <ShieldCheck className="w-10 h-10 text-gray-200 mx-auto mb-2" />
          <p className="text-gray-400 text-sm">No governance reviews found.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {reviews.map(r => (
            <div key={r.id} className={`card p-4 hover:border-flame-200 transition-all cursor-pointer ${selected?.id === r.id ? 'border-flame-300' : ''}`} onClick={() => setSelected(selected?.id === r.id ? null : r)}>
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${r.priority === 'critical' ? 'bg-red-100' : 'bg-orange-100'}`}>
                  <Flag className={`w-4 h-4 ${r.priority === 'critical' ? 'text-red-600' : 'text-orange-600'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${PRIORITY_BADGE[r.priority]}`}>{r.priority}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[r.status]}`}>{r.status.replace('_', ' ')}</span>
                    <span className="text-xs text-gray-400 bg-gray-50 rounded px-1.5 py-0.5">{r.review_type.replace('_', ' ')}</span>
                  </div>
                  <p className="text-navy-900 text-sm mt-1">{r.flagged_reason}</p>
                  <div className="text-gray-400 text-xs mt-0.5">{format(new Date(r.created_at), 'dd MMM yyyy, HH:mm')}</div>
                </div>
                <ChevronRight className={`w-4 h-4 text-gray-300 flex-shrink-0 transition-transform ${selected?.id === r.id ? 'rotate-90' : ''}`} />
              </div>

              {selected?.id === r.id && (
                <div className="mt-4 pt-4 border-t border-gray-100 space-y-3 animate-fade-in">
                  {(r as GovernanceReview & { chat_messages?: { content: string; role: string } }).chat_messages && (
                    <div>
                      <div className="label mb-1">Flagged Message Content</div>
                      <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-700 line-clamp-4">
                        {(r as GovernanceReview & { chat_messages?: { content: string; role: string } }).chat_messages?.content}
                      </div>
                    </div>
                  )}
                  {r.review_notes && (
                    <div>
                      <div className="label mb-1">Review Notes</div>
                      <p className="text-gray-600 text-xs">{r.review_notes}</p>
                    </div>
                  )}
                  {r.status === 'pending' && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <button onClick={() => updateStatus(r.id, 'in_review')} disabled={updating} className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1">
                        <Eye className="w-3 h-3" /> Start Review
                      </button>
                      <button onClick={() => updateStatus(r.id, 'approved')} disabled={updating} className="text-xs py-1.5 px-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Approve
                      </button>
                      <button onClick={() => updateStatus(r.id, 'rejected')} disabled={updating} className="text-xs py-1.5 px-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Reject
                      </button>
                    </div>
                  )}
                  {r.status === 'in_review' && (
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateStatus(r.id, 'approved')} disabled={updating} className="text-xs py-1.5 px-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Approve
                      </button>
                      <button onClick={() => updateStatus(r.id, 'rejected')} disabled={updating} className="text-xs py-1.5 px-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Reject
                      </button>
                    </div>
                  )}
                  {r.reviewed_at && (
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <Clock className="w-3 h-3" /> Reviewed {format(new Date(r.reviewed_at), 'dd MMM yyyy, HH:mm')}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
