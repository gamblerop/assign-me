import React, { useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  signInWithPopup,
  GoogleAuthProvider
} from 'firebase/auth';

import { auth } from '../firebase';
import { createUserProfile, getUserProfile } from '../services/dbService';

import { motion, AnimatePresence } from 'motion/react';

import {
  X,
  Eye,
  EyeOff,
  Sparkles,
  LogIn,
  Key,
  Mail,
  User,
  Phone,
  ArrowLeft,
  RefreshCw,
  CheckCircle
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (profile: any) => void;
}

export default function AuthModal({
  isOpen,
  onClose,
  onSuccess
}: AuthModalProps) {

  const [tab, setTab] = useState<
    'login' | 'signup' | 'forgot' | 'verification_pending'
  >('login');

  const [registeredProfile, setRegisteredProfile] = useState<any>(null);

  // ==============================
  // LOGIN
  // ==============================

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // ==============================
  // SIGN UP
  // ==============================

  const [suName, setSuName] = useState('');
  const [suEmail, setSuEmail] = useState('');
  const [suPhone, setSuPhone] = useState('');
  const [suPassword, setSuPassword] = useState('');

  const [pwdStrength, setPwdStrength] = useState({
    score: 0,
    label: '',
    color: ''
  });

  // ==============================
  // FORGOT PASSWORD
  // ==============================

  const [forgotEmail, setForgotEmail] = useState('');

  // ==============================
  // UI
  // ==============================

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Clear messages when changing tabs
  useEffect(() => {
    setError('');
    setSuccessMsg('');
  }, [tab]);

  // ==============================
  // PASSWORD STRENGTH
  // ==============================

  const checkPwdStrength = (val: string) => {

    let score = 0;

    if (val.length >= 6) score++;
    if (val.length >= 10) score++;
    if (/[A-Z]/.test(val)) score++;
    if (/[0-9]/.test(val)) score++;
    if (/[^a-zA-Z0-9]/.test(val)) score++;

    const levels = [
      {
        score: 0,
        label: '',
        color: 'bg-slate-700'
      },
      {
        score: 1,
        label: 'Weak',
        color: 'text-rose-500'
      },
      {
        score: 2,
        label: 'Fair',
        color: 'text-amber-500'
      },
      {
        score: 3,
        label: 'Good',
        color: 'text-yellow-500'
      },
      {
        score: 4,
        label: 'Strong',
        color: 'text-lime-500'
      },
      {
        score: 5,
        label: 'Excellent',
        color: 'text-emerald-500'
      }
    ];

    setPwdStrength(levels[Math.min(score, 5)]);
  };

  // =====================================================
  // LOGIN
  // =====================================================

  const handleLogin = async (e: React.FormEvent) => {

    e.preventDefault();

    setError('');
    setSuccessMsg('');

    if (!loginEmail.trim()) {
      setError('Please fill in the email address.');
      return;
    }

    if (!loginPassword) {
      setError('Please fill in the password.');
      return;
    }

    setLoading(true);

    try {

      const userCredential =
        await signInWithEmailAndPassword(
          auth,
          loginEmail.trim(),
          loginPassword
        );

      const user = userCredential.user;

      // Email verification
      if (!user.emailVerified) {

        setRegisteredProfile(
          await getUserProfile(user.uid)
        );

        setTab('verification_pending');
        return;
      }

      let profile =
        await getUserProfile(user.uid);

      // If profile doesn't exist, create it
      if (!profile) {

        profile = await createUserProfile(user.uid, {
          name: user.displayName || 'User',
          email:
            user.email ||
            loginEmail.trim().toLowerCase(),
          phone: user.phoneNumber || ''
        });
      }

      setSuccessMsg(
        'Logged in successfully! Welcome back.'
      );

      setTimeout(() => {
        onSuccess(profile);
        onClose();
      }, 700);

    } catch (err: any) {

      console.error('Firebase login error:', err);

      if (
        err.code === 'auth/invalid-credential' ||
        err.code === 'auth/wrong-password' ||
        err.code === 'auth/user-not-found'
      ) {

        setError(
          'Incorrect email or password.'
        );

      } else {

        setError(
          err.message ||
          'Login failed. Please try again.'
        );
      }

    } finally {

      setLoading(false);
    }
  };

  // =====================================================
  // SIGN UP
  // =====================================================

  const handleSignup = async (
    e: React.FormEvent
  ) => {

    e.preventDefault();

    setError('');
    setSuccessMsg('');

    if (
      !suName.trim() ||
      !suEmail.trim() ||
      !suPassword
    ) {

      setError(
        'Please fill in all required fields.'
      );

      return;
    }

    if (suPassword.length < 6) {

      setError(
        'Password must be at least 6 characters.'
      );

      return;
    }

    setLoading(true);

    try {

      /*
       * IMPORTANT:
       *
       * DO NOT query the users collection here.
       *
       * The user is not authenticated yet, so Firestore
       * correctly rejects that query.
       *
       * Firebase Authentication itself checks whether
       * the email is already registered.
       */

      const userCredential =
        await createUserWithEmailAndPassword(
          auth,
          suEmail.trim().toLowerCase(),
          suPassword
        );

      const user = userCredential.user;

      // Send verification email
      try {

        await sendEmailVerification(user);

      } catch (sendErr) {

        console.warn(
          'Could not send verification email:',
          sendErr
        );
      }

      /*
       * User is now authenticated.
       *
       * Therefore this Firestore write is allowed by
       * your /users/{userId} create rule.
       */

      const profile =
        await createUserProfile(user.uid, {
          name: suName.trim(),
          email: suEmail.trim().toLowerCase(),
          phone: suPhone.trim()
        });

      setRegisteredProfile(profile);

      setSuccessMsg(
        'Account created successfully! 🎉 A verification email has been sent.'
      );

      setTab('verification_pending');

    } catch (err: any) {

      console.error(
        'Registration error:',
        err
      );

      if (
        err.code === 'auth/email-already-in-use'
      ) {

        setError(
          'An account with this email already exists. Please log in.'
        );

      } else if (
        err.code === 'auth/invalid-email'
      ) {

        setError(
          'Please enter a valid email address.'
        );

      } else if (
        err.code === 'auth/weak-password'
      ) {

        setError(
          'Password is too weak.'
        );

      } else if (
        err.code === 'auth/unauthorized-domain'
      ) {

        setError(
          'This website domain is not authorized in Firebase Authentication.'
        );

      } else {

        setError(
          err.message ||
          'Registration failed. Please try again.'
        );
      }

    } finally {

      setLoading(false);
    }
  };

  // =====================================================
  // CHECK EMAIL VERIFICATION
  // =====================================================

  const handleCheckEmailVerified =
    async () => {

      setError('');
      setSuccessMsg('');
      setLoading(true);

      try {

        const user = auth.currentUser;

        if (!user) {

          setError(
            'No active session found. Please log in again.'
          );

          return;
        }

        await user.reload();

        if (user.emailVerified) {

          let profile =
            registeredProfile;

          if (!profile) {

            profile =
              await getUserProfile(
                user.uid
              );
          }

          if (!profile) {

            profile =
              await createUserProfile(
                user.uid,
                {
                  name:
                    suName ||
                    user.displayName ||
                    'User',

                  email:
                    user.email ||
                    suEmail ||
                    '',

                  phone:
                    suPhone || ''
                }
              );
          }

          setSuccessMsg(
            'Email verified successfully! 🎉 Welcome to the portal.'
          );

          setTimeout(() => {

            onSuccess(profile);
            onClose();

          }, 1000);

        } else {

          setError(
            'Email not verified yet. Please click the link in the email sent to ' +
            user.email
          );
        }

      } catch (err: any) {

        console.error(err);

        setError(
          err.message ||
          'Verification check failed.'
        );

      } finally {

        setLoading(false);
      }
    };

  // =====================================================
  // RESEND VERIFICATION
  // =====================================================

  const handleResendVerification =
    async () => {

      setError('');
      setSuccessMsg('');
      setLoading(true);

      try {

        const user = auth.currentUser;

        if (!user) {

          setError(
            'Please sign in first to request a verification link.'
          );

          return;
        }

        await sendEmailVerification(user);

        setSuccessMsg(
          'A new verification email has been sent to ' +
          user.email
        );

      } catch (err: any) {

        console.error(err);

        setError(
          err.message ||
          'Failed to resend verification email.'
        );

      } finally {

        setLoading(false);
      }
    };

  // =====================================================
  // BACK FROM VERIFICATION
  // =====================================================

  const handleBackFromVerification =
    async () => {

      setError('');
      setSuccessMsg('');

      await auth.signOut();

      setTab('login');
    };

  // =====================================================
  // FORGOT PASSWORD
  // =====================================================

  const handleForgot = async (
    e: React.FormEvent
  ) => {

    e.preventDefault();

    setError('');
    setSuccessMsg('');

    if (!forgotEmail.trim()) {

      setError(
        'Please enter your email.'
      );

      return;
    }

    setLoading(true);

    try {

      await sendPasswordResetEmail(
        auth,
        forgotEmail.trim()
      );

      setSuccessMsg(
        'Password reset link sent! Check your email inbox.'
      );

    } catch (err: any) {

      console.error(err);

      if (
        err.code === 'auth/user-not-found'
      ) {

        setError(
          'No account found with this email.'
        );

      } else {

        setError(
          err.message ||
          'Failed to send reset email.'
        );
      }

    } finally {

      setLoading(false);
    }
  };

  // =====================================================
  // GOOGLE LOGIN
  // =====================================================

  const handleGoogleLogin =
    async () => {

      setError('');
      setSuccessMsg('');
      setLoading(true);

      const provider =
        new GoogleAuthProvider();

      try {

        const result =
          await signInWithPopup(
            auth,
            provider
          );

        let profile =
          await getUserProfile(
            result.user.uid
          );

        if (!profile) {

          profile =
            await createUserProfile(
              result.user.uid,
              {
                name:
                  result.user.displayName ||
                  'Google User',

                email:
                  result.user.email ||
                  '',

                phone:
                  result.user.phoneNumber ||
                  ''
              }
            );
        }

        onSuccess(profile);
        onClose();

      } catch (err: any) {

        console.error(
          'Google Sign-In Error:',
          err
        );

        if (
          err.code ===
          'auth/unauthorized-domain'
        ) {

          setError(
            'Unauthorized Domain. Please check Firebase Authentication → Settings → Authorized Domains.'
          );

        } else if (
          err.code !==
          'auth/popup-closed-by-user'
        ) {

          setError(
            'Google authentication failed: ' +
            (err.message ||
              err.code ||
              err)
          );
        }

      } finally {

        setLoading(false);
      }
    };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[#000]/80 z-[1000] flex items-center justify-center p-4 backdrop-blur-md">

      <motion.div
        initial={{
          opacity: 0,
          scale: 0.95,
          y: 15
        }}
        animate={{
          opacity: 1,
          scale: 1,
          y: 0
        }}
        className="bg-[#071628] border border-[#0d2d50] rounded-2xl p-6 w-full max-w-[460px] relative shadow-2xl shadow-[#1a6fff]/10"
      >

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#7da3cc] hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        {/* TABS */}

        {tab !== 'forgot' &&
          tab !== 'verification_pending' && (

          <div className="flex bg-[#040f1e] rounded-xl p-1 mb-6 border border-[#0d2d50] gap-1">

            <button
              onClick={() =>
                setTab('login')
              }
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold ${
                tab === 'login'
                  ? 'bg-[#1a6fff] text-white'
                  : 'text-[#7da3cc]'
              }`}
            >
              Login
            </button>

            <button
              onClick={() =>
                setTab('signup')
              }
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold ${
                tab === 'signup'
                  ? 'bg-[#1a6fff] text-white'
                  : 'text-[#7da3cc]'
              }`}
            >
              Sign Up
            </button>

          </div>
        )}

        <AnimatePresence mode="wait">

          {/* ================= LOGIN ================= */}

          {tab === 'login' && (

            <motion.div
              key="login"
              initial={{
                opacity: 0,
                x: -10
              }}
              animate={{
                opacity: 1,
                x: 0
              }}
            >

              <div className="text-center mb-6">

                <div className="text-4xl mb-3">
                  🔐
                </div>

                <h2 className="font-syne text-xl font-bold text-white">
                  Welcome Back
                </h2>

                <p className="text-[#7da3cc] text-xs mt-1">
                  Access your assignments and rewards
                </p>

              </div>

              <form
                onSubmit={handleLogin}
                className="space-y-4"
              >

                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) =>
                    setLoginEmail(e.target.value)
                  }
                  placeholder="Enter your email"
                  className="w-full bg-[#0a1f38] border border-[#0d2d50] rounded-xl py-3 px-4 text-white"
                />

                <div className="relative">

                  <input
                    type={
                      showPassword
                        ? 'text'
                        : 'password'
                    }
                    value={loginPassword}
                    onChange={(e) =>
                      setLoginPassword(e.target.value)
                    }
                    placeholder="Enter your password"
                    className="w-full bg-[#0a1f38] border border-[#0d2d50] rounded-xl py-3 px-4 pr-12 text-white"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(
                        !showPassword
                      )
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7da3cc]"
                  >
                    {showPassword
                      ? <EyeOff />
                      : <Eye />}
                  </button>

                </div>

                <button
                  type="button"
                  onClick={() =>
                    setTab('forgot')
                  }
                  className="text-[#1a6fff] text-xs"
                >
                  Forgot password?
                </button>

                {error && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#1a6fff] text-white py-3 rounded-xl font-semibold disabled:opacity-50"
                >
                  {loading
                    ? 'Logging in...'
                    : 'Login'}
                </button>

              </form>

            </motion.div>
          )}

          {/* ================= SIGN UP ================= */}

          {tab === 'signup' && (

            <motion.div
              key="signup"
              initial={{
                opacity: 0,
                x: 10
              }}
              animate={{
                opacity: 1,
                x: 0
              }}
            >

              <div className="text-center mb-5">

                <div className="text-4xl mb-3">
                  ✨
                </div>

                <h2 className="font-syne text-xl font-bold text-white">
                  Create Account
                </h2>

                <p className="text-[#7da3cc] text-xs mt-1">
                  Create your Assign Me account
                </p>

              </div>

              <form
                onSubmit={handleSignup}
                className="space-y-3.5"
              >

                <input
                  type="text"
                  value={suName}
                  onChange={(e) =>
                    setSuName(e.target.value)
                  }
                  placeholder="Your full name"
                  required
                  className="w-full bg-[#0a1f38] border border-[#0d2d50] rounded-xl py-2.5 px-4 text-white"
                />

                <input
                  type="email"
                  value={suEmail}
                  onChange={(e) =>
                    setSuEmail(e.target.value)
                  }
                  placeholder="Your email address"
                  required
                  className="w-full bg-[#0a1f38] border border-[#0d2d50] rounded-xl py-2.5 px-4 text-white"
                />

                <input
                  type="tel"
                  value={suPhone}
                  onChange={(e) =>
                    setSuPhone(e.target.value)
                  }
                  placeholder="+91 WhatsApp Number"
                  className="w-full bg-[#0a1f38] border border-[#0d2d50] rounded-xl py-2.5 px-4 text-white"
                />

                <div className="relative">

                  <input
                    type={
                      showPassword
                        ? 'text'
                        : 'password'
                    }
                    value={suPassword}
                    onChange={(e) => {

                      setSuPassword(
                        e.target.value
                      );

                      checkPwdStrength(
                        e.target.value
                      );
                    }}
                    placeholder="Minimum 6 characters"
                    required
                    className="w-full bg-[#0a1f38] border border-[#0d2d50] rounded-xl py-2.5 px-4 pr-12 text-white"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(
                        !showPassword
                      )
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7da3cc]"
                  >
                    {showPassword
                      ? <EyeOff />
                      : <Eye />}
                  </button>

                </div>

                {suPassword && (

                  <div>

                    <div className="h-1 w-full bg-[#0d2d50] rounded-full overflow-hidden">

                      <div
                        className={`h-full transition-all ${
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
                      />

                    </div>

                    <span
                      className={`text-[10px] block text-right ${pwdStrength.color}`}
                    >
                      Password Strength:{' '}
                      {pwdStrength.label}
                    </span>

                  </div>
                )}

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
                  className="w-full bg-[#1a6fff] text-white py-3 rounded-xl font-semibold disabled:opacity-50"
                >
                  {loading
                    ? 'Creating account...'
                    : 'Register Account'}
                </button>

              </form>

            </motion.div>
          )}

          {/* ================= FORGOT ================= */}

          {tab === 'forgot' && (

            <motion.div
              key="forgot"
              initial={{
                opacity: 0,
                scale: 0.95
              }}
              animate={{
                opacity: 1,
                scale: 1
              }}
            >

              <div className="text-center mb-6">

                <div className="text-4xl mb-3">
                  🔑
                </div>

                <h2 className="font-syne text-xl font-bold text-white">
                  Reset Password
                </h2>

              </div>

              <form
                onSubmit={handleForgot}
                className="space-y-4"
              >

                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) =>
                    setForgotEmail(
                      e.target.value
                    )
                  }
                  placeholder="Your registered email"
                  required
                  className="w-full bg-[#0a1f38] border border-[#0d2d50] rounded-xl py-3 px-4 text-white"
                />

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

                <div className="flex gap-2">

                  <button
                    type="button"
                    onClick={() =>
                      setTab('login')
                    }
                    className="flex-1 border border-[#0d2d50] text-[#7da3cc] py-3 rounded-xl"
                  >
                    Back
                  </button>

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-[1.5] bg-[#1a6fff] text-white py-3 rounded-xl"
                  >
                    {loading
                      ? 'Sending...'
                      : 'Send Reset Link'}
                  </button>

                </div>

              </form>

            </motion.div>
          )}

          {/* ================= VERIFICATION ================= */}

          {tab === 'verification_pending' && (

            <motion.div
              key="verification_pending"
              initial={{
                opacity: 0,
                scale: 0.95
              }}
              animate={{
                opacity: 1,
                scale: 1
              }}
              className="text-center py-2"
            >

              <div className="text-4xl mb-4">
                📧
              </div>

              <h2 className="font-syne text-xl font-bold text-white mb-2">
                Verify Your Email
              </h2>

              <p className="text-[#7da3cc] text-xs leading-relaxed mb-6">
                We've sent a verification link to{' '}
                <strong className="text-white">
                  {suEmail || loginEmail}
                </strong>.
              </p>

              {error && (
                <div className="p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                  {error}
                </div>
              )}

              {successMsg && (
                <div className="p-3 mb-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs">
                  {successMsg}
                </div>
              )}

              <div className="space-y-3">

                <button
                  onClick={
                    handleCheckEmailVerified
                  }
                  disabled={loading}
                  className="w-full bg-[#1a6fff] text-white py-3 rounded-xl font-semibold"
                >
                  <CheckCircle className="inline w-4 h-4 mr-2" />
                  I've Clicked & Confirmed
                </button>

                <div className="flex gap-2">

                  <button
                    type="button"
                    onClick={
                      handleBackFromVerification
                    }
                    className="flex-1 border border-[#0d2d50] text-[#7da3cc] py-2.5 rounded-xl"
                  >
                    <ArrowLeft className="inline w-3 h-3 mr-1" />
                    Back to Login
                  </button>

                  <button
                    type="button"
                    onClick={
                      handleResendVerification
                    }
                    disabled={loading}
                    className="flex-1 border border-[#0d2d50] text-[#7da3cc] py-2.5 rounded-xl"
                  >
                    <RefreshCw className="inline w-3 h-3 mr-1" />
                    Resend Email
                  </button>

                </div>

              </div>

            </motion.div>
          )}

        </AnimatePresence>

        {/* GOOGLE */}

        {tab !== 'forgot' &&
          tab !== 'verification_pending' && (

          <div className="mt-5 border-t border-[#0d2d50]/70 pt-5">

            <button
              onClick={handleGoogleLogin}
              type="button"
              className="w-full bg-[#0a1f38] border border-[#0d2d50] text-white py-2.5 rounded-xl text-sm font-medium"
            >
              Google Account
            </button>

          </div>
        )}

      </motion.div>
    </div>
  );
}