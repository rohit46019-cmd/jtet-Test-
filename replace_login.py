import sys

with open('App.tsx', 'r') as f:
    content = f.read()

target = """                  <button onClick={login} className="px-2.5 py-1 rounded-xl bg-blue-600 text-white font-black text-[9.5px] uppercase tracking-wider hover:bg-blue-500 transition-all shrink-0 border border-blue-500">Google Login</button>
                  <button onClick={loginAsGuest} className="px-2 py-1 rounded-xl bg-slate-800 text-slate-300 font-bold text-[8.5px] uppercase hover:bg-slate-700 transition-all">Guest</button>"""

replacement = """                  <button onClick={loginAsGuest} className="px-2.5 py-1 rounded-xl bg-blue-600 text-white font-black text-[9.5px] uppercase tracking-wider hover:bg-blue-500 transition-all shrink-0 border border-blue-500">Start Learning</button>"""

if target in content:
    content = content.replace(target, replacement)
    print("Replaced login button")
else:
    print("Could not find target")

target2 = """      {/* Vercel Login Warning/Notification Banner if any */}
      {authError && (
        <div className="max-w-4xl mx-auto px-3 py-1.5 mt-2 bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[9.5px] rounded-xl flex items-center justify-between gap-2 animate-in fade-in">
          <span>{authError}</span>
          <button onClick={loginAsGuest} className="px-2 py-0.5 bg-amber-500 text-white font-black text-[8px] uppercase rounded-lg shrink-0">Continue as Guest</button>
        </div>
      )}"""

replacement2 = ""

if target2 in content:
    content = content.replace(target2, replacement2)
    print("Replaced auth error banner")
else:
    print("Could not find target2")

with open('App.tsx', 'w') as f:
    f.write(content)
