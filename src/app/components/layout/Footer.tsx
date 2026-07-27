import React from 'react';
import { useApp } from '../../../contexts/AppContext';
import { Scale, ShieldCheck, Code2, ExternalLink } from 'lucide-react';

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

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <a
            href="https://loho-portfolio.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 hover:text-emerald-200 hover:border-emerald-400/60 hover:bg-emerald-900/40 transition-all duration-200 group shadow-sm text-xs"
            title="View Architect Portfolio"
          >
            <Code2 className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
            <span>Designed & Engineered by <strong className="font-semibold text-emerald-300 group-hover:underline">Loho Christopher</strong></span>
            <ExternalLink className="w-3 h-3 text-emerald-400/70 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </a>

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
      </div>
    </footer>
  );
};