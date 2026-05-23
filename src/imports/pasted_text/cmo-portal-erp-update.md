You are a Principal Full-Stack Engineer and Core Systems Architect. Your task is to update the Holy Cross CMO Management Portal into a responsive, secure, multi-departmental ERP platform using React and Lucide Icons.

THEME & INTERACTIVE STYLE RULES:
- Primary Color Scheme: Deep Liturgical Teal (#001a16 as dominant backdrop, #002520 for cards) and Brilliant Gold (#ffd700) for interactive states, table headers, borders, and focal text highlights.
- Interaction Feedback: Every clickable element, navbar link, tab selector, and button must explicitly implement interactive pointer styles (e.g., cursor: 'pointer', transition: 'all 0.2s ease-in-out') with visual feedback on hover.
- Responsive Layout: Use fluid CSS Grid and Flexbox mechanics to guarantee the user interface renders beautifully on mobile devices, tablets, and desktop displays. No fixed-pixel column widths that break mobile screen viewports.

AUTHENTICATION HARDENING (NO HARDCODED HINTS):
- Completely remove all visible backdoor shortcut text hints, testing passwords, or exposed executive keys from the login display card and dashboards.
- Authentication must process strictly via a single "Member ID" input field. The system looks up this ID inside the database state matrix to determine the user's explicit role ('member', 'fin_sec', 'welfare', 'treasurer', 'gen_sec') and conditionally renders the corresponding workspace dashboard.

MULTI-DEPARTMENTAL SCHEMA & WORKFLOW ENGINES TO IMPLEMENT:

1. MEMBER PROFILE & PLATFORM COMMUNICATION:
   - Extend the member data schema to support a 'profilePic' string property (Base64 data or mock image URL).
   - Create a Profile Management widget allowing users to upload an image or simulate a camera snapshot.
   - Include a global "CMO Announcements Bulletin Board" visible on the Home tab serving as the primary communication feed where executives can broadcast official parish updates to members.

2. WELFARE DEPARTMENT (TICKET LIFECYCLE PIPELINE):
   - Add a "Welfare" tab to the Navbar, accessible to the Welfare Officer.
   - The Welfare Officer can raise assistance requests by filling out a form: Member ID, Package Category (e.g., Medical, Death Levy, Child Birth), and Requested Amount (₦).
   - Submitting the form automatically generates a unique tracking token string formatted as 'WLF-TKT-XXXX'.
   - The ticket state must move linearly through these statuses: 'Awaiting Financial Audit' -> 'Awaiting Disbursement' -> 'Settled & Cleared'.
   - Public Transparency Dashboard: Render a viewable-by-all read-only widget on the main portal listing all active and pending welfare tickets so the general membership can inspect the transparency of the pipeline.

3. FINANCIAL SECRETARY AUDIT LINK:
   - Within the Financial Secretary Dashboard, display incoming Welfare Tickets under audit review.
   - The Financial Secretary cross-checks the target member's current total balance dues. Clicking "Approve Financial Clearance" updates the ticket status to 'Awaiting Disbursement'.

4. TREASURER DEPARTMENT (DISBURSEMENT & TIMELINE LOGGING):
   - Add a "Treasurer" tab to the Navbar, accessible to the Treasurer.
   - The Treasurer can view all tickets marked 'Awaiting Disbursement'. Clicking an interactive "Disburse & Settle" button pays out the fund to the Welfare department, flags the ticket status as 'Settled & Cleared', and removes it from the active dashboard view.
   - Expense Ledger Track: Provide a manual form for the Treasurer to record general operational expenses (Amount, Purpose, Date). 
   - Real-time Linkage: Every logged expense must instantly fire an alert to the Financial Secretary and append data directly into a unified chronological financial timeline. This timeline must be designed like a bank statement, allowing the Financial Secretary to preview or invoke a print layout action at any time.

5. SECRETARY DEPARTMENT (AI MINUTES ENGINE):
   - Add a "Secretary" tab to the Navbar, accessible to the General Secretary.
   - Integrate a digital notebook workspace containing a mock "AI Voice-to-Text Live Listener" button. Clicking it simulates audio capture and populates a text block editor with a beautifully structured text transcript summary (Include a professional Minute Taking Template).
   - Provide full textarea text-editing controls so the Secretary can proofread, type edits, and click an "Export & Publish Minutes" button which converts the text block into a downloadable PDF file structure for the parish body.

CURRENT USER BASE SEED DATA (For Routing Reference):
[
  { id: 'HCC-CMO-26-0001', name: 'Alao, Joseph', status: 'Active (Cleared)', balance: 15000, role: 'member', profilePic: null },
  { id: 'FIN-SEC-2026', name: 'Dondo, Christopher', status: 'Active (Cleared)', balance: 0, role: 'fin_sec', profilePic: null },
  { id: 'WELFARE-2026', name: 'Okafor, Emmanuel', status: 'Active (Cleared)', balance: 0, role: 'welfare', profilePic: null },
  { id: 'TREASURER-2026', name: 'Ibrahim, Musa', status: 'Active (Cleared)', balance: 0, role: 'treasurer', profilePic: null },
  { id: 'SECRETARY-2026', name: 'Eze, Chukwuma', status: 'Active (Cleared)', balance: 0, role: 'gen_sec', profilePic: null }
]
Ensure all child panels receive their required global array states and callback mutation triggers. Prioritize structural reliability, modular layouts, and pristine visual scannability.
