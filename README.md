# Holy Cross Catholic Men Organization (CMO) Management Portal

An enterprise-grade, digital governance and financial management platform engineered for the **Catholic Men Organization (CMO), Holy Cross Catholic Church, Badawa (Kano Diocese)**. The platform provides real-time multi-executive synchronization, constitutional rule enforcement, live voice-to-text meeting transcription, automated banking ledger reconciliation, and a complete Inter-Family Sports Management Suite grounded strictly in the **2023 CMO Bye-Laws**.

---

## Comprehensive Portal & Dashboard Suite (`src/pages/dashboard/`)

| Portal Component | Executive / User Role | Primary Responsibilities & Features |
| :--- | :--- | :--- |
| **`ChairmanDashboard.tsx`** | Executive Chairman | 0–100% Constitutional Health Score, Section I Signatory Deck, Section D(6) Bank Deposit Audit Deck, Announcements. |
| **`FinSecDashboard.tsx`** | Financial Secretary | Master Income/Expense Ledger, Fine Clearance Escrow, Welfare Staging, Bulk CSV Ingestion, Family Dues Tracking. |
| **`TreasurerDashboard.tsx`** | Treasurer | Cash Vault Ledger, Section D(6) Bank Deposit Logging, Debit Outflow Alignment, Section I Withdrawal Co-Signing. |
| **`SecretaryDashboard.tsx`** | Secretary | Web Speech Transcriber, AI Floor Motion Extraction, Bye-Law RAG Search, Decree Publishing. |
| **`ProvostDashboard.tsx`** | Provost | Roll Call Attendance Register, Real-Time Section L Fine Calculation, Push to Escrow Ledger. |
| **`WelfareDashboard.tsx`** | Welfare Officer | Member Welfare Ticket Lifecycle, Bereavement/Hospitalization Benefit Claims, Section K Cap Audits. |
| **`PRODashboard.tsx`** | PRO | Public Media Hub, Event Broadcasting, Circular Distribution, Gallery Management. |
| **`LiturgistDashboard.tsx`** | Liturgist | Spiritual Calendar, Mass Booking Logs, Family Mass Attendance Tracking, Liturgical Roster. |
| **`MemberDashboard.tsx`** | General Member | Member Digital ID Card, Dues Statement, Fine Status, Family Assignment, Individual Welfare Claims. |
| **`FamilyHeadDashboard.tsx`** | Family Head | Family Leadership Management (Wisdom, Honour, Talent, Integrity), Meeting Roll Call & Welfare. |
| **`FamilySecDashboard.tsx`** | Family Secretary | Family Financial Ledger, Member Attendance Summaries, Local Family Dues Collection. |
| **`FamilyDashboard.tsx`** | Family Portal | Overview of Family Leadership, Family Roster, Internal Family Announcements. |

---

## Inter-Family Sports Management Suite (`src/pages/dashboard/sports/`)

| Specialized Module | Module Purpose | Core Features |
| :--- | :--- | :--- |
| **`SportsHub.tsx`** | Main Sports Center | CMO Sports Treasury & Inter-Family Tournament Workspace. |
| **`SportsAdminPanel.tsx`** | Sports Administration | Tournament Settings, Fixture Scheduling, Rule Enforcement. |
| **`SportsFinancialHub.tsx`** | Sports Treasury | Tournament Budgeting, Player Registration Fees, Equipment Outflows. |
| **`AthleteProfileHub.tsx`** | Athlete Registry | Member Sports Profiles, Bio Data, Player Performance Stats. |
| **`CoachRosterWorkspace.tsx`** | Coaching & Roster | Family Team Roster Allocations, Lineups, Tactics. |
| **`TournamentStandingsBoard.tsx`** | Standings & Results | Real-time Group/Knockout Tables, Goal Differences, Points. |
| **`RefereeMatchCenter.tsx`** | Match Center | Live Scorekeeping, Yellow/Red Cards, Match Official Reports. |
| **`EquipmentInventoryLedger.tsx`** | Equipment Ledger | Sports Kits, Balls, Trophies, Asset Tracking. |
| **`SportsMedicalPortal.tsx`** | Sports Medical | Athlete Medical Clearances, Injury Logs, First-Aid Tracking. |
| **`SportsAuditReadOnlyView.tsx`** | Read-Only Audit | Independent Financial & Match Audit Deck for Executives. |

---

## Tech Stack & Infrastructure

* **Frontend**: React 18, TypeScript, Vite, Tailwind CSS
* **Icons**: Lucide React SVG Icons
* **Backend & Database**: Supabase (PostgreSQL, Realtime Subscriptions, Row Level Security)
* **AI & Natural Language**: Google Gemini API, Web Speech API (MediaStream)
* **Hosting & Deployment**: Vercel (Edge Network & SPA Route Rewrites via `vercel.json`)

---

## Local Development & Deployment

```bash
# 1. Install Dependencies
npm install

# 2. Run Local Development Server
npm run dev

# 3. Production Build Check
npm run build
```

© 2026 Holy Cross Catholic Church Badawa, Catholic Men Organization (Kano Diocese).