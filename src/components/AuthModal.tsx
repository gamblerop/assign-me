import React, { useEffect, useState } from 'react';

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
} from 'firebase/auth';

import { httpsCallable } from 'firebase/functions';

import { auth, functions } from '../firebase';

import {
  collection,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  setDoc,
} from 'firebase/firestore';

import { db } from '../firebase';

import {
  createUserProfile,
  getUserProfile,
} from '../services/dbService';

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
  CheckCircle,
  ShieldCheck,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (profile: any) => void;
}

type AuthTab =
  | 'login'
  | 'signup'
  | 'forgot'
  | 'verification_pending'
  | 'admin_otp';

const ADMIN_EMAIL = 'gamblerop18@gmail.com';

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();

  const data = encoder.encode(
    password + 'assignme-salt-secret-99',
  );

  const hashBuffer = await crypto.subtle.digest(
    'SHA-256',
    data,
  );

  const hashArray = Array.from(
    new Uint8Array(hashBuffer),
  );

  return hashArray
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export default function AuthModal({
  isOpen,
  onClose,
  onSuccess,
}: AuthModalProps) {
  const [tab, setTab] = useState<AuthTab>('login');

  const [registeredProfile, setRegisteredProfile] =
    useState<any>(null);

  const [enteredOtp, setEnteredOtp] = useState('');

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [suName, setSuName] = useState('');
  const [suEmail, setSuEmail] = useState('');
  const [suPhone, setSuPhone] = useState('');
  const [suPassword, setSuPassword] = useState('');

  const [forgotEmail, setForgotEmail] = useState('');

  const [pwdStrength, setPwdStrength] = useState({
    score: 0,
    label: '',
    color: 'text-slate-400',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setError('');
    setSuccessMsg('');
  }, [tab]);

  const resetModalState = () => {
    setTab('login');
    setEnteredOtp('');
    setError('');
    setSuccessMsg('');
    setLoading(false);
  };

  const handleClose = () => {
    resetModalState();
    onClose();
  };

  const checkPwdStrength = (value: string) => {
    let score = 0;

    if (value.length >= 6) score++;
    if (value.length >= 10) score++;
    if (/[A-Z]/.test(value)) score++;
    if (/[0-9]/.test(value)) score++;
    if (/[^a-zA-Z0-9]/.test(value)) score++;

    const levels = [
      {
        score: 0,
        label: '',
        color: 'text-slate-400',
      },
      {
        score: 1,
        label: 'Weak',
        color: 'text-rose-500',
      },
      {
        score: 2,
        label: 'Fair',
        color: 'text-amber-500',
      },
      {
        score: 3,
        label: 'Good',
        color: 'text-yellow-500',
      },
      {
        score: 4,
        label: 'Strong',
        color: 'text-lime-500',
      },
      {
        score: 5,
        label: 'Excellent',
        color: 'text-emerald-500',
      },
    ];

    setPwdStrength(levels[Math.min(score, 5)]);
  };

  const completeLogin = (profile: any) => {
    setSuccessMsg('Logged in successfully! Welcome back.');

    setTimeout(() => {
      onSuccess(profile);
      handleClose();
    }, 700);
  };

  const handleLogin = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setError('');
    setSuccessMsg('');

    const email = loginEmail.trim().toLowerCase();

    if (!email) {
      setError('Please enter your email address.');
      return;
    }

    if (!loginPassword && email !== ADMIN_EMAIL) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);

    try {
      /*
       * Admin login:
       * The OTP is generated and emailed by the Firebase Cloud Function.
       * Never generate or verify the admin OTP in the browser.
       */
      if (email === ADMIN_EMAIL) {
        const sendAdminOTP = httpsCallable<
          { email: string },
          { success: boolean; message?: string }
        >(functions, 'sendAdminOTP');

        const result = await sendAdminOTP({
          email,
        });

        if (!result.data.success) {
          throw new Error(
            result.data.message ||
              'Unable to send the administrator OTP.',
          );
        }

        setRegisteredProfile({
          id: 'admin-uid',
          name: 'Super Administrator',
          email: ADMIN_EMAIL,
          phone: '+919999999999',
          role: 'admin',
          points: 9999,
          ordersCount: 99,
        });

        setEnteredOtp('');
        setTab('admin_otp');

        setSuccessMsg(
          'A secure administrator OTP has been sent to your email.',
        );

        return;
      }

      const userCredential =
        await signInWithEmailAndPassword(
          auth,
          email,
          loginPassword,
        );

      const user = userCredential.user;

      if (!user.emailVerified) {
        const profile = await getUserProfile(user.uid);

        setRegisteredProfile(profile);
        setSuEmail(user.email || email);
        setTab('verification_pending');

        return;
      }

      let profile = await getUserProfile(user.uid);

      if (!profile) {
        profile = await createUserProfile(user.uid, {
          name: user.displayName || 'User',
          email: user.email || email,
          phone: user.phoneNumber || '',
        });
      }

      completeLogin(profile);
    } catch (firebaseError: any) {
      console.warn(
        'Firebase login failed. Trying legacy login fallback.',
        firebaseError,
      );

      try {
        const emailQuery = query(
          collection(db, 'users'),
          where('email', '==', email),
        );

        const snapshot = await getDocs(emailQuery);

        if (snapshot.empty) {
          setError(
            firebaseError?.message ||
              'Incorrect email or password.',
          );

          return;
        }

        const userDoc = snapshot.docs[0];
        const profile = userDoc.data();

        if (!profile.passwordHash) {
          setError(
            'This account uses Google Sign-In. Please continue with Google.',
          );

          return;
        }

        const enteredHash = await hashPassword(
          loginPassword,
        );

        if (enteredHash !== profile.passwordHash) {
          setError('Incorrect email or password.');
          return;
        }

        try {
          const migratedCredential =
            await createUserWithEmailAndPassword(
              auth,
              email,
              loginPassword,
            );

          const migratedUser = migratedCredential.user;

          const migratedProfile = {
            ...profile,
            id: migratedUser.uid,
          };

          delete migratedProfile.passwordHash;

          await setDoc(
            doc(db, 'users', migratedUser.uid),
            migratedProfile,
          );

          completeLogin(migratedProfile);
        } catch (migrationError) {
          console.error(
            'Legacy account migration failed:',
            migrationError,
          );

          const clientProfile = {
            ...profile,
          };

          delete clientProfile.passwordHash;

          completeLogin(clientProfile);
        }
      } catch (fallbackError: any) {
        console.error('Legacy login failed:', fallbackError);

        setError(
          firebaseError?.message ||
            fallbackError?.message ||
            'Login failed. Please try again.',
        );
      }
    } finally {
      setLoading(false);
    }
  };
const handleSignup = async (
  event: React.FormEvent<HTMLFormElement>,
) => {
  event.preventDefault();

  setError('');
  setSuccessMsg('');

  const name = suName.trim();
  const email = suEmail.trim().toLowerCase();
  const phone = suPhone.trim();

  if (!name || !email || !suPassword) {
    setError('Please fill in all required fields.');
    return;
  }

  if (suPassword.length < 6) {
    setError('Password must be at least 6 characters.');
    return;
  }

  setLoading(true);

  try {
    // Create the Firebase Authentication account first.
    // Do not read the users collection before authentication.
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      suPassword,
    );

    const user = userCredential.user;

    // Update the Firebase Auth display name.
    await import('firebase/auth').then(({ updateProfile }) =>
      updateProfile(user, {
        displayName: name,
      }),
    );

    // Send verification email.
    try {
      await sendEmailVerification(user);
    } catch (verificationError) {
      console.warn(
        'Verification email could not be sent:',
        verificationError,
      );
    }

    // Now the user is authenticated, so Firestore rules allow
    // creation of users/{user.uid}.
    const profile = await createUserProfile(user.uid, {
      name,
      email,
      phone,
    });

    setRegisteredProfile(profile);
    setSuEmail(email);
    setTab('verification_pending');

    setSuccessMsg(
      'Account created successfully. Please verify your email.',
    );
  } catch (signupError: any) {
    console.error('Signup error code:', signupError?.code);
    console.error('Signup error message:', signupError?.message);
    console.error('Full signup error:', signupError);

    if (signupError?.code === 'auth/email-already-in-use') {
      setError('An account with this email already exists.');
    } else if (signupError?.code === 'auth/invalid-email') {
      setError('Please enter a valid email address.');
    } else if (signupError?.code === 'auth/weak-password') {
      setError('Please choose a stronger password.');
    } else if (signupError?.code === 'permission-denied') {
      setError(
        'Account created, but the profile could not be saved. Check Firestore Rules.',
      );
    } else {
      setError(
        signupError?.message || 'Registration failed.',
      );
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

      if (!user) {
        setError(
          'No active session found. Please log in again.',
        );
        return;
      }

      await user.reload();

      if (!user.emailVerified) {
        setError(
          `Email not verified yet. Please check ${user.email}.`,
        );
        return;
      }

      let profile = registeredProfile;

      if (!profile) {
        profile = await getUserProfile(user.uid);
      }

      if (!profile) {
        profile = await createUserProfile(user.uid, {
          name: suName || user.displayName || 'User',
          email: user.email || suEmail,
          phone: suPhone,
        });
      }

      setSuccessMsg(
        'Email verified successfully. Welcome to Assign Me!',
      );

      setTimeout(() => {
        onSuccess(profile);
        handleClose();
      }, 700);
    } catch (verificationError: any) {
      console.error(
        'Email verification check failed:',
        verificationError,
      );

      setError(
        verificationError.message ||
          'Verification check failed.',
      );
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

      if (!user) {
        setError(
          'Please log in first to request a verification email.',
        );
        return;
      }

      await sendEmailVerification(user);

      setSuccessMsg(
        `A new verification email was sent to ${user.email}.`,
      );
    } catch (resendError: any) {
      console.error(
        'Resend verification failed:',
        resendError,
      );

      setError(
        resendError.message ||
          'Failed to resend verification email.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBackFromVerification = async () => {
    setError('');
    setSuccessMsg('');

    try {
      await signOut(auth);
    } catch (signOutError) {
      console.error('Sign out failed:', signOutError);
    }

    setTab('login');
  };

  const handleVerifyAdminOtp = async () => {
    setError('');
    setSuccessMsg('');

    if (!/^\d{6}$/.test(enteredOtp)) {
      setError('Please enter a valid 6-digit OTP.');
      return;
    }

    setLoading(true);

    try {
      /*
       * The Cloud Function must verify the OTP server-side.
       * It should return a Firebase custom token after successful verification.
       */
      const verifyAdminOTP = httpsCallable<
        { email: string; otp: string },
        {
          success: boolean;
          customToken?: string;
          message?: string;
        }
      >(functions, 'verifyAdminOTP');

      const result = await verifyAdminOTP({
        email: ADMIN_EMAIL,
        otp: enteredOtp,
      });

      if (!result.data.success) {
        throw new Error(
          result.data.message ||
            'Incorrect or expired administrator OTP.',
        );
      }

      if (!result.data.customToken) {
        throw new Error(
          'The server did not return an administrator token.',
        );
      }

      const adminCredential = await import(
        'firebase/auth'
      ).then(({ signInWithCustomToken }) =>
        signInWithCustomToken(
          auth,
          result.data.customToken as string,
        ),
      );

      const adminUser = adminCredential.user;

      const adminProfile = {
        id: adminUser.uid,
        name: 'Super Administrator',
        email: ADMIN_EMAIL,
        phone: '+919999999999',
        role: 'admin',
        points: 9999,
        ordersCount: 99,
        joined: new Date().toISOString().split('T')[0],
      };

      await setDoc(
        doc(db, 'users', adminUser.uid),
        adminProfile,
        { merge: true },
      );

      setSuccessMsg(
        'Administrator identity verified. Access granted.',
      );

      setTimeout(() => {
        onSuccess(adminProfile);
        handleClose();
      }, 700);
    } catch (otpError: any) {
      console.error(
        'Administrator OTP verification failed:',
        otpError,
      );

      setError(
        otpError.message ||
          'OTP verification failed. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setError('');
    setSuccessMsg('');

    const email = forgotEmail.trim().toLowerCase();

    if (!email) {
      setError('Please enter your email address.');
      return;
    }

    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);

      setSuccessMsg(
        'Password reset link sent. Please check your inbox.',
      );
    } catch (forgotError: any) {
      console.error(
        'Password reset failed:',
        forgotError,
      );

      if (
        forgotError.code === 'auth/user-not-found'
      ) {
        setError('No account was found with this email.');
      } else {
        setError(
          forgotError.message ||
            'Failed to send password reset email.',
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const provider = new GoogleAuthProvider();

      const result = await signInWithPopup(
        auth,
        provider,
      );

      let profile = await getUserProfile(
        result.user.uid,
      );

      if (!profile) {
        profile = await createUserProfile(
          result.user.uid,
          {
            name: result.user.displayName || 'Google User',
            email: result.user.email || '',
            phone: result.user.phoneNumber || '',
          },
        );
      }

      onSuccess(profile);
      handleClose();
    } catch (googleError: any) {
      console.error(
        'Google Sign-In Error:',
        googleError,
      );

      if (
        googleError.code === 'auth/unauthorized-domain'
      ) {
        setError(
          'Unauthorized domain. Add assign-me-rho.vercel.app in Firebase Authentication > Settings > Authorized domains.',
        );
      } else if (
        googleError.code !== 'auth/popup-closed-by-user'
      ) {
        setError(
          googleError.message ||
            'Google authentication failed.',
        );
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <motion.div
        initial={{
          opacity: 0,
          scale: 0.95,
          y: 15,
        }}
        animate={{
          opacity: 1,
          scale: 1,
          y: 0,
        }}
        exit={{
          opacity: 0,
          scale: 0.95,
          y: 15,
        }}
        className="relative max-h-[90vh] w-full max-w-[460px] overflow-y-auto rounded-2xl border border-[#0d2d50] bg-[#071628] p-6 shadow-2xl"
      >
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-4 top-4 text-[#7da3cc] transition-colors hover:text-white"
          aria-label="Close authentication modal"
        >
          <X className="h-5 w-5" />
        </button>

        {tab !== 'forgot' &&
          tab !== 'verification_pending' &&
          tab !== 'admin_otp' && (
            <div className="mb-6 flex gap-1 rounded-xl border border-[#0d2d50] bg-[#040f1e] p-1">
              <button
                type="button"
                onClick={() => setTab('login')}
                className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition ${
                  tab === 'login'
                    ? 'bg-[#1a6fff] text-white'
                    : 'text-[#7da3cc] hover:text-white'
                }`}
              >
                Login
              </button>

              <button
                type="button"
                onClick={() => setTab('signup')}
                className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition ${
                  tab === 'signup'
                    ? 'bg-[#1a6fff] text-white'
                    : 'text-[#7da3cc] hover:text-white'
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
            >
              <div className="mb-6 text-center">
                <div className="mb-3 flex justify-center text-4xl">
                  🔐
                </div>

                <h2 className="font-syne text-xl font-bold text-white">
                  Welcome Back
                </h2>

                <p className="mt-1 text-xs text-[#7da3cc]">
                  Access your assignments and rewards
                </p>
              </div>

              <form
                onSubmit={handleLogin}
                className="space-y-4"
              >
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#7da3cc]">
                    Email Address
                  </label>

                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7da3cc]" />

                    <input
                      type="email"
                      value={loginEmail}
                      onChange={(event) =>
                        setLoginEmail(event.target.value)
                      }
                      placeholder="Enter your email"
                      required
                      className="w-full rounded-xl border border-[#0d2d50] bg-[#0a1f38] py-2.5 pl-11 pr-4 text-sm text-[#e8f0fe] outline-none focus:border-[#1a6fff]"
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-1.5 flex justify-between">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#7da3cc]">
                      Password
                    </label>

                    <button
                      type="button"
                      onClick={() => setTab('forgot')}
                      className="text-xs text-[#1a6fff] hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>

                  <div className="relative">
                    <Key className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7da3cc]" />

                    <input
                      type={
                        showPassword ? 'text' : 'password'
                      }
                      value={loginPassword}
                      onChange={(event) =>
                        setLoginPassword(event.target.value)
                      }
                      placeholder="Enter your password"
                      className="w-full rounded-xl border border-[#0d2d50] bg-[#0a1f38] py-2.5 pl-11 pr-11 text-sm text-[#e8f0fe] outline-none focus:border-[#1a6fff]"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword((value) => !value)
                      }
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#7da3cc] hover:text-white"
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
                    {error}
                  </div>
                )}

                {successMsg && (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-400">
                    {successMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1a6fff] py-3 text-sm font-semibold text-white shadow-lg shadow-[#1a6fff]/20 transition hover:bg-[#1558cc] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? (
                    'Logging in...'
                  ) : (
                    <>
                      <LogIn className="h-4 w-4" />
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
            >
              <div className="mb-5 text-center">
                <div className="mb-3 flex justify-center text-4xl">
                  ✨
                </div>

                <h2 className="font-syne text-xl font-bold text-white">
                  Create Account
                </h2>

                <p className="mt-1 text-xs text-[#7da3cc]">
                  Get +50 signup reward points instantly
                </p>
              </div>

              <form
                onSubmit={handleSignup}
                className="space-y-3.5"
              >
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#7da3cc]">
                    Full Name
                  </label>

                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7da3cc]" />

                    <input
                      type="text"
                      value={suName}
                      onChange={(event) =>
                        setSuName(event.target.value)
                      }
                      placeholder="Your full name"
                      required
                      className="w-full rounded-xl border border-[#0d2d50] bg-[#0a1f38] py-2.5 pl-11 pr-4 text-sm text-[#e8f0fe] outline-none focus:border-[#1a6fff]"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#7da3cc]">
                    Email Address
                  </label>

                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7da3cc]" />

                    <input
                      type="email"
                      value={suEmail}
                      onChange={(event) =>
                        setSuEmail(event.target.value)
                      }
                      placeholder="Your email address"
                      required
                      className="w-full rounded-xl border border-[#0d2d50] bg-[#0a1f38] py-2.5 pl-11 pr-4 text-sm text-[#e8f0fe] outline-none focus:border-[#1a6fff]"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#7da3cc]">
                    Phone Number
                  </label>

                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7da3cc]" />

                    <input
                      type="tel"
                      value={suPhone}
                      onChange={(event) =>
                        setSuPhone(event.target.value)
                      }
                      placeholder="+91 WhatsApp Number"
                      className="w-full rounded-xl border border-[#0d2d50] bg-[#0a1f38] py-2.5 pl-11 pr-4 text-sm text-[#e8f0fe] outline-none focus:border-[#1a6fff]"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#7da3cc]">
                    Create Password
                  </label>

                  <div className="relative">
                    <Key className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7da3cc]" />

                    <input
                      type={
                        showPassword ? 'text' : 'password'
                      }
                      value={suPassword}
                      onChange={(event) => {
                        setSuPassword(event.target.value);
                        checkPwdStrength(event.target.value);
                      }}
                      placeholder="Minimum 6 characters"
                      required
                      className="w-full rounded-xl border border-[#0d2d50] bg-[#0a1f38] py-2.5 pl-11 pr-11 text-sm text-[#e8f0fe] outline-none focus:border-[#1a6fff]"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword((value) => !value)
                      }
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#7da3cc] hover:text-white"
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  {suPassword && (
                    <div className="mt-1.5">
                      <div className="h-1 overflow-hidden rounded-full bg-[#0d2d50]">
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
                        className={`mt-0.5 block text-right text-[10px] font-medium ${pwdStrength.color}`}
                      >
                        Password Strength:{' '}
                        {pwdStrength.label}
                      </span>
                    </div>
                  )}
                </div>

                {error && (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
                    {error}
                  </div>
                )}

                {successMsg && (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-400">
                    {successMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1a6fff] py-3 text-sm font-semibold text-white shadow-lg shadow-[#1a6fff]/20 transition hover:bg-[#1558cc] disabled:opacity-50"
                >
                  {loading ? (
                    'Creating account...'
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
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
            >
              <div className="mb-6 text-center">
                <div className="mb-3 flex justify-center text-4xl">
                  🔑
                </div>

                <h2 className="font-syne text-xl font-bold text-white">
                  Reset Password
                </h2>

                <p className="mt-1 text-xs text-[#7da3cc]">
                  We will send a password reset link
                </p>
              </div>

              <form
                onSubmit={handleForgot}
                className="space-y-4"
              >
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#7da3cc]">
                    Registered Email
                  </label>

                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7da3cc]" />

                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(event) =>
                        setForgotEmail(event.target.value)
                      }
                      placeholder="name@example.com"
                      required
                      className="w-full rounded-xl border border-[#0d2d50] bg-[#0a1f38] py-2.5 pl-11 pr-4 text-sm text-[#e8f0fe] outline-none focus:border-[#1a6fff]"
                    />
                  </div>
                </div>

                {error && (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
                    {error}
                  </div>
                )}

                {successMsg && (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-400">
                    {successMsg}
                  </div>
                )}

                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => setTab('login')}
                    className="flex-1 rounded-xl border border-[#0d2d50] py-3 text-sm font-semibold text-[#7da3cc] hover:text-white"
                  >
                    Back
                  </button>

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-[1.5] rounded-xl bg-[#1a6fff] py-3 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {loading
                      ? 'Sending...'
                      : 'Send Reset Link'}
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
              className="py-2 text-center"
            >
              <div className="mb-4 flex justify-center text-4xl">
                📧
              </div>

              <h2 className="mb-2 font-syne text-xl font-bold text-white">
                Verify Your Email
              </h2>

              <p className="mx-auto mb-6 max-w-[340px] text-xs leading-relaxed text-[#7da3cc]">
                We sent a verification link to{' '}
                <strong className="text-white">
                  {suEmail || loginEmail}
                </strong>
                . Check your inbox and spam folder.
              </p>

              {error && (
                <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-left text-xs text-red-400">
                  {error}
                </div>
              )}

              {successMsg && (
                <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-left text-xs text-emerald-400">
                  {successMsg}
                </div>
              )}

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleCheckEmailVerified}
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1a6fff] py-3 text-sm font-semibold text-white disabled:opacity-50"
                >
                  <CheckCircle className="h-4 w-4" />
                  {loading
                    ? 'Checking...'
                    : "I've Verified My Email"}
                </button>

                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={handleBackFromVerification}
                    className="flex-1 rounded-xl border border-[#0d2d50] py-2.5 text-xs font-semibold text-[#7da3cc] hover:text-white"
                  >
                    <ArrowLeft className="mr-1 inline h-3.5 w-3.5" />
                    Back
                  </button>

                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={loading}
                    className="flex-1 rounded-xl border border-[#0d2d50] py-2.5 text-xs font-semibold text-[#7da3cc] hover:text-white disabled:opacity-50"
                  >
                    <RefreshCw className="mr-1 inline h-3.5 w-3.5" />
                    Resend
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
              className="py-2 text-center"
            >
              <div className="mb-4 flex justify-center text-4xl">
                🛡️
              </div>

              <h2 className="mb-2 font-syne text-xl font-bold text-white">
                Administrator Verification
              </h2>

              <p className="mx-auto mb-6 max-w-[340px] text-xs leading-relaxed text-[#7da3cc]">
                A secure OTP was sent to{' '}
                <strong className="text-white">
                  {ADMIN_EMAIL}
                </strong>
                . Enter the six-digit code to continue.
              </p>

              {error && (
                <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-left text-xs text-red-400">
                  {error}
                </div>
              )}

              {successMsg && (
                <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-left text-xs text-emerald-400">
                  {successMsg}
                </div>
              )}

              <div className="space-y-4">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={enteredOtp}
                  onChange={(event) =>
                    setEnteredOtp(
                      event.target.value.replace(
                        /[^0-9]/g,
                        '',
                      ),
                    )
                  }
                  placeholder="• • • • • •"
                  className="w-full rounded-xl border-2 border-[#0d2d50] bg-[#040f1e] py-3 text-center text-2xl font-bold tracking-[0.5em] text-[#e8f0fe] outline-none focus:border-[#1a6fff]"
                />

                <button
                  type="button"
                  onClick={handleVerifyAdminOtp}
                  disabled={
                    loading || enteredOtp.length !== 6
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1a6fff] py-3 text-sm font-semibold text-white disabled:opacity-50"
                >
                  <ShieldCheck className="h-4 w-4" />
                  {loading
                    ? 'Verifying...'
                    : 'Verify & Enter Admin Portal'}
                </button>

                <button
                  type="button"
                  onClick={handleBackFromVerification}
                  className="w-full rounded-xl border border-[#0d2d50] py-2.5 text-xs font-semibold text-[#7da3cc] hover:text-white"
                >
                  <ArrowLeft className="mr-1 inline h-3.5 w-3.5" />
                  Back to Login
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {tab !== 'forgot' &&
          tab !== 'verification_pending' &&
          tab !== 'admin_otp' && (
            <div className="mt-5 border-t border-[#0d2d50]/70 pt-5">
              <div className="relative mb-4 flex items-center py-2">
                <div className="flex-grow border-t border-[#0d2d50]/40" />

                <span className="mx-4 text-[10px] font-semibold uppercase tracking-wider text-[#7da3cc]">
                  Or Connect With
                </span>

                <div className="flex-grow border-t border-[#0d2d50]/40" />
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="flex w-full items-center justify-center gap-3 rounded-xl border border-[#0d2d50] bg-[#0a1f38] py-2.5 text-sm font-medium text-white transition hover:bg-[#102945] disabled:opacity-50"
              >
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
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