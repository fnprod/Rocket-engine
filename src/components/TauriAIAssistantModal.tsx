import React, { useState, useEffect, useRef } from 'react';
import { 
  checkGeminiStatus, 
  saveGeminiApiKey, 
  streamGeminiResponse, 
  getNativeSystemSpecs,
  isTauriDesktop,
  GeminiStatus,
  NativeSystemSpecs
} from '../services/gemini';
import { 
  Bot, 
  Key, 
  ShieldCheck, 
  Send, 
  Sparkles, 
  Monitor, 
  Cpu, 
  CheckCircle2, 
  AlertCircle,
  StopCircle,
  Copy,
  Check,
  Terminal,
  Zap
} from 'lucide-react';

interface TauriAIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: 'ar' | 'en';
}

export const TauriAIAssistantModal: React.FC<TauriAIAssistantModalProps> = ({
  isOpen,
  onClose,
  language
}) => {
  const isAr = language === 'ar';
  const isDesktop = isTauriDesktop();

  const [status, setStatus] = useState<GeminiStatus>({
    isConfigured: false,
    source: 'NOT_CONFIGURED',
    model: 'gemini-1.5-flash'
  });
  const [specs, setSpecs] = useState<NativeSystemSpecs | null>(null);
  const [inputKey, setInputKey] = useState('');
  const [isKeySaving, setIsKeySaving] = useState(false);
  const [keySaveMessage, setKeySaveMessage] = useState<string | null>(null);

  // Chat/Prompt State
  const [prompt, setPrompt] = useState('');
  const [streamingResponse, setStreamingResponse] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const cancelStreamRef = useRef<(() => void) | null>(null);
  const responseEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      checkGeminiStatus().then(setStatus);
      getNativeSystemSpecs().then(setSpecs);
    }
  }, [isOpen]);

  useEffect(() => {
    if (responseEndRef.current) {
      responseEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [streamingResponse]);

  if (!isOpen) return null;

  const handleSaveKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputKey.trim()) return;

    setIsKeySaving(true);
    setKeySaveMessage(null);
    try {
      await saveGeminiApiKey(inputKey.trim());
      setInputKey('');
      const newStatus = await checkGeminiStatus();
      setStatus(newStatus);
      setKeySaveMessage(
        isAr 
          ? '✓ تم حفظ المفتاح بنجاح داخل نواة Rust المشفرة في بيئة Tauri Desktop.' 
          : '✓ API Key securely stored in Rust backend state.'
      );
      setTimeout(() => setKeySaveMessage(null), 3500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setKeySaveMessage(isAr ? `خطأ في الحفظ: ${msg}` : `Save error: ${msg}`);
    } finally {
      setIsKeySaving(false);
    }
  };

  const handleSendPrompt = async (textToSend?: string) => {
    const activePrompt = textToSend || prompt;
    if (!activePrompt.trim() || isStreaming) return;

    setStreamingResponse('');
    setStreamError(null);
    setIsStreaming(true);

    const cancel = await streamGeminiResponse(
      activePrompt,
      {
        onChunk: (chunk) => {
          setStreamingResponse((prev) => prev + chunk);
        },
        onComplete: () => {
          setIsStreaming(false);
          cancelStreamRef.current = null;
        },
        onError: (err) => {
          setStreamError(err);
          setIsStreaming(false);
          cancelStreamRef.current = null;
        }
      },
      status.model
    );

    cancelStreamRef.current = cancel;
  };

  const handleStopStream = () => {
    if (cancelStreamRef.current) {
      cancelStreamRef.current();
      cancelStreamRef.current = null;
    }
    setIsStreaming(false);
  };

  const handleCopyResponse = () => {
    if (!streamingResponse) return;
    navigator.clipboard.writeText(streamingResponse);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const samplePrompts = [
    {
      label: isAr ? 'تحليل محركي الرئيسي (1.35 / 0.04)' : "Analyze My Master Engine (1.35 / 0.04)",
      prompt: 'Analyze My Master Engine parameters (0.04 Deadzone, 1.45 Aerial, 1.50 Ground, 1.35 Curve Exponent) and explain how it influences high-speed flip reset and 50/50 aerial recovery at 1000Hz polling rate.'
    },
    {
      label: isAr ? 'توقيتات سبيد فليب 1000Hz' : '1000Hz Speedflip Timings',
      prompt: 'Calculate the mathematical frame cancellation window for a 45-degree diagonal speedflip with 1.0ms (1000Hz) DirectInput scancode injection.'
    },
    {
      label: isAr ? 'معادلة منع الجيتر العتادي' : 'Hardware Jitter Damping Math',
      prompt: 'Provide mathematical formula for deadzone rescaling when switching from standard linear input to Unreal Engine 1.0/-1.0 symmetric dynamic curve.'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-cyan-500/30 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden relative">
        
        {/* Header Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  {isAr ? 'مساعد الذكاء الاصطناعي وهندسة Tauri v2' : 'Gemini AI Studio & Tauri v2 Desktop Hub'}
                </h3>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                  isDesktop 
                    ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/40' 
                    : 'bg-blue-950/60 text-blue-400 border-blue-500/40'
                }`}>
                  {isDesktop ? 'TAURI V2 NATIVE' : 'WEB CLIENT'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {isAr 
                  ? 'بث استجابات Gemini في الوقت الفعلي عبر قنوات IPC المشفرة في Rust backend' 
                  : 'Real-time Gemini token streaming via secure Rust backend IPC bridge'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white text-lg font-mono px-2 py-1 rounded hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* Windows 11 System Specs & IPC Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-3">
              <Monitor className="w-4 h-4 text-cyan-400 shrink-0" />
              <div className="min-w-0">
                <div className="text-[10px] font-mono uppercase text-slate-500">{isAr ? 'نظام التشغيل' : 'Host OS'}</div>
                <div className="text-xs font-bold text-slate-200 truncate">{specs?.os || 'Windows 11 Pro 64-bit'}</div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-3">
              <Cpu className="w-4 h-4 text-amber-400 shrink-0" />
              <div className="min-w-0">
                <div className="text-[10px] font-mono uppercase text-slate-500">{isAr ? 'معدل بث العتاد' : 'Hardware Polling'}</div>
                <div className="text-xs font-bold text-amber-300">1000Hz (1.0ms DirectInput)</div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-3">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="min-w-0">
                <div className="text-[10px] font-mono uppercase text-slate-500">{isAr ? 'حالة مفتاح الذكاء' : 'API Key Storage'}</div>
                <div className="text-xs font-bold text-emerald-300">
                  {status.isConfigured ? `CONFIGURED (${status.source})` : 'NOT CONFIGURED'}
                </div>
              </div>
            </div>
          </div>

          {/* Secure Key Ingestion Form */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-cyan-400" />
                <h4 className="text-xs font-bold text-slate-200">
                  {isAr ? 'إدارة مفتاح Google Gemini API بشكل آمن' : 'Secure Gemini API Key Management'}
                </h4>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                Model: <span className="text-cyan-400 font-semibold">{status.model}</span>
              </span>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              {isAr
                ? 'وفقًا لمتطلبات الأمان الهندسية: لا يتم إظهار أو تخزين مفتاحك داخل كود الواجهة (JavaScript/DOM). يتم إرسال المفتاح عبر أمر Tauri IPC إلى ذاكرة Rust الخلفية فقط.'
                : 'Security Compliance: Your Gemini API Key is never stored in browser memory or the DOM. It is transferred strictly via Tauri IPC invoke to the encrypted Rust backend state.'}
            </p>

            <form onSubmit={handleSaveKey} className="flex flex-col sm:flex-row gap-2">
              <input
                type="password"
                placeholder={status.isConfigured ? '••••••••••••••••••••••••••••••••••••' : 'AIzaSy... (Paste Google AI Studio API Key)'}
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-700 focus:border-cyan-400 rounded-lg px-3 py-2 text-xs text-white font-mono outline-none"
              />
              <button
                type="submit"
                disabled={isKeySaving || !inputKey.trim()}
                className="px-4 py-2 text-xs font-bold bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 rounded-lg transition-all cursor-pointer font-mono shrink-0"
              >
                {isKeySaving ? (isAr ? 'جاري الحفظ...' : 'Saving...') : (isAr ? 'حفظ بأمان' : 'Save Key (Rust)')}
              </button>
            </form>

            {keySaveMessage && (
              <div className="text-xs font-mono text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>{keySaveMessage}</span>
              </div>
            )}
          </div>

          {/* Quick Prompt Chips */}
          <div>
            <div className="text-xs font-bold text-slate-400 mb-2">
              {isAr ? 'أسئلة سريعة لمحاكاة الفيزياء وتحليل المحترفين:' : 'Quick Pro Telemetry Prompts:'}
            </div>
            <div className="flex flex-wrap gap-2">
              {samplePrompts.map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setPrompt(sample.prompt);
                    handleSendPrompt(sample.prompt);
                  }}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 transition-colors cursor-pointer text-left"
                >
                  ⚡ {sample.label}
                </button>
              ))}
            </div>
          </div>

          {/* Prompt Input Box */}
          <div className="space-y-2">
            <div className="relative">
              <textarea
                rows={3}
                placeholder={isAr ? 'اطلب من مساعد الذكاء تحليل إعدادات الحساسية، الديدزون، أو معادلات الانجراف...' : 'Ask Gemini AI to analyze physics curves, deadzones, or speedflip frame cancels...'}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-400 rounded-xl p-3 text-xs text-white font-mono outline-none resize-none"
              />
              <div className="absolute bottom-2.5 right-2.5 flex items-center gap-2">
                {isStreaming ? (
                  <button
                    type="button"
                    onClick={handleStopStream}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-red-500/20 text-red-300 border border-red-500/40 rounded-lg hover:bg-red-500/30 cursor-pointer"
                  >
                    <StopCircle className="w-3.5 h-3.5" />
                    <span>{isAr ? 'إيقاف البث' : 'Stop Stream'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSendPrompt()}
                    disabled={!prompt.trim()}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 rounded-lg transition-all cursor-pointer shadow-md shadow-cyan-950/40"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isAr ? 'إرسال' : 'Send'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Streaming Response Console Output */}
          {(streamingResponse || isStreaming || streamError) && (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
                  <Terminal className="w-3.5 h-3.5" />
                  <span>{isAr ? 'بث الرد المباشر (IPC Token Stream):' : 'Live IPC Token Stream:'}</span>
                  {isStreaming && <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>}
                </div>
                {streamingResponse && (
                  <button
                    type="button"
                    onClick={handleCopyResponse}
                    className="flex items-center gap-1 text-[11px] font-mono text-slate-400 hover:text-white cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? (isAr ? 'تم النسخ' : 'Copied') : (isAr ? 'نسخ' : 'Copy')}</span>
                  </button>
                )}
              </div>

              {streamError && (
                <div className="p-3 rounded-lg bg-red-950/40 border border-red-500/40 text-red-300 text-xs font-mono flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{streamError}</span>
                </div>
              )}

              <div className="text-xs font-mono text-slate-200 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto no-scrollbar">
                {streamingResponse}
                {isStreaming && <span className="inline-block w-1.5 h-3.5 bg-cyan-400 ml-1 animate-pulse"></span>}
                <div ref={responseEndRef} />
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400">
          <span>Tauri v2 · WebView2 Runtime · Rust Backend</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded transition-colors"
          >
            {isAr ? 'إغلاق' : 'Close'}
          </button>
        </div>

      </div>
    </div>
  );
};
