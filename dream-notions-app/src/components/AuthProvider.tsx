import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { auth } from '../services/firebase-config';
import { type User, GoogleAuthProvider, signInWithPopup, signInWithRedirect, signOut, getRedirectResult } from 'firebase/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithGoogleRedirect: () => Promise<void>;
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
    
    // Handle redirect result for Google sign-in
    getRedirectResult(auth).then((result) => {
      if (result) {
        console.log("✅ Redirect sign-in successful:", result.user.displayName);
      }
    }).catch((error) => {
      console.error("❌ Error getting redirect result:", error);
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
    
    // Add custom parameters to improve popup behavior
    provider.setCustomParameters({
      prompt: 'select_account'
    });
    
    try {
      console.log("🔐 Attempting Google sign-in...");
      console.log("🔐 Auth domain:", auth.config.authDomain);
      console.log("🔐 Current URL:", window.location.href);
      
      const result = await signInWithPopup(auth, provider);
      console.log("✅ Google sign-in successful:", result.user.displayName);
      console.log("✅ User email:", result.user.email);
      console.log("✅ User ID:", result.user.uid);
    } catch (error: any) {
      console.error("❌ Error signing in with Google:", error);
      
      // Provide specific error messages for common issues
      if (error.code === 'auth/popup-closed-by-user') {
        console.error("❌ Popup was closed by user");
        alert("Sign-in popup was closed. Please try again and keep the popup open.");
      } else if (error.code === 'auth/popup-blocked') {
        console.error("❌ Popup was blocked by browser");
        alert("Sign-in popup was blocked. Please allow popups for this site and try again.");
      } else if (error.code === 'auth/unauthorized-domain') {
        console.error("❌ Domain not authorized");
        alert("This domain is not authorized for sign-in. Please contact support.");
      } else if (error.code === 'auth/network-request-failed') {
        console.error("❌ Network request failed");
        alert("Network error. Please check your connection and try again.");
      } else {
        console.error("❌ Unknown error:", error.message);
        alert(`Sign-in failed: ${error.message}`);
      }
    }
  };

  const signInWithGoogleRedirect = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithRedirect(auth, provider);
      // The user will be redirected back to the app, and getRedirectResult will handle the final user.
      // We don't need to set loading to false here, as the redirect will handle the state change.
    } catch (error: any) {
      console.error("❌ Error signing in with Google redirect:", error);
      if (error.code === 'auth/popup-closed-by-user') {
        alert("Sign-in popup was closed. Please try again and keep the popup open.");
      } else if (error.code === 'auth/popup-blocked') {
        alert("Sign-in popup was blocked. Please allow popups for this site and try again.");
      } else if (error.code === 'auth/unauthorized-domain') {
        alert("This domain is not authorized for sign-in. Please contact support.");
      } else if (error.code === 'auth/network-request-failed') {
        alert("Network error. Please check your connection and try again.");
      } else {
        alert(`Sign-in failed: ${error.message}`);
      }
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

  const value = { user, loading, signInWithGoogle, signInWithGoogleRedirect, signOutUser };

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
