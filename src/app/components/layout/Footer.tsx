import React from 'react';
import { useApp } from '../../../contexts/AppContext';
import { Scale, ShieldCheck, Code2, ExternalLink } from 'lucide-react';

export const Footer: React.FC = () => {
  const { setCurrentPage } = useApp();

  return (
    <footer className="bg-[#001a16] border-t-2 border-[#ffd700] py-6 mt-12 no-print">
      <div className="max-w-7xl mx-auto px-4 md:px-8 flex flex-col lg:flex-row items-center justify-between gap-4 text-center lg:text-left text-xs text-slate-300">
        {/* Left Column: Copyright & Bye-Laws grounding */}
        <div className="text-xs text-emerald-100/80 space-y-1">
          <p>© 2026 Holy Cross Catholic Church Badawa. Catholic Men Organisation — Kano Diocese.</p>
          <p className="text-yellow-400 font-medium">Grounded in the 2023 Official Constitution & Bye-Laws.</p>
        </div>

        {/* Right/Center Column: Developer badge + Legal Links */}
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <a
            href="https://loho-portfolio.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-950/40 border border-yellow-500/30 text-yellow-400 hover:text-yellow-300 hover:border-yellow-500/60 hover:bg-emerald-900/40 transition-all duration-200 group shadow-sm text-xs font-medium cursor-pointer"
            title="View Architect Portfolio"
          >
            <Code2 className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
            <span>Designed & Engineered by <strong className="font-semibold text-emerald-300 group-hover:underline">Loho Christopher</strong></span>
            <ExternalLink className="w-3 h-3 text-yellow-400/70 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </a>

          <div className="flex items-center gap-3 text-xs text-slate-300">
            <button
              onClick={() => setCurrentPage('terms' as any)}
              className="hover:text-yellow-400 transition-colors cursor-pointer flex items-center gap-1.5 font-medium whitespace-nowrap"
            >
              <Scale className="w-3.5 h-3.5 text-yellow-400" />
              Terms & Conditions
            </button>

            <span className="text-slate-600">•</span>

            <button
              onClick={() => setCurrentPage('privacy' as any)}
              className="hover:text-emerald-400 transition-colors cursor-pointer flex items-center gap-1.5 font-medium whitespace-nowrap"
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