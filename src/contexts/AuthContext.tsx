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
        console.log("AuthContext: Fetching profile for UID:", firebaseUser.uid);
        
        // fetch profile
        unsubscribeProfile = onSnapshot(doc(db, 'users', firebaseUser.uid), async (docSnap) => {
          console.log("AuthContext: Profile snapshot received. Exists:", docSnap.exists());
          if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
            
            // Sync photoUrl from Firebase Auth if it exists and differs from Firestore
            if (firebaseUser.photoURL && data.photoUrl !== firebaseUser.photoURL) {
              try {
                await updateDoc(doc(db, 'users', firebaseUser.uid), {
                  photoUrl: firebaseUser.photoURL
                });
                data.photoUrl = firebaseUser.photoURL;
              } catch (e) {
                console.error("Failed to sync photoURL", (e as any)?.message || e);
              }
            }
            setProfile(data);
          } else {
            setProfile(null); // needs onboarding
          }
          setLoading(false);
        }, (err) => {
          console.error("AuthContext: Profile snapshot error", err.message, err.code, err);
          if (err.code === 'permission-denied') {
            setError("Firestore permissions denied. Please ensure you have enabled the Cloud Firestore API and deployed rules.");
          }
          
          // Try a manual getDoc as a one-time fallback to see if it's an onSnapshot issue
          getDoc(doc(db, 'users', firebaseUser.uid)).then((snap) => {
             console.log("AuthContext: Fallback getDoc result exists:", snap.exists());
             if (snap.exists()) {
               setProfile(snap.data() as UserProfile);
             }
             setLoading(false);
          }).catch(getErr => {
             console.error("AuthContext: Fallback getDoc also failed", getErr.message);
             setLoading(false);
          });
        });
      } else {
        if (unsubscribeProfile) unsubscribeProfile();
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    await ensureUserProfile(result.user);
  };

  const signInWithGithub = async () => {
    const provider = new GithubAuthProvider();
    const result = await signInWithPopup(auth, provider);
    await ensureUserProfile(result.user);
  };

  const ensureUserProfile = async (firebaseUser: User) => {
    // We get the doc using a one-off fetch (not snapshot here) 
    // to check if they already exist, if not create default
    const docRef = doc(db, 'users', firebaseUser.uid);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      await setDoc(docRef, {
        uid: firebaseUser.uid,
        role: 'student',
        displayName: firebaseUser.displayName || 'Student',
        email: firebaseUser.email || '',
        photoUrl: firebaseUser.photoURL || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
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
