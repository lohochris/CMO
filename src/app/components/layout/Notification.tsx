import { XCircle, CheckCircle } from 'lucide-react';
import { useApp } from '../../../contexts/AppContext';

export const Notification = () => {
  const { error, success } = useApp();

  if (!error && !success) return null;

  return (
    <>
      {error && (
        <div className="fixed top-20 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-in slide-in-from-right z-50">
          <XCircle className="w-5 h-5" />
          {error}
        </div>
      )}
      {success && (
        <div className="fixed top-20 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-in slide-in-from-right z-50">
          <CheckCircle className="w-5 h-5" />
          {success}
        </div>
      )}
    </>
  );
};