import re

with open('components/Quiz.tsx', 'r') as f:
    content = f.read()

target = """            );
          })
        ) : (
          <p className="text-slate-500 italic">No static explanation available. Click "Ask AI" for a detailed breakdown!</p>
        )}
      </div>
    </div>
  );
};"""

replacement = """            );
          })
        ) : (
          <p className="text-slate-500 italic">No static explanation available. Click "Ask AI" for a detailed breakdown!</p>
        )}
      </div>
      </div>
    </div>
  );
};"""

if target in content:
    content = content.replace(target, replacement)
    with open('components/Quiz.tsx', 'w') as f:
        f.write(content)
    print("Closing tags fixed.")
else:
    print("Closing tags target not found.")
