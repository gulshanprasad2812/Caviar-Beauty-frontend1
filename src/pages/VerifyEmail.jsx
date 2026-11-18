import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiMail, FiCheck, FiRefreshCw, FiPhone } from 'react-icons/fi';
import { useQuery } from '@tanstack/react-query';
import api from '@/utils/api';
import { useAuthStore } from '@/store/authStore';
import { loadFirebaseAuth } from '@/utils/firebase';
import toast from 'react-hot-toast';
import PageTransition from '@/components/layout/PageTransition';
import { useSeo } from '@/hooks/useSeo';

export default function VerifyEmail() {
  useSeo('Verify Email', 'Confirm your email address to finish setting up your account.');
  const navigate = useNavigate();
  const { user, isAuthenticated, verifyEmailOtp, sendPhoneOtp, verifyPhoneOtp } = useAuthStore();
  const [otp, setOtp] = useState('');
  const [phone, setPhone] = useState(user?.phone || '');
  const [phoneOtp, setPhoneOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [resent, setResent] = useState(false);
  const [phoneSent, setPhoneSent] = useState(false);

  // Firebase hands back a confirmation handle that must be reused when checking
  // the code, and the invisible reCAPTCHA has to live on a real DOM node.
  const confirmationRef = useRef(null);
  const recaptchaRef = useRef(null);
  const recaptchaContainerRef = useRef(null);

  // Which channels can actually deliver a code on this deployment.
  const { data: config, isLoading: configLoading } = useQuery({
    queryKey: ['verification-config'],
    queryFn: () => api.get('/auth/verification/config').then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const usingFirebase = config?.sms?.provider === 'firebase';

  const resetRecaptcha = () => {
    try { recaptchaRef.current?.clear?.(); } catch { /* already gone */ }
    recaptchaRef.current = null;
  };

  useEffect(() => {
    if (!isAuthenticated) navigate('/login');
  }, [isAuthenticated, navigate]);

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await verifyEmailOtp(otp);
      toast.success('Email verified!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);
    try {
      await api.post('/auth/resend-otp', { email: user.email });
      setResent(true);
      toast.success('New verification code sent');
      setTimeout(() => setResent(false), 30000);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to resend code');
    } finally {
      setLoading(false);
    }
  };

  const handleSendPhone = async (e) => {
    e.preventDefault();
    setPhoneLoading(true);
    try {
      if (usingFirebase) {
        const loaded = await loadFirebaseAuth(config?.sms?.firebase);
        if (!loaded) throw new Error('Firebase is not configured on this deployment');
        const { auth, api: authApi } = loaded;
        const e164 = phone.replace(/[^\d+]/g, '');
        if (!recaptchaRef.current) {
          recaptchaRef.current = new authApi.RecaptchaVerifier(auth, recaptchaContainerRef.current, { size: 'invisible' });
        }
        const confirmation = await authApi.signInWithPhoneNumber(auth, e164, recaptchaRef.current);
        confirmationRef.current = confirmation;
        // Store the number against the account so verifying it can mark the right one.
        await sendPhoneOtp(e164).catch(() => {});
        setPhoneSent(true);
        toast.success('Code sent by SMS');
      } else {
        const result = await sendPhoneOtp(phone);
        setPhoneSent(true);
        if (result?.smsSent) toast.success('Code sent by SMS');
        else toast.success('Code generated — SMS is not configured on this deployment, see the server log.');
      }
    } catch (err) {
      resetRecaptcha();
      confirmationRef.current = null;
      toast.error(err.response?.data?.error || err.message || 'Failed to send SMS code');
    } finally {
      setPhoneLoading(false);
    }
  };

  const handleVerifyPhone = async (e) => {
    e.preventDefault();
    setPhoneLoading(true);
    try {
      if (usingFirebase) {
        if (!confirmationRef.current) throw new Error('Please request a new code');
        const credential = await confirmationRef.current.confirm(phoneOtp);
        const idToken = await credential.user.getIdToken();
        await verifyPhoneOtp({ idToken });
      } else {
        await verifyPhoneOtp(phoneOtp);
      }
      toast.success('Phone number verified!');
      setPhoneSent(false);
      setPhoneOtp('');
      confirmationRef.current = null;
      resetRecaptcha();
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Invalid code');
    } finally {
      setPhoneLoading(false);
    }
  };

  const handleUseDifferentNumber = () => {
    setPhoneSent(false);
    setPhoneOtp('');
    confirmationRef.current = null;
    resetRecaptcha();
  };

  if (!user) return null;

  const emailConfigured = config?.email?.configured;
  const smsConfigured = config?.sms?.configured;

  return (
    <PageTransition>
      <div className="min-h-screen flex pt-20 md:pt-24">
        <div className="w-full flex items-center justify-center px-6 py-12">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md text-center">
            <div className="w-16 h-16 bg-gold-100 dark:bg-gold-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <FiMail className="w-8 h-8 text-gold-500" />
            </div>
            <h1 className="font-serif text-3xl mb-2">Verify Your Account</h1>
            <p className="text-caviar-500 dark:text-caviar-400 mb-2">We sent a 6-digit code to</p>
            <p className="font-medium text-lg mb-8">{user.email}</p>

            <form onSubmit={handleVerify} className="space-y-6">
              <div>
                <input type="text" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} className="input-field text-center tracking-[12px] font-mono text-2xl" placeholder="000000" maxLength={6} required />
              </div>
              <button type="submit" disabled={loading || otp.length !== 6} className="btn-primary w-full text-xs"><FiCheck className="inline mr-2" />{loading ? 'Verifying...' : 'Verify Email'}</button>
            </form>
            <button onClick={handleResend} disabled={loading || resent} className="mt-6 text-sm text-gold-500 hover:text-gold-600 flex items-center justify-center mx-auto"><FiRefreshCw className={`mr-2 ${resent ? 'animate-spin' : ''}`} />{resent ? 'Code sent' : 'Resend code'}</button>

            {emailConfigured === false && (
              <div className="mt-6 p-4 border border-amber-400 bg-amber-50 text-amber-900 text-left">
                <p className="text-sm font-medium">Email delivery is not configured on this deployment.</p>
                <p className="text-xs mt-2 leading-relaxed">
                  Set SMTP_HOST / SMTP_USER / SMTP_PASS on the server (Gmail requires an App Password). Until then the verification code is printed in the backend log. See EMAIL_OTP_SETUP.md.
                </p>
              </div>
            )}

            <div className="mt-10 pt-8 border-t border-caviar-200 dark:border-caviar-800 text-left">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <FiPhone className="w-4 h-4 text-gold-500 mr-2" />
                  <span className="text-sm font-medium">Phone verification</span>
                </div>
                {user.phoneVerified ? (
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1">Verified</span>
                ) : (
                  <span className="text-xs bg-caviar-100 dark:bg-caviar-800 text-caviar-600 dark:text-caviar-300 px-2 py-1">Not verified</span>
                )}
              </div>

              {user.phoneVerified ? (
                <p className="text-xs text-caviar-500">Your phone number {user.phone} is verified.</p>
              ) : !phoneSent ? (
                <form onSubmit={handleSendPhone} className="space-y-3">
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="input-field" placeholder="+91 98765 43210" required />
                  <button type="submit" disabled={phoneLoading || configLoading || phone.replace(/\D/g, '').length < 10} className="btn-primary w-full text-xs">{phoneLoading ? 'Sending...' : 'Send code by SMS'}</button>
                  {smsConfigured === false && (
                    <p className="text-xs text-amber-700">
                      SMS is not configured on this deployment. Add FIREBASE_API_KEY + FIREBASE_PROJECT_ID (free) or the TWILIO_* variables on the server; until then the code is only logged.
                    </p>
                  )}
                  {/* Invisible reCAPTCHA anchor required by Firebase Phone Auth. */}
                  <div ref={recaptchaContainerRef} />
                </form>
              ) : (
                <form onSubmit={handleVerifyPhone} className="space-y-3">
                  <input type="text" value={phoneOtp} onChange={(e) => setPhoneOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} className="input-field text-center tracking-[12px] font-mono text-xl" placeholder="000000" maxLength={6} required />
                  <button type="submit" disabled={phoneLoading || phoneOtp.length !== 6} className="btn-primary w-full text-xs">{phoneLoading ? 'Verifying...' : 'Verify Phone'}</button>
                  <button type="button" onClick={handleUseDifferentNumber} className="w-full text-xs text-gold-500 hover:text-gold-600">Use a different number</button>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </PageTransition>
  );
}
