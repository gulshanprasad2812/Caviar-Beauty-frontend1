import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FiCheckCircle, FiAlertTriangle, FiSmartphone } from 'react-icons/fi';
import api from '@/utils/api';
import { formatPrice } from '@/utils/helpers';
import { useSeo } from '@/hooks/useSeo';

const CLOSE_SECONDS = 10;

function Shell({ children }) {
  return (
    <div className="min-h-screen bg-caviar-950 text-white flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <p className="font-serif text-3xl tracking-wide">CAVIAR</p>
          <p className="text-[10px] tracking-[0.4em] uppercase text-gold-400 mt-1">Beauty</p>
        </div>
        <div className="bg-white text-caviar-950 p-8">{children}</div>
        <p className="text-center text-[10px] tracking-widest uppercase text-caviar-500 mt-6">
          Secure test payment · No real money
        </p>
      </div>
    </div>
  );
}

export default function DummyPay() {
  useSeo('Payment', 'Complete your Caviar Beauty test payment.');
  const { token } = useParams();
  const { data: session, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['payment-session', token],
    queryFn: () => api.get(`/payments/session/${token}`).then((r) => r.data),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(null);
  const [payError, setPayError] = useState('');
  const [seconds, setSeconds] = useState(CLOSE_SECONDS);
  const closeAttempted = useRef(false);

  const success = Boolean(paid) || session?.status === 'PAID';
  const amount = paid?.amount ?? session?.amount;
  const orderNumber = paid?.orderNumber ?? session?.orderNumber;

  useEffect(() => {
    if (!success) return undefined;
    const id = setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => clearInterval(id);
  }, [success]);

  useEffect(() => {
    if (!success || seconds > 0 || closeAttempted.current) return;
    closeAttempted.current = true;
    // Browsers only allow scripts to close windows they opened, so this is
    // best-effort; the message below stays visible either way.
    window.close();
  }, [success, seconds]);

  const pay = async () => {
    setPaying(true);
    setPayError('');
    try {
      const { data } = await api.post(`/payments/session/${token}/pay`);
      setPaid(data);
    } catch (err) {
      setPayError(err.response?.data?.error || 'The payment could not be completed. Please try again.');
    } finally {
      setPaying(false);
    }
  };

  if (isLoading) {
    return (
      <Shell>
        <div className="flex flex-col items-center py-10">
          <span className="w-10 h-10 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-caviar-500 mt-4">Loading payment…</p>
        </div>
      </Shell>
    );
  }

  if (isError) {
    const notFound = error?.response?.status === 404;
    return (
      <Shell>
        <div className="text-center py-6">
          <FiAlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
          <h1 className="font-serif text-2xl mt-4">{notFound ? 'Payment link not found' : 'Could not load payment'}</h1>
          <p className="text-sm text-caviar-500 mt-3 leading-relaxed">
            {notFound
              ? 'This link is invalid or has been replaced by a newer QR code. Generate a new QR on your computer.'
              : 'Check your connection and try again.'}
          </p>
          {!notFound && (
            <button type="button" onClick={() => refetch()} className="btn-primary text-xs mt-6">
              Try again
            </button>
          )}
        </div>
      </Shell>
    );
  }

  if (success) {
    const closeBlocked = seconds === 0;
    return (
      <Shell>
        <div className="text-center py-4">
          <FiCheckCircle className="w-12 h-12 text-green-600 mx-auto" />
          <h1 className="font-serif text-2xl mt-4">Payment successful</h1>
          <p className="text-sm text-caviar-500 mt-2">{formatPrice(amount)}</p>
          {orderNumber && <p className="text-xs text-caviar-400 mt-1">Order {orderNumber}</p>}

          <div className="mt-6 p-4 bg-caviar-50 text-sm text-caviar-600 leading-relaxed">
            {closeBlocked ? (
              <>This page can be closed now. You may safely close this page.</>
            ) : (
              <>
                This page will close in <span className="font-medium text-caviar-950">{seconds}</span>{' '}
                {seconds === 1 ? 'second' : 'seconds'}. You may safely close this page.
              </>
            )}
          </div>

          <p className="text-[11px] text-caviar-400 mt-4">
            Your order is confirmed on the store. The computer that showed the QR will continue automatically.
          </p>

          <button type="button" onClick={() => window.close()} className="btn-secondary text-xs mt-6">
            Close this page
          </button>
        </div>
      </Shell>
    );
  }

  if (session?.status === 'EXPIRED') {
    return (
      <Shell>
        <div className="text-center py-6">
          <FiAlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
          <h1 className="font-serif text-2xl mt-4">QR code expired</h1>
          <p className="text-sm text-caviar-500 mt-3 leading-relaxed">
            This payment link is no longer valid. Go back to the checkout on your computer and generate a new QR
            code.
          </p>
        </div>
      </Shell>
    );
  }

  if (session?.status === 'CANCELLED' || session?.status === 'FAILED') {
    return (
      <Shell>
        <div className="text-center py-6">
          <FiAlertTriangle className="w-10 h-10 text-red-500 mx-auto" />
          <h1 className="font-serif text-2xl mt-4">
            {session.status === 'CANCELLED' ? 'Order cancelled' : 'Payment unavailable'}
          </h1>
          <p className="text-sm text-caviar-500 mt-3 leading-relaxed">
            No payment was taken. Please return to the store and place a new order.
          </p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="text-center">
        <span className="inline-flex items-center space-x-1 text-[10px] tracking-widest uppercase px-2 py-1 bg-amber-100 text-amber-800">
          <FiSmartphone className="w-3 h-3" />
          <span>Test payment</span>
        </span>

        <p className="text-xs tracking-widest uppercase text-caviar-400 mt-6">Amount to pay</p>
        <p className="text-4xl font-serif mt-2">{formatPrice(amount)}</p>
        {orderNumber && <p className="text-xs text-caviar-500 mt-2">Order {orderNumber}</p>}

        <p className="text-[11px] text-caviar-400 mt-6 leading-relaxed">
          This is a demonstration checkout. Pressing Pay confirms the order without charging anything.
        </p>

        {payError && <p className="text-xs text-red-600 mt-4">{payError}</p>}

        <button
          type="button"
          onClick={pay}
          disabled={paying}
          className="btn-primary w-full text-sm mt-8"
        >
          {paying ? 'Processing…' : `Pay ${formatPrice(amount)}`}
        </button>

        <p className="text-[10px] text-caviar-400 mt-4">Keep this page open until you see the confirmation.</p>
      </div>
    </Shell>
  );
}
