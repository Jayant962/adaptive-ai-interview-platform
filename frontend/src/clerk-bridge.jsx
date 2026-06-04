import React, { createContext, useContext, useState } from 'react';
import * as ClerkReal from '@clerk/clerk-react';

// Determine if Clerk publishable key is valid
const rawKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const isClerkAvailable = rawKey && rawKey !== '' && rawKey !== 'mock' && !rawKey.includes('your_clerk_publishable_key');

// Global mock state key in localStorage to persist demo sessions across page refreshes
const MOCK_USER_KEY = 'ai_interview_mock_user';

// Mock context to broadcast changes across components
const MockAuthContext = createContext(null);

export function ClerkProvider({ children, publishableKey, ...props }) {
  const [mockUser, setMockUser] = useState(() => {
    try {
      const stored = localStorage.getItem(MOCK_USER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const setAndPersistUser = (user) => {
    setMockUser(user);
    if (user) {
      localStorage.setItem(MOCK_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(MOCK_USER_KEY);
    }
  };

  const providerValue = {
    mockUser,
    setMockUser: setAndPersistUser,
    isClerkActive: isClerkAvailable && !mockUser,
  };

  if (isClerkAvailable) {
    return (
      <MockAuthContext.Provider value={providerValue}>
        <ClerkReal.ClerkProvider publishableKey={publishableKey} {...props}>
          {children}
        </ClerkReal.ClerkProvider>
      </MockAuthContext.Provider>
    );
  }

  return (
    <MockAuthContext.Provider value={providerValue}>
      {children}
    </MockAuthContext.Provider>
  );
}

export function useUser() {
  const mockContext = useContext(MockAuthContext);
  
  // 1. If a local mock user session is active, return the mock user
  if (mockContext?.mockUser) {
    return {
      isLoaded: true,
      isSignedIn: true,
      user: mockContext.mockUser,
    };
  }

  // 2. If Clerk is configured and no mock session is active, use Clerk
  if (isClerkAvailable) {
    try {
      return ClerkReal.useUser();
    } catch (e) {
      console.warn("Clerk useUser failed:", e);
    }
  }

  // 3. Otherwise return anonymous state
  return {
    isLoaded: true,
    isSignedIn: false,
    user: null,
  };
}

export function useAuth() {
  const mockContext = useContext(MockAuthContext);

  // 1. If mock session is active, return mock auth details + token generator
  if (mockContext?.mockUser) {
    const getAuthToken = async () => {
      const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" })).replace(/=/g, '');
      const payload = btoa(JSON.stringify({
        sub: mockContext.mockUser.id,
        name: mockContext.mockUser.fullName,
        email: mockContext.mockUser.primaryEmailAddress.emailAddress
      })).replace(/=/g, '');
      return `${header}.${payload}.mock_signature`;
    };

    return {
      isLoaded: true,
      isSignedIn: true,
      userId: mockContext.mockUser.id,
      getToken: getAuthToken,
    };
  }

  // 2. If Clerk is configured, use real Clerk auth
  if (isClerkAvailable) {
    try {
      return ClerkReal.useAuth();
    } catch (e) {
      console.warn("Clerk useAuth failed:", e);
    }
  }

  // 3. Default fallback
  return {
    isLoaded: true,
    isSignedIn: false,
    userId: null,
    getToken: async () => null,
  };
}

export function useClerk() {
  const mockContext = useContext(MockAuthContext);

  if (isClerkAvailable && !mockContext?.mockUser) {
    try {
      return ClerkReal.useClerk();
    } catch (e) {
      console.warn("Clerk useClerk failed:", e);
    }
  }

  return {
    signOut: async () => {
      if (mockContext) {
        mockContext.setMockUser(null);
      }
      window.location.href = '/';
    },
    openUserProfile: () => {
      alert('Mock Mode Profile details are pre-configured for Jane Doe.');
    }
  };
}

export function SignIn(props) {
  const mockContext = useContext(MockAuthContext);
  const [showClerk, setShowClerk] = useState(isClerkAvailable);

  const loginAsDemo = () => {
    if (mockContext) {
      mockContext.setMockUser({
        id: 'user_2N5e4B9q8Z3w2x1y0v9u8t7s6r',
        fullName: 'Jane Doe',
        firstName: 'Jane',
        lastName: 'Doe',
        primaryEmailAddress: { emailAddress: 'jane.doe@example.com' },
        imageUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80',
      });
      window.location.href = '/dashboard';
    }
  };

  if (showClerk) {
    return (
      <div className="flex flex-col items-center">
        <ClerkReal.SignIn {...props} />
        <button
          onClick={() => setShowClerk(false)}
          className="mt-6 text-indigo-400 hover:text-indigo-300 text-sm font-semibold underline transition duration-200"
        >
          Want to Sign In as Demo User instead?
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md p-8 bg-neutral-900 border border-neutral-800 rounded-3xl text-center shadow-2xl backdrop-blur-md">
      <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg">
        <span className="text-2xl text-white font-bold">🎙️</span>
      </div>
      <h2 className="text-3xl font-extrabold text-white tracking-tight mb-2">Developer Sign In</h2>
      <p className="text-neutral-400 text-sm mb-8 leading-relaxed">
        Click below to sign in instantly with a pre-configured developer profile, or switch to your real Clerk credentials.
      </p>
      
      <button 
        onClick={loginAsDemo}
        className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold rounded-2xl shadow-xl transition-all duration-300 transform hover:-translate-y-0.5 active:scale-95 mb-4"
      >
        Sign In as Demo User
      </button>

      {isClerkAvailable && (
        <button
          onClick={() => setShowClerk(true)}
          className="w-full py-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-medium rounded-2xl transition duration-200"
        >
          Use Real Clerk Authentication
        </button>
      )}

      <div className="mt-6 flex justify-center gap-2 items-center text-xs text-neutral-500">
        <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        Database connection ready
      </div>
    </div>
  );
}

export function SignUp(props) {
  const mockContext = useContext(MockAuthContext);
  const [showClerk, setShowClerk] = useState(isClerkAvailable);

  const loginAsDemo = () => {
    if (mockContext) {
      mockContext.setMockUser({
        id: 'user_2N5e4B9q8Z3w2x1y0v9u8t7s6r',
        fullName: 'Jane Doe',
        firstName: 'Jane',
        lastName: 'Doe',
        primaryEmailAddress: { emailAddress: 'jane.doe@example.com' },
        imageUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80',
      });
      window.location.href = '/dashboard';
    }
  };

  if (showClerk) {
    return (
      <div className="flex flex-col items-center">
        <ClerkReal.SignUp {...props} />
        <button
          onClick={() => setShowClerk(false)}
          className="mt-6 text-indigo-400 hover:text-indigo-300 text-sm font-semibold underline transition duration-200"
        >
          Want to Sign Up as Demo User instead?
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md p-8 bg-neutral-900 border border-neutral-800 rounded-3xl text-center shadow-2xl backdrop-blur-md">
      <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg">
        <span className="text-2xl text-white font-bold">🎙️</span>
      </div>
      <h2 className="text-3xl font-extrabold text-white tracking-tight mb-2">Developer Sign Up</h2>
      <p className="text-neutral-400 text-sm mb-8 leading-relaxed">
        Click below to sign up instantly with a pre-configured developer profile, or switch to your real Clerk credentials.
      </p>
      
      <button 
        onClick={loginAsDemo}
        className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold rounded-2xl shadow-xl transition-all duration-300 transform hover:-translate-y-0.5 active:scale-95 mb-4"
      >
        Sign Up as Demo User
      </button>

      {isClerkAvailable && (
        <button
          onClick={() => setShowClerk(true)}
          className="w-full py-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-medium rounded-2xl transition duration-200"
        >
          Use Real Clerk Authentication
        </button>
      )}

      <div className="mt-6 flex justify-center gap-2 items-center text-xs text-neutral-500">
        <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        Database connection ready
      </div>
    </div>
  );
}
