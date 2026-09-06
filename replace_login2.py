import re

with open('App.tsx', 'r') as f:
    content = f.read()

# Replace Google Login button
content = re.sub(r'<button onClick=\{login\} className="[^"]*">Google Login</button>\s*<button onClick=\{loginAsGuest\} className="[^"]*">Guest</button>', r'<button onClick={loginAsGuest} className="px-2.5 py-1 rounded-xl bg-blue-600 text-white font-black text-[9.5px] uppercase tracking-wider hover:bg-blue-500 transition-all shrink-0 border border-blue-500">Start Learning</button>', content)

with open('App.tsx', 'w') as f:
    f.write(content)

print("Done")
