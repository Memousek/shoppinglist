/**
 * Toast komponenta pro globální notifikace (úspěch, chyba, info).
 * Barevné, s ikonami, přístupné. Používá react-hot-toast.
 */
import toast, { Toaster } from 'react-hot-toast';

export function showSuccess(message: string) {
  toast.success(message, {
    icon: '✅',
    style: { background: '#166534', color: '#fff', border: '1px solid #14532d' },
    ariaProps: { role: 'status', 'aria-live': 'polite' },
  });
}

export function showError(message: string) {
  toast.error(message, {
    icon: '❌',
    style: { background: '#991b1b', color: '#fff', border: '1px solid #7f1d1d' },
    ariaProps: { role: 'alert', 'aria-live': 'assertive' },
  });
}

export function showInfo(message: string) {
  toast(message, {
    icon: 'ℹ️',
    style: { background: '#1e293b', color: '#fff', border: '1px solid #334155' },
    ariaProps: { role: 'status', 'aria-live': 'polite' },
  });
}

export function CustomToaster() {
  return <Toaster position="bottom-right" toastOptions={{ duration: 4000 }} />;
} 