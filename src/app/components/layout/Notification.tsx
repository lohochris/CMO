import { useEffect } from 'react';
import { XCircle, CheckCircle } from 'lucide-react';
import { useApp } from '../../../contexts/AppContext';

export const Notification = () => {
  const { error, success, setError, setSuccess } = useApp();

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [success, setSuccess]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, setError]);

  if (!error && !success) return null;

  return (
    <>
      {error && (
        <div className="fixed top-20 right-4 bg-red-600/95 text-white px-6 py-3 rounded-lg shadow-xl border border-red-400 flex items-center gap-2 animate-in slide-in-from-right duration-300 z-50 pointer-events-auto">
          <XCircle className="w-5 h-5 shrink-0" />
          <span className="font-semibold text-sm">{error}</span>
        </div>
      )}
      {success && (
        <div className="fixed top-20 right-4 bg-emerald-600/95 text-white px-6 py-3 rounded-lg shadow-xl border border-emerald-400 flex items-center gap-2 animate-in slide-in-from-right duration-300 z-50 pointer-events-auto">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <span className="font-semibold text-sm">{success}</span>
        </div>
      )}
    </>
  );
};