import React from 'react';
import { useApp } from '../../../contexts/AppContext';
import { Scale, ShieldCheck } from 'lucide-react';

export const Footer: React.FC = () => {
  const { setCurrentPage } = useApp();

  return (
    <footer className="bg-[#001a16] border-t-2 border-[#ffd700] py-6 mt-12 no-print">
      <div className="max-w-7xl mx-auto px-4 md:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
        <div>
          <p className="text-sm text-gray-400">
            © 2026 Holy Cross Catholic Church Badawa. Catholic Men Organisation — Kano Diocese.
          </p>
          <p className="text-xs mt-1 text-[#ffd700]">
            Grounded in the 2023 Official Constitution & Bye-Laws.
          </p>
        </div>

        <div className="flex items-center gap-6 text-xs text-gray-300">
          <button
            onClick={() => setCurrentPage('terms' as any)}
            className="hover:text-emerald-400 transition-colors cursor-pointer flex items-center gap-1.5 font-medium"
          >
            <Scale className="w-3.5 h-3.5 text-[#ffd700]" />
            Terms & Conditions
          </button>
          <span className="text-gray-600">•</span>
          <button
            onClick={() => setCurrentPage('privacy' as any)}
            className="hover:text-emerald-400 transition-colors cursor-pointer flex items-center gap-1.5 font-medium"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Privacy & Legal Policy
          </button>
        </div>
      </div>
    </footer>
  );
};