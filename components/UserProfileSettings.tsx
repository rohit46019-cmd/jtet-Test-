import React, { useState, useRef } from 'react';
import { User, Camera, Save, X, Edit2, Loader2, CheckCircle2, Upload } from 'lucide-react';

interface UserProfileSettingsProps {
  user: any;
  updateUserProfile: (displayName: string, photoURL: string) => Promise<void>;
  isDarkMode: boolean;
}

export const UserProfileSettings: React.FC<UserProfileSettingsProps> = ({ user, updateUserProfile, isDarkMode }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.displayName || '');
  const [photoUrl, setPhotoUrl] = useState(user?.photoURL || '');
  const [isSaving, setIsSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    setIsSaving(true);
    await updateUserProfile(name, photoUrl);
    setIsSaving(false);
    setIsEditing(false);
    setSavedMessage(true);
    setTimeout(() => setSavedMessage(false), 3000);
  };

  const startEditing = () => {
    setName(user?.displayName || '');
    setPhotoUrl(user?.photoURL || '');
    setIsEditing(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Compress image to a smaller base64 string
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxSize = 200; // Small size for profile pictures

        if (width > height) {
          if (width > maxSize) {
            height = Math.round(height * (maxSize / width));
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round(width * (maxSize / height));
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        setPhotoUrl(dataUrl);
      };
    };
  };

  if (!user) return null;

  return (
    <div className={`p-8 rounded-[3rem] border shadow-2xl ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
             <User size={12} className="text-blue-500" /> My Profile
          </label>
        </div>
        {!isEditing && (
          <button 
            onClick={startEditing}
            className={`p-2 rounded-xl transition-all ${isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            <Edit2 size={16} />
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
        {/* Avatar */}
        <div className="relative shrink-0">
          <div 
            onClick={() => isEditing && fileInputRef.current?.click()}
            className={`w-24 h-24 rounded-[2rem] bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 border-4 border-white dark:border-slate-800 shadow-xl overflow-hidden flex items-center justify-center ${isEditing ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}`}
          >
             {(isEditing ? photoUrl : user?.photoURL) ? (
                <img src={isEditing ? photoUrl : user.photoURL} alt="Profile" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
             ) : (
                <User size={40} className="text-blue-500/50" />
             )}
          </div>
          {isEditing && (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-2 -right-2 bg-blue-600 text-white p-2 rounded-xl shadow-lg border-2 border-white dark:border-slate-800 cursor-pointer hover:scale-105 transition-transform"
            >
              <Camera size={14} />
            </div>
          )}
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*" 
            className="hidden" 
          />
        </div>

        {/* Info or Edit Form */}
        <div className="flex-1 w-full space-y-4">
          {isEditing ? (
            <div className="space-y-3 animate-in fade-in">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Display Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className={`w-full px-4 py-3 rounded-2xl text-sm font-bold border transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'}`}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Profile Photo URL</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={photoUrl}
                    onChange={(e) => setPhotoUrl(e.target.value)}
                    placeholder="https://example.com/photo.jpg"
                    className={`w-full px-4 py-3 rounded-2xl text-sm border transition-all ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'}`}
                  />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className={`px-4 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all whitespace-nowrap flex items-center justify-center gap-1.5 ${isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  >
                    <Upload size={14} /> <span className="hidden sm:inline">Upload</span>
                  </button>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50"
                >
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Save Profile
                </button>
                <button 
                  onClick={() => setIsEditing(false)}
                  disabled={isSaving}
                  className={`px-4 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          ) : (
            <div className="animate-in fade-in">
              <h3 className="text-xl font-black tracking-tight dark:text-white mb-1">
                {user?.displayName || 'Learner'}
              </h3>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                {user?.email || 'Guest User'}
              </p>
              
              {savedMessage && (
                <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold animate-in slide-in-from-bottom-2 fade-in">
                  <CheckCircle2 size={14} /> Profile updated!
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
