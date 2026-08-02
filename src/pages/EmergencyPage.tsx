import { useState, useEffect, useCallback, useRef } from 'react';
import {
  AlertTriangle, Phone, ChevronDown, ChevronUp, Flame, Wind, Droplets,
  Zap, Anchor, Heart, X, CheckSquare, Plus, Pencil, Trash2, Save,
  Loader2, Settings2, ToggleLeft, ToggleRight, ShieldAlert,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

/* ─── Types ──────────────────────────────────────────────── */
interface EmergencyCard {
  id: string;
  title: string;
  scenario: string;
  severity: string;
  quick_actions: string[];
  checklist_items: string[];
  escalation_contacts: { role: string; number: string }[];
  muster_points: string[];
  equipment_needed: string[];
  color: string;
  icon: string;
  is_active: boolean;
}

interface GlobalContact {
  label: string;
  number: string;
}

interface FormData {
  title: string;
  scenario: string;
  severity: 'high' | 'critical';
  icon: string;
  color: string;
  quick_actions: string[];
  checklist_items: string[];
  escalation_contacts: { role: string; number: string }[];
  muster_points: string[];
  equipment_needed: string[];
  is_active: boolean;
}

/* ─── Constants ─────────────────────────────────────────── */
const ICON_MAP: Record<string, typeof Flame> = {
  fire: Flame, gas: Wind, spill: Droplets,
  electrical: Zap, marine: Anchor, medical: Heart,
};

const ICON_OPTIONS = [
  { value: 'fire', label: 'Fire' },
  { value: 'gas', label: 'Gas' },
  { value: 'spill', label: 'Spill' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'marine', label: 'Marine' },
  { value: 'medical', label: 'Medical' },
];

const COLOR_OPTIONS = [
  { value: 'red', label: 'Red', ring: 'ring-red-500', dot: 'bg-red-500' },
  { value: 'orange', label: 'Orange', ring: 'ring-orange-500', dot: 'bg-orange-500' },
  { value: 'yellow', label: 'Yellow', ring: 'ring-yellow-500', dot: 'bg-yellow-500' },
  { value: 'blue', label: 'Blue', ring: 'ring-blue-500', dot: 'bg-blue-500' },
  { value: 'green', label: 'Green', ring: 'ring-green-500', dot: 'bg-green-500' },
];

const COLOR_MAP: Record<string, string> = {
  red: 'border-red-200 bg-red-50/50 dark:border-red-900/40 dark:bg-red-900/10',
  orange: 'border-orange-200 bg-orange-50/50 dark:border-orange-900/40 dark:bg-orange-900/10',
  yellow: 'border-yellow-200 bg-yellow-50/50 dark:border-yellow-900/40 dark:bg-yellow-900/10',
  blue: 'border-blue-200 bg-blue-50/50 dark:border-blue-900/40 dark:bg-blue-900/10',
  green: 'border-green-200 bg-green-50/50 dark:border-green-900/40 dark:bg-green-900/10',
};

const ICON_BADGE: Record<string, string> = {
  red: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/40',
  orange: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800/40',
  yellow: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800/40',
  blue: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/40',
  green: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800/40',
};

const DEFAULT_CONTACTS: GlobalContact[] = [
  { label: 'Control Room', number: '+234-1-CTRL-000' },
  { label: 'HSE Hotline', number: '+234-800-HSE-NEPL' },
  { label: 'Medical Emergency', number: '101' },
  { label: 'Security', number: '102' },
];

const CONTACTS_KEY = 'hse-ops-ai_emergency_contacts';
const CARDS_KEY    = 'hse-ops-ai_emergency_cards';

const EMPTY_FORM: FormData = {
  title: '',
  scenario: '',
  severity: 'high',
  icon: 'fire',
  color: 'red',
  quick_actions: [],
  checklist_items: [],
  escalation_contacts: [],
  muster_points: [],
  equipment_needed: [],
  is_active: true,
};

/* ─── Seed data (displayed when DB table is not yet available) ── */
const SEED_CARDS: EmergencyCard[] = [
  {
    id: 'seed-fire',
    title: 'Fire Emergency',
    scenario: 'Uncontrolled fire detected in facility, process area, or equipment. Immediate evacuation and response required.',
    severity: 'critical', icon: 'fire', color: 'red',
    quick_actions: [
      'Activate nearest fire alarm pull station',
      'Call Control Room immediately',
      'Evacuate all personnel — do NOT use elevators',
      'Report to designated muster point',
      'Await headcount clearance from Supervisor',
    ],
    checklist_items: [
      'All personnel accounted for at muster point',
      'Fire brigade notified',
      'Access routes clear for emergency vehicles',
      'Utilities (gas, power) isolated if safe',
      'Incident commander on scene and briefed',
    ],
    escalation_contacts: [
      { role: 'HSE Manager',        number: '+234-800-HSE-NEPL' },
      { role: 'Control Room',       number: '+234-1-CTRL-000' },
      { role: 'Fire Brigade',       number: '01-770-0001' },
      { role: 'Site Medical Officer', number: '101' },
    ],
    muster_points: ['Muster Point A – Main Gate Car Park', 'Muster Point B – Drill Ground'],
    equipment_needed: ['CO2 / Dry Powder Extinguisher', 'SCBA Breathing Apparatus', 'Fire-Resistant PPE', 'First Aid Kit'],
    is_active: true,
  },
  {
    id: 'seed-gas',
    title: 'Gas Leak / Toxic Release',
    scenario: 'Detection of flammable or toxic gas release from pipeline, vessel, or storage tank. Risk of explosion or asphyxiation.',
    severity: 'critical', icon: 'gas', color: 'orange',
    quick_actions: [
      'Activate gas alarm — evacuate upwind immediately',
      'Eliminate ALL ignition sources within 50 m radius',
      'Isolate gas supply at nearest isolation valve',
      'Call Control Room — do NOT use mobile phones near leak',
      'Do NOT operate electrical switches in hazardous area',
    ],
    checklist_items: [
      'Wind direction confirmed — all personnel evacuated upwind',
      'Ignition sources eliminated in 50 m radius',
      'Gas isolation valve closed and LOTO applied',
      'Emergency services on standby',
      'Continuous air quality monitoring initiated',
    ],
    escalation_contacts: [
      { role: 'HSE Manager',            number: '+234-800-HSE-NEPL' },
      { role: 'Control Room',           number: '+234-1-CTRL-000' },
      { role: 'Gas Safety Officer',     number: '+234-803-GAS-0001' },
      { role: 'Emergency Response Team', number: '+234-803-ERT-0001' },
    ],
    muster_points: ['Upwind Muster Point – min. 200 m from source', 'Emergency Assembly – Admin Block'],
    equipment_needed: ['Multi-gas Detector (H2S, LEL, CO, O2)', 'SCBA / Air-purifying Respirator', 'Non-sparking Tools', 'Chemical Protective Suit'],
    is_active: true,
  },
  {
    id: 'seed-spill',
    title: 'Oil Spill Response',
    scenario: 'Uncontrolled release of hydrocarbon liquid posing environmental and fire risk.',
    severity: 'high', icon: 'spill', color: 'yellow',
    quick_actions: [
      'Stop source flow if safely possible',
      'Deploy absorbent booms / berms to contain spill',
      'Notify HSE Manager and Control Room immediately',
      'Prevent spill reaching storm drains or water bodies',
      'Activate Spill Response Team',
    ],
    checklist_items: [
      'Spill source identified and isolated',
      'Containment booms deployed',
      'Drainage points blocked',
      'Environmental Officer notified',
      'Spill volume estimated and logged',
    ],
    escalation_contacts: [
      { role: 'HSE Manager',         number: '+234-800-HSE-NEPL' },
      { role: 'Environmental Officer', number: '+234-803-ENV-0001' },
      { role: 'Control Room',        number: '+234-1-CTRL-000' },
    ],
    muster_points: ['Upwind Muster Point – min. 100 m from spill'],
    equipment_needed: ['Absorbent Boom and Spill Pads', 'Chemical-resistant Gloves and Boots', 'Spill Kit (sand / vermiculite)', 'Sample Containers'],
    is_active: true,
  },
  {
    id: 'seed-medical',
    title: 'Medical Emergency',
    scenario: 'Personnel injury, illness, cardiac event, or unconscious worker requiring immediate first aid and medevac.',
    severity: 'high', icon: 'medical', color: 'blue',
    quick_actions: [
      'Call for help — shout or use radio',
      'Do NOT move casualty unless in immediate danger',
      'Begin first aid / CPR if trained',
      'Call Medical Officer: 101',
      'Guide ambulance / medevac to location',
    ],
    checklist_items: [
      'Scene safe — no secondary hazard',
      'Casualty responsiveness and breathing assessed',
      'Qualified first-aider on scene',
      'Ambulance or medic en route with ETA confirmed',
      'Supervisor and HSE Manager notified',
    ],
    escalation_contacts: [
      { role: 'Site Medical Officer', number: '101' },
      { role: 'HSE Manager',         number: '+234-800-HSE-NEPL' },
      { role: 'Control Room',        number: '+234-1-CTRL-000' },
      { role: 'Medevac Coordinator', number: '+234-803-MED-0001' },
    ],
    muster_points: ['Medical Bay – Admin Block Ground Floor', 'Helicopter Landing Zone – Pad Alpha'],
    equipment_needed: ['Comprehensive First Aid Kit', 'AED (Defibrillator)', 'Stretcher / Spine Board', 'Portable Oxygen Cylinder'],
    is_active: true,
  },
  {
    id: 'seed-elec',
    title: 'Electrical Incident',
    scenario: 'Electric shock, electrical fire, equipment failure, or exposed live conductor posing risk to personnel.',
    severity: 'high', icon: 'electrical', color: 'yellow',
    quick_actions: [
      'Do NOT touch victim — isolate power supply first',
      'Isolate at distribution panel or MCC',
      'Call Control Room and confirm isolation',
      'Administer first aid once power confirmed OFF',
      'Secure area with barriers and warning signs',
    ],
    checklist_items: [
      'Power isolation confirmed and LOTO applied',
      'Casualty removed from hazard safely',
      'Medical assessment completed on site',
      'Electrical Supervisor and HSE Manager notified',
      'Area secured pending investigation',
    ],
    escalation_contacts: [
      { role: 'Electrical Supervisor', number: '+234-803-ELEC-01' },
      { role: 'Control Room',          number: '+234-1-CTRL-000' },
      { role: 'Site Medical Officer',  number: '101' },
      { role: 'HSE Manager',           number: '+234-800-HSE-NEPL' },
    ],
    muster_points: ['Muster Point A – Main Gate Car Park', 'Electrical Control Room – Block C'],
    equipment_needed: ['Insulated Rubber Gloves (Class 0+)', 'Voltage Tester / Non-contact Voltmeter', 'Lock-out Tag-out (LOTO) Kit', 'First Aid Kit'],
    is_active: true,
  },
];

/* ─── Hybrid storage helpers ────────────────────────────────── */
function loadLocalCards(): EmergencyCard[] {
  try {
    const raw = localStorage.getItem(CARDS_KEY);
    if (raw) return JSON.parse(raw) as EmergencyCard[];
  } catch { /* ignore */ }
  return SEED_CARDS;
}

function saveLocalCards(cards: EmergencyCard[]): void {
  try { localStorage.setItem(CARDS_KEY, JSON.stringify(cards)); } catch { /* ignore */ }
}

function genId(): string {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/* ─── Sub-components ────────────────────────────────────── */
function StringListEditor({
  label,
  placeholder,
  items,
  onChange,
}: {
  label: string;
  placeholder: string;
  items: string[];
  onChange: (val: string[]) => void;
}) {
  const [draft, setDraft] = useState('');
  const add = () => {
    if (!draft.trim()) return;
    onChange([...items, draft.trim()]);
    setDraft('');
  };
  return (
    <div>
      <span className="label">{label}</span>
      <div className="space-y-1.5">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              value={item}
              onChange={e => onChange(items.map((x, j) => (j === i ? e.target.value : x)))}
              className="input flex-1 text-xs"
            />
            <button
              type="button"
              onClick={() => onChange(items.filter((_, j) => j !== i))}
              className="text-red-400 hover:text-red-600 p-1 flex-shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { add(); e.preventDefault(); } }}
            placeholder={placeholder}
            className="input flex-1 text-xs"
          />
          <button type="button" onClick={add} className="btn-secondary text-xs px-3 flex-shrink-0">
            <Plus className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

function ContactPairEditor({
  items,
  onChange,
}: {
  items: { role: string; number: string }[];
  onChange: (val: { role: string; number: string }[]) => void;
}) {
  const [draftRole, setDraftRole] = useState('');
  const [draftNum, setDraftNum] = useState('');
  const [addError, setAddError] = useState('');

  // Ref always points to the latest items — prevents any stale-closure issue
  // when the parent re-renders between the user's keystrokes and Add click.
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const add = () => {
    const role = draftRole.trim();
    const number = draftNum.trim();
    if (!role && !number) { setAddError('Enter a role and phone number.'); return; }
    if (!role)             { setAddError('Role / title is required.'); return; }
    if (!number)           { setAddError('Phone number is required.'); return; }
    setAddError('');
    onChange([...itemsRef.current, { role, number }]);
    setDraftRole('');
    setDraftNum('');
  };

  const updateAt = (i: number, field: 'role' | 'number', val: string) =>
    onChange(itemsRef.current.map((x, j) => (j === i ? { ...x, [field]: val } : x)));

  const removeAt = (i: number) =>
    onChange(itemsRef.current.filter((_, j) => j !== i));

  return (
    <div>
      <span className="label">Escalation Contacts</span>
      <div className="space-y-1.5">
        {/* Existing contacts — editable in-place */}
        {items.map((c, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              value={c.role}
              onChange={e => updateAt(i, 'role', e.target.value)}
              placeholder="Role / Title"
              className="input flex-1 text-xs"
            />
            <input
              value={c.number}
              onChange={e => updateAt(i, 'number', e.target.value)}
              placeholder="Phone number"
              className="input flex-1 text-xs"
            />
            <button
              type="button"
              onClick={() => removeAt(i)}
              className="text-red-400 hover:text-red-600 p-1 flex-shrink-0"
              title="Remove contact"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}

        {/* Add new contact row */}
        <div className="space-y-1.5 pt-2 border-t border-dashed border-gray-200 dark:border-white/10">
          <div className="flex items-center gap-2">
            <input
              value={draftRole}
              onChange={e => { setDraftRole(e.target.value); if (addError) setAddError(''); }}
              placeholder="Role / Title (e.g. HSE Manager)"
              className={`input flex-1 text-xs ${addError && !draftRole.trim() ? 'border-red-400 focus:ring-red-400/30 focus:border-red-400' : ''}`}
            />
            <input
              value={draftNum}
              onChange={e => { setDraftNum(e.target.value); if (addError) setAddError(''); }}
              onKeyDown={e => { if (e.key === 'Enter') { add(); e.preventDefault(); } }}
              placeholder="Phone number"
              className={`input flex-1 text-xs ${addError && !draftNum.trim() ? 'border-red-400 focus:ring-red-400/30 focus:border-red-400' : ''}`}
            />
            <button
              type="button"
              onClick={add}
              className="btn-primary text-xs px-3 flex-shrink-0"
              title="Add contact"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
          {addError && (
            <p className="text-red-500 dark:text-red-400 text-xs flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 flex-shrink-0" /> {addError}
            </p>
          )}
          <p className="text-gray-400 text-[11px]">Fill both fields and click + (or press Enter) to add.</p>
        </div>
      </div>
    </div>
  );
}

/* ─── Main page ─────────────────────────────────────────── */
export default function EmergencyPage() {
  const { user } = useAuthStore();
  const canManage = !!user && ['admin', 'hse_manager'].includes(user.role);

  /* list state */
  const [cards, setCards] = useState<EmergencyCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [selected, setSelected] = useState<EmergencyCard | null>(null);

  /* global contacts */
  const [contacts, setContacts] = useState<GlobalContact[]>(() => {
    try {
      const s = localStorage.getItem(CONTACTS_KEY);
      return s ? JSON.parse(s) : DEFAULT_CONTACTS;
    } catch { return DEFAULT_CONTACTS; }
  });
  const [editContactsOpen, setEditContactsOpen] = useState(false);
  const [contactsDraft, setContactsDraft] = useState<GlobalContact[]>([]);

  /* create / edit card form */
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<EmergencyCard | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  /* delete */
  const [deleteTarget, setDeleteTarget] = useState<EmergencyCard | null>(null);
  const [deleting, setDeleting] = useState(false);

  /* toast */
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  /* Fetch cards — tries Supabase first, falls back to localStorage */
  const fetchCards = useCallback(async () => {
    setLoading(true);
    try {
      const q = supabase.from('emergency_cards').select('*').order('created_at');
      const { data, error } = canManage ? await q : await q.eq('is_active', true);
      if (error) throw error;
      if (data && data.length > 0) {
        setCards(data);
        saveLocalCards(data);        // keep local copy in sync
      } else if (!data || data.length === 0) {
        // DB exists but is empty — use (and keep) local cards
        setCards(loadLocalCards());
      }
    } catch {
      // Table may not exist yet — use local/seed data
      setCards(loadLocalCards());
    }
    setLoading(false);
  }, [canManage]);

  useEffect(() => { fetchCards(); }, [fetchCards]);

  /* ── Handlers ─────────────────────────────────────────── */
  const openCreate = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };

  const openEdit = (card: EmergencyCard) => {
    setEditTarget(card);
    setForm({
      title: card.title,
      scenario: card.scenario,
      severity: (card.severity as 'high' | 'critical') || 'high',
      icon: card.icon,
      color: card.color,
      quick_actions: card.quick_actions ?? [],
      checklist_items: card.checklist_items ?? [],
      escalation_contacts: card.escalation_contacts ?? [],
      muster_points: card.muster_points ?? [],
      equipment_needed: card.equipment_needed ?? [],
      is_active: card.is_active,
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.scenario.trim()) {
      showToast('Title and scenario description are required.', false);
      return;
    }
    setSaving(true);
    try {
      let saved = false;
      if (editTarget) {
        const { error } = await supabase.from('emergency_cards').update(form).eq('id', editTarget.id);
        if (!error) {
          saved = true;
          showToast('Emergency card updated successfully.');
        } else {
          // Surface the real DB error so we know what's wrong
          console.warn('Supabase update error:', error.message);
        }
      } else {
        const { data: inserted, error } = await supabase.from('emergency_cards').insert(form).select().maybeSingle();
        if (!error && inserted) {
          saved = true;
          showToast('Emergency card created successfully.');
        } else {
          console.warn('Supabase insert error:', error?.message);
        }
      }

      if (!saved) {
        // Supabase write failed (missing RLS policy or table not migrated yet) →
        // persist locally so the change is not lost.
        const current = loadLocalCards();
        let next: EmergencyCard[];
        if (editTarget) {
          next = current.map(c => c.id === editTarget.id ? { ...c, ...form } : c);
        } else {
          next = [...current, { id: genId(), ...form }];
        }
        saveLocalCards(next);
        setCards(next);
        showToast(
          editTarget
            ? 'Card updated locally. Apply the DB migration to persist across devices.'
            : 'Card created locally. Apply the DB migration to persist across devices.'
        );
        setFormOpen(false);
        setSaving(false);
        return;
      }

      setFormOpen(false);
      await fetchCards();
    } catch (err: unknown) {
      // Unexpected error — still save locally
      const current = loadLocalCards();
      const next: EmergencyCard[] = editTarget
        ? current.map(c => c.id === editTarget.id ? { ...c, ...form } : c)
        : [...current, { id: genId(), ...form }];
      saveLocalCards(next);
      setCards(next);
      showToast('Saved locally (DB unavailable). Run the migration to enable cloud storage.');
      setFormOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from('emergency_cards').delete().eq('id', deleteTarget.id);
      if (error) throw error;
      showToast('Emergency card deleted.');
    } catch {
      // Fall back to local delete
      const next = loadLocalCards().filter(c => c.id !== deleteTarget.id);
      saveLocalCards(next);
      setCards(next);
      showToast('Card removed locally.');
      setDeleteTarget(null);
      setDeleting(false);
      return;
    }
    setDeleteTarget(null);
    await fetchCards();
    setDeleting(false);
  };

  const handleToggleActive = async (card: EmergencyCard) => {
    const next = !card.is_active;
    const { error } = await supabase
      .from('emergency_cards')
      .update({ is_active: next })
      .eq('id', card.id);
    if (!error) {
      showToast(`Card ${next ? 'activated' : 'deactivated'}.`);
      await fetchCards();
    } else {
      // Local fallback
      const updated = loadLocalCards().map(c => c.id === card.id ? { ...c, is_active: next } : c);
      saveLocalCards(updated);
      setCards(updated);
      showToast(`Card ${next ? 'activated' : 'deactivated'} (locally).`);
    }
  };

  const saveContacts = () => {
    setContacts(contactsDraft);
    localStorage.setItem(CONTACTS_KEY, JSON.stringify(contactsDraft));
    setEditContactsOpen(false);
    showToast('Emergency contacts updated.');
  };

  const setField = <K extends keyof FormData>(key: K) =>
    (val: FormData[K]) => setForm(prev => ({ ...prev, [key]: val }));

  /* ── Render ───────────────────────────────────────────── */
  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[100] flex items-center gap-2 px-4 py-3 rounded-xl shadow-panel text-sm font-medium animate-fade-in ${
          toast.ok ? 'bg-flame-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {toast.msg}
          <button onClick={() => setToast(null)} className="ml-1 opacity-70 hover:opacity-100"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Banner */}
      <div className="bg-red-600 rounded-xl p-4 mb-6 flex items-start sm:items-center gap-4">
        <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-white font-bold text-lg">Emergency Response Procedures</h1>
          <p className="text-red-100 text-sm mt-0.5">In a real emergency, activate the alarm and contact the control room immediately.</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 bg-white/20 rounded-lg px-3 py-2 text-white text-sm flex-shrink-0">
          <Phone className="w-4 h-4" />
          <span className="font-mono font-bold">999 / 112</span>
        </div>
      </div>

      {/* Global emergency contacts */}
      <div className="card p-3 mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Phone className="w-3.5 h-3.5 text-flame-500" />
            <span className="text-navy-900 dark:text-gray-100 text-xs font-semibold uppercase tracking-wider">Key Emergency Contacts</span>
          </div>
          {canManage && (
            <button
              onClick={() => { setContactsDraft([...contacts]); setEditContactsOpen(true); }}
              className="flex items-center gap-1.5 text-xs text-flame-600 dark:text-flame-400 hover:underline"
            >
              <Settings2 className="w-3 h-3" /> Edit Contacts
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {contacts.map((c, i) => (
            <div key={i} className="bg-red-50 dark:bg-red-900/15 border border-red-100 dark:border-red-900/30 rounded-lg p-2.5">
              <div className="text-red-600 dark:text-red-400 text-xs font-medium">{c.label}</div>
              <div className="font-mono text-navy-900 dark:text-gray-100 text-sm font-bold mt-0.5">{c.number}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Admin toolbar */}
      {canManage && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-flame-500" />
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Management View — {cards.filter(c => !c.is_active).length} inactive card{cards.filter(c => !c.is_active).length !== 1 ? 's' : ''}
            </span>
          </div>
          <button onClick={openCreate} className="btn-primary text-xs">
            <Plus className="w-3.5 h-3.5" /> Add Card
          </button>
        </div>
      )}

      {/* Card grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="card h-24 animate-pulse" />)}
        </div>
      ) : cards.length === 0 ? (
        <div className="card p-10 text-center">
          <AlertTriangle className="w-10 h-10 text-gray-200 dark:text-gray-700 mx-auto mb-2" />
          <p className="text-gray-400 text-sm">No emergency cards available.</p>
          {canManage && <button onClick={openCreate} className="btn-primary mt-4 text-xs mx-auto"><Plus className="w-3.5 h-3.5" /> Add First Card</button>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cards.map(card => {
            const Icon = ICON_MAP[card.icon] || AlertTriangle;
            const borderColor = COLOR_MAP[card.color] || 'border-gray-200';
            const badgeColor = ICON_BADGE[card.color] || 'bg-gray-100 text-gray-700 border-gray-200';
            const isExpanded = expanded === card.id;
            return (
              <div
                key={card.id}
                className={`card overflow-hidden border ${borderColor} transition-all ${!card.is_active ? 'opacity-50' : ''}`}
              >
                {/* Card header row */}
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 border ${badgeColor} cursor-pointer`}
                      onClick={() => setExpanded(isExpanded ? null : card.id)}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpanded(isExpanded ? null : card.id)}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-navy-900 dark:text-gray-100 font-semibold text-sm">{card.title}</h3>
                        {card.severity === 'critical' && (
                          <span className="text-xs bg-red-600 text-white rounded-full px-1.5 py-0.5">CRITICAL</span>
                        )}
                        {canManage && !card.is_active && (
                          <span className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-full px-1.5 py-0.5">INACTIVE</span>
                        )}
                      </div>
                      <p className="text-gray-500 text-xs mt-0.5 line-clamp-2">{card.scenario}</p>
                    </div>

                    {/* Admin action buttons */}
                    {canManage ? (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => handleToggleActive(card)}
                          title={card.is_active ? 'Deactivate' : 'Activate'}
                          className={`p-1.5 rounded-lg transition-colors ${card.is_active ? 'text-flame-500 hover:bg-flame-50 dark:hover:bg-flame-500/10' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'}`}
                        >
                          {card.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => openEdit(card)}
                          title="Edit card"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-flame-600 dark:hover:text-flame-400 hover:bg-flame-50 dark:hover:bg-flame-500/10 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(card)}
                          title="Delete card"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setExpanded(isExpanded ? null : card.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setExpanded(isExpanded ? null : card.id)}
                        className="p-1 text-gray-400 flex-shrink-0 mt-1"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded section */}
                {isExpanded && (
                  <div className="border-t border-gray-100 dark:border-[#1f2e24] p-4 space-y-4 animate-fade-in">
                    {card.quick_actions?.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-red-700 dark:text-red-400 uppercase tracking-wider mb-2">Immediate Actions</h4>
                        <ol className="space-y-1.5">
                          {card.quick_actions.map((action, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-xs text-navy-900 dark:text-gray-200">
                              <span className="w-5 h-5 bg-red-600 text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold text-xs">{idx + 1}</span>
                              {action}
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
                    {card.checklist_items?.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-orange-700 dark:text-orange-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                          <CheckSquare className="w-3 h-3" /> Checklist
                        </h4>
                        <ul className="space-y-1">
                          {card.checklist_items.map((item, idx) => (
                            <li key={idx} className="flex items-center gap-2 text-xs text-navy-900 dark:text-gray-200">
                              <span className="w-3.5 h-3.5 border-2 border-orange-400 rounded flex-shrink-0" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {card.escalation_contacts?.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                          <Phone className="w-3 h-3" /> Contacts
                        </h4>
                        <div className="space-y-1">
                          {card.escalation_contacts.map((c, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs">
                              <span className="text-gray-600 dark:text-gray-400">{c.role}</span>
                              <span className="font-mono font-semibold text-navy-900 dark:text-gray-100">{c.number}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <button onClick={() => setSelected(card)} className="btn-secondary text-xs w-full justify-center">
                      View Full Card
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── View modal ──────────────────────────────────── */}
      {selected && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-white dark:bg-[#182219] rounded-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="bg-red-600 p-4 rounded-t-2xl flex items-center justify-between">
              <h2 className="text-white font-bold text-lg">{selected.title}</h2>
              <button onClick={() => setSelected(null)} className="text-white/70 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-5">
              <p className="text-gray-600 dark:text-gray-400 text-sm">{selected.scenario}</p>
              {selected.quick_actions?.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-red-700 dark:text-red-400 mb-2">Quick Actions</h4>
                  <ol className="space-y-2">{selected.quick_actions.map((a, i) => <li key={i} className="flex gap-2 text-sm dark:text-gray-200"><span className="w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold text-xs">{i + 1}</span>{a}</li>)}</ol>
                </div>
              )}
              {selected.checklist_items?.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-orange-700 dark:text-orange-400 mb-2">Checklist</h4>
                  <ul className="space-y-1">{selected.checklist_items.map((item, i) => <li key={i} className="flex items-center gap-2 text-sm dark:text-gray-200"><span className="w-3.5 h-3.5 border-2 border-orange-400 rounded flex-shrink-0" />{item}</li>)}</ul>
                </div>
              )}
              {selected.muster_points?.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-blue-700 dark:text-blue-400 mb-2">Muster Points</h4>
                  <ul className="space-y-1">{selected.muster_points.map((p, i) => <li key={i} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2"><span className="text-blue-600 flex-shrink-0">●</span>{p}</li>)}</ul>
                </div>
              )}
              {selected.equipment_needed?.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Equipment Needed</h4>
                  <ul className="space-y-1">{selected.equipment_needed.map((e, i) => <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2"><span className="text-gray-400 flex-shrink-0">—</span>{e}</li>)}</ul>
                </div>
              )}
              {selected.escalation_contacts?.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-blue-700 dark:text-blue-400 mb-2">Escalation Contacts</h4>
                  <div className="space-y-1.5">{selected.escalation_contacts.map((c, i) => (
                    <div key={i} className="flex justify-between text-sm"><span className="text-gray-500 dark:text-gray-400">{c.role}</span><span className="font-mono font-semibold dark:text-gray-100">{c.number}</span></div>
                  ))}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Create / Edit form modal ─────────────────────── */}
      {formOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div
            className="bg-white dark:bg-[#182219] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-[#1f2e24] flex-shrink-0">
              <h2 className="text-navy-900 dark:text-gray-100 font-bold text-base">
                {editTarget ? 'Edit Emergency Card' : 'New Emergency Card'}
              </h2>
              <button onClick={() => setFormOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1 p-5 space-y-5">
              {/* Basic info */}
              <div className="space-y-3">
                <div>
                  <label className="label">Title *</label>
                  <input value={form.title} onChange={e => setField('title')(e.target.value)} placeholder="e.g. Fire Emergency" className="input" />
                </div>
                <div>
                  <label className="label">Scenario Description *</label>
                  <textarea
                    value={form.scenario}
                    onChange={e => setField('scenario')(e.target.value)}
                    placeholder="Describe when this card applies..."
                    rows={3}
                    className="input resize-none"
                  />
                </div>
                <div>
                  <label className="label">Severity</label>
                  <div className="flex gap-3">
                    {(['high', 'critical'] as const).map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setField('severity')(s)}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${
                          form.severity === s
                            ? s === 'critical'
                              ? 'bg-red-600 text-white border-red-600'
                              : 'bg-orange-500 text-white border-orange-500'
                            : 'bg-white dark:bg-white/5 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-white/10 hover:border-gray-300'
                        }`}
                      >
                        {s.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Appearance */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Icon Type</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {ICON_OPTIONS.map(opt => {
                      const Ic = ICON_MAP[opt.value] || AlertTriangle;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setField('icon')(opt.value)}
                          className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-xs transition-all ${
                            form.icon === opt.value
                              ? 'border-flame-500 bg-flame-50 dark:bg-flame-500/10 text-flame-600 dark:text-flame-400'
                              : 'border-gray-200 dark:border-white/10 text-gray-500 hover:border-gray-300 dark:hover:border-white/20'
                          }`}
                        >
                          <Ic className="w-4 h-4" />
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label className="label">Colour Theme</label>
                  <div className="flex flex-col gap-1.5">
                    {COLOR_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setField('color')(opt.value)}
                        className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg border text-xs transition-all ${
                          form.color === opt.value
                            ? `${opt.ring} ring-1 border-transparent bg-gray-50 dark:bg-white/5`
                            : 'border-gray-200 dark:border-white/10 hover:border-gray-300'
                        }`}
                      >
                        <span className={`w-3 h-3 rounded-full flex-shrink-0 ${opt.dot}`} />
                        <span className="text-gray-700 dark:text-gray-300">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Content arrays */}
              <div className="pt-2 border-t border-gray-100 dark:border-[#1f2e24] space-y-5">
                <StringListEditor
                  label="Quick Actions (Immediate Steps)"
                  placeholder="Add immediate action…"
                  items={form.quick_actions}
                  onChange={setField('quick_actions')}
                />
                <StringListEditor
                  label="Checklist Items"
                  placeholder="Add checklist item…"
                  items={form.checklist_items}
                  onChange={setField('checklist_items')}
                />
                <ContactPairEditor
                  key={`ec-${editTarget?.id ?? 'new'}`}
                  items={form.escalation_contacts}
                  onChange={setField('escalation_contacts')}
                />
                <StringListEditor
                  label="Muster Points"
                  placeholder="Add muster point…"
                  items={form.muster_points}
                  onChange={setField('muster_points')}
                />
                <StringListEditor
                  label="Equipment Needed"
                  placeholder="Add equipment item…"
                  items={form.equipment_needed}
                  onChange={setField('equipment_needed')}
                />
              </div>

              {/* Active toggle */}
              <div className="flex items-center justify-between py-2 border-t border-gray-100 dark:border-[#1f2e24]">
                <div>
                  <p className="text-sm font-medium text-navy-900 dark:text-gray-100">Active</p>
                  <p className="text-xs text-gray-400">Inactive cards are hidden from field users</p>
                </div>
                <button
                  type="button"
                  onClick={() => setField('is_active')(!form.is_active)}
                  className={`relative w-10 h-6 rounded-full transition-colors ${form.is_active ? 'bg-flame-500' : 'bg-gray-200 dark:bg-white/10'}`}
                >
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.is_active ? 'translate-x-5' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-gray-100 dark:border-[#1f2e24] flex items-center justify-end gap-3 flex-shrink-0">
              <button onClick={() => setFormOpen(false)} className="btn-secondary text-sm">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary text-sm">
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : <><Save className="w-4 h-4" />{editTarget ? 'Save Changes' : 'Create Card'}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirmation ──────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#182219] rounded-2xl max-w-sm w-full p-6 shadow-2xl">
            <div className="w-12 h-12 bg-red-50 dark:bg-red-500/10 rounded-xl flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-navy-900 dark:text-gray-100 font-bold text-base mb-1">Delete Emergency Card</h3>
            <p className="text-gray-500 text-sm mb-5">
              Permanently delete <span className="font-semibold text-navy-900 dark:text-gray-100">"{deleteTarget.title}"</span>? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleDelete} disabled={deleting} className="btn-danger flex-1">
                {deleting ? <><Loader2 className="w-4 h-4 animate-spin" />Deleting…</> : 'Delete Card'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit global contacts modal ───────────────────── */}
      {editContactsOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#182219] rounded-2xl max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-[#1f2e24]">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-flame-500" />
                <h2 className="text-navy-900 dark:text-gray-100 font-bold text-base">Edit Emergency Contacts</h2>
              </div>
              <button onClick={() => setEditContactsOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-xs text-gray-400">These contacts appear at the top of the emergency page for all users.</p>
              {contactsDraft.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={c.label}
                    onChange={e => setContactsDraft(contactsDraft.map((x, j) => j === i ? { ...x, label: e.target.value } : x))}
                    placeholder="Label (e.g. Control Room)"
                    className="input flex-1 text-xs"
                  />
                  <input
                    value={c.number}
                    onChange={e => setContactsDraft(contactsDraft.map((x, j) => j === i ? { ...x, number: e.target.value } : x))}
                    placeholder="Phone number"
                    className="input flex-1 text-xs"
                  />
                  <button
                    onClick={() => setContactsDraft(contactsDraft.filter((_, j) => j !== i))}
                    className="text-red-400 hover:text-red-600 p-1 flex-shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => setContactsDraft([...contactsDraft, { label: '', number: '' }])}
                className="btn-secondary text-xs w-full justify-center"
              >
                <Plus className="w-3 h-3" /> Add Contact
              </button>
            </div>
            <div className="px-5 py-4 border-t border-gray-100 dark:border-[#1f2e24] flex gap-3">
              <button onClick={() => setEditContactsOpen(false)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={saveContacts} className="btn-primary flex-1">
                <Save className="w-4 h-4" /> Save Contacts
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
