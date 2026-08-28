import { useState, useEffect } from 'react';
import { User, signInWithPopup, signInWithRedirect, getRedirectResult, signOut } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    // Check for cached auth user info from localStorage for instant offline load
    const cachedUser = localStorage.getItem('qf_auth_user');
    const cachedAdmin = localStorage.getItem('qf_is_admin');
    if (cachedUser) {
      try {
        const parsed = JSON.parse(cachedUser);
        setUser(parsed);
      } catch (e) {}
    }
    if (cachedAdmin === 'true') {
      setIsAdmin(true);
    }

    // Check redirect result for mobile/Vercel redirect logins
    getRedirectResult(auth).catch((err) => {
      console.warn("Redirect login check result:", err);
    });

    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        setAuthError(null);
        localStorage.setItem('qf_auth_user', JSON.stringify({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL
        }));

        const isUserAdmin = firebaseUser.email === 'rohit37816@gmail.com';
        setIsAdmin(isUserAdmin);
        localStorage.setItem('qf_is_admin', isUserAdmin ? 'true' : 'false');

        try {
          // Sync with MongoDB backend server
          const res = await fetch('/api/users/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: firebaseUser.uid,
              email: firebaseUser.email,
              name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Unknown User',
              role: isUserAdmin ? 'admin' : 'user'
            })
          });
          if (res.ok) {
            const dbUser = await res.json();
            if (dbUser.role === 'admin' || isUserAdmin) {
              setIsAdmin(true);
              localStorage.setItem('qf_is_admin', 'true');
            }
          }
        } catch (e) {
          console.warn("Backend user sync error, using local state:", e);
        }
      } else {
        // If not logged in via Firebase, keep local guest cached user if manually set
        const existingLocal = localStorage.getItem('qf_auth_user');
        if (existingLocal) {
          try {
            setUser(JSON.parse(existingLocal));
          } catch {}
        } else {
          setUser(null);
          setIsAdmin(false);
        }
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.warn("Popup login failed, attempting redirect login:", error);
      
      if (error?.code === 'auth/unauthorized-domain') {
        const domainMsg = `Vercel domain is not authorized in Firebase Console (Authentication > Settings > Authorized Domains). Logged in as Guest user so you can test features.`;
        setAuthError(domainMsg);
        loginAsGuest();
        return;
      }

      try {
        await signInWithRedirect(auth, googleProvider);
      } catch (redirectErr: any) {
        console.error("Redirect login failed:", redirectErr);
        if (redirectErr?.code === 'auth/unauthorized-domain') {
          setAuthError(`Vercel Domain Warning: Please add domain in Firebase Console. Logged in as Guest.`);
        } else {
          setAuthError(`Login notice: ${redirectErr.message || 'Switched to Guest mode'}`);
        }
        loginAsGuest();
      }
    }
  };

  const loginAsGuest = () => {
    const guestUser: any = {
      uid: 'guest_' + Math.random().toString(36).substr(2, 9),
      email: 'guest@quizflash.app',
      displayName: 'Guest Learner',
      photoURL: ''
    };
    setUser(guestUser);
    localStorage.setItem('qf_auth_user', JSON.stringify(guestUser));
    localStorage.setItem('qf_is_admin', 'false');
    setIsAdmin(false);
  };

  const logout = async () => {
    localStorage.removeItem('qf_auth_user');
    localStorage.removeItem('qf_is_admin');
    setUser(null);
    setIsAdmin(false);
    try {
      await signOut(auth);
    } catch {}
  };

  return { user, isAdmin, loading, login, loginAsGuest, logout, authError };
}

