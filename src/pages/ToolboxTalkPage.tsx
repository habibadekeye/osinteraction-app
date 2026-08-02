import { useState, useEffect } from 'react';
import { Plus, Users, Calendar, CheckCircle, X, Save, ClipboardList, Sparkles, MapPin, Clock, AlertTriangle, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { format } from '../lib/date-fns';
import type { ToolboxTalk } from '../types';

type Tab = 'ai' | 'manual';

const EMPTY_AI_FORM = {
  activity: '',
  location: '',
  crewSize: 4,
  durationMinutes: 15,
  environmentalConditions: '',
  crewExperience: 'mixed',
};

const EMPTY_MANUAL_FORM = {
  title: '',
  location: '',
  crew_size: 4,
  discussion_points: '',
  duration_minutes: 15,
};

export default function ToolboxTalkPage() {
  const { user } = useAuthStore();
  const [talks, setTalks] = useState<ToolboxTalk[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [tab, setTab] = useState<Tab>('ai');
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aiForm, setAiForm] = useState(EMPTY_AI_FORM);
  const [generated, setGenerated] = useState<ToolboxTalk | null>(null);
  const [manualForm, setManualForm] = useState(EMPTY_MANUAL_FORM);
  const [error, setError] = useState('');

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('toolbox_talks').select('*').order('created_at', { ascending: false });
    if (data) setTalks(data);
    setLoading(false);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    setError('');
    setGenerated(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-toolbox-talk`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'Apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            activity: aiForm.activity,
            location: aiForm.location || undefined,
            crewSize: aiForm.crewSize,
            durationMinutes: aiForm.durationMinutes,
            environmentalConditions: aiForm.environmentalConditions || undefined,
            crewExperience: aiForm.crewExperience,
          }),
        }
      );
      const json = await res.json() as { success: boolean; data?: ToolboxTalk; error?: { message: string } };
      if (!json.success || !json.data) throw new Error(json.error?.message ?? 'Generation failed');
      setGenerated(json.data);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate toolbox talk');
    } finally {
      setGenerating(false);
    }
  };

  const handleManualCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    const points = manualForm.discussion_points.split('\n').map(s => s.trim()).filter(Boolean);
    const { error: dbErr } = await supabase.from('toolbox_talks').insert({
      title: manualForm.title,
      location: manualForm.location,
      crew_size: Number(manualForm.crew_size),
      discussion_points: points,
      duration_minutes: Number(manualForm.duration_minutes),
      user_id: user!.id,
      conducted_at: new Date().toISOString(),
      status: 'completed',
      ai_generated: false,
    });
    if (!dbErr) {
      setShowNew(false);
      setManualForm(EMPTY_MANUAL_FORM);
      load();
    } else {
      setError(dbErr.message);
    }
    setSaving(false);
  };

  const handleMarkConducted = async (id: string) => {
    await supabase.from('toolbox_talks').update({ status: 'completed', conducted_at: new Date().toISOString() }).eq('id', id);
    load();
  };

  const closeNew = () => {
    setShowNew(false);
    setGenerated(null);
    setError('');
    setAiForm(EMPTY_AI_FORM);
    setManualForm(EMPTY_MANUAL_FORM);
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-navy-900">Toolbox Talks</h1>
          <p className="text-gray-500 text-sm mt-0.5">AI-generated and manually recorded pre-shift safety briefings</p>
        </div>
        <button onClick={() => { setShowNew(true); setGenerated(null); }} className="btn-primary py-2 px-4 text-sm">
          <Plus className="w-4 h-4" /> New Talk
        </button>
      </div>

      {showNew && (
        <div className="card p-4 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => { setTab('ai'); setGenerated(null); setError(''); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${tab === 'ai' ? 'bg-white text-flame-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <Sparkles className="w-3.5 h-3.5" /> AI Generate
              </button>
              <button
                onClick={() => { setTab('manual'); setGenerated(null); setError(''); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${tab === 'manual' ? 'bg-white text-navy-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <ClipboardList className="w-3.5 h-3.5" /> Manual Record
              </button>
            </div>
            <button onClick={closeNew}><X className="w-4 h-4 text-gray-400 hover:text-gray-600" /></button>
          </div>

          {error && (
            <div className="mb-4 flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" /> {error}
            </div>
          )}

          {tab === 'ai' && !generated && (
            <form onSubmit={handleGenerate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="label">Activity / Task <span className="text-red-400">*</span></label>
                <input className="input" value={aiForm.activity} onChange={e => setAiForm(p => ({ ...p, activity: e.target.value }))}
                  placeholder="e.g., Crane lift of 5-tonne pump on Bonga FPSO main deck" required />
              </div>
              <div>
                <label className="label">Location</label>
                <input className="input" value={aiForm.location} onChange={e => setAiForm(p => ({ ...p, location: e.target.value }))}
                  placeholder="e.g., Okono Platform, Drill Floor" />
              </div>
              <div>
                <label className="label">Crew Size</label>
                <input type="number" className="input" min="1" max="50" value={aiForm.crewSize}
                  onChange={e => setAiForm(p => ({ ...p, crewSize: Number(e.target.value) }))} />
              </div>
              <div>
                <label className="label">Duration (minutes)</label>
                <input type="number" className="input" min="5" max="60" value={aiForm.durationMinutes}
                  onChange={e => setAiForm(p => ({ ...p, durationMinutes: Number(e.target.value) }))} />
              </div>
              <div>
                <label className="label">Crew Experience</label>
                <select className="input" value={aiForm.crewExperience} onChange={e => setAiForm(p => ({ ...p, crewExperience: e.target.value }))}>
                  <option value="new">New / Inexperienced</option>
                  <option value="mixed">Mixed</option>
                  <option value="experienced">Experienced</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="label">Environmental Conditions</label>
                <input className="input" value={aiForm.environmentalConditions} onChange={e => setAiForm(p => ({ ...p, environmentalConditions: e.target.value }))}
                  placeholder="e.g., Wind 12 m/s, wet deck, night shift" />
              </div>
              <div className="md:col-span-2 flex justify-end gap-2">
                <button type="button" onClick={closeNew} className="btn-secondary text-sm">Cancel</button>
                <button type="submit" disabled={generating} className="btn-primary text-sm">
                  <Sparkles className="w-4 h-4" /> {generating ? 'Generating...' : 'Generate with AI'}
                </button>
              </div>
            </form>
          )}

          {tab === 'ai' && generated && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-2 text-green-600 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs font-medium">
                <ShieldCheck className="w-3.5 h-3.5" /> Toolbox talk generated and saved as draft
              </div>
              <div>
                <h3 className="text-navy-900 font-semibold text-sm mb-1">{generated.title}</h3>
                <div className="flex flex-wrap gap-3 text-xs text-gray-400 mb-3">
                  {generated.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{generated.location}</span>}
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" />{generated.crew_size} crew</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{generated.duration_minutes} min</span>
                </div>
              </div>
              {generated.discussion_points?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-navy-700 uppercase tracking-wide mb-2">Discussion Points</p>
                  <ol className="space-y-1.5">
                    {generated.discussion_points.map((pt, i) => (
                      <li key={i} className="text-xs text-gray-700 flex gap-2"><span className="text-flame-500 font-bold flex-shrink-0">{i + 1}.</span>{pt}</li>
                    ))}
                  </ol>
                </div>
              )}
              {generated.hazards?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-navy-700 uppercase tracking-wide mb-2">Key Hazards</p>
                  <div className="space-y-1">
                    {generated.hazards.map((h, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-gray-700">
                        <AlertTriangle className="w-3 h-3 text-amber-500 flex-shrink-0 mt-0.5" />{h}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {generated.questions?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-navy-700 uppercase tracking-wide mb-2">Engagement Questions</p>
                  <div className="space-y-1">
                    {generated.questions.map((q, i) => (
                      <div key={i} className="text-xs text-gray-700 bg-blue-50 border border-blue-100 rounded px-2.5 py-1.5">{q}</div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-gray-100">
                <button onClick={() => { setGenerated(null); setAiForm(EMPTY_AI_FORM); }} className="btn-secondary text-xs">Generate Another</button>
                <button onClick={() => { handleMarkConducted(generated.id); setGenerated(null); closeNew(); }} className="btn-primary text-xs">
                  <CheckCircle className="w-3.5 h-3.5" /> Mark as Conducted
                </button>
              </div>
            </div>
          )}

          {tab === 'manual' && (
            <form onSubmit={handleManualCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="label">Title / Topic <span className="text-red-400">*</span></label>
                <input className="input" value={manualForm.title} onChange={e => setManualForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="e.g., Safe lifting operations and rigging" required />
              </div>
              <div>
                <label className="label">Location</label>
                <input className="input" value={manualForm.location} onChange={e => setManualForm(p => ({ ...p, location: e.target.value }))}
                  placeholder="e.g., Bonga FPSO Drill Floor" required />
              </div>
              <div>
                <label className="label">Crew Size</label>
                <input type="number" className="input" min="1" value={manualForm.crew_size}
                  onChange={e => setManualForm(p => ({ ...p, crew_size: Number(e.target.value) }))} required />
              </div>
              <div>
                <label className="label">Duration (minutes)</label>
                <input type="number" className="input" min="5" value={manualForm.duration_minutes}
                  onChange={e => setManualForm(p => ({ ...p, duration_minutes: Number(e.target.value) }))} />
              </div>
              <div className="md:col-span-2">
                <label className="label">Discussion Points (one per line)</label>
                <textarea className="input min-h-[100px] resize-none" value={manualForm.discussion_points}
                  onChange={e => setManualForm(p => ({ ...p, discussion_points: e.target.value }))}
                  placeholder="PPE requirements for lifting&#10;Exclusion zone setup&#10;Communication signals" />
              </div>
              <div className="md:col-span-2 flex justify-end gap-2">
                <button type="button" onClick={closeNew} className="btn-secondary text-sm">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary text-sm">
                  <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Talk'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="card h-20 animate-pulse bg-gray-50" />)}</div>
      ) : talks.length === 0 ? (
        <div className="card p-10 text-center">
          <ClipboardList className="w-10 h-10 text-gray-200 mx-auto mb-2" />
          <p className="text-gray-400 text-sm">No toolbox talks yet. Generate your first one with AI.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {talks.map(t => (
            <div key={t.id} className="card p-4 hover:border-flame-200 transition-all">
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${t.ai_generated ? 'bg-flame-50' : 'bg-blue-50'}`}>
                  {t.ai_generated
                    ? <Sparkles className="w-5 h-5 text-flame-500" />
                    : <ClipboardList className="w-5 h-5 text-blue-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-navy-900 font-semibold text-sm">{t.title}</h3>
                    {t.status === 'completed' && <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />}
                    {t.status === 'draft' && <span className="text-xs bg-amber-50 text-amber-600 border border-amber-200 rounded-full px-1.5 py-0.5">Draft</span>}
                    {t.ai_generated && <span className="text-xs bg-flame-50 text-flame-600 border border-flame-200 rounded-full px-1.5 py-0.5">AI</span>}
                  </div>
                  <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{t.crew_size} crew</span>
                    {t.conducted_at && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{format(new Date(t.conducted_at), 'dd MMM yyyy, HH:mm')}</span>}
                    {t.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{t.location}</span>}
                  </div>
                  {t.discussion_points?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {t.discussion_points.slice(0, 3).map((p, i) => (
                        <span key={i} className="text-xs bg-gray-50 text-gray-600 border border-gray-200 rounded px-1.5 py-0.5 max-w-[200px] truncate">{p}</span>
                      ))}
                      {t.discussion_points.length > 3 && <span className="text-xs text-gray-400">+{t.discussion_points.length - 3} more</span>}
                    </div>
                  )}
                </div>
                {t.status === 'draft' && (
                  <button onClick={() => handleMarkConducted(t.id)}
                    className="text-xs text-flame-600 hover:text-flame-700 font-medium flex-shrink-0 border border-flame-200 rounded-lg px-2.5 py-1.5 hover:bg-flame-50 transition-colors">
                    Mark Conducted
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
