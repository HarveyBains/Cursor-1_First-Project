import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { auth } from '../services/firebase-config';
import { type User, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    }, (error) => {
      console.error('Auth state change error:', error);
      setLoading(false);
    });
    
    // Fallback timeout in case Firebase doesn't respond
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn('Firebase auth taking too long, proceeding without auth');
        setLoading(false);
      }
    }, 5000);
    
    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, [loading]);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      console.log("🔐 Attempting Google sign-in...");
      const result = await signInWithPopup(auth, provider);
      console.log("✅ Google sign-in successful:", result.user.displayName);
    } catch (error) {
      console.error("❌ Error signing in with Google:", error);
    }
  };

  const signOutUser = async () => {
    try {
      console.log("🚪 Attempting sign out...");
      await signOut(auth);
      console.log("✅ Sign out successful");
    } catch (error) {
      console.error("❌ Error signing out:", error);
    }
  };

  const value = { user, loading, signInWithGoogle, signOutUser };

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};
