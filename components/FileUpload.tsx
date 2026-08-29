import React, { useRef, useState } from "react";
import { Upload, FileText, X, FileJson, FileCode } from "lucide-react";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  isLoading: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, isLoading }) => {
  const [dragActive, setDragActive] = useState(false);
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
      if (validTypes.includes(file.type) || file.name.endsWith(".json")) {
        onFileSelect(file);
      } else {
        alert("Please upload a valid PDF or JSON file.");
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        className={`relative flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-[2.5rem] transition-all duration-300 ${
          dragActive
            ? "border-blue-500 bg-blue-50 shadow-inner"
            : "border-slate-300 bg-white dark:bg-black/20 dark:border-white/10"
        } ${
          isLoading
            ? "opacity-50 cursor-not-allowed"
            : "cursor-pointer hover:border-blue-400 hover:bg-slate-50 dark:hover:bg-white/5"
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={!isLoading ? onButtonClick : undefined}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.json"
          onChange={handleChange}
          disabled={isLoading}
        />
        <div className="flex flex-col items-center justify-center pt-4 pb-5">
          <div className="flex gap-3 mb-3">
            <div className="p-3 rounded-2xl bg-blue-100 text-blue-600 dark:bg-blue-900/30">
              <FileText size={22} />
            </div>
            <div className="p-3 rounded-2xl bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30">
              <FileCode size={22} />
            </div>
          </div>
          <p className="mb-1 text-xs font-bold text-slate-700 dark:text-slate-200">
            {dragActive ? "Drop file here" : "Upload PDF or JSON Quiz"}
          </p>
          <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">
            Drag & drop to begin analysis
          </p>
        </div>
      </div>
    </div>
  );
};

export default FileUpload;
