import React from 'react';
import { useApp } from '../../../contexts/AppContext';
import { Scale, ShieldCheck, Code2, ExternalLink } from 'lucide-react';

export const Footer: React.FC = () => {
  const { setCurrentPage } = useApp();

  return (
    <footer className="w-full bg-[#001a16] text-emerald-100/80 py-6 px-4 border-t border-[#ffd700]/20 mt-12 no-print">
      <div className="max-w-7xl mx-auto flex flex-col items-center justify-center text-center gap-3 text-xs">
        {/* Copyright & Subtitle */}
        <p className="text-xs sm:text-sm text-emerald-200/90 max-w-md leading-relaxed">
          © 2026 Holy Cross Catholic Church Badawa. Catholic Men Organisation — Kano Diocese.
        </p>
        <p className="text-xs font-bold text-[#ffd700]">
          Grounded in the 2023 Official Constitution & Bye-Laws.
        </p>

        {/* Engineered By Tag */}
        <a
          href="https://loho-portfolio.vercel.app/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#ffd700] bg-emerald-950/80 border border-emerald-700/50 rounded-full hover:border-[#ffd700] transition-colors my-1 cursor-pointer group"
          title="View Architect Portfolio"
        >
          <Code2 className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
          <span>Designed & Engineered by <span className="text-emerald-400 underline">Loho Christopher</span></span>
          <ExternalLink className="w-3 h-3 text-[#ffd700]/70 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </a>

        {/* Responsive Links Container (Stacked on mobile flex-col, side-by-side on sm flex-row) */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-4 text-xs font-medium text-emerald-200/90 pt-1">
          {/* Terms & Conditions Link */}
          <button
            onClick={() => setCurrentPage('terms' as any)}
            className="inline-flex items-center gap-1.5 hover:text-[#ffd700] transition-colors duration-200 cursor-pointer"
          >
            <Scale className="w-3.5 h-3.5 text-[#ffd700]/90 shrink-0" />
            <span>Terms & Conditions</span>
          </button>

          <span className="hidden sm:inline text-emerald-700/60">•</span>

          {/* Privacy & Legal Policy Link */}
          <button
            onClick={() => setCurrentPage('privacy' as any)}
            className="inline-flex items-center gap-1.5 hover:text-[#ffd700] transition-colors duration-200 cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Privacy & Legal Policy</span>
          </button>
        </div>
      </div>
    </footer>
  );
};