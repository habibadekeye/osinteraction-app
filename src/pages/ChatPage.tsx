import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Mic, MicOff, Bot, User, AlertTriangle, BookOpen, Flag, Plus, ThumbsUp, ThumbsDown, Copy, Zap } from 'lucide-react';
import ReactMarkdown from '../lib/react-markdown';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { streamMockResponse } from '../services/mockAI';
import type { ChatSession, ChatMessage, Citation } from '../types';

const QUICK_PROMPTS = [
  'What are the confined space entry requirements?',
  'How do I conduct a JSA for lifting operations?',
  'What PPE is required for hot work?',
  'Explain the PTW process for electrical isolation',
  'What are the H₂S safety procedures?',
  'How do I report a near miss?',
];

export default function ChatPage() {
  const { user } = useAuthStore();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [activeCitations, setActiveCitations] = useState<Citation[]>([]);
  const [showCitations, setShowCitations] = useState(false);
  const [listening, setListening] = useState(false);
  const [useEdgeFunction, setUseEdgeFunction] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => { loadSessions(); }, []);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, streamingContent]);

  const loadSessions = async () => {
    const { data } = await supabase.from('chat_sessions').select('*').order('updated_at', { ascending: false }).limit(20);
    if (data) setSessions(data);
  };

  const loadMessages = async (sessionId: string) => {
    const { data } = await supabase.from('chat_messages').select('*').eq('session_id', sessionId).order('created_at');
    if (data) setMessages(data);
  };

  const createSession = async (title: string) => {
    const { data } = await supabase.from('chat_sessions').insert({ title, user_id: user!.id }).select().maybeSingle();
    if (data) { setSessions(prev => [data, ...prev]); setActiveSession(data); setMessages([]); }
    return data;
  };

  const handleSend = useCallback(async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || streaming) return;
    setInput('');
    if (textareaRef.current) { textareaRef.current.style.height = 'auto'; }

    let session = activeSession;
    if (!session) {
      session = await createSession(content.slice(0, 60));
      if (!session) return;
    }

    setStreaming(true);
    setStreamingContent('');

    if (useEdgeFunction) {
      // --- Edge Function path ---
      try {
        // Optimistically show user message
        const tempUserMsg: ChatMessage = {
          id: crypto.randomUUID(),
          session_id: session.id,
          user_id: user!.id,
          role: 'user',
          content,
          content_type: 'text',
          safety_flag: false,
          escalation_triggered: false,
          governance_status: 'pending',
          citations: [],
          metadata: {},
          created_at: new Date().toISOString(),
        };
        setMessages(prev => [...prev, tempUserMsg]);

        const { data: { session: authSession } } = await supabase.auth.getSession();
        const token = authSession?.access_token;
        if (!token) throw new Error('Not authenticated');

        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
              'Apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({ sessionId: session.id, content }),
          }
        );

        const json = await res.json() as {
          success: boolean;
          data?: {
            userMessage: ChatMessage;
            assistantMessage: ChatMessage;
            safetyFlag: boolean;
            escalationTriggered: boolean;
            citations: Citation[];
          };
          error?: { code: string; message: string };
        };

        setStreamingContent('');
        setStreaming(false);

        if (!json.success || !json.data) throw new Error(json.error?.message ?? 'Edge function error');

        // Replace temp user message with saved one, add assistant message
        setMessages(prev => [
          ...prev.filter(m => m.id !== tempUserMsg.id),
          json.data!.userMessage,
          { ...json.data!.assistantMessage, citations: json.data!.citations as unknown as never },
        ]);

        if (json.data.citations.length > 0) {
          setActiveCitations(json.data.citations);
          setShowCitations(true);
        }
        await supabase.from('chat_sessions').update({ last_message_at: new Date().toISOString(), title: content.slice(0, 60) }).eq('id', session.id);
        loadSessions();
      } catch (err) {
        console.warn('Edge function failed, falling back to mock:', err);
        setStreaming(false);
        setStreamingContent('');
        setUseEdgeFunction(false);
        // Retry with mock
        handleSend(content);
      }
    } else {
      // --- Mock fallback path ---
      const userMsg = { session_id: session.id, user_id: user!.id, role: 'user' as const, content, content_type: 'text', safety_flag: false, escalation_triggered: false, governance_status: 'pending', citations: [], metadata: {} };
      const { data: savedUser } = await supabase.from('chat_messages').insert(userMsg).select().maybeSingle();
      if (savedUser) setMessages(prev => [...prev, savedUser]);

      await streamMockResponse(content, chunk => setStreamingContent(chunk), async response => {
        setStreamingContent('');
        setStreaming(false);
        const aiMsg = { session_id: session!.id, role: 'assistant' as const, content: response.content, content_type: 'text', safety_flag: response.safety_flag, escalation_triggered: response.escalation_triggered, escalation_reason: response.escalation_reason, governance_status: 'pending', citations: response.citations as unknown as never, confidence_score: response.confidence_score, metadata: {} };
        const { data: savedAI } = await supabase.from('chat_messages').insert(aiMsg).select().maybeSingle();
        if (savedAI) {
          setMessages(prev => [...prev, savedAI]);
          if (response.citations.length > 0) { setActiveCitations(response.citations); setShowCitations(true); }
        }
        await supabase.from('chat_sessions').update({ last_message_at: new Date().toISOString(), title: content.slice(0, 60) }).eq('id', session!.id);
        loadSessions();
      });
    }
  }, [input, streaming, activeSession, user, useEdgeFunction]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const toggleVoice = () => {
    if (listening) { recognitionRef.current?.stop(); setListening(false); return; }
    const SR = (window as unknown as Record<string, typeof SpeechRecognition>).SpeechRecognition || (window as unknown as Record<string, typeof SpeechRecognition>).webkitSpeechRecognition;
    if (!SR) { alert('Voice input not supported in this browser.'); return; }
    const rec = new SR();
    rec.lang = 'en-NG';
    rec.onresult = (e: SpeechRecognitionEvent) => { setInput(e.results[0][0].transcript); setListening(false); };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  };

  const flagMessage = async (msgId: string) => {
    await supabase.from('governance_reviews').insert({ message_id: msgId, review_type: 'ai_response', flagged_reason: 'User flagged for review', priority: 'medium', flagged_by: user!.id });
    alert('Response flagged for governance review.');
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Session list */}
      <div className="hidden md:flex flex-col w-56 bg-white border-r border-gray-100 flex-shrink-0">
        <div className="p-3 border-b border-gray-100">
          <button onClick={() => { setActiveSession(null); setMessages([]); setShowCitations(false); }} className="btn-primary w-full justify-center py-2 text-xs">
            <Plus className="w-3.5 h-3.5" /> New Chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {sessions.map(s => (
            <button key={s.id} onClick={() => { setActiveSession(s); loadMessages(s.id); setShowCitations(false); }}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-xs transition-colors ${activeSession?.id === s.id ? 'bg-flame-50 text-flame-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>
              <div className="truncate font-medium">{s.title}</div>
              <div className="text-gray-400 mt-0.5">{s.message_count} messages</div>
            </button>
          ))}
          {sessions.length === 0 && <div className="text-center text-gray-400 text-xs py-8">No conversations yet</div>}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && !streaming && (
            <div className="flex flex-col items-center justify-center h-full text-center px-4 py-12 animate-fade-in">
              <div className="w-16 h-16 bg-flame-50 rounded-2xl flex items-center justify-center mb-4">
                <Bot className="w-8 h-8 text-flame-500" />
              </div>
              <h2 className="text-navy-900 text-xl font-semibold mb-2">HSE OPS AI Assistant</h2>
              <p className="text-gray-500 text-sm max-w-md mb-8">Ask me about NEPL HSE procedures, risk assessments, permit requirements, emergency response, or any safety-related query.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                {QUICK_PROMPTS.map(p => (
                  <button key={p} onClick={() => handleSend(p)} className="text-left px-3 py-2.5 rounded-lg border border-gray-200 hover:border-flame-400 hover:bg-flame-50 text-xs text-gray-600 hover:text-flame-700 transition-all">{p}</button>
                ))}
              </div>
            </div>
          )}

          {messages.map(msg => (
            <div key={msg.id} className={`flex gap-3 animate-fade-in ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-1 ${msg.escalation_triggered ? 'bg-red-100' : 'bg-flame-100'}`}>
                  <Bot className={`w-4 h-4 ${msg.escalation_triggered ? 'text-red-600' : 'text-flame-600'}`} />
                </div>
              )}
              <div className="max-w-[75%]">
                {msg.escalation_triggered && (
                  <div className="flex items-center gap-1.5 text-red-600 text-xs font-bold mb-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> ESCALATION TRIGGERED — Stop Work
                  </div>
                )}
                <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-navy-900 text-white rounded-tr-sm' : `${msg.escalation_triggered ? 'bg-red-50 border border-red-200' : 'bg-white border border-gray-100 shadow-card'} text-navy-900 rounded-tl-sm`}`}>
                  {msg.role === 'user' ? msg.content : (
                    <div className="prose prose-sm max-w-none prose-headings:text-navy-900 prose-strong:text-navy-900 prose-table:text-xs">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  )}
                </div>
                {msg.role === 'assistant' && (
                  <div className="flex items-center gap-1 mt-1.5 ml-1">
                    {(msg.citations as Citation[])?.length > 0 && (
                      <button onClick={() => { setActiveCitations(msg.citations as Citation[]); setShowCitations(true); }}
                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-flame-500 transition-colors">
                        <BookOpen className="w-3 h-3" /> {(msg.citations as Citation[]).length} source{(msg.citations as Citation[]).length > 1 ? 's' : ''}
                      </button>
                    )}
                    <button onClick={() => navigator.clipboard.writeText(msg.content)} className="p-1 text-gray-300 hover:text-gray-500 transition-colors"><Copy className="w-3 h-3" /></button>
                    <button className="p-1 text-gray-300 hover:text-green-500 transition-colors"><ThumbsUp className="w-3 h-3" /></button>
                    <button className="p-1 text-gray-300 hover:text-red-500 transition-colors"><ThumbsDown className="w-3 h-3" /></button>
                    <button onClick={() => flagMessage(msg.id)} className="p-1 text-gray-300 hover:text-orange-500 transition-colors" title="Flag for review"><Flag className="w-3 h-3" /></button>
                  </div>
                )}
              </div>
              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-lg bg-navy-900 flex items-center justify-center flex-shrink-0 mt-1">
                  <User className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
          ))}

          {streaming && (
            <div className="flex gap-3 animate-fade-in">
              <div className="w-8 h-8 rounded-lg bg-flame-100 flex items-center justify-center flex-shrink-0 mt-1">
                <Bot className="w-4 h-4 text-flame-600" />
              </div>
              <div className="max-w-[75%] bg-white border border-gray-100 shadow-card rounded-2xl rounded-tl-sm px-4 py-3">
                {streamingContent ? (
                  <div className="prose prose-sm max-w-none prose-headings:text-navy-900 text-sm leading-relaxed">
                    <ReactMarkdown>{streamingContent}</ReactMarkdown>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 h-5">
                    {[0, 150, 300].map(d => <span key={d} className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />)}
                  </div>
                )}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-gray-100 bg-white p-4">
          <div className="flex items-end gap-2 max-w-4xl mx-auto">
            <div className="flex-1">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about HSE procedures, PTW requirements, risk assessments..."
                rows={1}
                disabled={streaming}
                className="input resize-none min-h-[42px] max-h-32 py-2.5"
                onInput={e => { const t = e.currentTarget; t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 128) + 'px'; }}
              />
            </div>
            <button onClick={toggleVoice} className={`p-2.5 rounded-lg border transition-all flex-shrink-0 ${listening ? 'bg-red-500 border-red-500 text-white' : 'border-gray-200 text-gray-400 hover:text-flame-500 hover:border-flame-400'}`}>
              {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
            <button onClick={() => handleSend()} disabled={!input.trim() || streaming} className="btn-primary py-2.5 px-4 flex-shrink-0">
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-center text-gray-400 text-xs mt-2">
            Always verify AI guidance with your supervisor for critical decisions.
            {useEdgeFunction && <span className="ml-2 inline-flex items-center gap-1 text-flame-500"><Zap className="w-3 h-3" />Edge</span>}
          </p>
        </div>
      </div>

      {/* Citations panel */}
      {showCitations && activeCitations.length > 0 && (
        <div className="hidden lg:flex flex-col w-72 bg-white border-l border-gray-100 flex-shrink-0 animate-slide-up">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2 text-navy-900 font-semibold text-sm">
              <BookOpen className="w-4 h-4 text-flame-500" /> Sources ({activeCitations.length})
            </div>
            <button onClick={() => setShowCitations(false)} className="text-gray-400 hover:text-gray-600 text-xs">Close</button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {activeCitations.map((c, i) => (
              <div key={i} className="rounded-lg border border-gray-100 p-3 hover:border-flame-200 transition-colors">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <span className="text-navy-900 text-xs font-semibold leading-snug">{c.document_title}</span>
                  <span className="text-xs bg-green-50 text-green-700 border border-green-200 rounded-full px-1.5 py-0.5 flex-shrink-0">{Math.round(c.relevance_score * 100)}%</span>
                </div>
                <span className="text-xs font-mono text-flame-600">{c.document_code}</span>
                {c.page && <span className="text-gray-400 text-xs ml-2">p.{c.page}</span>}
                <p className="text-gray-500 text-xs mt-2 leading-relaxed line-clamp-4">{c.excerpt}</p>
              </div>
            ))}
          </div>
          <div className="p-3 border-t border-gray-100">
            <p className="text-gray-400 text-xs text-center">Based on NEPL approved documents</p>
          </div>
        </div>
      )}
    </div>
  );
}
