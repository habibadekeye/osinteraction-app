import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search, BookOpen, Tag, CheckCircle, FileText, X, Plus, Save,
  AlertCircle, Pencil, Trash2, Loader2, Cpu, CheckCheck,
  RefreshCw, AlertTriangle, Clock, Upload, Download, File,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { downloadDocumentPDF, formatFileSize } from '../lib/pdfExport';
import type { KnowledgeDocument, KnowledgeCategory } from '../types';

/* ── Constants ───────────────────────────────────────────────── */
const RISK_BADGE: Record<string, string> = {
  low: 'badge-risk-low', medium: 'badge-risk-medium',
  high: 'badge-risk-high', critical: 'badge-risk-critical',
};

const DOC_TYPE_LABELS: Record<string, string> = {
  procedure: 'Procedure', sop: 'SOP', manual: 'Manual', guideline: 'Guideline',
  alert: 'Alert', lesson_learned: 'Lesson Learned', regulatory: 'Regulatory',
  emergency_plan: 'Emergency Plan',
};

const DOC_TYPES = Object.keys(DOC_TYPE_LABELS);
const RISK_LEVELS = ['low', 'medium', 'high', 'critical'];

const EMPTY_FORM = {
  title: '', document_code: '', category_id: '', document_type: 'procedure',
  description: '', content: '', version: '1.0', risk_level: 'medium',
  is_contractor_visible: false, is_emergency_critical: false, tags_raw: '',
};

/* ── Embedding status badge ──────────────────────────────────── */
function EmbedBadge({ status }: { status?: string | null }) {
  if (!status) return null;
  const cfg: Record<string, { label: string; cls: string; Icon: typeof Cpu }> = {
    processing: { label: 'Indexing…', cls: 'text-yellow-600 bg-yellow-50 border-yellow-200', Icon: Loader2 },
    indexed:    { label: 'Chunked',   cls: 'text-blue-600 bg-blue-50 border-blue-200',       Icon: CheckCircle },
    embedded:   { label: 'AI Ready',  cls: 'text-flame-600 bg-flame-50 border-flame-200',    Icon: Cpu },
    failed:     { label: 'Index fail',cls: 'text-red-600 bg-red-50 border-red-200',          Icon: AlertTriangle },
    skipped:    { label: 'No content',cls: 'text-gray-400 bg-gray-50 border-gray-200',       Icon: AlertCircle },
  };
  const c = cfg[status];
  if (!c) return null;
  const { label, cls, Icon } = c;
  return (
    <span className={`flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full border ${cls}`}>
      <Icon className={`w-2.5 h-2.5 ${status === 'processing' ? 'animate-spin' : ''}`} />
      {label}
    </span>
  );
}

/* ── Accepted file types ─────────────────────────────────────── */
const ACCEPTED = '.pdf,.doc,.docx,.txt';
const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50 MB

/* ── Document form (shared for Add and Edit) ─────────────────── */
interface DocFormProps {
  mode: 'add' | 'edit';
  initial: typeof EMPTY_FORM;
  categories: KnowledgeCategory[];
  onSave: (data: typeof EMPTY_FORM, file: File | null) => Promise<void>;
  onClose: () => void;
  saving: boolean;
  error: string | null;
  existingFileName?: string | null;
}
function DocForm({ mode, initial, categories, onSave, onClose, saving, error, existingFileName }: DocFormProps) {
  const [form, setForm] = useState(initial);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const f = <K extends keyof typeof EMPTY_FORM>(key: K) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(p => ({ ...p, [key]: e.target.value }));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0] ?? null;
    setFileError('');
    if (!picked) { setFile(null); return; }
    if (picked.size > MAX_FILE_BYTES) {
      setFileError(`File is too large (${formatFileSize(picked.size)}). Maximum 50 MB.`);
      setFile(null);
      return;
    }
    setFile(picked);
    // Auto-extract text for plain text files
    if (picked.type === 'text/plain' || picked.name.endsWith('.txt')) {
      const reader = new FileReader();
      reader.onload = ev => {
        const text = ev.target?.result as string;
        setForm(p => ({ ...p, content: text }));
      };
      reader.readAsText(picked);
    }
    // Pre-fill title from filename if title is empty
    if (!form.title) {
      const nameWithoutExt = picked.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ');
      setForm(p => ({ ...p, title: p.title || nameWithoutExt }));
    }
  };

  return (
    <div className="mb-6 card p-5 border-blue-200 dark:border-blue-900/40 bg-blue-50/20 dark:bg-blue-900/5 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-navy-900 dark:text-gray-100 font-semibold text-sm">
            {mode === 'add' ? 'Add Document to Knowledge Base' : `Edit: ${initial.title}`}
          </h3>
          <p className="text-gray-400 text-xs mt-0.5">
            {mode === 'add'
              ? 'Published immediately as Approved. Content will be indexed for AI search.'
              : 'Save changes — the document will be re-indexed for AI search after saving.'}
          </p>
        </div>
        <button onClick={onClose}><X className="w-4 h-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" /></button>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-lg px-3 py-2 mb-4 text-xs text-red-700 dark:text-red-400">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />{error}
        </div>
      )}

      <form onSubmit={e => { e.preventDefault(); onSave(form, file); }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

        <div className="lg:col-span-2">
          <label className="label">Document Title <span className="text-red-400">*</span></label>
          <input className="input" value={form.title} onChange={f('title')} placeholder="e.g. Hot Work Permit Procedure" required />
        </div>
        <div>
          <label className="label">Document Code <span className="text-red-400">*</span></label>
          <input className="input font-mono" value={form.document_code} onChange={f('document_code')} placeholder="e.g. NEPL-PTW-002" required />
        </div>
        <div>
          <label className="label">Category <span className="text-red-400">*</span></label>
          <select className="input" value={form.category_id} onChange={f('category_id')} required>
            <option value="">Select category…</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Document Type</label>
          <select className="input" value={form.document_type} onChange={f('document_type')}>
            {DOC_TYPES.map(t => <option key={t} value={t}>{DOC_TYPE_LABELS[t]}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Risk Level</label>
          <select className="input" value={form.risk_level} onChange={f('risk_level')}>
            {RISK_LEVELS.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Version</label>
          <input className="input" value={form.version} onChange={f('version')} placeholder="1.0" />
        </div>
        <div className="lg:col-span-2">
          <label className="label">Tags <span className="text-gray-400 font-normal">(comma-separated)</span></label>
          <input className="input" value={form.tags_raw} onChange={f('tags_raw')} placeholder="e.g. hot-work, welding, permit" />
        </div>
        <div className="md:col-span-2 lg:col-span-3">
          <label className="label">Description</label>
          <textarea className="input resize-none min-h-[72px]" value={form.description} onChange={f('description')}
            placeholder="Brief summary of what this document covers and when it applies." />
        </div>

        {/* ── File upload ─────────────────────────────────────── */}
        <div className="md:col-span-2 lg:col-span-3">
          <label className="label">
            Attach File
            <span className="text-gray-400 font-normal ml-1">(PDF, Word, TXT — max 50 MB)</span>
          </label>
          <div
            className={`relative border-2 border-dashed rounded-xl p-4 transition-colors cursor-pointer
              ${file ? 'border-flame-400 bg-flame-50/30 dark:bg-flame-500/5' : 'border-gray-200 dark:border-white/10 hover:border-flame-300 dark:hover:border-flame-500/40'}
            `}
            onClick={() => fileRef.current?.click()}
          >
            <input
              ref={fileRef}
              type="file"
              accept={ACCEPTED}
              className="hidden"
              onChange={handleFileChange}
            />
            {file ? (
              <div className="flex items-center gap-3">
                <File className="w-8 h-8 text-flame-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-navy-900 dark:text-gray-100 truncate">{file.name}</p>
                  <p className="text-xs text-gray-400">{formatFileSize(file.size)}</p>
                  {file.name.endsWith('.txt') && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">
                      ✓ Text extracted automatically and placed in Document Content below.
                    </p>
                  )}
                  {(file.name.endsWith('.pdf') || file.name.endsWith('.doc') || file.name.endsWith('.docx')) && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                      File will be uploaded for storage. Paste the text content below for AI indexing.
                    </p>
                  )}
                </div>
                <button type="button" onClick={e => { e.stopPropagation(); setFile(null); if (fileRef.current) fileRef.current.value = ''; }}
                  className="text-gray-400 hover:text-red-500 p-1 flex-shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : existingFileName ? (
              <div className="flex items-center gap-3">
                <File className="w-8 h-8 text-gray-400 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{existingFileName}</p>
                  <p className="text-xs text-gray-400">Click to replace file</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 text-gray-400">
                <Upload className="w-8 h-8 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">Click to upload or drag and drop</p>
                  <p className="text-xs">PDF, Word (.docx), or plain text — max 50 MB</p>
                </div>
              </div>
            )}
          </div>
          {fileError && (
            <p className="text-xs text-red-500 dark:text-red-400 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />{fileError}
            </p>
          )}
        </div>

        {/* ── Document content (text for AI) ───────────────────── */}
        <div className="md:col-span-2 lg:col-span-3">
          <label className="label">
            Document Content
            <span className="text-gray-400 font-normal ml-1">(used by AI for search and citations)</span>
          </label>
          <textarea className="input resize-none min-h-[140px] font-mono text-xs" value={form.content} onChange={f('content')}
            placeholder="Paste the full procedure text here. For .txt uploads this is auto-filled. For PDF/Word, paste the text manually. The AI will use this for semantic search." />
        </div>

        <div className="md:col-span-2 lg:col-span-3 flex items-center gap-6">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" className="rounded" checked={form.is_contractor_visible}
              onChange={e => setForm(p => ({ ...p, is_contractor_visible: e.target.checked }))} />
            <span className="text-sm text-gray-600 dark:text-gray-400">Visible to contractors</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" className="rounded" checked={form.is_emergency_critical}
              onChange={e => setForm(p => ({ ...p, is_emergency_critical: e.target.checked }))} />
            <span className="text-sm text-gray-600 dark:text-gray-400">Emergency critical</span>
          </label>
        </div>
        <div className="md:col-span-2 lg:col-span-3 flex justify-end gap-2 pt-2 border-t border-blue-100 dark:border-blue-900/30">
          <button type="button" onClick={onClose} className="btn-secondary text-sm">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary text-sm">
            {saving
              ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</>
              : <><Save className="w-4 h-4" />{mode === 'add' ? 'Publish Document' : 'Save Changes'}</>}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────────── */
export default function KnowledgePage() {
  const { user, canAccess } = useAuthStore();
  const canWrite = canAccess('knowledge.write');
  const canDelete = !!user && ['admin', 'hse_manager'].includes(user.role);

  const [categories, setCategories] = useState<KnowledgeCategory[]>([]);
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<KnowledgeDocument | null>(null);

  /* Add / Edit form */
  const [showForm, setShowForm]     = useState(false);
  const [editTarget, setEditTarget] = useState<KnowledgeDocument | null>(null);
  const [saving, setSaving]         = useState(false);
  const [saveError, setSaveError]   = useState<string | null>(null);

  /* Delete */
  const [deleteTarget, setDeleteTarget] = useState<KnowledgeDocument | null>(null);
  const [deleting, setDeleting]         = useState(false);

  /* Embed */
  const [embeddingId, setEmbeddingId] = useState<string | null>(null);

  /* Toast */
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    supabase.from('knowledge_categories').select('*').eq('is_active', true).order('display_order')
      .then(({ data }) => { if (data) setCategories(data); });
  }, []);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from('knowledge_documents')
      .select('*, knowledge_categories(name, code)')
      .eq('status', 'approved');
    if (selectedCategory) q = q.eq('category_id', selectedCategory);
    if (search.trim()) q = q.ilike('title', `%${search}%`);
    if (user?.role === 'contractor') q = q.eq('is_contractor_visible', true);
    const { data } = await q.order('title');
    if (data) setDocuments(data);
    setLoading(false);
  }, [selectedCategory, search, user?.role]);

  useEffect(() => { loadDocuments(); }, [loadDocuments]);

  /* ── Trigger embedding edge function ──────────────────────── */
  const triggerEmbed = useCallback(async (docId: string) => {
    setEmbeddingId(docId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { showToast('Not authenticated.', false); return; }

      const res = await supabase.functions.invoke('embed-document', {
        body: { documentId: docId },
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.error) throw new Error(res.error.message);

      const result = res.data as { success: boolean; data: { embeddingStatus: string; chunksCreated: number; message: string } };
      if (result.success) {
        showToast(result.data.message);
        await loadDocuments();
      } else {
        showToast('Indexing failed. Check console for details.', false);
      }
    } catch (err) {
      showToast((err as Error).message ?? 'Indexing failed.', false);
    } finally {
      setEmbeddingId(null);
    }
  }, [loadDocuments]);

  /* ── Save (Add or Edit) ────────────────────────────────────── */
  const handleSave = async (form: typeof EMPTY_FORM, file: File | null) => {
    setSaving(true);
    setSaveError(null);
    const tags = form.tags_raw.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);

    // Upload file to storage first (if provided)
    let fileStorageKey: string | null = editTarget?.file_storage_key ?? null;
    let fileOriginalName: string | null = editTarget?.file_original_name ?? null;
    let fileSizeBytes: number | null = editTarget?.file_size_bytes ?? null;

    if (file) {
      const ext = file.name.split('.').pop() ?? 'bin';
      const docCode = form.document_code.trim().toUpperCase() || `DOC-${Date.now()}`;
      const storageKey = `${docCode}/v${form.version}/${Date.now()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from('knowledge-documents')
        .upload(storageKey, file, { upsert: true, contentType: file.type });

      if (uploadErr) {
        setSaveError(`File upload failed: ${uploadErr.message}`);
        setSaving(false);
        return;
      }
      fileStorageKey = storageKey;
      fileOriginalName = file.name;
      fileSizeBytes = file.size;
    }

    const payload = {
      title: form.title.trim(),
      document_code: form.document_code.trim().toUpperCase(),
      category_id: form.category_id,
      document_type: form.document_type,
      description: form.description.trim(),
      content: form.content.trim() || null,
      version: form.version.trim() || '1.0',
      risk_level: form.risk_level,
      is_contractor_visible: form.is_contractor_visible,
      is_emergency_critical: form.is_emergency_critical,
      metadata_tags: tags,
      file_storage_key: fileStorageKey,
      file_original_name: fileOriginalName,
      file_size_bytes: fileSizeBytes,
    };

    let savedId: string | null = null;

    if (editTarget) {
      const { error } = await supabase
        .from('knowledge_documents')
        .update({ ...payload, embedding_status: null })
        .eq('id', editTarget.id);
      if (error) {
        setSaveError(error.message.includes('unique') ? 'Document code already in use.' : error.message);
        setSaving(false);
        return;
      }
      savedId = editTarget.id;
      showToast('Document updated successfully.');
    } else {
      const { data, error } = await supabase
        .from('knowledge_documents')
        .insert({ ...payload, status: 'approved', created_by: user!.id, approved_at: new Date().toISOString() })
        .select('id')
        .maybeSingle();
      if (error) {
        setSaveError(error.message.includes('unique') ? 'Document code already exists. Use a unique code.' : error.message);
        setSaving(false);
        return;
      }
      savedId = data?.id ?? null;
      showToast('Document published successfully.');
    }

    setShowForm(false);
    setEditTarget(null);
    setSaving(false);
    await loadDocuments();

    // Trigger embedding pipeline (non-blocking) if content exists
    if (savedId && payload.content) {
      triggerEmbed(savedId);
    }
  };

  /* ── Delete ────────────────────────────────────────────────── */
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase.from('knowledge_documents').delete().eq('id', deleteTarget.id);
    if (error) {
      showToast(error.message, false);
    } else {
      showToast('Document deleted.');
      setDeleteTarget(null);
      await loadDocuments();
    }
    setDeleting(false);
  };

  /* ── Download original file ────────────────────────────────── */
  const downloadOriginal = async (doc: KnowledgeDocument) => {
    if (!doc.file_storage_key) return;
    const { data, error } = await supabase.storage
      .from('knowledge-documents')
      .createSignedUrl(doc.file_storage_key, 60);
    if (error || !data?.signedUrl) {
      showToast('Could not generate download link.', false);
      return;
    }
    const a = document.createElement('a');
    a.href = data.signedUrl;
    a.download = doc.file_original_name ?? 'document';
    a.click();
  };

  /* ── Open forms ────────────────────────────────────────────── */
  const openAdd = () => {
    setEditTarget(null);
    setSaveError(null);
    setShowForm(true);
  };

  const openEdit = (doc: KnowledgeDocument) => {
    setEditTarget(doc);
    setSaveError(null);
    setShowForm(true);
  };

  const initialForm = editTarget
    ? {
        title: editTarget.title,
        document_code: editTarget.document_code,
        category_id: editTarget.category_id,
        document_type: editTarget.document_type,
        description: editTarget.description ?? '',
        content: editTarget.content ?? '',
        version: editTarget.version,
        risk_level: editTarget.risk_level,
        is_contractor_visible: editTarget.is_contractor_visible,
        is_emergency_critical: editTarget.is_emergency_critical,
        tags_raw: editTarget.metadata_tags?.join(', ') ?? '',
      }
    : EMPTY_FORM;

  /* ── Render ────────────────────────────────────────────────── */
  return (
    <div className="flex h-full overflow-hidden">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[100] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-fade-in ${
          toast.ok ? 'bg-flame-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {toast.ok ? <CheckCheck className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {toast.msg}
          <button onClick={() => setToast(null)} className="ml-1 opacity-70 hover:opacity-100"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Category sidebar */}
      <div className="hidden lg:flex flex-col w-52 bg-white dark:bg-[#182219] border-r border-gray-100 dark:border-[#1f2e24] flex-shrink-0 overflow-y-auto">
        <div className="p-4 border-b border-gray-100 dark:border-[#1f2e24]">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Categories</h3>
        </div>
        <div className="p-2 space-y-0.5">
          <button onClick={() => setSelectedCategory(null)}
            className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${!selectedCategory ? 'bg-flame-50 dark:bg-flame-500/10 text-flame-700 dark:text-flame-400 font-medium' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'}`}>
            All Documents ({documents.length})
          </button>
          {categories.map(cat => (
            <button key={cat.id} onClick={() => setSelectedCategory(cat.id === selectedCategory ? null : cat.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center justify-between gap-1 ${selectedCategory === cat.id ? 'bg-flame-50 dark:bg-flame-500/10 text-flame-700 dark:text-flame-400 font-medium' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'}`}>
              <span className="truncate">{cat.name}</span>
              <span className={`text-xs px-1 py-0.5 rounded border flex-shrink-0 ${RISK_BADGE[cat.risk_level]}`}>{cat.risk_level[0].toUpperCase()}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Header bar */}
        <div className="bg-white dark:bg-[#182219] border-b border-gray-100 dark:border-[#1f2e24] p-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Search procedures, SOPs, guidelines…" value={search}
                onChange={e => setSearch(e.target.value)} className="input pl-9" />
            </div>
            {canWrite && (
              <button onClick={openAdd} className="btn-primary py-2 px-4 text-sm flex-shrink-0">
                <Plus className="w-4 h-4" /> Add Document
              </button>
            )}
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <BookOpen className="w-3.5 h-3.5" />
            {documents.length} document{documents.length !== 1 ? 's' : ''}
            {selectedCategory && (
              <button onClick={() => setSelectedCategory(null)}
                className="flex items-center gap-1 bg-flame-50 dark:bg-flame-500/10 text-flame-700 dark:text-flame-400 px-2 py-0.5 rounded-full border border-flame-200 dark:border-flame-500/30 hover:bg-flame-100 dark:hover:bg-flame-500/20">
                {categories.find(c => c.id === selectedCategory)?.name} <X className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {/* Add/Edit form */}
          {showForm && (
            <DocForm
              key={editTarget?.id ?? 'new'}
              mode={editTarget ? 'edit' : 'add'}
              initial={initialForm}
              categories={categories}
              onSave={handleSave}
              onClose={() => { setShowForm(false); setEditTarget(null); }}
              saving={saving}
              error={saveError}
              existingFileName={editTarget?.file_original_name}
            />
          )}

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="card p-4 h-40 animate-pulse" />
              ))}
            </div>
          ) : documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <BookOpen className="w-12 h-12 text-gray-200 dark:text-gray-700 mb-3" />
              <p className="text-gray-500 font-medium">No documents found</p>
              <p className="text-gray-400 text-sm mt-1">Try adjusting your search or category filter</p>
              {canWrite && !showForm && (
                <button onClick={openAdd} className="mt-4 btn-primary text-sm">
                  <Plus className="w-4 h-4" /> Add First Document
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {documents.map(doc => {
                const isEmbedding = embeddingId === doc.id;
                return (
                  <div
                    key={doc.id}
                    onClick={() => setSelectedDoc(doc)}
                    className="card p-4 cursor-pointer hover:border-flame-200 dark:hover:border-flame-500/30 hover:shadow-panel transition-all group"
                  >
                    {/* Card top row */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${doc.is_emergency_critical ? 'bg-red-100 dark:bg-red-900/30' : 'bg-blue-50 dark:bg-blue-900/20'}`}>
                        <FileText className={`w-4 h-4 ${doc.is_emergency_critical ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`} />
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap justify-end">
                        {doc.is_emergency_critical && (
                          <span className="text-xs bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/40 rounded-full px-1.5 py-0.5">Critical</span>
                        )}
                        <span className={`text-xs px-1.5 py-0.5 rounded-full border ${RISK_BADGE[doc.risk_level]}`}>{doc.risk_level}</span>
                        <EmbedBadge status={isEmbedding ? 'processing' : doc.embedding_status} />
                      </div>
                    </div>

                    <h3 className="text-navy-900 dark:text-gray-100 font-semibold text-sm leading-snug mb-1 group-hover:text-flame-600 dark:group-hover:text-flame-400 transition-colors line-clamp-2">
                      {doc.title}
                    </h3>
                    <div className="text-xs font-mono text-gray-400 dark:text-gray-500 mb-2">{doc.document_code}</div>
                    <p className="text-gray-500 dark:text-gray-400 text-xs line-clamp-2 mb-3">{doc.description}</p>

                    {/* Bottom row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-white/10 rounded px-1.5 py-0.5">
                          {DOC_TYPE_LABELS[doc.document_type] || doc.document_type}
                        </span>
                        <span className="text-xs text-gray-400">v{doc.version}</span>
                      </div>
                      <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                        <CheckCircle className="w-3 h-3" /> Approved
                      </span>
                    </div>

                    {doc.metadata_tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {doc.metadata_tags.slice(0, 3).map(tag => (
                          <span key={tag} className="flex items-center gap-0.5 text-xs text-gray-400 bg-gray-50 dark:bg-white/5 rounded px-1.5 py-0.5">
                            <Tag className="w-2.5 h-2.5" />{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Admin action row */}
                    {canWrite && (
                      <div
                        className="flex items-center gap-1 mt-3 pt-2 border-t border-gray-100 dark:border-white/5"
                        onClick={e => e.stopPropagation()}
                      >
                        <button
                          onClick={() => openEdit(doc)}
                          title="Edit document"
                          className="flex items-center gap-1 text-xs text-gray-400 hover:text-flame-600 dark:hover:text-flame-400 px-2 py-1 rounded hover:bg-flame-50 dark:hover:bg-flame-500/10 transition-colors"
                        >
                          <Pencil className="w-3 h-3" /> Edit
                        </button>
                        <button
                          onClick={() => triggerEmbed(doc.id)}
                          disabled={isEmbedding}
                          title={doc.embedding_status === 'embedded' ? 'Re-index for AI' : 'Index for AI'}
                          className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 px-2 py-1 rounded hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors disabled:opacity-50"
                        >
                          {isEmbedding
                            ? <><Loader2 className="w-3 h-3 animate-spin" /> Indexing…</>
                            : <><RefreshCw className="w-3 h-3" /> Index AI</>}
                        </button>
                        {canDelete && (
                          <button
                            onClick={() => setDeleteTarget(doc)}
                            title="Delete document"
                            className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-600 dark:hover:text-red-400 px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors ml-auto"
                          >
                            <Trash2 className="w-3 h-3" /> Delete
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Detail panel */}
      {selectedDoc && (
        <div className="hidden xl:flex flex-col w-80 bg-white dark:bg-[#182219] border-l border-gray-100 dark:border-[#1f2e24] flex-shrink-0">
          <div className="p-4 border-b border-gray-100 dark:border-[#1f2e24] flex items-center justify-between">
            <h3 className="text-navy-900 dark:text-gray-100 font-semibold text-sm">Document Details</h3>
            <button onClick={() => setSelectedDoc(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs">Close</button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div>
              <h4 className="text-navy-900 dark:text-gray-100 font-semibold text-sm">{selectedDoc.title}</h4>
              <div className="text-xs font-mono text-flame-600 dark:text-flame-400 mt-1">{selectedDoc.document_code}</div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div><div className="label">Type</div><div className="text-navy-900 dark:text-gray-200">{DOC_TYPE_LABELS[selectedDoc.document_type]}</div></div>
              <div><div className="label">Version</div><div className="text-navy-900 dark:text-gray-200">v{selectedDoc.version}</div></div>
              <div>
                <div className="label">Risk Level</div>
                <span className={`inline-block px-1.5 py-0.5 rounded-full border ${RISK_BADGE[selectedDoc.risk_level]}`}>{selectedDoc.risk_level}</span>
              </div>
              <div>
                <div className="label">Status</div>
                <span className="flex items-center gap-1 text-green-600 dark:text-green-400"><CheckCircle className="w-3 h-3" /> Approved</span>
              </div>
              <div className="col-span-2">
                <div className="label">AI Index</div>
                <EmbedBadge status={embeddingId === selectedDoc.id ? 'processing' : selectedDoc.embedding_status} />
                {!selectedDoc.embedding_status && <span className="text-xs text-gray-400">Not indexed</span>}
              </div>
              {selectedDoc.updated_at && (
                <div className="col-span-2">
                  <div className="label flex items-center gap-1"><Clock className="w-3 h-3" />Last Updated</div>
                  <div className="text-gray-500 dark:text-gray-400">{new Date(selectedDoc.updated_at).toLocaleDateString()}</div>
                </div>
              )}
            </div>
            {selectedDoc.description && (
              <div><div className="label">Description</div>
                <p className="text-gray-600 dark:text-gray-400 text-xs leading-relaxed">{selectedDoc.description}</p>
              </div>
            )}
            {selectedDoc.metadata_tags?.length > 0 && (
              <div><div className="label">Tags</div>
                <div className="flex flex-wrap gap-1">
                  {selectedDoc.metadata_tags.map(tag => (
                    <span key={tag} className="text-xs bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-white/10 rounded-full px-2 py-0.5">{tag}</span>
                  ))}
                </div>
              </div>
            )}
            {selectedDoc.is_contractor_visible && (
              <div className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 rounded-lg px-3 py-2">Visible to contractors</div>
            )}
            {selectedDoc.is_emergency_critical && (
              <div className="text-xs text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30 rounded-lg px-3 py-2">Emergency Critical</div>
            )}
          </div>
          <div className="p-4 border-t border-gray-100 dark:border-[#1f2e24] space-y-2">
              {/* PDF download — always available if there is content */}
              <button
                onClick={() => downloadDocumentPDF(selectedDoc)}
                className="btn-primary w-full justify-center text-xs"
              >
                <Download className="w-3.5 h-3.5" /> Download PDF
              </button>
              {/* Download original uploaded file */}
              {selectedDoc.file_storage_key && (
                <button
                  onClick={() => downloadOriginal(selectedDoc)}
                  className="btn-secondary w-full justify-center text-xs"
                  title={selectedDoc.file_original_name ?? 'Original file'}
                >
                  <File className="w-3.5 h-3.5" />
                  {selectedDoc.file_original_name
                    ? `Download ${selectedDoc.file_original_name.split('.').pop()?.toUpperCase()}`
                    : 'Download Original'}
                  {selectedDoc.file_size_bytes && (
                    <span className="ml-1 text-gray-400">({formatFileSize(selectedDoc.file_size_bytes)})</span>
                  )}
                </button>
              )}
              {canWrite && (
                <>
                  <button
                    onClick={() => { openEdit(selectedDoc); setSelectedDoc(null); }}
                    className="btn-secondary w-full justify-center text-xs"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Edit Document
                  </button>
                  <button
                    onClick={() => triggerEmbed(selectedDoc.id)}
                    disabled={embeddingId === selectedDoc.id}
                    className="btn-secondary w-full justify-center text-xs text-blue-600 dark:text-blue-400"
                  >
                    {embeddingId === selectedDoc.id
                      ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Indexing…</>
                      : <><RefreshCw className="w-3.5 h-3.5" /> Index for AI</>}
                  </button>
                </>
              )}
            </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#182219] rounded-2xl max-w-sm w-full p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 bg-red-50 dark:bg-red-500/10 rounded-xl flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-navy-900 dark:text-gray-100 font-bold text-base mb-1">Delete Document</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">
              Permanently delete <span className="font-semibold text-navy-900 dark:text-gray-100">"{deleteTarget.title}"</span>?
            </p>
            <p className="text-gray-400 text-xs mb-5">All AI chunks and embeddings for this document will also be deleted. This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="btn-secondary flex-1">Cancel</button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-medium text-sm py-2 px-4 rounded-lg transition-colors disabled:opacity-60"
              >
                {deleting ? <><Loader2 className="w-4 h-4 animate-spin" /> Deleting…</> : 'Delete Document'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
