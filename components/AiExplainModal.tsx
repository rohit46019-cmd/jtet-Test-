import React, { useState, useEffect } from 'react';
import { Sparkles, X, Volume2, VolumeX, Copy, Check, RefreshCw, BookOpen, AlertTriangle, Lightbulb, CheckCircle2, Key, ArrowRight } from 'lucide-react';
import { Question } from '../types';
import { generateDeepExplanation, setUserApiKeys, getClientGenAIKeys } from '../services/geminiService';

interface AiExplainModalProps {
  question: Question;
  userSelectedOption?: number | null;
  isOpen: boolean;
  onClose: () => void;
  isDarkMode?: boolean;
}

export const AiExplainModal: React.FC<AiExplainModalProps> = ({
  question,
  userSelectedOption,
  isOpen,
  onClose,
  isDarkMode: propDarkMode
}) => {
  const isDarkMode = propDarkMode ?? (typeof document !== 'undefined' && document.documentElement.classList.contains('dark'));
  const [loading, setLoading] = useState(false);
  const [explanation, setExplanation] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<'Hindi & English' | 'Hindi' | 'English'>('Hindi & English');
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [inlineKeyInput, setInlineKeyInput] = useState('');
  const [showKeyPrompt, setShowKeyPrompt] = useState(false);

  const fetchExplanation = async (lang = language) => {
    try {
      if (!explanation && question.explanation) {
        const correctOpt = question.options[question.correctAnswerIndex] || '';
        setExplanation(`**🎯 Verified Correct Answer:** Option ${String.fromCharCode(65 + question.correctAnswerIndex)} - ${correctOpt}\n\n**💡 Solution Breakdown:**\n${question.explanation}`);
      }
      setLoading(true);
      setError(null);
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      setIsSpeaking(false);
      const res = await generateDeepExplanation(question, userSelectedOption, lang);
      setExplanation(res);
      setShowKeyPrompt(false);
    } catch (err: any) {
      const errMsg = err?.message || 'Failed to generate AI explanation.';
      setError(errMsg);
      if (errMsg.includes('API key') || getClientGenAIKeys().length === 0) {
        setShowKeyPrompt(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveInlineKey = () => {
    const trimmed = inlineKeyInput.trim();
    if (!trimmed) return;
    
    // Save to user API keys and localStorage
    const currentKeys = getClientGenAIKeys();
    const updated = Array.from(new Set([trimmed, ...currentKeys]));
    setUserApiKeys(updated);
    try {
      localStorage.setItem('qf_user_api_keys', JSON.stringify(updated));
      localStorage.setItem('gemini_api_key', trimmed);
    } catch (_) {}

    setInlineKeyInput('');
    setShowKeyPrompt(false);
    fetchExplanation(language);
  };

  useEffect(() => {
    if (isOpen) {
      if (question.explanation) {
        const correctOpt = question.options[question.correctAnswerIndex] || '';
        setExplanation(`**🎯 Verified Correct Answer:** Option ${String.fromCharCode(65 + question.correctAnswerIndex)} - ${correctOpt}\n\n**💡 Solution Breakdown:**\n${question.explanation}`);
      } else {
        setExplanation('');
      }
      fetchExplanation(language);
    } else {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [isOpen, question.id]);

  const handleCopy = () => {
    if (!explanation) return;
    navigator.clipboard.writeText(explanation);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleSpeech = () => {
    if (!window.speechSynthesis) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      const cleanText = explanation.replace(/[*#•_`]/g, '');
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.0;
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[320] flex flex-col justify-start sm:justify-center items-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className={`w-full max-w-2xl my-2 sm:my-auto max-h-[92vh] sm:max-h-[85vh] rounded-3xl shadow-2xl border transition-all flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 ${
          isDarkMode 
            ? 'bg-slate-900 border-slate-800 text-white' 
            : 'bg-white border-slate-100 text-slate-900'
        }`}
      >
        {/* Sticky Header */}
        <div className="shrink-0 p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm z-10">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              <Sparkles size={20} className="animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black tracking-tight truncate">
                  AI Instant Explanation
                </h3>
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 shrink-0">
                  Gemini 3.6 Flash
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-400 truncate">
                Deep concept breakdown, trap analysis & exam tricks
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={onClose}
              aria-label="Close"
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-red-50 dark:bg-slate-800 dark:hover:bg-red-950/40 text-slate-600 hover:text-red-600 dark:text-slate-300 dark:hover:text-red-400 font-bold text-xs flex items-center gap-1 transition-all active:scale-95 border border-transparent hover:border-red-200 dark:hover:border-red-900/50"
            >
              <X size={16} />
              <span className="hidden xs:inline">Close</span>
            </button>
          </div>
        </div>

        {/* Toolbar (Language selector, Copy, Speech, Refresh) */}
        <div className="shrink-0 px-4 sm:px-6 py-2.5 bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Language:</span>
            {(['Hindi & English', 'Hindi', 'English'] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => {
                  setLanguage(lang);
                  fetchExplanation(lang);
                }}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                  language === lang
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                {lang}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            {explanation && (
              <>
                <button
                  onClick={toggleSpeech}
                  title={isSpeaking ? "Stop Audio" : "Listen to explanation"}
                  className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                    isSpeaking 
                      ? 'bg-amber-500 text-white animate-pulse' 
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {isSpeaking ? <VolumeX size={14} /> : <Volume2 size={14} />}
                  <span className="text-[10px]">{isSpeaking ? 'Stop' : 'Audio'}</span>
                </button>

                <button
                  onClick={handleCopy}
                  title="Copy Explanation"
                  className="p-1.5 rounded-lg bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-xs font-bold transition-all flex items-center gap-1"
                >
                  {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                  <span className="text-[10px]">{copied ? 'Copied!' : 'Copy'}</span>
                </button>
              </>
            )}

            <button
              onClick={() => fetchExplanation(language)}
              disabled={loading}
              title="Regenerate Explanation"
              className="p-1.5 rounded-lg bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 hover:bg-blue-50 text-xs font-bold transition-all flex items-center gap-1 disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span className="text-[10px]">Refresh</span>
            </button>
          </div>
        </div>

        {/* Scrollable Modal Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 [scrollbar-width:thin] [scrollbar-color:rgba(156,163,175,0.5)_transparent]">
          {/* Question Summary Box */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-blue-50/60 dark:bg-slate-800/60 border border-blue-100 dark:border-slate-700/80">
            <div className="flex items-center gap-2 text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1.5">
              <BookOpen size={12} />
              <span>Target Question</span>
            </div>
            <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 leading-snug">
              {question.question}
            </p>

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {question.options.map((opt, idx) => {
                const isCorrect = idx === question.correctAnswerIndex;
                const isSelected = idx === userSelectedOption;

                return (
                  <div
                    key={idx}
                    className={`p-2 rounded-xl text-[11px] flex items-center justify-between border ${
                      isCorrect
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-bold'
                        : isSelected
                        ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300 font-medium'
                        : 'bg-white/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      <span className="font-black text-[10px]">{String.fromCharCode(65 + idx)}.</span>
                      <span className="truncate">{opt}</span>
                    </span>
                    {isCorrect && (
                      <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-600 text-white shrink-0">
                        Answer
                      </span>
                    )}
                    {isSelected && !isCorrect && (
                      <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-rose-600 text-white shrink-0">
                        Picked
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* AI Explanation Body */}
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-4">
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 flex items-center justify-center animate-bounce">
                  <Sparkles size={24} />
                </div>
                <div className="absolute -inset-1 rounded-2xl border-2 border-blue-500/30 animate-ping pointer-events-none" />
              </div>
              <div className="text-center">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  AI is analyzing question & options...
                </h4>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Verifying factual accuracy, eliminating distractors & drafting memory tricks
                </p>
              </div>
            </div>
          ) : error ? (
            <div className="space-y-4">
              {/* Question's built-in explanation fallback if available */}
              {question.explanation && question.explanation.trim().length > 0 && (
                <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-black text-[11px] uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 size={14} />
                    <span>Verified Answer & Solution</span>
                  </div>
                  <p className="text-xs leading-relaxed font-medium text-slate-800 dark:text-slate-100">
                    {question.explanation}
                  </p>
                </div>
              )}

              {/* API Key Configuration Card */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
                    <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400">
                      <Key size={14} />
                    </div>
                    <span>Enter Gemini API Key for Instant AI Insights</span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Paste your free Google Gemini API key below to unlock instant deep concept breakdowns, mistake analysis, and exam memory tricks.
                </p>

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="password"
                    value={inlineKeyInput}
                    onChange={(e) => setInlineKeyInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveInlineKey();
                    }}
                    placeholder="AIzaSy..."
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                  <button
                    onClick={handleSaveInlineKey}
                    disabled={!inlineKeyInput.trim()}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md shadow-blue-500/20 active:scale-95 shrink-0"
                  >
                    <span>Save & Generate</span>
                    <ArrowRight size={14} />
                  </button>
                </div>

                <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400">
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline font-bold"
                  >
                    Get free API key at Google AI Studio ↗
                  </a>
                  <button
                    onClick={() => fetchExplanation(language)}
                    className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-bold"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          ) : explanation ? (
            <div className="space-y-3.5 text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-medium leading-relaxed">
              {explanation.split('\n\n').map((block, bIdx) => {
                const trimmed = block.trim();
                if (!trimmed) return null;

                const isCorrect = trimmed.includes('🎯 Sahi Uttar') || trimmed.includes('Correct Answer') || trimmed.includes('🎯 Core Concept');
                const isTrick = trimmed.includes('📌 Memory Trick') || trimmed.includes('Exam Tip') || trimmed.includes('📌 Key');
                const isTrap = trimmed.includes('🚫 Option Breakdown') || trimmed.includes('Trap Analysis') || trimmed.includes('⚠️ Mistake');

                return (
                  <div 
                    key={bIdx} 
                    className={`flex items-start gap-3 p-3.5 rounded-2xl transition-all shadow-3xs ${
                      isCorrect 
                        ? 'bg-emerald-50/80 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-100 border border-emerald-200 dark:border-emerald-900/50' 
                        : isTrick
                        ? 'bg-amber-50/80 dark:bg-amber-950/30 text-amber-950 dark:text-amber-100 border border-amber-200 dark:border-amber-900/50'
                        : isTrap
                        ? 'bg-rose-50/80 dark:bg-rose-950/30 text-rose-950 dark:text-rose-100 border border-rose-200 dark:border-rose-900/50'
                        : 'bg-slate-50/90 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800'
                    }`}
                  >
                    {isCorrect ? (
                      <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                    ) : isTrick ? (
                      <Lightbulb size={18} className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                    ) : isTrap ? (
                      <AlertTriangle size={18} className="text-rose-600 dark:text-rose-400 mt-0.5 shrink-0" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-blue-500 mt-2 shrink-0" />
                    )}
                    <div className="flex-1 break-words space-y-1.5">
                      {trimmed.split('\n').map((line, lIdx) => {
                        const lineTrimmed = line.trim();
                        if (!lineTrimmed) return null;

                        const isBullet = lineTrimmed.startsWith('•') || lineTrimmed.startsWith('-') || lineTrimmed.startsWith('* ') || /^\d+[\.\)]\s+/.test(lineTrimmed);
                        const cleanLine = isBullet ? lineTrimmed.replace(/^[•\-\*\d\.\)]\s*/, '') : lineTrimmed;
                        const parts = cleanLine.split(/(\*\*.*?\*\*|\*.*?\*)/g);

                        return (
                          <div key={lIdx} className={`flex items-start gap-1.5 ${isBullet ? 'pl-2 my-0.5' : 'my-0.5'}`}>
                            {isBullet && <span className="text-blue-500 dark:text-blue-400 font-extrabold text-xs select-none shrink-0">•</span>}
                            <div className="flex-1">
                              {parts.map((part, pIdx) => {
                                if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
                                  const inner = part.slice(2, -2);
                                  return (
                                    <strong
                                      key={pIdx}
                                      className="font-black text-amber-950 dark:text-amber-100 bg-amber-200/90 dark:bg-amber-900/60 px-1.5 py-0.5 mx-0.5 rounded-md border border-amber-300/60 dark:border-amber-700/60 inline-block shadow-2xs"
                                    >
                                      {inner}
                                    </strong>
                                  );
                                }
                                if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
                                  return (
                                    <em key={pIdx} className="italic text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-1 py-0.5 rounded">
                                      {part.slice(1, -1)}
                                    </em>
                                  );
                                }
                                return part;
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>

        {/* Sticky Footer */}
        <div className="shrink-0 p-3 sm:p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2 text-[10px] text-slate-400">
            <Sparkles size={12} className="text-blue-500" />
            <span>Instant Gemini AI pedagogical verification</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-all active:scale-95"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
