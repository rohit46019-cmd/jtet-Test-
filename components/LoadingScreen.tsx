
import React, { useState, useEffect } from 'react';
import { Loader2, BrainCircuit, Sparkles, Database, Microscope, ChevronRight, Search } from 'lucide-react';

interface LoadingScreenProps {
  stage: 'PROCESSING_PDF' | 'GENERATING_QUIZ';
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ stage }) => {
  const [progress, setProgress] = useState(0);
  const [feed, setFeed] = useState<string[]>([]);
  
  const snippets = [
    "Identifying explicitly stated questions...",
    "Scanning for Multiple Choice markers (A/B/C/D)...",
    "Extracting document structure...",
    "Synthesizing key conceptual links...",
    "Building pedagogical explanations...",
    "Validating extracted correct answers...",
    "Refining question language...",
    "Generating supplementary items...",
    "Checking semantic integrity...",
    "Finalizing interactive data..."
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev < 90) return prev + 3;
        if (prev < 99) return prev + 0.5;
        return 99;
      });
    }, 80);
    return () => clearInterval(timer);
  }, [stage]);

  useEffect(() => {
    if (stage === 'GENERATING_QUIZ') {
      const interval = setInterval(() => {
        setFeed(prev => [snippets[Math.floor(Math.random() * snippets.length)], ...prev].slice(0, 5));
      }, 1500);
      return () => clearInterval(interval);
    }
  }, [stage]);

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl max-w-lg mx-auto border border-slate-50 dark:border-slate-800 overflow-hidden relative">
      <div className="relative mb-8">
        <div className="relative bg-blue-50 dark:bg-blue-900/30 p-8 rounded-[2rem] group">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin" strokeWidth={2} />
            <div className="absolute inset-0 flex items-center justify-center">
                <BrainCircuit className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
        </div>
      </div>
      
      <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-1 uppercase tracking-tight">AI Intelligence</h2>
      <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-[0.2em] mb-6">Processing Knowledge</p>

      {stage === 'GENERATING_QUIZ' && (
        <div className="w-full bg-slate-50 dark:bg-slate-950 rounded-2xl p-4 mb-6 border border-slate-100 dark:border-slate-800 font-mono text-[9px] text-slate-500 overflow-hidden h-36 relative">
           <div className="absolute top-0 left-0 w-full h-6 bg-gradient-to-b from-slate-50 dark:from-slate-950 to-transparent z-10"></div>
           <div className="space-y-2 animate-in slide-in-from-top-4 duration-500">
             {feed.map((line, i) => (
               <div key={i} className="flex items-center gap-2">
                  {i === 0 ? <Search size={10} className="text-blue-500 animate-pulse" /> : <ChevronRight size={10} className="text-slate-400" />}
                  <span className={i === 0 ? 'text-blue-600 dark:text-blue-400 font-black' : ''}>{line}</span>
               </div>
             ))}
           </div>
        </div>
      )}

      <div className="w-full space-y-3">
         <div className="flex items-center justify-between px-4 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
            <span className="font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-[8px]">Neural Sync</span>
            <span className="font-black text-slate-900 dark:text-white text-xs">{Math.round(progress)}%</span>
         </div>
         <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-600 transition-all duration-300 shadow-[0_0_10px_rgba(37,99,235,0.4)]" 
              style={{ width: `${progress}%` }} 
            />
         </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
