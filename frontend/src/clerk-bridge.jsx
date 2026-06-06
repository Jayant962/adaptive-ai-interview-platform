import React from 'react';
import * as ClerkReal from '@clerk/clerk-react';

// Determine if Clerk publishable key is valid
const rawKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const isClerkAvailable = rawKey && rawKey !== '' && rawKey !== 'mock' && !rawKey.includes('your_clerk_publishable_key');

export function ClerkProvider({ children, publishableKey, ...props }) {
  if (isClerkAvailable) {
    return (
      <ClerkReal.ClerkProvider publishableKey={publishableKey} {...props}>
        {children}
      </ClerkReal.ClerkProvider>
    );
  }

  // No Clerk key — render children directly (unauthenticated)
  return <>{children}</>;
}

export function useUser() {
  if (isClerkAvailable) {
    try {
      return ClerkReal.useUser();
    } catch (e) {
      console.warn('Clerk useUser failed:', e);
    }
  }

  return {
    isLoaded: true,
    isSignedIn: false,
    user: null,
  };
}

export function useSession() {
  if (isClerkAvailable) {
    try {
      return ClerkReal.useSession();
    } catch (e) {
      console.warn('Clerk useSession failed:', e);
    }
  }

  return {
    isLoaded: true,
    isSignedIn: false,
    session: null,
  };
}

export function useAuth() {
  if (isClerkAvailable) {
    try {
      return ClerkReal.useAuth();
    } catch (e) {
      console.warn('Clerk useAuth failed:', e);
    }
  }

  return {
    isLoaded: true,
    isSignedIn: false,
    userId: null,
    getToken: async () => null,
  };
}

export function useClerk() {
  if (isClerkAvailable) {
    try {
      return ClerkReal.useClerk();
    } catch (e) {
      console.warn('Clerk useClerk failed:', e);
    }
  }

  return {
    signOut: async () => {
      window.location.href = '/';
    },
    openUserProfile: () => {},
  };
}

// ─── Shared spinner shown while Clerk SDK initializes ────────────────────────
function ClerkLoadingSpinner() {
  return (
    <div className="flex items-center justify-center" style={{ minHeight: '320px' }}>
      <div
        style={{
          width: '40px', height: '40px',
          border: '3px solid rgba(109,95,232,0.25)',
          borderTopColor: '#6d5fe8',
          borderRadius: '50%',
          animation: 'spin 0.7s linear infinite',
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export function SignIn(props) {
  if (!isClerkAvailable) {
    return (
      <div className="w-full max-w-md p-8 bg-neutral-900 border border-neutral-800 rounded-3xl text-center shadow-2xl">
        <p className="text-neutral-400 text-sm">
          Clerk is not configured. Please set <code>VITE_CLERK_PUBLISHABLE_KEY</code>.
        </p>
      </div>
    );
  }

  return <ClerkSignInInner {...props} />;
}

function ClerkSignInInner(props) {
  const { isLoaded } = ClerkReal.useUser();
  if (!isLoaded) return <ClerkLoadingSpinner />;
  return <ClerkReal.SignIn {...props} />;
}

export function SignUp(props) {
  if (!isClerkAvailable) {
    return (
      <div className="w-full max-w-md p-8 bg-neutral-900 border border-neutral-800 rounded-3xl text-center shadow-2xl">
        <p className="text-neutral-400 text-sm">
          Clerk is not configured. Please set <code>VITE_CLERK_PUBLISHABLE_KEY</code>.
        </p>
      </div>
    );
  }

  return <ClerkSignUpInner {...props} />;
}

function ClerkSignUpInner(props) {
  const { isLoaded } = ClerkReal.useUser();
  if (!isLoaded) return <ClerkLoadingSpinner />;
  return <ClerkReal.SignUp {...props} />;
}
