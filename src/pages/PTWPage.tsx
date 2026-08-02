import { useState, useEffect } from 'react';
import { Plus, FileText, CheckCircle, Clock, AlertTriangle, X, Save, ChevronRight, ShieldCheck, Info } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { format } from '../lib/date-fns';

interface PTW {
  id: string;
  permit_number: string;
  work_type: string;
  work_description: string;
  work_location: string;
  risk_level: string;
  status: string;
  valid_from: string;
  valid_until: string;
  created_at: string;
  permit_holder_name: string;
}

const WORK_TYPES = ['hot_work', 'cold_work', 'confined_space', 'electrical', 'lifting', 'excavation', 'diving', 'radiography'];
const WORK_TYPE_LABELS: Record<string, string> = {
  hot_work: 'Hot Work', cold_work: 'Cold Work', confined_space: 'Confined Space Entry',
  electrical: 'Electrical Isolation', lifting: 'Critical Lifting', excavation: 'Excavation',
  diving: 'Diving Operations', radiography: 'Radiography',
};

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600', pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700', active: 'bg-blue-100 text-blue-700',
  suspended: 'bg-orange-100 text-orange-700', closed: 'bg-gray-200 text-gray-500',
  cancelled: 'bg-red-100 text-red-600',
};

const RISK_BADGE: Record<string, string> = {
  low: 'badge-risk-low', medium: 'badge-risk-medium', high: 'badge-risk-high', critical: 'badge-risk-critical',
};

// AI-powered requirements checklist per work type
const PTW_REQUIREMENTS: Record<string, { category: string; items: string[] }[]> = {
  hot_work: [
    { category: 'Pre-Work Checks', items: ['Gas test <10% LEL, O₂ 19.5–23.5%, H₂S <1ppm', 'All combustibles removed or shielded within 10m', 'Fire extinguisher (CO2) charged and positioned', 'Standby fire watch assigned and briefed'] },
    { category: 'Permit Requirements', items: ['Hot Work Permit signed by Area Authority', 'Gas test certificate attached (tested within 30 min)', 'All signatories physically present at site', 'Communication with Control Room confirmed'] },
    { category: 'PPE Required', items: ['Flame-resistant (FR) coveralls', 'Face shield (welding grade)', 'Leather gauntlet gloves', 'Safety boots (steel toe, non-sparking)'] },
    { category: 'Post-Work', items: ['Fire watch maintained 30 min after work stops', 'Area inspected for hot spots or smouldering', 'Permit closed out and signed by RP and AA'] },
  ],
  confined_space: [
    { category: 'Pre-Entry Checks', items: ['Space classified and risk assessment completed', 'Full process isolation — double block and bleed or spade', 'LOTO applied and verified by Entry Supervisor', 'Atmosphere tested: O₂, LEL, H₂S at all four quadrants'] },
    { category: 'Entry Team Roles', items: ['Entry Supervisor designated and on site', 'Competent Entrant with valid CSE certification', 'Standby Person at entrance (never enters the space)', 'Standby equipped with SCBA, tripod, rescue winch'] },
    { category: 'Monitoring', items: ['Continuous gas monitoring during entry (alarm set at 50% of limits)', 'Radio communication check every 5 minutes', 'Emergency rescue drill conducted before first entry'] },
    { category: 'Permit', items: ['Confined Space Entry Permit issued and displayed', 'Rescue plan documented on permit', 'Entry log maintained (name, in/out times)'] },
  ],
  electrical: [
    { category: 'Isolation', items: ['All energy sources identified on P&ID redline', 'LOTO applied — every worker uses personal padlock', 'Capacitors discharged and verified at zero volts', 'Independent verification by second competent electrician'] },
    { category: 'Verification', items: ['Zero energy verified with calibrated multi-meter', 'Test instrument proved live on known live circuit before and after', 'All phases tested (L1, L2, L3, neutral)', 'Circuit grounded (earthed) before any contact'] },
    { category: 'PPE Required', items: ['Arc-rated PPE minimum Cat 2 (8 cal/cm²)', 'Insulated gloves (rated for voltage)', 'Face shield or arc flash hood', 'No metal jewellery, watches or accessories'] },
    { category: 'Permit', items: ['Electrical Isolation Permit issued per NEPL-ELEC-001', 'LOTO log maintained with all lock holder details', 'Re-energisation checklist completed before power-on'] },
  ],
  lifting: [
    { category: 'Pre-Lift Planning', items: ['Lift categorised: routine / complex / critical', 'Lift plan prepared and signed by CP Rigger', 'Weather check: wind speed <15 m/s for offshore lifts', 'SIMOPS check — no concurrent activities in lift zone'] },
    { category: 'Equipment Checks', items: ['Crane pre-use inspection completed (daily checklist)', 'All lifting accessories within test date and marked SWL', 'Rigging weight calculated — confirmed within crane chart', 'Softeners fitted on all sharp load edges'] },
    { category: 'Execution Controls', items: ['Exclusion zone = load diameter + 5m minimum', 'Lift Supervisor and dedicated Signaller assigned', 'Tag lines used to guide load — never under the load', 'Trial lift to 150mm — check balance before full lift'] },
    { category: 'Documentation', items: ['Critical Lift Plan signed by OIM (if >20T)', 'Lift record completed post-lift', 'All rigging inspected for damage after de-rig'] },
  ],
  excavation: [
    { category: 'Site Preparation', items: ['CAT scan and underground services drawing obtained', 'Hand-dig within 500mm of identified services', 'Permit issued with services drawing attached', 'Nearest utilities marked with paint and flags'] },
    { category: 'Edge Protection', items: ['Shoring, battering or trench box for >1.2m depth', 'Spoil minimum 500mm from trench edge', 'Rigid barriers with warning signs at trench edge', 'Access ladder every 10m of trench length'] },
    { category: 'Atmospheric Monitoring', items: ['Continuous gas monitor for excavations >1.2m', 'Forced ventilation if gas levels approach 10% LEL', 'Vehicles excluded from within 10m'] },
    { category: 'Permit', items: ['Excavation Permit with services drawing attached', 'Competent Supervisor on site at all times', 'Engineer sign-off before backfill commences'] },
  ],
  diving: [
    { category: 'Pre-Dive', items: ['Diving Supervisor and Diving Medical Technician (DMT) on standby', 'Standby diver suited and ready at all times', 'USBL/diver tracking system operational', 'SIMOPS cleared — all vessel thrusters inhibited in exclusion zone'] },
    { category: 'Equipment', items: ['Dive equipment inspected and test certified within 6 months', 'Umbilical tested for integrity', 'Decompression chamber on board and manned', 'Emergency gas supply verified'] },
    { category: 'Permit', items: ['Diving Operations Permit issued per NEPL diving procedure', 'Diving Plan reviewed and signed by Diving Supervisor', 'Vessel Master notified and in agreement', 'Weather window confirmed: max sea state 2.5m Hs'] },
  ],
  cold_work: [
    { category: 'Work Area', items: ['Work area inspected and hazards identified', 'Concurrent operations (SIMOPS) checked', 'Access and egress confirmed safe'] },
    { category: 'Permit', items: ['Cold Work Permit issued by Area Authority', 'JSA completed and reviewed with crew', 'Permit displayed at work site'] },
    { category: 'PPE', items: ['Appropriate PPE for task identified in JSA', 'PPE inspected before use', 'MSDS reviewed for any chemicals involved'] },
  ],
  radiography: [
    { category: 'Radiation Safety', items: ['Radiation survey conducted and exclusion zone established', 'Dosimetry badges issued to all personnel in zone', 'Shielding verified for radiation source type and activity', 'Radon / NORM management plan in place'] },
    { category: 'Exclusion Zone', items: ['Exclusion zone boundaries set per ALARA calculations', 'Warning signs and barriers at all entry points', 'Radiation Safety Officer (RSO) on site', 'Emergency assembly point identified and briefed'] },
    { category: 'Permit', items: ['Radiography Permit issued with NUPRC licence attached', 'RSO sign-off on all permit conditions', 'Source log and chain of custody maintained'] },
  ],
};

export default function PTWPage() {
  const { user } = useAuthStore();
  const [permits, setPermits] = useState<PTW[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ work_type: 'hot_work', work_description: '', work_location: '', risk_level: 'medium', permit_holder_name: '', valid_from: '', valid_until: '' });

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('permit_to_work').select('*').order('created_at', { ascending: false });
    if (data) setPermits(data as PTW[]);
    setLoading(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const num = `PTW-${Date.now().toString().slice(-6)}`;
    const { error } = await supabase.from('permit_to_work').insert({
      ...form,
      permit_number: num,
      requested_by: user!.id,
      status: 'pending',
    });
    if (!error) {
      setShowNew(false);
      setForm({ work_type: 'hot_work', work_description: '', work_location: '', risk_level: 'medium', permit_holder_name: '', valid_from: '', valid_until: '' });
      load();
    }
    setSaving(false);
  };

  const statusIcon = (status: string) => {
    if (status === 'approved' || status === 'active') return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (status === 'pending') return <Clock className="w-4 h-4 text-yellow-500" />;
    if (status === 'suspended' || status === 'cancelled') return <AlertTriangle className="w-4 h-4 text-orange-500" />;
    return <ChevronRight className="w-4 h-4 text-gray-300" />;
  };

  const requirements = PTW_REQUIREMENTS[form.work_type] ?? PTW_REQUIREMENTS['cold_work'];

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-navy-900">Permit to Work</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage work permits with AI-guided requirements checklists</p>
        </div>
        <button onClick={() => setShowNew(!showNew)} className="btn-primary py-2 px-4 text-sm">
          <Plus className="w-4 h-4" /> New Permit
        </button>
      </div>

      {showNew && (
        <div className="card p-4 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-navy-900 font-semibold text-sm">New Permit to Work</h3>
            <button onClick={() => setShowNew(false)}><X className="w-4 h-4 text-gray-400" /></button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <form onSubmit={handleCreate} className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4 content-start">
              <div>
                <label className="label">Work Type</label>
                <select className="input" value={form.work_type} onChange={e => setForm(p => ({ ...p, work_type: e.target.value }))}>
                  {WORK_TYPES.map(t => <option key={t} value={t}>{WORK_TYPE_LABELS[t]}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Risk Level</label>
                <select className="input" value={form.risk_level} onChange={e => setForm(p => ({ ...p, risk_level: e.target.value }))}>
                  <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
                </select>
              </div>
              <div>
                <label className="label">Work Location <span className="text-red-400">*</span></label>
                <input className="input" value={form.work_location} onChange={e => setForm(p => ({ ...p, work_location: e.target.value }))} placeholder="e.g., Pump Room A, Platform B" required />
              </div>
              <div>
                <label className="label">Permit Holder Name <span className="text-red-400">*</span></label>
                <input className="input" value={form.permit_holder_name} onChange={e => setForm(p => ({ ...p, permit_holder_name: e.target.value }))} placeholder="Full name" required />
              </div>
              <div>
                <label className="label">Valid From <span className="text-red-400">*</span></label>
                <input type="datetime-local" className="input" value={form.valid_from} onChange={e => setForm(p => ({ ...p, valid_from: e.target.value }))} required />
              </div>
              <div>
                <label className="label">Valid Until <span className="text-red-400">*</span></label>
                <input type="datetime-local" className="input" value={form.valid_until} onChange={e => setForm(p => ({ ...p, valid_until: e.target.value }))} required />
              </div>
              <div className="md:col-span-2">
                <label className="label">Work Description <span className="text-red-400">*</span></label>
                <textarea className="input min-h-[80px] resize-none" value={form.work_description} onChange={e => setForm(p => ({ ...p, work_description: e.target.value }))} placeholder="Describe the work activity in detail..." required />
              </div>
              <div className="md:col-span-2 flex justify-end gap-2">
                <button type="button" onClick={() => setShowNew(false)} className="btn-secondary text-sm">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary text-sm">
                  <Save className="w-4 h-4" /> {saving ? 'Submitting…' : 'Submit Permit'}
                </button>
              </div>
            </form>

            {/* AI Requirements Checklist */}
            <div className="lg:col-span-2 space-y-3">
              <div className="flex items-center gap-2 text-navy-900 font-semibold text-xs uppercase tracking-wide">
                <ShieldCheck className="w-4 h-4 text-flame-500" /> AI Requirements — {WORK_TYPE_LABELS[form.work_type]}
              </div>
              <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg px-2.5 py-2 text-xs text-blue-700">
                <Info className="w-3 h-3 flex-shrink-0 mt-0.5" /> Verify each item before submitting. These are minimum requirements per NEPL procedures.
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {requirements.map((cat, i) => (
                  <div key={i} className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-700">{cat.category}</div>
                    <ul className="p-3 space-y-1.5">
                      {cat.items.map((item, j) => (
                        <li key={j} className="flex items-start gap-2 text-xs text-gray-700">
                          <input type="checkbox" className="mt-0.5 flex-shrink-0 rounded" defaultChecked={false} />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400">Reference: NEPL-PTW-001 Permit to Work Procedure v2.1</p>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="card h-20 animate-pulse bg-gray-50" />)}</div>
      ) : permits.length === 0 ? (
        <div className="card p-10 text-center"><FileText className="w-10 h-10 text-gray-200 mx-auto mb-2" /><p className="text-gray-400 text-sm">No permits found. Create your first permit request.</p></div>
      ) : (
        <div className="space-y-2">
          {permits.map(p => (
            <div key={p.id} className="card p-4 hover:border-flame-200 transition-all">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs text-flame-600 font-bold">{p.permit_number}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[p.status]}`}>{p.status}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full border ${RISK_BADGE[p.risk_level]}`}>{p.risk_level}</span>
                  </div>
                  <h3 className="text-navy-900 font-semibold text-sm mt-1">{WORK_TYPE_LABELS[p.work_type]} — {p.work_location}</h3>
                  <p className="text-gray-400 text-xs line-clamp-1 mt-0.5">{p.work_description}</p>
                  <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-400">
                    {p.permit_holder_name && <span>Holder: {p.permit_holder_name}</span>}
                    {p.valid_from && <span>From: {format(new Date(p.valid_from), 'dd MMM HH:mm')}</span>}
                    {p.valid_until && <span>Until: {format(new Date(p.valid_until), 'dd MMM HH:mm')}</span>}
                  </div>
                </div>
                {statusIcon(p.status)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
