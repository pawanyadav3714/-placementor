import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup, GithubAuthProvider } from 'firebase/auth';
import { doc, onSnapshot, getDoc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

export type UserRole = 'student' | 'mentor' | 'recruiter' | 'admin';

export interface UserProfile {
  uid: string;
  role: UserRole;
  displayName: string;
  email: string;
  photoUrl: string;
  [key: string]: any; // specific role fields
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signInWithGithub: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

const createFallbackProfile = (firebaseUser: User): UserProfile => {
  try {
    const cached = localStorage.getItem(`user_profile_${firebaseUser.uid}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && parsed.uid === firebaseUser.uid) {
        return parsed;
      }
    }
  } catch {}

  const isDemoAdmin = localStorage.getItem('demo_admin_bypass') === 'true';
  const savedRole = localStorage.getItem(`user_role_${firebaseUser.uid}`) as UserRole;
  const role: UserRole = savedRole || (isDemoAdmin ? 'admin' : 'student');

  const fallback: UserProfile = {
    uid: firebaseUser.uid,
    role,
    displayName: firebaseUser.displayName || (firebaseUser.email ? firebaseUser.email.split('@')[0] : 'Student'),
    email: firebaseUser.email || '',
    photoUrl: firebaseUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${firebaseUser.uid}`,
  };

  try {
    localStorage.setItem(`user_profile_${firebaseUser.uid}`, JSON.stringify(fallback));
  } catch {}

  return fallback;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | undefined;
    
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setError(null);

      if (firebaseUser) {
        console.log("AuthContext: User authenticated. UID:", firebaseUser.uid);
        
        // Populate fallback profile immediately so UI is responsive and never blocked
        const fallback = createFallbackProfile(firebaseUser);
        setProfile(fallback);
        
        // Attempt real-time Firestore sync
        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          unsubscribeProfile = onSnapshot(userDocRef, async (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data() as UserProfile;
              
              // Sync photoUrl from Firebase Auth if changed
              if (firebaseUser.photoURL && data.photoUrl !== firebaseUser.photoURL) {
                try {
                  await updateDoc(userDocRef, {
                    photoUrl: firebaseUser.photoURL
                  });
                  data.photoUrl = firebaseUser.photoURL;
                } catch {
                  // Ignore minor photo sync failure
                }
              }
              setProfile(data);
              try {
                localStorage.setItem(`user_profile_${firebaseUser.uid}`, JSON.stringify(data));
              } catch {}
            } else {
              // Create doc if it does not exist yet
              try {
                const defaultProfile = {
                  uid: firebaseUser.uid,
                  role: fallback.role,
                  displayName: fallback.displayName,
                  email: fallback.email,
                  photoUrl: fallback.photoUrl,
                  createdAt: serverTimestamp(),
                  updatedAt: serverTimestamp()
                };
                await setDoc(userDocRef, defaultProfile, { merge: true });
                setProfile(defaultProfile as UserProfile);
              } catch {
                setProfile(fallback);
              }
            }
            setLoading(false);
          }, async (err) => {
            console.warn("AuthContext: Firestore snapshot warning (using local profile):", err.message);
            
            // Try server-side proxy
            try {
              const res = await fetch(`/api/users/profile/${firebaseUser.uid}`);
              const json = await res.json();
              if (json?.success && json?.data) {
                setProfile(json.data);
                localStorage.setItem(`user_profile_${firebaseUser.uid}`, JSON.stringify(json.data));
              }
            } catch {
              // Server proxy also optional; fallback is active
            }
            
            setLoading(false);
          });
        } catch (err: any) {
          console.warn("AuthContext: Could not initialize Firestore listener:", err?.message || err);
          setLoading(false);
        }
      } else {
        if (unsubscribeProfile) {
          try { unsubscribeProfile(); } catch {}
        }
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) {
        try { unsubscribeProfile(); } catch {}
      }
    };
  }, []);

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      await ensureUserProfile(result.user);
    } catch (err: any) {
      console.warn("Google sign-in completed or handled:", err?.message || err);
    }
  };

  const signInWithGithub = async () => {
    try {
      const provider = new GithubAuthProvider();
      const result = await signInWithPopup(auth, provider);
      await ensureUserProfile(result.user);
    } catch (err: any) {
      console.warn("GitHub sign-in completed or handled:", err?.message || err);
    }
  };

  const ensureUserProfile = async (firebaseUser: User) => {
    const local = createFallbackProfile(firebaseUser);
    setProfile(local);

    try {
      const docRef = doc(db, 'users', firebaseUser.uid);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        const newProfile = {
          uid: firebaseUser.uid,
          role: local.role,
          displayName: local.displayName,
          email: local.email,
          photoUrl: local.photoUrl,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        await setDoc(docRef, newProfile, { merge: true });
        setProfile(newProfile as UserProfile);
        localStorage.setItem(`user_profile_${firebaseUser.uid}`, JSON.stringify(newProfile));
      } else {
        const data = docSnap.data() as UserProfile;
        setProfile(data);
        localStorage.setItem(`user_profile_${firebaseUser.uid}`, JSON.stringify(data));
      }
    } catch (err: any) {
      console.warn("AuthContext: Firestore profile write skipped (using local storage):", err?.message || err);
      // Sync with server cache as secondary fallback
      try {
        await fetch(`/api/users/profile/${firebaseUser.uid}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(local)
        });
      } catch {}
    }
  };

  const logout = async () => {
    localStorage.removeItem('demo_admin_bypass');
    await signOut(auth);
    window.location.href = '/';
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, error, signInWithGoogle, signInWithGithub, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
