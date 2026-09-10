import React, { useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  signInWithPopup,
  GoogleAuthProvider
} from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc, getDocs, query, where, collection } from 'firebase/firestore';
import { createUserProfile, getUserProfile } from '../services/dbService';
import { motion, AnimatePresence } from 'motion/react';
import { X, Eye, EyeOff, Sparkles, LogIn, Key, Mail, User, Phone, ArrowLeft, RefreshCw, CheckCircle, ShieldCheck } from 'lucide-react';

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'assignme-salt-secret-99');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (profile: any) => void;
}

export default function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [tab, setTab] = useState<'login' | 'signup' | 'forgot' | 'verification_pending' | 'admin_otp'>('login');
  const [registeredProfile, setRegisteredProfile] = useState<any>(null);
  const [adminOtpCode, setAdminOtpCode] = useState('');
  const [enteredOtp, setEnteredOtp] = useState('');
  
  // Login Form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Signup Form
  const [suName, setSuName] = useState('');
  const [suEmail, setSuEmail] = useState('');
  const [suPhone, setSuPhone] = useState('');
  const [suPassword, setSuPassword] = useState('');
  const [pwdStrength, setPwdStrength] = useState({ score: 0, label: '', color: '' });
  
  // Forgot Password Form
  const [forgotEmail, setForgotEmail] = useState('');
  
  // UI State
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Clear states when tab changes
  useEffect(() => {
    setError('');
    setSuccessMsg('');
  }, [tab]);

  // Check password strength
  const checkPwdStrength = (val: string) => {
    let score = 0;
    if (val.length >= 6) score++;
    if (val.length >= 10) score++;
    if (/[A-Z]/.test(val)) score++;
    if (/[0-9]/.test(val)) score++;
    if (/[^a-zA-Z0-9]/.test(val)) score++;

    const levels = [
      { score: 0, label: '', color: 'bg-slate-700' },
      { score: 1, label: 'Weak', color: 'bg-rose-500 text-rose-500' },
      { score: 2, label: 'Fair', color: 'bg-amber-500 text-amber-500' },
      { score: 3, label: 'Good', color: 'bg-yellow-500 text-yellow-500' },
      { score: 4, label: 'Strong', color: 'bg-lime-500 text-lime-500' },
      { score: 5, label: 'Excellent', color: 'bg-emerald-500 text-emerald-500' }
    ];

    const currentLevel = levels[Math.min(score, 5)];
    setPwdStrength(currentLevel);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    if (!loginEmail) {
      setError('Please fill in the email address.');
      return;
    }

    setLoading(true);

    // 1. Intercept the secret administrator immediately to run passwordless OTP verification
    if (loginEmail.trim().toLowerCase() === 'gamblerop18@gmail.com') {
      try {
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Save OTP to Firestore under /admin_otps/gamblerop18@gmail.com (secure verification reference)
        await setDoc(doc(db, 'admin_otps', 'gamblerop18@gmail.com'), {
          otp: otpCode,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minute TTL
        });

        const adminProfile = {
          id: 'admin-bypass-uid',
          name: 'Super Administrator',
          email: 'gamblerop18@gmail.com',
          phone: '+919999999999',
          role: 'admin',
          points: 9999,
          ordersCount: 99,
          joined: new Date().toISOString().split('T')[0]
        };

        setSuEmail(loginEmail);
        setRegisteredProfile(adminProfile);
        setAdminOtpCode(otpCode);
        setEnteredOtp('');
        
        // Disseminate email via FormSubmit.co API
        try {
          fetch('https://formsubmit.co/ajax/gamblerop18@gmail.com', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({
              _subject: `🛡️ Assign Me - Super Admin OTP: ${otpCode}`,
              OTP_Code: otpCode,
              Expires_In: '5 Minutes',
              Security_Notice: 'If you did not request this OTP, please ignore this email.',
              _honey: '',
              _captcha: 'false'
            })
          }).catch(err => console.error('Failed to send FormSubmit OTP email:', err));
        } catch (mailErr) {
          console.error(mailErr);
        }

        setTab('admin_otp');
        setLoading(false);
        return;
      } catch (err: any) {
        console.error(err);
        setError('Failed to configure Admin OTP session: ' + err.message);
        setLoading(false);
        return;
      }
    }

    if (!loginPassword) {
      setError('Please fill in the password.');
      setLoading(false);
      return;
    }

    // Try standard Firebase Authentication first
    try {
      const userCredential = await signInWithEmailAndPassword(auth, loginEmail.trim(), loginPassword);
      const user = userCredential.user;

      // Check email verification if configured
      if (!user.emailVerified) {
        setRegisteredProfile(await getUserProfile(user.uid));
        setTab('verification_pending');
        setLoading(false);
        return;
      }

      let profile = await getUserProfile(user.uid);
      if (!profile) {
        profile = await createUserProfile(user.uid, {
          name: user.displayName || 'User',
          email: user.email || loginEmail.trim().toLowerCase(),
          phone: user.phoneNumber || ''
        });
      }

      setSuccessMsg('Logged in successfully! Welcome back.');
      setTimeout(() => {
        onSuccess(profile);
        onClose();
      }, 1000);

    } catch (firebaseErr: any) {
      console.warn('Firebase login failed, trying custom legacy database fallback...', firebaseErr);

      // Fallback for custom legacy database hashed logins (to support pre-migration accounts)
      try {
        const emailQuery = query(collection(db, 'users'), where('email', '==', loginEmail.trim().toLowerCase()));
        const snap = await getDocs(emailQuery);

        if (snap.empty) {
          if (firebaseErr.code === 'auth/user-not-found' || firebaseErr.code === 'auth/wrong-password' || firebaseErr.code === 'auth/invalid-credential') {
            setError('Incorrect email or password.');
          } else {
            setError(firebaseErr.message || 'Incorrect email or password.');
          }
          setLoading(false);
          return;
        }

        const userDoc = snap.docs[0];
        const profile = userDoc.data();

        if (!profile.passwordHash) {
          setError('This email is associated with a Google Account. Please log in using Google Sign-In.');
          setLoading(false);
          return;
        }

        const hash = await hashPassword(loginPassword);
        if (hash === profile.passwordHash) {
          // Valid legacy user! Let's auto-migrate them to standard Firebase Auth so they register in the Users dashboard!
          try {
            const migrationUserCred = await createUserWithEmailAndPassword(auth, loginEmail.trim(), loginPassword);
            const user = migrationUserCred.user;

            const migratedProfile = {
              ...profile,
              id: user.uid
            } as any;
            delete migratedProfile.passwordHash;

            // Save under their proper authenticated uid
            await setDoc(doc(db, 'users', user.uid), migratedProfile);
            
            setSuccessMsg('Logged in successfully and account securely upgraded! Welcome.');
            setTimeout(() => {
              onSuccess(migratedProfile);
              onClose();
            }, 1000);
          } catch (migrateErr) {
            console.error('Auto-migration to standard auth failed, logging in via legacy session:', migrateErr);
            const clientProfile = { ...profile } as any;
            delete clientProfile.passwordHash;

            localStorage.setItem('customUserAuth', JSON.stringify(clientProfile));
            setSuccessMsg('Logged in successfully! Welcome back.');
            setTimeout(() => {
              onSuccess(clientProfile);
              onClose();
            }, 1000);
          }
        } else {
          setError('Incorrect email or password.');
        }
      } catch (fallbackErr: any) {
        console.error(fallbackErr);
        setError('Login failed: ' + (firebaseErr.message || fallbackErr.message || firebaseErr || fallbackErr));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!suName || !suEmail || !suPassword) {
      setError('Please fill in all required fields.');
      return;
    }
    if (suPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      // 1. Check if user already exists in Firestore custom records
      const emailQuery = query(collection(db, 'users'), where('email', '==', suEmail.trim().toLowerCase()));
      const snap = await getDocs(emailQuery);

      if (!snap.empty) {
        setError('An account with this email already exists.');
        setLoading(false);
        return;
      }

      // 2. Create the standard user in Firebase Authentication (so they show up in Firebase dashboard!)
      const userCredential = await createUserWithEmailAndPassword(auth, suEmail.trim(), suPassword);
      const user = userCredential.user;

      // 3. Send Firebase Email Verification
      try {
        await sendEmailVerification(user);
      } catch (sendErr) {
        console.warn('Could not send verification email:', sendErr);
      }

      // 4. Create and save their user profile in Firestore
      const profile = await createUserProfile(user.uid, {
        name: suName,
        email: suEmail.trim().toLowerCase(),
        phone: suPhone
      });

      // Keep custom passwordHash strictly as secondary/legacy fallback
      const hash = await hashPassword(suPassword);
      await setDoc(doc(db, 'users', user.uid), {
        ...profile,
        passwordHash: hash
      });

      setRegisteredProfile(profile);
      setSuccessMsg('Account created successfully! 🎉 A verification email has been sent. Please verify to activate your account.');
      setTab('verification_pending');

    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists.');
      } else {
        setError(err.message || 'Registration failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCheckEmailVerified = async () => {
    setError('');
    setSuccessMsg('');
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (user) {
        await user.reload();
        if (user.emailVerified) {
          let profile = registeredProfile;
          if (!profile) {
            profile = await getUserProfile(user.uid);
          }
          if (!profile) {
            profile = await createUserProfile(user.uid, {
              name: suName || user.displayName || 'User',
              email: user.email || suEmail || '',
              phone: suPhone || ''
            });
          }
          setSuccessMsg('Email verified successfully! 🎉 Welcome to the portal.');
          setTimeout(() => {
            onSuccess(profile);
            onClose();
          }, 1500);
        } else {
          setError('Email not verified yet. Please click the link in the email we sent to ' + user.email);
        }
      } else {
        setError('No active session found. Please try logging in.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Verification check failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setError('');
    setSuccessMsg('');
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (user) {
        await sendEmailVerification(user);
        setSuccessMsg('A new verification email has been sent to ' + user.email);
      } else {
        setError('Please sign in first to request a verification link.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to resend verification email.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackFromVerification = async () => {
    setError('');
    setSuccessMsg('');
    await auth.signOut();
    setTab('login');
  };

  const handleVerifyAdminOtp = async () => {
    setError('');
    setSuccessMsg('');
    if (enteredOtp.length !== 6) {
      setError('Please enter a 6-digit OTP code.');
      return;
    }

    setLoading(true);
    try {
      const otpSnap = await getDoc(doc(db, 'admin_otps', 'gamblerop18@gmail.com'));
      if (!otpSnap.exists()) {
        setError('No OTP code generated. Please try logging in again.');
        setLoading(false);
        return;
      }

      const otpData = otpSnap.data();
      const now = new Date();
      const expiresAt = new Date(otpData.expiresAt);

      if (now > expiresAt) {
        setError('The OTP has expired. Please try logging in again.');
        setLoading(false);
        return;
      }

      if (enteredOtp !== otpData.otp) {
        setError('Incorrect One-Time Password. Access denied.');
        setLoading(false);
        return;
      }

      setSuccessMsg('Administrative identity verified! Access granted. 🛡️');
      
      const adminProfile = registeredProfile || {
        id: 'admin-bypass-uid',
        name: 'Super Administrator',
        email: 'gamblerop18@gmail.com',
        phone: '+919999999999',
        role: 'admin',
        points: 9999,
        ordersCount: 99
      };

      // Also set in Firestore if any currentUser is signed in
      const user = auth.currentUser;
      if (user) {
        try {
          await setDoc(doc(db, 'users', user.uid), adminProfile, { merge: true });
        } catch (dbErr) {
          console.error('Failed to merge admin state in Firestore:', dbErr);
        }
      }
      
      sessionStorage.setItem('adminAuth', 'true');
      setTimeout(() => {
        onSuccess(adminProfile);
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'OTP verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!forgotEmail) {
      setError('Please enter your email.');
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, forgotEmail);
      setSuccessMsg('Password reset link sent! Check your email inbox.');
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/user-not-found') {
        setError('No account found with this email.');
      } else {
        setError('Failed to send reset email. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setSuccessMsg('');
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      let profile = await getUserProfile(result.user.uid);
      if (!profile) {
        // Create a new profile for Google sign-in
        profile = await createUserProfile(result.user.uid, {
          name: result.user.displayName || 'Google User',
          email: result.user.email || '',
          phone: result.user.phoneNumber || ''
        });
      }
      onSuccess(profile);
      onClose();
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      if (err.code === 'auth/unauthorized-domain') {
        setError('Unauthorized Domain: Please add your domain (assign-me-rho.vercel.app) to your Firebase Console under Authentication > Settings > Authorized Domains.');
      } else if (err.code !== 'auth/popup-closed-by-user') {
        setError('Google authentication failed: ' + (err.message || err.code || err));
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[#000]/80 z-[1000] flex items-center justify-center p-4 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-[#071628] border border-[#0d2d50] rounded-2xl p-6 w-full max-w-[460px] relative shadow-2xl shadow-[#1a6fff]/10"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#7da3cc] hover:text-white transition-colors duration-200"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Tab switcher */}
        {tab !== 'forgot' && tab !== 'verification_pending' && (
          <div className="flex bg-[#040f1e] rounded-xl p-1 mb-6 border border-[#0d2d50] gap-1">
            <button
              onClick={() => setTab('login')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer ${
                tab === 'login'
                  ? 'bg-[#1a6fff] text-white shadow-md'
                  : 'bg-transparent text-[#7da3cc] hover:text-white'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setTab('signup')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer ${
                tab === 'signup'
                  ? 'bg-[#1a6fff] text-white shadow-md'
                  : 'bg-transparent text-[#7da3cc] hover:text-white'
              }`}
            >
              Sign Up
            </button>
          </div>
        )}

        <AnimatePresence mode="wait">
          {tab === 'login' && (
            <motion.div
              key="login"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
            >
              <div className="text-center mb-6">
                <div className="text-4xl justify-center flex mb-3">🔐</div>
                <h2 className="font-syne text-xl font-bold text-white">Welcome Back</h2>
                <p className="text-[#7da3cc] text-xs mt-1">Access your assignments and rewards</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#7da3cc] mb-1.5 uppercase tracking-wider">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[#7da3cc]" />
                    <input
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="w-full bg-[#0a1f38] border border-[#0d2d50] rounded-xl py-2.5 pl-11 pr-4 text-[#e8f0fe] text-sm focus:outline-none focus:border-[#1a6fff]"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-[#7da3cc] uppercase tracking-wider">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setTab('forgot')}
                      className="text-[#1a6fff] hover:underline text-xs"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[#7da3cc]" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full bg-[#0a1f38] border border-[#0d2d50] rounded-xl py-2.5 pl-11 pr-11 text-[#e8f0fe] text-sm focus:outline-none focus:border-[#1a6fff]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#7da3cc] hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#1a6fff] hover:bg-[#1558cc] text-white py-3 rounded-xl font-semibold text-sm cursor-pointer shadow-lg shadow-[#1a6fff]/20 flex items-center justify-center gap-2 duration-200 disabled:opacity-50"
                >
                  {loading ? 'Logging in...' : (
                    <>
                      <LogIn className="w-4.5 h-4.5" />
                      Login
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          )}

          {tab === 'signup' && (
            <motion.div
              key="signup"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              <div className="text-center mb-5">
                <div className="text-4xl justify-center flex mb-3">✨</div>
                <h2 className="font-syne text-xl font-bold text-white">Create Account</h2>
                <p className="text-[#7da3cc] text-xs mt-1">Get +50 signup reward points instantly</p>
              </div>

              <form onSubmit={handleSignup} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#7da3cc] mb-1.5 uppercase tracking-wider">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[#7da3cc]" />
                    <input
                      type="text"
                      value={suName}
                      onChange={(e) => setSuName(e.target.value)}
                      placeholder="Your full name"
                      required
                      className="w-full bg-[#0a1f38] border border-[#0d2d50] rounded-xl py-2.5 pl-11 pr-4 text-[#e8f0fe] text-sm focus:outline-none focus:border-[#1a6fff]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#7da3cc] mb-1.5 uppercase tracking-wider">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[#7da3cc]" />
                    <input
                      type="email"
                      value={suEmail}
                      onChange={(e) => setSuEmail(e.target.value)}
                      placeholder="Your email address"
                      required
                      className="w-full bg-[#0a1f38] border border-[#0d2d50] rounded-xl py-2.5 pl-11 pr-4 text-[#e8f0fe] text-sm focus:outline-none focus:border-[#1a6fff]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#7da3cc] mb-1.5 uppercase tracking-wider">
                    Phone (WhatsApp number for order notifications)
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[#7da3cc]" />
                    <input
                      type="tel"
                      value={suPhone}
                      onChange={(e) => setSuPhone(e.target.value)}
                      placeholder="+91 WhatsApp Number"
                      className="w-full bg-[#0a1f38] border border-[#0d2d50] rounded-xl py-2.5 pl-11 pr-4 text-[#e8f0fe] text-sm focus:outline-none focus:border-[#1a6fff]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#7da3cc] mb-1.5 uppercase tracking-wider">
                    Create Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[#7da3cc]" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={suPassword}
                      onChange={(e) => {
                        setSuPassword(e.target.value);
                        checkPwdStrength(e.target.value);
                      }}
                      placeholder="Minimum 6 characters"
                      required
                      className="w-full bg-[#0a1f38] border border-[#0d2d50] rounded-xl py-2.5 pl-11 pr-11 text-[#e8f0fe] text-sm focus:outline-none focus:border-[#1a6fff]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#7da3cc] hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                    </button>
                  </div>
                  {suPassword && (
                    <div className="mt-1.5">
                      <div className="h-1 w-full bg-[#0d2d50] rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            pwdStrength.score === 1
                              ? 'w-1/5 bg-rose-500'
                              : pwdStrength.score === 2
                              ? 'w-2/5 bg-amber-500'
                              : pwdStrength.score === 3
                              ? 'w-3/5 bg-yellow-500'
                              : pwdStrength.score === 4
                              ? 'w-4/5 bg-lime-500'
                              : 'w-full bg-emerald-500'
                          }`}
                        ></div>
                      </div>
                      <span className={`text-[10px] mt-0.5 block text-right font-medium ${pwdStrength.color}`}>
                        Password Strength: {pwdStrength.label}
                      </span>
                    </div>
                  )}
                </div>

                {error && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                    {error}
                  </div>
                )}

                {successMsg && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs">
                    {successMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#1a6fff] hover:bg-[#1558cc] text-white py-3 rounded-xl font-semibold text-sm cursor-pointer shadow-lg shadow-[#1a6fff]/20 flex items-center justify-center gap-2 duration-200 disabled:opacity-50"
                >
                  {loading ? 'Creating account...' : (
                    <>
                      <Sparkles className="w-4.5 h-4.5" />
                      Register Account
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          )}

          {tab === 'forgot' && (
            <motion.div
              key="forgot"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <div className="text-center mb-6">
                <div className="text-4xl justify-center flex mb-3">🔑</div>
                <h2 className="font-syne text-xl font-bold text-white">Reset Password</h2>
                <p className="text-[#7da3cc] text-xs mt-1">We'll send you an instructions link</p>
              </div>

              <form onSubmit={handleForgot} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#7da3cc] mb-1.5 uppercase tracking-wider">
                    Your Registered Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[#7da3cc]" />
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="e.g. name@student.com"
                      required
                      className="w-full bg-[#0a1f38] border border-[#0d2d50] rounded-xl py-2.5 pl-11 pr-4 text-[#e8f0fe] text-sm focus:outline-none focus:border-[#1a6fff]"
                    />
                  </div>
                </div>

                {error && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                    {error}
                  </div>
                )}

                {successMsg && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs">
                    {successMsg}
                  </div>
                )}

                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => setTab('login')}
                    className="flex-1 border border-[#0d2d50] text-[#7da3cc] hover:text-white py-3 rounded-xl font-semibold text-sm cursor-pointer duration-200"
                  >
                    Back to Login
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-[1.5] bg-[#1a6fff] hover:bg-[#1558cc] text-white py-3 rounded-xl font-semibold text-sm cursor-pointer shadow-lg shadow-[#1a6fff]/20 duration-200"
                  >
                    {loading ? 'Sending link...' : 'Send Reset Link'}
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {tab === 'verification_pending' && (
            <motion.div
              key="verification_pending"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="text-center py-2"
            >
              <div className="text-4xl justify-center flex mb-4 animate-bounce">📧</div>
              <h2 className="font-syne text-xl font-bold text-white mb-2">Verify Your Email</h2>
              <p className="text-[#7da3cc] text-xs leading-relaxed max-w-[340px] mx-auto mb-6">
                We've sent a verification link to <strong className="text-white font-semibold">{suEmail || loginEmail}</strong>. 
                Please check your inbox (and spam folder) and click the link in that email to activate your account.
              </p>

              {error && (
                <div className="p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs text-left">
                  {error}
                </div>
              )}

              {successMsg && (
                <div className="p-3 mb-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs text-left">
                  {successMsg}
                </div>
              )}

              <div className="space-y-3">
                <button
                  onClick={handleCheckEmailVerified}
                  disabled={loading}
                  className="w-full bg-[#1a6fff] hover:bg-[#1558cc] text-white py-3 rounded-xl font-semibold text-sm cursor-pointer shadow-lg shadow-[#1a6fff]/20 flex items-center justify-center gap-2 duration-200 disabled:opacity-50"
                >
                  <CheckCircle className={`w-4.5 h-4.5 ${loading ? 'animate-spin' : ''}`} />
                  I've Clicked & Confirmed
                </button>

                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={handleBackFromVerification}
                    className="flex-1 border border-[#0d2d50] text-[#7da3cc] hover:text-white py-2.5 rounded-xl font-semibold text-xs cursor-pointer duration-200 flex items-center justify-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back to Login
                  </button>

                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={loading}
                    className="flex-1 border border-[#0d2d50] text-[#7da3cc] hover:text-white py-2.5 rounded-xl font-semibold text-xs cursor-pointer duration-200 flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Resend Email
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {tab === 'admin_otp' && (
            <motion.div
              key="admin_otp"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="text-center py-2"
            >
              <div className="text-4xl justify-center flex mb-4 animate-pulse">🛡️</div>
              <h2 className="font-syne text-xl font-bold text-white mb-2">Super Admin Verification</h2>
              <p className="text-[#7da3cc] text-xs leading-relaxed max-w-[340px] mx-auto mb-6">
                A secure One-Time Password (OTP) has been dispatched to <strong className="text-white font-semibold">gamblerop18@gmail.com</strong>.
                Please enter the 6-digit code below to confirm your administrative identity.
              </p>

              {error && (
                <div className="p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs text-left">
                  {error}
                </div>
              )}

              {successMsg && (
                <div className="p-3 mb-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs text-left">
                  {successMsg}
                </div>
              )}

              {/* Developer OTP Preview Helper */}
              <div className="mb-4 p-3.5 bg-[#1a6fff]/10 border border-[#1a6fff]/20 rounded-xl text-left">
                <span className="text-[10px] font-semibold text-white/90 uppercase tracking-wide block mb-1">
                  💡 Dev Sandbox Helper:
                </span>
                <p className="text-[11px] text-[#7da3cc] leading-relaxed mb-2">
                  The generated OTP is <strong className="text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded text-xs select-all">{adminOtpCode}</strong>.
                  Use this to test the flow directly in the AI Studio preview window.
                </p>
                <span className="text-[10px] font-semibold text-yellow-400 uppercase tracking-wide block mb-1">
                  📧 Email Delivery Notice:
                </span>
                <p className="text-[11px] text-[#7da3cc] leading-relaxed">
                  We sent the OTP email to <span className="text-white">gamblerop18@gmail.com</span> using FormSubmit. <strong>If this is your first time using it,</strong> please check your inbox for a message from <strong>FormSubmit</strong> and click <strong>"Activate Form"</strong>. Once activated, all future OTPs will arrive in your inbox instantly!
                </p>
              </div>

              <div className="space-y-4">
                <input
                  type="text"
                  maxLength={6}
                  placeholder="• • • • • •"
                  value={enteredOtp}
                  onChange={(e) => setEnteredOtp(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full bg-[#040f1e] border-2 border-[#0d2d50] rounded-xl py-3 text-center text-2xl font-bold tracking-[0.5em] text-[#e8f0fe] focus:outline-none focus:border-[#1a6fff] focus:ring-1 focus:ring-[#1a6fff] placeholder-[#0d2d50]"
                />

                <button
                  onClick={handleVerifyAdminOtp}
                  disabled={loading || enteredOtp.length !== 6}
                  className="w-full bg-[#1a6fff] hover:bg-[#1558cc] text-white py-3 rounded-xl font-semibold text-sm cursor-pointer shadow-lg shadow-[#1a6fff]/20 flex items-center justify-center gap-2 duration-200 disabled:opacity-50"
                >
                  <ShieldCheck className="w-4.5 h-4.5" />
                  {loading ? 'Verifying Identity...' : 'Verify Identity & Enter'}
                </button>

                <button
                  type="button"
                  onClick={handleBackFromVerification}
                  className="w-full border border-[#0d2d50] text-[#7da3cc] hover:text-white py-2.5 rounded-xl font-semibold text-xs cursor-pointer duration-200 flex items-center justify-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to Login
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Third Party Login (Always visible except in Forgot Password or Verification mode) */}
        {tab !== 'forgot' && tab !== 'verification_pending' && tab !== 'admin_otp' && (
          <div className="mt-5 border-t border-[#0d2d50]/70 pt-5">
            <div className="relative flex py-2 items-center mb-4">
              <div className="flex-grow border-t border-[#0d2d50]/40"></div>
              <span className="flex-shrink mx-4 text-[#7da3cc] text-[10px] uppercase tracking-wider font-semibold">
                Or Connect With
              </span>
              <div className="flex-grow border-t border-[#0d2d50]/40"></div>
            </div>

            <button
              onClick={handleGoogleLogin}
              type="button"
              className="w-full bg-[#0a1f38] hover:bg-[#0a1f38]/80 border border-[#0d2d50] text-white py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-3 cursor-pointer transition-colors duration-200"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12 5.04c1.64 0 3.12.56 4.28 1.67l3.2-3.2C17.52 1.58 14.96 1 12 1 7.35 1 3.39 3.67 1.44 7.56l3.77 2.92C6.11 7.28 8.84 5.04 12 5.04z"
                />
                <path
                  fill="#4285F4"
                  d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.47h6.44c-.28 1.48-1.12 2.74-2.38 3.58l3.71 2.88c2.17-2 3.72-4.95 3.72-8.57z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.21 14.81c-.24-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29L1.44 7.31C.52 9.15 0 11.2 0 13.38s.52 4.23 1.44 6.07l3.77-2.92z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c3.24 0 5.97-1.07 7.96-2.92l-3.71-2.88c-1.11.75-2.53 1.2-4.25 1.2-3.16 0-5.89-2.24-6.79-5.44L1.44 15.88C3.39 19.78 7.35 22.46 12 23z"
                />
              </svg>
              Google Account
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
