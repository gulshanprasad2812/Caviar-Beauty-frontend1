import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { FiRefreshCw, FiSmartphone } from 'react-icons/fi';
import { formatPrice } from '@/utils/helpers';

const pad = (value) => String(value).padStart(2, '0');
const clock = (seconds) => `${pad(Math.floor(seconds / 60))}:${pad(seconds % 60)}`;

const secondsUntil = (date) => Math.max(0, Math.floor((new Date(date).getTime() - Date.now()) / 1000));

/**
 * Shown on the checkout tab after the order is created. The QR encodes the
 * public payment page; the parent polls the server and swaps this out once the
 * phone reports the payment.
 */
export default function PaymentQR({ session, stage, onRetry, retrying }) {
  const [left, setLeft] = useState(() => secondsUntil(session.expiresAt));

  useEffect(() => {
    setLeft(secondsUntil(session.expiresAt));
    const id = setInterval(() => setLeft((value) => Math.max(0, value - 1)), 1000);
    return () => clearInterval(id);
  }, [session.token, session.expiresAt]);

  if (stage === 'cancelled') {
    return (
      <div className="p-8 border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 text-center">
        <p className="text-sm font-medium text-red-800 dark:text-red-300">This order was cancelled.</p>
        <p className="text-xs text-red-700 dark:text-red-400 mt-2">
          No payment was taken. Add the items to your bag again to place a new order.
        </p>
      </div>
    );
  }

  if (stage === 'expired') {
    return (
      <div className="p-8 border border-amber-300 bg-amber-50 dark:bg-amber-900/20 text-center">
        <p className="text-sm font-medium text-amber-900 dark:text-amber-200">This payment QR expired.</p>
        <p className="text-xs text-amber-800 dark:text-amber-300 mt-2">
          Generate a fresh QR to keep this order. Unpaid orders are cancelled automatically after 15 minutes.
        </p>
        <button
          type="button"
          onClick={onRetry}
          disabled={retrying}
          className="btn-primary text-xs mt-6 inline-flex items-center space-x-2"
        >
          <FiRefreshCw className={`w-3.5 h-3.5 ${retrying ? 'animate-spin' : ''}`} />
          <span>{retrying ? 'Creating QR...' : 'Generate new QR'}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="p-8 border border-caviar-200 dark:border-caviar-800">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="section-subtitle">Payment</p>
          <h3 className="font-serif text-2xl mt-2">Scan to pay</h3>
        </div>
        <span className="text-[10px] tracking-widest uppercase px-2 py-1 bg-amber-100 text-amber-800">
          Test mode
        </span>
      </div>

      <div className="flex flex-col items-center text-center">
        <div className="bg-white p-4 border border-caviar-200">
          <QRCodeSVG value={session.url} size={208} level="M" marginSize={1} bgColor="#ffffff" fgColor="#111111" />
        </div>

        <p className="text-xs tracking-widest uppercase text-caviar-400 mt-6">Amount to pay</p>
        <p className="text-3xl font-serif mt-2">{formatPrice(session.amount)}</p>
        <p className="text-xs text-caviar-500 mt-1">Order {session.orderNumber}</p>

        <div className="flex items-center space-x-2 mt-6 text-sm text-caviar-600 dark:text-caviar-300">
          <FiSmartphone className="w-4 h-4" />
          <span>Open your phone camera and scan the code.</span>
        </div>

        <p className="text-[11px] text-caviar-400 mt-3 leading-relaxed max-w-sm">
          This is a demonstration payment. No money will be charged. The page updates automatically once the
          phone confirms.
        </p>

        <div className="flex items-center space-x-2 mt-6 text-[11px] text-caviar-500">
          <span className="w-2 h-2 rounded-full bg-gold-500 animate-pulse" />
          <span>Waiting for payment… QR expires in {clock(left)}</span>
        </div>

        <a
          href={session.url}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-caviar-500 hover:text-caviar-950 dark:hover:text-white underline underline-offset-4 mt-6"
        >
          Open the payment page on this device
        </a>
      </div>
    </div>
  );
}
