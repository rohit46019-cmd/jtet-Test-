import React, { useRef, useState } from "react";
import { Upload, FileText, FileCode2, Sparkles, CheckCircle2, ArrowUpRight, FileCheck } from "lucide-react";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  isLoading: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, isLoading }) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const validTypes = ["application/pdf", "application/json"];
      if (validTypes.includes(file.type) || file.name.endsWith(".json") || file.name.endsWith(".pdf")) {
        setSelectedFileName(file.name);
        onFileSelect(file);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      setSelectedFileName(e.target.files[0].name);
      onFileSelect(e.target.files[0]);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full">
      <div
        className={`relative group flex flex-col items-center justify-center w-full min-h-[170px] sm:min-h-[190px] p-6 rounded-[2rem] border-2 border-dashed transition-all duration-300 overflow-hidden ${
          dragActive
            ? "border-cyan-400 bg-cyan-950/40 shadow-[0_0_30px_rgba(6,182,212,0.4)] scale-[1.01]"
            : "border-indigo-500/30 hover:border-indigo-400/60 bg-gradient-to-b from-slate-900/80 via-slate-950/90 to-[#070913] hover:shadow-[0_0_25px_rgba(99,102,241,0.25)]"
        } ${
          isLoading
            ? "opacity-60 cursor-not-allowed"
            : "cursor-pointer"
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={!isLoading ? onButtonClick : undefined}
      >
        {/* Glow ambient spots */}
        <div className="absolute top-0 right-1/4 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-cyan-500/20 transition-all" />
        <div className="absolute bottom-0 left-1/4 w-32 h-32 bg-violet-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-violet-500/20 transition-all" />

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.json"
          onChange={handleChange}
          disabled={isLoading}
        />

        <div className="relative z-10 flex flex-col items-center justify-center text-center w-full">
          {/* Animated floating dual icons */}
          <div className="flex items-center gap-3.5 mb-3.5">
            <div className="relative p-3 rounded-2xl bg-gradient-to-br from-rose-500/20 to-orange-500/20 border border-rose-500/30 text-rose-300 shadow-lg shadow-rose-950/40 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300">
              <FileText size={24} className="text-rose-400" />
              <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.2 bg-rose-500 text-[8px] font-black uppercase text-white rounded-full shadow-sm">
                PDF
              </span>
            </div>

            <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white/40 font-black text-[10px]">
              +
            </div>

            <div className="relative p-3 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 text-cyan-300 shadow-lg shadow-cyan-950/40 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
              <FileCode2 size={24} className="text-cyan-400" />
              <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.2 bg-cyan-500 text-[8px] font-black uppercase text-white rounded-full shadow-sm">
                JSON
              </span>
            </div>
          </div>

          {/* Headline & Description */}
          <h4 className="text-sm sm:text-base font-black text-white group-hover:text-cyan-200 transition-colors flex items-center gap-1.5">
            {dragActive ? (
              <span className="text-cyan-300 flex items-center gap-1.5">
                <Sparkles size={16} className="animate-spin" /> Drop PDF or JSON file right here
              </span>
            ) : selectedFileName ? (
              <span className="text-emerald-300 flex items-center gap-1.5 truncate max-w-xs">
                <FileCheck size={16} /> {selectedFileName}
              </span>
            ) : (
              <>
                Drop PDF / JSON file or <span className="text-cyan-400 underline underline-offset-4 decoration-cyan-400/50">Browse Device</span>
              </>
            )}
          </h4>

          <p className="text-[10px] sm:text-xs text-slate-400 font-medium mt-1 max-w-sm">
            Instant AI auto-extraction from questions, answer keys, explanations & MCQs
          </p>

          {/* Format pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-3.5">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-[9px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
              PDF Notes & Question Papers
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-[9px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
              JSON Flashcard Schemas
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-[9px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              Up to 50MB
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileUpload;

