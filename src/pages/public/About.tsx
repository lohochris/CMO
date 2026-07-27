import React from 'react';
import {
  Church,
  BookOpen,
  Users,
  ShieldCheck,
  Landmark,
  HeartHandshake,
  Code2,
  ExternalLink,
  Sparkles,
  Award,
  FileText,
  Cpu
} from 'lucide-react';

export const About: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#021B13] text-emerald-100 py-12 px-4 sm:px-6 lg:px-8 selection:bg-emerald-500 selection:text-slate-950">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* ───────────────────────────────────────────────────────────── */}
        {/* Section 1: Hero Header & Mottos                               */}
        {/* ───────────────────────────────────────────────────────────── */}
        <header className="bg-[#04281D]/90 border border-emerald-800/40 rounded-2xl p-6 sm:p-10 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 space-y-6 max-w-4xl">
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/90 border border-yellow-500/30 text-yellow-400 text-xs font-semibold uppercase tracking-wider shadow-sm">
              <Church className="w-4 h-4 text-emerald-400" />
              CATHOLIC MEN ORGANIZATION • HOLY CROSS BADAWA
            </span>
            <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mt-3 mb-4">
              Uniting Catholic Men in Faith, Service, and Governance
            </h1>
            <p className="text-base sm:text-lg text-emerald-100/90 max-w-3xl leading-relaxed">
              Rooted in the Kano Diocese since 2002, the Catholic Men Organization (CMO) of Holy Cross Catholic Church, Badawa, stands as a pillar of spiritual strength, fraternal unity, and structured parish governance.
            </p>

            {/* Primary & Secondary Mottos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="bg-[#02110D] border border-yellow-500/30 p-4 rounded-xl shadow-inner">
                <span className="text-xs font-semibold uppercase tracking-wider text-yellow-400 block mb-1">Primary Motto</span>
                <p className="text-lg sm:text-xl font-bold text-white italic">"Christ Is Our Leader"</p>
              </div>
              <div className="bg-[#02110D] border border-emerald-500/30 p-4 rounded-xl shadow-inner">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 block mb-1">Secondary Motto</span>
                <p className="text-lg sm:text-xl font-bold text-emerald-300 italic">"That all may be one"</p>
                <span className="text-xs text-emerald-100/70 font-mono">— John 17:21</span>
              </div>
            </div>

            {/* Key Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-emerald-800/40">
              <div className="bg-[#02110D] p-4 rounded-xl border border-emerald-800/40">
                <span className="text-yellow-400 font-bold text-2xl block">Est. 2002</span>
                <span className="text-slate-300 text-xs font-medium">Parish Heritage</span>
              </div>
              <div className="bg-[#02110D] p-4 rounded-xl border border-emerald-800/40">
                <span className="text-emerald-400 font-bold text-2xl block">Kano Diocese</span>
                <span className="text-slate-300 text-xs font-medium">Ecclesial Body</span>
              </div>
              <div className="bg-[#02110D] p-4 rounded-xl border border-emerald-800/40">
                <span className="text-yellow-400 font-bold text-2xl block">4 Families</span>
                <span className="text-slate-300 text-xs font-medium">Wisdom, Honour, Integrity, Talent</span>
              </div>
              <div className="bg-[#02110D] p-4 rounded-xl border border-emerald-800/40">
                <span className="text-emerald-400 font-bold text-2xl block">100%</span>
                <span className="text-slate-300 text-xs font-medium">Digitized Ledgers</span>
              </div>
            </div>
          </div>
        </header>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* Section 2: Our Constitutional Mandate (Section A Summary)     */}
        {/* ───────────────────────────────────────────────────────────── */}
        <section className="space-y-6">
          <div>
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/90 border border-yellow-500/30 text-yellow-400 text-xs font-semibold uppercase tracking-wider shadow-sm">
              <BookOpen className="w-3.5 h-3.5" />
              SECTION A MANDATE
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mt-3 mb-4">
              Our Constitutional Objectives
            </h2>
            <p className="text-base sm:text-lg text-emerald-100/90 max-w-3xl leading-relaxed">
              Enshrined in the 2023 Official Constitution & Bye-Laws to govern our spiritual, fraternal, and administrative duties.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#04281D]/90 border border-emerald-800/40 rounded-2xl p-6 sm:p-8 hover:-translate-y-1 hover:border-yellow-500/40 transition-all duration-300 shadow-xl">
              <h3 className="text-lg font-bold text-yellow-400 tracking-wide flex items-center gap-2.5 mb-3">
                <Users className="w-5 h-5 text-yellow-400" /> 1. Unity & Fellowship
              </h3>
              <p className="text-sm text-slate-200 leading-relaxed mt-2">
                Uniting all Catholic men in Holy Cross Parish, Badawa, fostering Christian brotherhood, spiritual maturity, and active participation in parish life.
              </p>
            </div>

            <div className="bg-[#04281D]/90 border border-emerald-800/40 rounded-2xl p-6 sm:p-8 hover:-translate-y-1 hover:border-yellow-500/40 transition-all duration-300 shadow-xl">
              <h3 className="text-lg font-bold text-yellow-400 tracking-wide flex items-center gap-2.5 mb-3">
                <Church className="w-5 h-5 text-emerald-400" /> 2. Evangelization & Parish Support
              </h3>
              <p className="text-sm text-slate-200 leading-relaxed mt-2">
                Cooperating closely with the Parish Priest, pastoral council, and parish administration to advance evangelization, maintenance, and spiritual programs.
              </p>
            </div>

            <div className="bg-[#04281D]/90 border border-emerald-800/40 rounded-2xl p-6 sm:p-8 hover:-translate-y-1 hover:border-yellow-500/40 transition-all duration-300 shadow-xl">
              <h3 className="text-lg font-bold text-yellow-400 tracking-wide flex items-center gap-2.5 mb-3">
                <Award className="w-5 h-5 text-yellow-400" /> 3. Diocesan Alignment
              </h3>
              <p className="text-sm text-slate-200 leading-relaxed mt-2">
                Speaking with one unified voice alongside the Diocesan Catholic Men Organization (Kano Diocese), supporting broader church initiatives and synodal growth.
              </p>
            </div>

            <div className="bg-[#04281D]/90 border border-emerald-800/40 rounded-2xl p-6 sm:p-8 hover:-translate-y-1 hover:border-yellow-500/40 transition-all duration-300 shadow-xl">
              <h3 className="text-lg font-bold text-yellow-400 tracking-wide flex items-center gap-2.5 mb-3">
                <HeartHandshake className="w-5 h-5 text-emerald-400" /> 4. Structured Welfare Support
              </h3>
              <p className="text-sm text-slate-200 leading-relaxed mt-2">
                Providing structured, transparent assistance to members and families during life milestones (weddings, births, surgeries, bereavements) under strict constitutional guidelines.
              </p>
            </div>
          </div>
        </section>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* Section 3: Organizational Governance & Executive Council      */}
        {/* ───────────────────────────────────────────────────────────── */}
        <section className="space-y-6">
          <div>
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/90 border border-yellow-500/30 text-yellow-400 text-xs font-semibold uppercase tracking-wider shadow-sm">
              <Landmark className="w-3.5 h-3.5" />
              SECTION D GOVERNANCE
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mt-3 mb-4">
              Executive Governance Structure
            </h2>
            <p className="text-base sm:text-lg text-emerald-100/90 max-w-3xl leading-relaxed">
              Structured administration and constitutional leadership operating under the spiritual guidance of the Parish Priest and Patron.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#04281D]/90 border border-emerald-800/40 rounded-2xl p-6 sm:p-8 hover:-translate-y-1 hover:border-yellow-500/40 transition-all duration-300 shadow-xl">
              <h3 className="text-lg font-bold text-yellow-400 tracking-wide flex items-center gap-2.5 mb-3">
                <ShieldCheck className="w-5 h-5 text-yellow-400" /> Executive Triad
              </h3>
              <p className="text-sm text-slate-200 leading-relaxed mt-2">
                Executive Chairman, Financial Secretary, and Treasurer managing overall strategic direction, Section I bank disbursements, and master financial ledgers.
              </p>
            </div>

            <div className="bg-[#04281D]/90 border border-emerald-800/40 rounded-2xl p-6 sm:p-8 hover:-translate-y-1 hover:border-yellow-500/40 transition-all duration-300 shadow-xl">
              <h3 className="text-lg font-bold text-yellow-400 tracking-wide flex items-center gap-2.5 mb-3">
                <FileText className="w-5 h-5 text-emerald-400" /> Secretariat & Order
              </h3>
              <p className="text-sm text-slate-200 leading-relaxed mt-2">
                Secretary logging general assembly minutes & AI floor motions, alongside the Provost enforcing Section L meeting decorum and attendance fine calculation.
              </p>
            </div>

            <div className="bg-[#04281D]/90 border border-emerald-800/40 rounded-2xl p-6 sm:p-8 hover:-translate-y-1 hover:border-yellow-500/40 transition-all duration-300 shadow-xl">
              <h3 className="text-lg font-bold text-yellow-400 tracking-wide flex items-center gap-2.5 mb-3">
                <HeartHandshake className="w-5 h-5 text-yellow-400" /> Welfare & Liturgical Leads
              </h3>
              <p className="text-sm text-slate-200 leading-relaxed mt-2">
                Welfare Officer managing Section K benefit claims, Liturgist directing mass assignments, and Family Heads/Secretaries coordinating Wisdom, Honour, Integrity & Talent units.
              </p>
            </div>
          </div>
        </section>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* Section 4: The Digital Transformation Story                    */}
        {/* ───────────────────────────────────────────────────────────── */}
        <section className="space-y-6">
          <div>
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/90 border border-yellow-500/30 text-yellow-400 text-xs font-semibold uppercase tracking-wider shadow-sm">
              <Cpu className="w-3.5 h-3.5" />
              MODERN INNOVATION
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mt-3 mb-4">
              The Digital Evolution Story
            </h2>
            <p className="text-base sm:text-lg text-emerald-100/90 max-w-3xl leading-relaxed">
              Transitioning from manual paper-based record-keeping to an automated, audit-ready digital ecosystem enforcing 2023 Bye-Laws.
            </p>
          </div>

          <div className="bg-[#04281D]/90 border border-emerald-800/40 rounded-2xl p-6 sm:p-8 hover:-translate-y-1 hover:border-yellow-500/40 transition-all duration-300 shadow-xl space-y-6">
            <p className="text-sm text-slate-200 leading-relaxed">
              In 2026, Holy Cross CMO completed a full digital transition to replace vulnerable manual ledgers with a centralized portal. The digital system enforces constitutional governance automatically:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-[#02110D] rounded-xl border border-emerald-800/40 space-y-1">
                <span className="text-yellow-400 font-bold text-xs uppercase block">Section I Signatories</span>
                <p className="text-white text-xs font-semibold">2-of-3 Multi-Sig Approvals</p>
              </div>
              <div className="p-4 bg-[#02110D] rounded-xl border border-emerald-800/40 space-y-1">
                <span className="text-emerald-400 font-bold text-xs uppercase block">Section D(6) Audits</span>
                <p className="text-white text-xs font-semibold">Real-Time Deposit Lodgments</p>
              </div>
              <div className="p-4 bg-[#02110D] rounded-xl border border-emerald-800/40 space-y-1">
                <span className="text-yellow-400 font-bold text-xs uppercase block">Section L Fines</span>
                <p className="text-white text-xs font-semibold">Automated Roll Call Penalties</p>
              </div>
              <div className="p-4 bg-[#02110D] rounded-xl border border-emerald-800/40 space-y-1">
                <span className="text-emerald-400 font-bold text-xs uppercase block">Section K Welfare Caps</span>
                <p className="text-white text-xs font-semibold">Verified Benefit Disbursements</p>
              </div>
            </div>
          </div>
        </section>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* Section 5: Platform Engineering & Technical Provenance       */}
        {/* ───────────────────────────────────────────────────────────── */}
        <section className="space-y-6">
          <div>
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/90 border border-yellow-500/30 text-yellow-400 text-xs font-semibold uppercase tracking-wider shadow-sm">
              <Code2 className="w-3.5 h-3.5" />
              TECHNICAL ENGINEERING
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mt-3 mb-4">
              Platform Engineering & Provenance
            </h2>
            <p className="text-base sm:text-lg text-emerald-100/90 max-w-3xl leading-relaxed">
              Architectural provenance and lead software engineering attribution for the Holy Cross CMO Management System.
            </p>
          </div>

          <div className="bg-[#04281D]/90 border border-emerald-800/40 rounded-2xl p-6 sm:p-8 hover:-translate-y-1 hover:border-yellow-500/40 transition-all duration-300 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-3xl">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-950/40 border border-yellow-500/30 text-yellow-400 hover:text-yellow-300 hover:border-yellow-500/60 hover:bg-emerald-900/40 transition-all duration-200 text-xs font-medium">
                <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                Architect Attribution
              </span>
              <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Digital Platform Architecture & Provenance
              </h3>
              <p className="text-sm text-slate-200 leading-relaxed mt-2">
                Engineered and built to modern enterprise software standards by <strong className="font-semibold text-emerald-300">Loho Christopher Dondo</strong> (Lead Full-Stack Software Engineer & Systems Architect) to provide transparent, automated, and audit-ready digital governance for Holy Cross CMO.
              </p>
            </div>

            <a
              href="https://loho-portfolio.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-950/40 border border-yellow-500/30 text-yellow-400 hover:text-yellow-300 hover:border-yellow-500/60 hover:bg-emerald-900/40 transition-all duration-200 text-xs font-medium shrink-0 cursor-pointer"
            >
              <Code2 className="w-4 h-4 text-emerald-400" />
              <span>View Architect Portfolio</span>
              <ExternalLink className="w-4 h-4 text-yellow-400/70" />
            </a>
          </div>
        </section>
      </div>
    </div>
  );
};