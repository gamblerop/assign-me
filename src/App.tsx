import { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { 
  onAuthStateChanged, 
  signOut, 
  GoogleAuthProvider, 
  signInWithPopup 
} from 'firebase/auth';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { getUserProfile, seedInitialData } from './services/dbService';
import { UserProfile, SystemNotification } from './types';
import Hero from './components/Hero';
import HowItWorks from './components/HowItWorks';
import Pricing from './components/Pricing';
import OrderWizard from './components/OrderWizard';
import RewardsSection from './components/RewardsSection';
import ReviewSection from './components/ReviewSection';
import PhotoUploadSection from './components/PhotoUploadSection';
import AuthModal from './components/AuthModal';
import AdminPortal from './components/AdminPortal';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, Key, LogOut, ArrowRight, User, ShieldCheck } from 'lucide-react';

export default function App() {
  const [portal, setPortal] = useState<'user' | 'admin'>('user');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const googleProvider = new GoogleAuthProvider();

const handleAdminGoogleLogin = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);

    const email = result.user.email;

    if (email !== "gamblerop18@gmail.com") {
      alert("Access denied");
      await signOut(auth);
      return;
    }

    setPortal("admin");

  } catch (error) {
    console.log(error);
  }
};
  
  // Real-time notification lists (for toast popups)
  const [notifs, setNotifs] = useState<SystemNotification[]>([]);
  const [toastNotif, setToastNotif] = useState<SystemNotification | null>(null);

  // 1. Seed initial data (hostels and services) on mount
  useEffect(() => {
    seedInitialData();
  }, []);

  // 2. Track Firebase auth changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      const adminStored = false;``
      if (adminStored) {
        // Setup mock admin profile to bypass Email/Password disabled providers
        const adminProfile: UserProfile = {
          id: 'admin-bypass-uid',
          name: 'Super Administrator',
          email: 'gamblerop18@gmail.com',
          phone: '+919999999999',
          role: 'admin',
          points: 9999,
          ordersCount: 99,
          joined: new Date().toISOString().split('T')[0]
        };
        setUserProfile(adminProfile);
        setPortal('admin');
        return;
      }

      const customUserStored = localStorage.getItem('customUserAuth');
      if (customUserStored) {
        try {
          const profile = JSON.parse(customUserStored) as UserProfile;
          if (profile.email === 'gamblerop18@gmail.com' || profile.email === 'admin@assignme.in') {
            if (profile.role !== 'admin') {
              profile.role = 'admin';
              localStorage.setItem('customUserAuth', JSON.stringify(profile));
            }
          }
          setUserProfile(profile);
          setPortal(profile.role);
          return;
        } catch (e) {
          console.error('Error parsing custom user authentication:', e);
        }
      }

      if (authUser) {
        // Fetch matching profile
        const profile = await getUserProfile(authUser.uid);
        if (profile) {
          if (profile.email === 'gamblerop18@gmail.com' || profile.email === 'admin@assignme.in') {
            profile.role = 'admin';
          }
          setUserProfile(profile);
          setPortal(profile.role);
        }
      } else {
        setUserProfile(null);
        setPortal('user');
      }
    });

    return () => unsubscribe();
  }, []);

  // 3. Setup client real-time notification listener (sub-second sync for toasts)
  useEffect(() => {
    if (!userProfile) {
      setNotifs([]);
      return;
    }

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userProfile.id),
      orderBy('createdAt', 'desc'),
      limit(5)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: SystemNotification[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as SystemNotification);
      });

      // If a new unread notification arrives, trigger a real-time floating toast popup!
      if (list.length > 0 && list[0].id !== notifs[0]?.id && !list[0].read) {
        setToastNotif(list[0]);
        setTimeout(() => setToastNotif(null), 6000); // clear after 6s
      }

      setNotifs(list);
    });

    return () => unsubscribe();
  }, [userProfile]);

  // 4. Manual Route / Hash Interceptor (Route Protection)
  useEffect(() => {
    const checkRoute = () => {
      const path = window.location.pathname;
      const hash = window.location.hash;
      const adminPaths = ['/admin', '/dashboard', '/admin-dashboard'];
      const adminHashes = ['#admin', '#dashboard', '#admin-dashboard'];
      
      const isAdminAuth = userProfile?.email === "gamblerop18@gmail.com";
      
      if (adminPaths.includes(path) || adminHashes.includes(hash)) {
        if (!isAdminAuth) {
          handleAdminGoogleLogin();
        } else {
          setPortal('admin');
        }
      }
    };

    checkRoute();
    window.addEventListener('hashchange', checkRoute);
    window.addEventListener('popstate', checkRoute);
    return () => {
      window.removeEventListener('hashchange', checkRoute);
      window.removeEventListener('popstate', checkRoute);
    };
  }, [userProfile]);

  const handleLogout = async () => {
    if (confirm('Log out from your account?')) {
      sessionStorage.removeItem('adminAuth');
      localStorage.removeItem('customUserAuth');
      await signOut(auth);
      setUserProfile(null);
      setPortal('user');
    }
  };

  const handleAuthSuccess = (profile: UserProfile) => {
    setUserProfile(profile);
    if (profile.role === 'admin') {
      sessionStorage.setItem('adminAuth', 'true');
      setPortal('admin');
    }
  };

  const handleOrderSuccess = () => {
    alert('🎉 Order placed successfully! Check your WhatsApp window to finalize. Our team is writing currently.');
  };

  if (portal === 'admin') {
    return (
      <AdminPortal
        onBackToClient={() => {
          sessionStorage.removeItem('adminAuth');
          setPortal('user');
        }}
      />
    );
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-[#020b18] text-[#e8f0fe] flex flex-col justify-between font-sans selection:bg-[#1a6fff]/30">
      
      {/* Real-time Floating Notification Toasts */}
      <AnimatePresence>
        {toastNotif && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: 20 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-[9999] bg-[#0a1f38]/95 border-2 border-[#1a6fff]/50 rounded-2xl p-4 w-[340px] shadow-2xl shadow-[#1a6fff]/20 backdrop-blur-md flex gap-3.5 items-start"
          >
            <div className="w-10 h-10 rounded-xl bg-[#1a6fff]/10 flex items-center justify-center text-xl text-[#1a6fff] flex-shrink-0 animate-bounce">
              🔔
            </div>
            <div>
              <h4 className="font-syne font-bold text-xs text-white leading-tight">
                {toastNotif.title}
              </h4>
              <p className="text-[#7da3cc] text-[11px] mt-1 leading-relaxed">
                {toastNotif.desc}
              </p>
            </div>
            <button
              onClick={() => setToastNotif(null)}
              className="text-[#7da3cc] hover:text-white text-xs font-bold cursor-pointer ml-auto"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* NAVBAR */}
      <nav className="flex items-center justify-between px-6 md:px-14 lg:px-20 py-4.5 border-b border-[#0d2d50] sticky top-0 z-[100] bg-[#020b18]/92 backdrop-blur-md">
        <div className="flex items-center gap-3.5 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <div className="w-9 h-9 bg-[#1a6fff] rounded-xl flex items-center justify-center font-syne font-extrabold text-sm text-white shadow-md shadow-[#1a6fff]/20">
            AM
          </div>
          <span className="font-syne font-extrabold text-base tracking-wider text-white">
            ASSIGN ME
          </span>
        </div>

        {/* Links */}
        <ul className="hidden md:flex items-center gap-8 list-none text-xs font-bold tracking-wide uppercase">
          <li>
            <a href="#pricing" className="text-[#7da3cc] hover:text-white transition-colors duration-200">
              Pricing
            </a>
          </li>
          <li>
            <a href="#howitworks" className="text-[#7da3cc] hover:text-white transition-colors duration-200">
              How It Works
            </a>
          </li>
          <li>
            <a href="#rewards" className="text-[#7da3cc] hover:text-white transition-colors duration-200">
              Rewards
            </a>
          </li>
          <li>
            <a href="#reviews" className="text-[#7da3cc] hover:text-white transition-colors duration-200">
              Reviews
            </a>
          </li>
          <li>
            <a href="#upload-section" className="text-[#7da3cc] hover:text-white transition-colors duration-200">
              Upload Photo
            </a>
          </li>
        </ul>

        {/* Action Button */}
        <div className="flex items-center gap-3">
          {userProfile ? (
            <div className="flex items-center gap-3 bg-[#071628] border border-[#0d2d50] rounded-xl p-1.5 pl-3.5">
              <span className="text-white text-xs font-bold font-syne hidden sm:inline-block">
                {userProfile.name.split(' ')[0]}
              </span>
              <div className="w-8 h-8 rounded-lg bg-[#1a6fff] text-white flex items-center justify-center font-bold text-xs shadow-md">
                {getInitials(userProfile.name)}
              </div>
              <button
                onClick={handleLogout}
                title="Logout"
                className="p-1.5 hover:bg-red-500/10 text-[#7da3cc] hover:text-red-400 rounded-lg cursor-pointer duration-200"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAuthModalOpen(true)}
              className="border border-[#0d2d50] hover:border-[#1a6fff] text-[#e8f0fe] hover:text-white font-semibold text-xs px-6 py-2.5 rounded-xl cursor-pointer duration-200"
            >
              Sign In
            </button>
          )}

          <button
            onClick={() => document.getElementById('order')?.scrollIntoView({ behavior: 'smooth' })}
            className="hidden sm:inline-block bg-[#1a6fff] hover:bg-[#1558cc] text-white font-bold text-xs px-6 py-2.5 rounded-xl cursor-pointer shadow-lg shadow-[#1a6fff]/20 hover:shadow-[#1a6fff]/30 duration-200"
          >
            Start Order
          </button>
        </div>
      </nav>

      {/* CORE PORTAL CONTAINER */}
      <main className="flex-grow">
        <Hero onStartOrder={() => document.getElementById('order')?.scrollIntoView({ behavior: 'smooth' })} />
        <HowItWorks />
        <Pricing />
        <OrderWizard userProfile={userProfile} onOrderSuccess={handleOrderSuccess} />
        <RewardsSection userProfile={userProfile} onLoginClick={() => setAuthModalOpen(true)} />
        <ReviewSection userProfile={userProfile} onLoginClick={() => setAuthModalOpen(true)} />
        <PhotoUploadSection />
      </main>

      {/* FOOTER */}
      <footer className="border-t border-[#0d2d50] bg-[#040f1e] py-10 px-6 md:px-14 lg:px-20 text-center text-[#7da3cc] text-xs">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 max-w-7xl mx-auto mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#1a6fff] rounded-lg flex items-center justify-center font-syne font-extrabold text-xs text-white">
              AM
            </div>
            <span className="font-syne font-bold text-sm tracking-wider text-white">
              ASSIGN ME
            </span>
          </div>

          <div className="flex flex-wrap justify-center gap-6">
            <a href="#pricing" className="hover:text-white">Pricing</a>
            <a href="#howitworks" className="hover:text-white">How It Works</a>
            <a href="#rewards" className="hover:text-white">Rewards</a>
            <a href="#reviews" className="hover:text-white">Reviews</a>
          </div>
        </div>

        <div className="border-t border-[#0d2d50]/40 pt-6 max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px]">
          <span>© 2025 Assign Me. Designed with absolute precision. All rights reserved.</span>
          <span className="opacity-60">Because assignments shouldn't stress you.</span>
        </div>
      </footer>

      {/* MODALS */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
}
