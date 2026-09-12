import React, { useState } from 'react';
import { QuizConfig, QuizMode } from '../types';
import { 
  Sparkles, CheckSquare, Clock, Award, AlertTriangle, Play, X, Zap, Shuffle 
} from 'lucide-react';

interface QuizConfigModalProps {
  quizTitle: string;
  totalQuestions: number;
  initialConfig?: QuizConfig;
  onStart: (config: QuizConfig) => void;
  onClose: () => void;
  isDarkMode?: boolean;
}

export const QuizConfigModal: React.FC<QuizConfigModalProps> = ({
  quizTitle,
  totalQuestions,
  initialConfig = {
    mode: 'TEST',
    positiveMarks: 1,
    negativeMarks: 0.25,
    timePerQuestion: 0,
    testDurationMinutes: 0,
    shuffleQuestions: false
  },
  onStart,
  onClose,
  isDarkMode = false
}) => {
  const [mode, setMode] = useState<QuizMode>(initialConfig.mode || 'TEST');
  const [positiveMarks, setPositiveMarks] = useState<number>(initialConfig.positiveMarks ?? 1);
  const [negativeMarks, setNegativeMarks] = useState<number>(initialConfig.negativeMarks ?? 0.25);
  const [testDurationMinutes, setTestDurationMinutes] = useState<number>(initialConfig.testDurationMinutes ?? 0);
  const [timePerQuestion, setTimePerQuestion] = useState<number>(initialConfig.timePerQuestion ?? 0);
  const [shuffleQuestions, setShuffleQuestions] = useState<boolean>(initialConfig.shuffleQuestions ?? false);

  const handleStartQuiz = () => {
    onStart({
      mode,
      positiveMarks,
      negativeMarks,
      timePerQuestion,
      testDurationMinutes,
      shuffleQuestions
    });
  };

  return (
    <div className="fixed inset-0 z-[250] bg-slate-950/70 backdrop-blur-md flex items-center justify-center sm:p-4 animate-in fade-in duration-300">
      <div className={`w-full h-full sm:h-auto sm:max-w-lg rounded-none sm:rounded-[2.5rem] p-5 sm:p-8 shadow-2xl border relative animate-in zoom-in-95 duration-300 overflow-hidden flex flex-col justify-between ${
        isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-900'
      }`}>
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-all"
        >
          <X size={18} />
        </button>

        {/* Content Wrapper for scrolling on mobile */}
        <div className="flex-1 overflow-y-auto no-scrollbar py-2">
          {/* Header */}
          <div className="mb-5 mt-1">
            <span className="text-[9px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">
              Configure Session Settings
            </span>
            <h3 className={`text-base sm:text-lg font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'} line-clamp-2 mt-0.5 pr-8`}>
              {quizTitle}
            </h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
              Total Questions: <strong className="text-blue-600 dark:text-blue-400">{totalQuestions} Qs</strong>
            </p>
          </div>

          <div className="space-y-4 text-xs">
            {/* 1. MODE SELECTION */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                Select Quiz Mode:
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setMode('PRACTICE')}
                  className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between min-h-[90px] ${
                    mode === 'PRACTICE'
                      ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 ring-1 ring-emerald-500/30'
                      : isDarkMode ? 'bg-slate-800/80 border-slate-800 text-slate-400 hover:bg-slate-800' : 'bg-slate-50 border-slate-200/80 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className={`p-1 rounded-lg ${mode === 'PRACTICE' ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                      <Sparkles size={11} />
                    </div>
                    <span className="font-extrabold text-[10.5px]">Practice Mode</span>
                  </div>
                  <p className="text-[9px] leading-tight text-slate-500 dark:text-slate-400">
                    Instant feedback, see answers & solutions on selection.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setMode('TEST')}
                  className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between min-h-[90px] ${
                    mode === 'TEST'
                      ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 ring-1 ring-blue-500/30'
                      : isDarkMode ? 'bg-slate-800/80 border-slate-800 text-slate-400 hover:bg-slate-800' : 'bg-slate-50 border-slate-200/80 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className={`p-1 rounded-lg ${mode === 'TEST' ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                      <CheckSquare size={11} />
                    </div>
                    <span className="font-extrabold text-[10.5px]">Quiz Exam Mode</span>
                  </div>
                  <p className="text-[9px] leading-tight text-slate-500 dark:text-slate-400">
                    Real exam environment. Answers are shown after submission.
                  </p>
                </button>
              </div>
            </div>

            {/* 2. TIMER CONFIGURATION */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5">
                <Clock size={12} className="text-blue-500" /> Total Test Timer / Time Limit:
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { label: 'Unlimited', mins: 0 },
                  { label: '5 Mins', mins: 5 },
                  { label: '10 Mins', mins: 10 },
                  { label: '15 Mins', mins: 15 },
                  { label: '30 Mins', mins: 30 },
                  { label: '45 Mins', mins: 45 },
                  { label: '60 Mins', mins: 60 },
                ].map((t) => (
                  <button
                    key={t.mins}
                    type="button"
                    onClick={() => { setTestDurationMinutes(t.mins); setTimePerQuestion(0); }}
                    className={`py-1.5 px-0.5 rounded-lg font-bold text-[9.5px] border transition-all ${
                      testDurationMinutes === t.mins && timePerQuestion === 0
                        ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                        : isDarkMode ? 'bg-slate-800 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Per Question Speed Option */}
              <div className="mt-2 flex items-center gap-1.5">
                <span className="text-[9px] font-bold text-slate-400 uppercase">Per-Question Limit:</span>
                {[
                  { label: 'Off', secs: 0 },
                  { label: '15s', secs: 15 },
                  { label: '30s', secs: 30 },
                  { label: '60s', secs: 60 }
                ].map(pq => (
                  <button
                    key={pq.secs}
                    type="button"
                    onClick={() => { setTimePerQuestion(pq.secs); setTestDurationMinutes(0); }}
                    className={`px-2 py-0.5 rounded text-[8.5px] font-extrabold border transition-all ${
                      timePerQuestion === pq.secs && testDurationMinutes === 0
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : isDarkMode ? 'bg-slate-800 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
                    }`}
                  >
                    {pq.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. MARKS CONFIGURATION */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              {/* Positive Marks */}
              <div>
                <label className="block text-[9.5px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-1 flex items-center gap-1">
                  <Award size={11} /> Correct Marks (+):
                </label>
                <select
                  value={positiveMarks}
                  onChange={(e) => setPositiveMarks(parseFloat(e.target.value))}
                  className={`w-full p-2 rounded-lg border font-bold text-[10.5px] outline-none ${
                    isDarkMode ? 'bg-slate-800 border-slate-750 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                >
                  <option value={1}>+1 per Question</option>
                  <option value={2}>+2 per Question</option>
                  <option value={3}>+3 per Question</option>
                  <option value={4}>+4 per Question</option>
                  <option value={5}>+5 per Question</option>
                </select>
              </div>

              {/* Negative Marks */}
              <div>
                <label className="block text-[9.5px] font-black uppercase tracking-widest text-rose-600 dark:text-rose-400 mb-1 flex items-center gap-1">
                  <AlertTriangle size={11} /> Negative Mark (-):
                </label>
                <select
                  value={negativeMarks}
                  onChange={(e) => setNegativeMarks(parseFloat(e.target.value))}
                  className={`w-full p-2 rounded-lg border font-bold text-[10.5px] outline-none ${
                    isDarkMode ? 'bg-slate-800 border-slate-750 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                >
                  <option value={0}>0 (No Negative)</option>
                  <option value={0.25}>-0.25 (1/4 Ded)</option>
                  <option value={0.33}>-0.33 (1/3 Ded)</option>
                  <option value={0.5}>-0.50 (1/2 Ded)</option>
                  <option value={1}>-1.00 (Full Ded)</option>
                </select>
              </div>
            </div>

            {/* 4. SHUFFLE QUESTIONS TOGGLE */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShuffleQuestions(!shuffleQuestions)}
                className={`w-full p-3 rounded-xl border flex items-center justify-between transition-all ${
                  shuffleQuestions
                    ? 'bg-purple-50/70 dark:bg-purple-950/40 border-purple-500 text-purple-900 dark:text-purple-200 ring-1 ring-purple-500/20'
                    : isDarkMode ? 'bg-slate-800 border-slate-850 text-slate-400 hover:bg-slate-750' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${shuffleQuestions ? 'bg-purple-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                    <Shuffle size={12} />
                  </div>
                  <div className="text-left">
                    <div className="font-extrabold text-[10.5px]">Shuffle Questions & Options</div>
                    <div className="text-[8.5px] text-slate-400 font-bold uppercase mt-0.5">Random order of options</div>
                  </div>
                </div>
                <div className={`w-8 h-4.5 rounded-full transition-colors relative p-0.5 ${shuffleQuestions ? 'bg-purple-600' : 'bg-slate-300 dark:bg-slate-700'}`}>
                  <div className={`w-3.5 h-3.5 rounded-full bg-white shadow-md transition-transform ${shuffleQuestions ? 'translate-x-3.5' : 'translate-x-0'}`} />
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Start Button */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleStartQuiz}
            className="flex-[2] py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5"
          >
            <Play size={12} fill="currentColor" /> Start {mode === 'PRACTICE' ? 'Practice' : 'Quiz Test'}
          </button>
        </div>
      </div>
    </div>
  );
};
