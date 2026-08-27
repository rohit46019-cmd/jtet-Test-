import { useState, useEffect } from 'react';
import { User, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

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

    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
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
        localStorage.removeItem('qf_auth_user');
        localStorage.removeItem('qf_is_admin');
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const logout = async () => {
    localStorage.removeItem('qf_auth_user');
    localStorage.removeItem('qf_is_admin');
    await signOut(auth);
  };

  return { user, isAdmin, loading, login, logout };
}
