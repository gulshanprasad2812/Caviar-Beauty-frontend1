import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import { formatPrice } from '@/utils/helpers';
import { trackEcommerceEvent } from '@/utils/analytics';
import api from '@/utils/api';
import PageTransition from '@/components/layout/PageTransition';
import PaymentQR from '@/components/checkout/PaymentQR';
import toast from 'react-hot-toast';
import { useSeo } from '@/hooks/useSeo';

const schema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  email: z.string().email(),
  phone: z.string().min(10, 'Enter a valid 10-digit phone number'),
  street: z.string().min(1, 'Required'),
  city: z.string().min(1, 'Required'),
  state: z.string().min(1, 'Required'),
  zipCode: z.string().min(6, 'Enter a valid 6-digit PIN code'),
  country: z.string().min(1),
});

const steps = ['Shipping', 'Payment', 'Review'];

// The Paytm MID is served by POST /api/payments/create-order (and by
// GET /api/payments/config) together with the one-time txnToken. The merchant
// key never reaches the browser. VITE_PAYTM_MID is optional and only a fallback.
const FALLBACK_MID = import.meta.env.VITE_PAYTM_MID || '';
const FALLBACK_SCRIPT_HOST = import.meta.env.VITE_PAYTM_HOST || 'https://securestage.paytmpayments.com';

const paytmScripts = new Map();

/** Loads {HOST}/merchantpgpui/checkoutjs/merchants/{MID}.js once per MID. */
function loadPaytmScript(mid, scriptUrl) {
  if (window.Paytm?.CheckoutJS) return Promise.resolve(window.Paytm);
  const url =
    scriptUrl || `${FALLBACK_SCRIPT_HOST}/merchantpgpui/checkoutjs/merchants/${encodeURIComponent(mid)}.js`;
  if (paytmScripts.has(url)) return paytmScripts.get(url);

  const promise = new Promise((resolve, reject) => {
    const selector = `script[data-paytm-checkout="${url}"]`;
    let script = document.querySelector(selector);

    const ready = () => {
      if (!window.Paytm?.CheckoutJS) return reject(new Error('Paytm Checkout did not initialise'));
      if (typeof window.Paytm.CheckoutJS.onLoad === 'function') {
        window.Paytm.CheckoutJS.onLoad(() => resolve(window.Paytm));
      } else {
        resolve(window.Paytm);
      }
    };

    if (!script) {
      script = document.createElement('script');
      script.src = url;
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.dataset.paytmCheckout = url;
      script.addEventListener('load', ready, { once: true });
      script.addEventListener('error', () => reject(new Error('Failed to load Paytm Checkout')), { once: true });
      document.head.appendChild(script);
    } else {
      ready();
    }
  });

  paytmScripts.set(url, promise);
  return promise;
}

export default function Checkout() {
  useSeo('Checkout', 'Secure checkout with delivery details and payment.');
  const [step, setStep] = useState(0);
  const [placing, setPlacing] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [coupon, setCoupon] = useState(null);
  const [couponError, setCouponError] = useState('');
  const [paySession, setPaySession] = useState(null);
  const [payStage, setPayStage] = useState('idle');
  const [payRetrying, setPayRetrying] = useState(false);
  const items = useCartStore((s) => s.items);
  const total = useCartStore((s) => s.total);
  const cartFetched = useCartStore((s) => s.isFetched);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const authLoading = useAuthStore((s) => s.isLoading);
  const { data: savedAddresses = [] } = useQuery({
    queryKey: ['my-addresses'],
    queryFn: () => api.get('/addresses').then((r) => r.data.addresses || []),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });
  const { data: paymentConfig } = useQuery({
    queryKey: ['payment-config'],
    queryFn: () => api.get('/payments/config').then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });
  const paymentReady = paymentConfig?.configured !== false;
  const dummyMode = paymentConfig?.mode === 'dummy';
  const navigate = useNavigate();
  const idempotencyKey = useRef(crypto.randomUUID());
  const paymentSettled = useRef(false);
  const { register, handleSubmit, formState: { errors }, setValue } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { country: 'India' },
  });

  const shippingCost = total > 5000 ? 0 : 99;
  const tax = total * 0.18;
  const discount = coupon ? Math.min(coupon.discountType === 'percentage' ? total * (coupon.discountValue / 100) : coupon.discountValue, coupon.maxDiscount || Infinity) : 0;
  const grandTotal = total + shippingCost + tax - discount;

  // Shared by the dummy QR flow and the real gateway callback below.
  const finishPayment = (orderId) => {
    if (paymentSettled.current) return;
    paymentSettled.current = true;
    useCartStore.getState().reset();
    trackEcommerceEvent('purchase', {
      items,
      value: grandTotal,
      transaction_id: orderId,
      shipping: shippingCost,
      tax,
      ...(coupon?.code ? { coupon: coupon.code } : {}),
    });
    toast.success('Payment successful! Order confirmed.');
    navigate('/orders/' + orderId + '?payment=success');
  };

  // While the QR is on screen, ask the server whether the phone has paid.
  // The phone is the only place that confirms; this tab only observes.
  useEffect(() => {
    if (!paySession || payStage !== 'waiting') return undefined;
    let cancelled = false;
    const check = async () => {
      try {
        const { data } = await api.get(`/payments/session/${paySession.token}/status`);
        if (cancelled) return;
        if (data.status === 'PAID') {
          setPayStage('paid');
          finishPayment(paySession.orderId);
        } else if (['EXPIRED', 'CANCELLED', 'FAILED'].includes(data.status)) {
          setPayStage(data.status === 'CANCELLED' ? 'cancelled' : 'expired');
        }
      } catch (err) {
        if (!cancelled && err.response?.status === 404) setPayStage('expired');
      }
    };
    const id = setInterval(check, 2000);
    check();
    return () => {
      cancelled = true;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paySession, payStage]);

  // Wait for the session and the cart to load before deciding where to go.
  // Without this a refresh on /checkout lands on /login and then /dashboard.
  if (authLoading) {
    return (
      <PageTransition>
        <div className="pt-32 pb-20 px-4 min-h-screen flex items-center justify-center">
          <span className="w-10 h-10 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </PageTransition>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!cartFetched && !paymentSettled.current) {
    return (
      <PageTransition>
        <div className="pt-32 pb-20 px-4 min-h-screen flex items-center justify-center">
          <span className="w-10 h-10 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </PageTransition>
    );
  }
  if (items.length === 0 && !paymentSettled.current) return <Navigate to="/cart" replace />;

  const applyCoupon = async () => {
    if (!couponCode) return;
    setCouponError('');
    try {
      const { data } = await api.post('/coupons/validate', { code: couponCode, subtotal: total });
      setCoupon(data.coupon);
      toast.success(`Coupon applied: -${formatPrice(data.discount)}`);
    } catch (err) {
      setCoupon(null);
      setCouponError(err.response?.data?.error || 'Invalid coupon');
    }
  };

  const useSavedAddress = (address) => {
    setValue('firstName', address.firstName);
    setValue('lastName', address.lastName);
    setValue('phone', address.phone || '');
    setValue('street', address.street);
    setValue('city', address.city);
    setValue('state', address.state);
    setValue('zipCode', address.zipCode);
    setValue('country', address.country);
    toast.success('Address loaded');
  };

  const placeOrder = async (data) => {
    const { data: address } = await api.post('/addresses', {
      type: 'SHIPPING',
      firstName: data.firstName,
      lastName: data.lastName,
      street: data.street,
      city: data.city,
      state: data.state,
      zipCode: data.zipCode,
      country: data.country || 'India',
      phone: data.phone,
    });

    const { data: order } = await api.post('/orders', {
      shippingAddressId: address.id,
      paymentMethod: 'Paytm',
      couponCode: coupon?.code || undefined,
      idempotencyKey: idempotencyKey.current,
    });

    return order;
  };

  const payWithPaytm = async (orderId) => {
    const { data: gateway } = await api.post('/payments/create-order', { orderId });
    const mid = gateway.mid || FALLBACK_MID;
    if (!mid || !gateway.txnToken) {
      throw new Error('Payment gateway is not configured (missing Paytm MID or transaction token)');
    }

    const Paytm = await loadPaytmScript(mid, gateway.checkoutScriptUrl);

    /** Server-side verification: the browser response alone is never trusted. */
    const confirmPayment = async () => {
      if (paymentSettled.current) return 'paid';
      const { data } = await api.post('/payments/verify', { orderId });
      if (data?.pending) return 'pending';

      finishPayment(orderId);
      return 'paid';
    };

    const config = {
      root: '',
      flow: 'DEFAULT',
      website: gateway.websiteName,
      merchant: {
        mid,
        redirect: false,
      },
      data: {
        orderId: gateway.paytmOrderId,
        token: gateway.txnToken,
        tokenType: 'TXN_TOKEN',
        amount: Number(gateway.amount).toFixed(2),
      },
      handler: {
        transactionStatus: async () => {
          try {
            const state = await confirmPayment();
            if (state === 'pending') {
              toast('Paytm is still confirming this payment. It will appear on your orders page shortly.', {
                icon: '⏳',
              });
              navigate('/orders/' + orderId);
            }
          } catch (err) {
            toast.error(err.response?.data?.error || 'Payment verification failed');
            setPlacing(false);
          }
        },
        notifyMerchant: async (eventName) => {
          if (!['APP_CLOSED', 'SESSION_EXPIRED', 'PAYMENT_FAILED'].includes(eventName)) return;
          try {
            const state = await confirmPayment();
            if (state === 'paid' || state === 'pending') {
              if (state === 'pending') navigate('/orders/' + orderId);
              return;
            }
          } catch {
            // Verification failed: the backend has already cancelled the order.
          }
          setPlacing(false);
          toast.error('Payment was not completed. Your order has not been charged.');
        },
      },
    };

    await new Promise((resolve, reject) => {
      try {
        Paytm.CheckoutJS.onLoad(() => {
          Paytm.CheckoutJS.init(config)
            .then(() => {
              Paytm.CheckoutJS.invoke();
              resolve();
            })
            .catch(reject);
        });
      } catch (err) {
        reject(err);
      }
    });
  };

  const retryDummyPayment = async () => {
    if (!paySession?.orderId) return;
    setPayRetrying(true);
    try {
      const { data } = await api.post('/payments/session', { orderId: paySession.orderId });
      setPaySession(data);
      setPayStage('waiting');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not create a new QR code');
    } finally {
      setPayRetrying(false);
    }
  };

  const onSubmit = async (data) => {
    if (step < 2) {
      if (step === 0) {
        trackEcommerceEvent('add_shipping_info', {
          items,
          value: grandTotal,
          shipping_tier: total > 5000 ? 'free' : 'standard',
        });
      } else if (step === 1) {
        trackEcommerceEvent('add_payment_info', { items, value: grandTotal });
      }
      setStep(step + 1);
      return;
    }
    trackEcommerceEvent('begin_checkout', {
      items,
      value: grandTotal,
      ...(coupon?.code ? { coupon: coupon.code } : {}),
    });
    if (!paymentReady) {
      toast.error('Online payment is not configured yet, so this order cannot be paid. Please contact the store.');
      setStep(1);
      return;
    }
    setPlacing(true);
    try {
      const order = await placeOrder(data);
      if (dummyMode) {
        const { data: session } = await api.post('/payments/session', { orderId: order.id });
        setPaySession(session);
        setPayStage('waiting');
        setPlacing(false);
      } else {
        await payWithPaytm(order.id);
      }
    } catch (err) {
      const message = err.response?.data?.error || err.message || 'Failed to place order. Please try again.';
      toast.error(message);
      setPlacing(false);
    }
  };

  return (
    <PageTransition>
      <div className="pt-24 md:pt-32 pb-20 px-4 md:px-8 lg:px-12 min-h-screen">
        <div className="max-w-[1440px] mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="section-title">Checkout</h1>
            <div className="w-16 h-[1px] bg-gold-500 mt-6 mb-12" />
          </motion.div>

          {/* Progress */}
          <div className="flex items-center mb-12 max-w-2xl">
            {steps.map((s, i) => (
              <div key={s} className="flex items-center flex-1 last:flex-none">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  i <= step ? 'bg-caviar-950 dark:bg-white text-white dark:text-caviar-950' : 'bg-caviar-200 dark:bg-caviar-700 text-caviar-500'
                }`}>{i + 1}</div>
                <span className={`ml-2 text-xs tracking-widest uppercase ${i <= step ? 'text-caviar-950 dark:text-white font-medium' : 'text-caviar-400'}`}>{s}</span>
                {i < steps.length - 1 && <div className={`flex-1 h-[1px] mx-4 ${i < step ? 'bg-caviar-950 dark:bg-white' : 'bg-caviar-200 dark:bg-caviar-700'}`} />}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <form onSubmit={handleSubmit(onSubmit)} className="lg:col-span-2 space-y-8">
              {paySession ? (
                <PaymentQR
                  session={paySession}
                  stage={payStage}
                  onRetry={retryDummyPayment}
                  retrying={payRetrying}
                />
              ) : (
                <>
              {step === 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                  <h3 className="text-sm tracking-widest uppercase font-medium">Shipping Address</h3>
                  {savedAddresses.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {savedAddresses.map((address) => (
                        <button
                          key={address.id}
                          type="button"
                          onClick={() => useSavedAddress(address)}
                          className="p-4 border border-caviar-300 dark:border-caviar-600 text-left hover:border-gold-500 transition-colors"
                        >
                          <p className="text-xs font-medium">{address.firstName} {address.lastName}</p>
                          <p className="text-[10px] text-caviar-500 mt-1 leading-relaxed">{address.street}, {address.city}, {address.state} {address.zipCode}</p>
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-xs tracking-wider uppercase mb-2">First Name</label><input {...register('firstName')} className="input-field" /><p className="text-red-500 text-xs mt-1">{errors.firstName?.message}</p></div>
                    <div><label className="block text-xs tracking-wider uppercase mb-2">Last Name</label><input {...register('lastName')} className="input-field" /><p className="text-red-500 text-xs mt-1">{errors.lastName?.message}</p></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-xs tracking-wider uppercase mb-2">Email</label><input type="email" {...register('email')} className="input-field" /><p className="text-red-500 text-xs mt-1">{errors.email?.message}</p></div>
                    <div><label className="block text-xs tracking-wider uppercase mb-2">Phone</label><input {...register('phone')} className="input-field" placeholder="10-digit mobile" /><p className="text-red-500 text-xs mt-1">{errors.phone?.message}</p></div>
                  </div>
                  <div><label className="block text-xs tracking-wider uppercase mb-2">Street Address</label><input {...register('street')} className="input-field" /><p className="text-red-500 text-xs mt-1">{errors.street?.message}</p></div>
                  <div className="grid grid-cols-3 gap-4">
                    <div><label className="block text-xs tracking-wider uppercase mb-2">City</label><input {...register('city')} className="input-field" /></div>
                    <div><label className="block text-xs tracking-wider uppercase mb-2">State</label><input {...register('state')} className="input-field" /></div>
                    <div><label className="block text-xs tracking-wider uppercase mb-2">PIN Code</label><input {...register('zipCode')} className="input-field" placeholder="6-digit" /></div>
                  </div>
                  <div><label className="block text-xs tracking-wider uppercase mb-2">Country</label><input {...register('country')} className="input-field" /></div>
                </motion.div>
              )}

              {step === 1 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                  <h3 className="text-sm tracking-widest uppercase font-medium">Payment Method</h3>
                  <div className={`p-6 border ${paymentReady ? 'border-caviar-200 dark:border-caviar-800' : 'border-amber-400'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{dummyMode ? 'UPI QR — Test Mode' : 'Paytm Secure Checkout'}</p>
                        <p className="text-xs text-caviar-500 mt-1">
                          {dummyMode
                            ? 'Scan a QR code with your phone. No real money is charged.'
                            : 'Pay via UPI, Credit/Debit Card, Net Banking, or Wallets'}
                        </p>
                      </div>
                      {paymentReady ? (
                        <span className={`text-xs px-2 py-1 ${dummyMode ? 'bg-amber-100 text-amber-800' : 'bg-caviar-100 dark:bg-caviar-800 text-caviar-700 dark:text-caviar-200'}`}>
                          {dummyMode ? 'Demo' : 'Secure'}
                        </span>
                      ) : (
                        <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1">Not configured</span>
                      )}
                    </div>
                    {paymentReady && paymentConfig?.mode && (
                      <p className="text-[11px] text-caviar-400 mt-3">
                        {dummyMode
                          ? 'Demo payment gateway — no gateway credentials are used. The order is confirmed when you press Pay on the phone.'
                          : `Gateway mode: ${paymentConfig.mode === 'live' ? 'Live (real money)' : 'Test (sandbox)'} · ${paymentConfig.webhookConfigured ? 'Webhooks active' : 'Webhook verification unavailable'}`}
                      </p>
                    )}
                  </div>
                  {!paymentReady && (
                    <div className="p-5 border border-amber-400 bg-amber-50 text-amber-900">
                      <p className="text-sm font-medium">Online payment is not available on this deployment.</p>
                      <p className="text-xs mt-2 leading-relaxed">
                        The server has no Paytm credentials yet, so the Pay button would fail with HTTP 503.
                        {paymentConfig?.missing?.length ? ` Set: ${paymentConfig.missing.join(', ')}.` : ''}
                        {' '}See PAYMENT_SETUP.md in the repository root.
                      </p>
                    </div>
                  )}
                </motion.div>
              )}

              {step === 2 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  <h3 className="text-sm tracking-widest uppercase font-medium">Review Order</h3>
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between py-3 border-b border-caviar-100 dark:border-caviar-800">
                      <div className="flex items-center space-x-4">
                        <span className="text-sm font-medium">{item.product.name}</span>
                        <span className="text-xs text-caviar-400">x{item.quantity}</span>
                      </div>
                      <span className="text-sm">{formatPrice((item.product.discountPrice || item.product.basePrice) * item.quantity)}</span>
                    </div>
                  ))}
                </motion.div>
              )}

              <div className="flex items-center justify-between pt-4">
                {step > 0 ? (
                  <button type="button" onClick={() => setStep(step - 1)} className="text-sm text-caviar-500 hover:text-caviar-950 dark:hover:text-white transition-colors">← Back</button>
                ) : <div />}
                <button type="submit" className="btn-primary text-xs" disabled={placing || (step === 2 && !paymentReady)}>
                  {placing ? 'Processing...' : step === 2 ? (paymentReady ? (dummyMode ? 'Generate QR to Pay' : 'Pay Securely') : 'Payment unavailable') : 'Continue'}
                </button>
              </div>
                </>
              )}
            </form>

            <div className="lg:col-span-1">
              <div className="p-8 border border-caviar-200 dark:border-caviar-800 sticky top-28">
                <h3 className="text-sm tracking-widest uppercase font-medium mb-6">Order Summary</h3>
                <div className="space-y-4 text-sm">
                  {items.map((item) => (
                    <div key={item.id} className="flex justify-between">
                      <span className="text-caviar-500 truncate max-w-[180px]">{item.product.name} x{item.quantity}</span>
                      <span>{formatPrice((item.product.discountPrice || item.product.basePrice) * item.quantity)}</span>
                    </div>
                  ))}
                  <div className="border-t border-caviar-200 dark:border-caviar-800 pt-4 space-y-2">
                    <div className="flex justify-between"><span className="text-caviar-500">Subtotal</span><span>{formatPrice(total)}</span></div>
                    <div className="flex justify-between"><span className="text-caviar-500">Shipping</span><span>{total > 5000 ? 'Free' : '₹99'}</span></div>
                    <div className="flex justify-between"><span className="text-caviar-500">GST (18%)</span><span>{formatPrice(tax)}</span></div>
                    {discount > 0 && (
                      <div className="flex justify-between"><span className="text-green-600">Coupon ({coupon.code})</span><span className="text-green-600">-{formatPrice(discount)}</span></div>
                    )}
                  </div>
                  <div className="border-t border-caviar-200 dark:border-caviar-800 pt-4 flex justify-between font-medium text-base">
                    <span>Total</span>
                    <span>{formatPrice(grandTotal)}</span>
                  </div>

                  <div className="border-t border-caviar-200 dark:border-caviar-800 pt-4">
                    <label className="block text-xs tracking-widest uppercase font-medium mb-2">Promo Code</label>
                    <div className="flex space-x-2">
                      <input
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        placeholder="Enter coupon code"
                        className="input-field flex-1"
                      />
                      <button type="button" onClick={applyCoupon} className="btn-secondary text-xs">Apply</button>
                    </div>
                    {couponError && <p className="text-red-500 text-xs mt-2">{couponError}</p>}
                    {coupon && <p className="text-green-600 text-xs mt-2">Coupon applied</p>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
