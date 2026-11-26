// Meeting types + sample meetings (exact copy of the prototype data).
export const TYPES = {
  internal: { icon: 'department', name: 'Internal Meeting', desc: 'Team, department or cross-functional meeting with TrustLab colleagues' },
  customer: { icon: 'handshake', name: 'Customer Meeting', desc: 'B2B client, hospital, corporate or referral partner meeting' },
  supplier: { icon: 'package', name: 'Supplier Meeting', desc: 'Vendor, equipment, reagent or service provider meeting' },
  consultants: { icon: 'consultant', name: 'Consultants Meeting', desc: 'External advisor, consultant or professional services engagement' },
  board: { icon: '⚖️', name: 'Board Meeting', desc: 'Directors, board committee or statutory governance meeting' },
  other: { icon: '◦', name: 'Other Meeting', desc: 'Meeting type not fitting standard categories' }
};


export const INITIAL_MEETINGS = [
  // ---------- UPCOMING ----------
  { id: 'm1', type: 'internal', title: 'Q3 Operations Review — Hyderabad Hub', date: '2026-11-24', time: '10:00', dur: '1h', status: 'upcoming', chair: 'Venkata Cherukuri', loc: 'Begumpet HQ · Board Room', mode: '📍 In-person', attendees: ['Venkata Cherukuri (CMD)','N. Sharma (CFO)','V. Subramanian (COO)','R. Krishnan (CGO)','Pallavi (EA)'], external: [], agenda: ['Opening & context','Branch-level TAT dip in W45–W46','Material management stock adherence','Procurement open POs > 45 days','Decisions & asks'], agendaTimes: ['5m','20m','10m','15m','10m'], actions: [], subBadge: 'Ops Review' },
  { id: 'm2', type: 'customer', title: 'Adani AHC — Pricing & Package Finalisation', date: '2026-11-25', time: '14:30', dur: '1h 30m', status: 'upcoming', chair: 'Venkata Cherukuri', loc: 'Virtual (Teams)', mode: '💻 Virtual', attendees: ['Venkata Cherukuri (CMD)','Arjun (Sales)','R. Krishnan (CGO)'], external: [{name:'Priya Menon (Adani HR Lead)',email:'priya.menon@adani.com',rsvp:'accepted',respondedAt:'2026-11-20T10:15'},{name:'Dr. Suresh K (Occupational Health)',email:'suresh.k@adani.com',rsvp:'tentative',respondedAt:'2026-11-20T14:22',respondedNote:'Will try to join; might be 10 min late from another meeting.'}], agenda: ['Final package line-up','Volume commitments & phasing','Price per head — 3 tiers','Sample collection logistics','Signoff timeline'], agendaTimes: ['15m','20m','20m','20m','15m'], actions: [], subBadge: 'Pricing' },
  { id: 'm3', type: 'supplier', title: 'Transasia — HbA1c Analyser Failure Review', date: '2026-11-26', time: '11:00', dur: '1h', status: 'upcoming', chair: 'Venkata Cherukuri', loc: 'Begumpet HQ · Procurement Room', mode: '📍 In-person', attendees: ['Venkata Cherukuri (CMD)','Head of Procurement','BMO Head','Quality Manager'], external: [{name:'Rajesh Nair (Transasia Regional Head)',email:'rajesh.n@transasia.co.in',rsvp:'accepted',respondedAt:'2026-11-19T09:30'},{name:'Vikram Shah (Transasia Service Lead)',email:'vikram.shah@transasia.co.in',rsvp:'pending'}], agenda: ['Timeline of failures — Hyd & Bengaluru','RCA from Transasia','Credit note & replacement unit','Go-forward: continue or withdraw','Written commitment'], agendaTimes: ['10m','15m','15m','15m','5m'], actions: [], subBadge: 'Dispute' },
  { id: 'm4', type: 'internal', title: 'HR Monthly — Attrition & New Hires', date: '2026-11-27', time: '15:00', dur: '45m', status: 'upcoming', chair: 'Venkata Cherukuri', loc: 'Virtual (Teams)', mode: '💻 Virtual', attendees: ['Venkata Cherukuri (CMD)','HR Head','Madhavi'], external: [], agenda: ['Attrition heatmap by branch','New hires pending induction','PACE payroll reconciliation status','Open HR actions'], agendaTimes: ['15m','10m','10m','10m'], actions: [], subBadge: 'HR Monthly' },
  { id: 'm5', type: 'board', title: 'BM-2026-11 — Board Meeting (Ordinary)', date: '2026-11-28', time: '11:00', dur: '2h', status: 'upcoming', chair: 'Independent Director', loc: 'Begumpet HQ · Board Room', mode: '🔀 Hybrid', attendees: ['Venkata Cherukuri (CMD)','N. Sharma (CFO)','Independent Director 1','Independent Director 2','Company Secretary'], external: [{name:'Prakash Agarwal (Statutory Auditor)',email:'prakash.agarwal@kcmehta.com',rsvp:'accepted',respondedAt:'2026-11-18T16:00'}], agenda: ['Confirmation of previous minutes','CFO financial update Q2','Advisory board formation resolution','Statutory compliance report','AoB & date of next meeting'], agendaTimes: ['10m','30m','20m','40m','20m'], actions: [], subBadge: 'Ordinary' },
  { id: 'm6', type: 'consultants', title: 'Ishaq Ahmed — QMS NABL Pre-assessment Walkthrough', date: '2026-12-01', time: '10:00', dur: '2h', status: 'upcoming', chair: 'Venkata Cherukuri', loc: 'Virtual (Zoom)', mode: '💻 Virtual', attendees: ['Venkata Cherukuri (CMD)','Fayaz (QM)','Dr. Anusha Singh','Dr. Reddy'], external: [{name:'Mr. Ishaq Ahmed (Andromeda Dubai)',email:'ishaq.ahmed@andromeda-qms.ae',rsvp:'accepted',respondedAt:'2026-11-17T08:45',respondedNote:'Confirmed. Will have the pre-assessment checklist ready.'}], agenda: ['Document gap review','Internal audit evidence','Management review inputs','Preparedness checklist','Next steps & timelines'], agendaTimes: ['30m','30m','20m','30m','10m'], actions: [], subBadge: 'QMS Advisory' },

  // ---------- COMPLETED ----------
  { id: 'm7', type: 'internal', title: 'Accounts W46 — Weekly Review', date: '2026-11-17', time: '09:00', dur: '45m', status: 'completed', chair: 'Venkata Cherukuri', loc: 'Begumpet HQ', mode: '📍 In-person', attendees: ['Venkata Cherukuri','N. Sharma (CFO)','Accounts Head','2 Analysts'], external: [], agenda: ['AR aging — top 10 accounts','AP cycle — critical vendors','Bank reconciliation status','Branch cash positions','Decisions'], agendaTimes: ['15m','10m','5m','10m','5m'], minutes: { 'ag0': { disc: 'Top 10 overdue accounts reviewed. Three accounts over 90 DPD identified — total ₹18.4L. Care & Cure, Apollo Rangareddy, Fernandez are the concerns. CFO to drive weekly chase.', dec: 'Freeze services to any account crossing 120 DPD unless written CMD override. CFO to send me weekly aging snapshot every Monday 8 AM.' }, 'ag1': { disc: 'AP cycle is clean. No critical vendor past due. Transasia dispute amount held in suspense as agreed.', dec: 'Continue. No action required.' }, 'ag2': { disc: 'Branch cash positions all within policy. Begumpet slightly high — consider sweep.', dec: 'Daily sweep rule to be auto-configured in LedgerTrace.' }, }, actions: [
    { id: 'a1', desc: 'Send weekly AR aging snapshot to CMD every Monday 8 AM', owner: 'N. Sharma (CFO)', ownerShort: 'NS', deadline: '2026-11-24', priority: 'high', status: 'in-progress' },
    { id: 'a2', desc: 'Issue formal service-hold notices to accounts crossing 120 DPD', owner: 'N. Sharma (CFO)', ownerShort: 'NS', deadline: '2026-11-30', priority: 'high', status: 'open' },
    { id: 'a3', desc: 'Configure LedgerTrace daily cash sweep from Begumpet branch', owner: 'Accounts Head', ownerShort: 'AH', deadline: '2026-11-28', priority: 'medium', status: 'done' },
  ]},
  { id: 'm8', type: 'customer', title: 'Care & Cure — Joint CME Planning', date: '2026-11-13', time: '15:00', dur: '1h', status: 'completed', chair: 'Venkata Cherukuri', loc: 'Care & Cure HQ', mode: '📍 In-person', attendees: ['Venkata Cherukuri','R. Krishnan (CGO)','Marketing Head'], external: [{name:'Dr. Abishekh (MD, Care & Cure)',email:'md@careandcure.in'},{name:'Mr. Abhilash (CEO, Care & Cure)',email:'ceo@careandcure.in'}], agenda: ['CME theme & speakers','Date & venue','Co-branding & cost split','Diagnostics portal milestones','Next review date'], agendaTimes: ['15m','10m','15m','15m','5m'], minutes: { 'ag0': { disc: 'Agreed theme: "Metabolic Health in Young Adults". Keynote by Dr. Abishekh, co-presentation by TrustLab clinical. Target audience 150 physicians.', dec: 'Theme and speakers locked. Dr. Abishekh to send speaker brief; TrustLab to prepare co-presentation deck.' }, 'ag2': { disc: 'Cost split discussed: 60-40 with TrustLab bearing 60% (we gain B2B footfall). Co-branding — both logos equal prominence.', dec: 'Approved 60-40 split. Marketing to send draft invite.' }, }, actions: [
    { id: 'a4', desc: 'Prepare co-presentation deck "Metabolic Health in Young Adults"', owner: 'Marketing Head', ownerShort: 'MH', deadline: '2026-11-30', priority: 'high', status: 'in-progress' },
    { id: 'a5', desc: 'Send draft CME invite with co-branding for Dr. Abishekh approval', owner: 'Marketing Head', ownerShort: 'MH', deadline: '2026-11-20', priority: 'high', status: 'overdue' },
  ]},
  { id: 'm9', type: 'supplier', title: 'Procurement — Reagent Price Negotiation (Q4)', date: '2026-11-10', time: '14:00', dur: '1h 30m', status: 'completed', chair: 'Venkata Cherukuri', loc: 'Begumpet HQ', mode: '📍 In-person', attendees: ['Venkata Cherukuri','Head of Procurement','BMO Head'], external: [{name:'Anita Desai (Roche Key Accounts)',email:'anita.desai@roche.com'},{name:'Kiran Rao (Siemens Healthcare)',email:'kiran.rao@siemens-healthineers.com'},{name:'Mohan P (Abbott India)',email:'mohan.p@abbott.com'}], agenda: ['Volume commitments','Price per test — target reduction','Credit terms','Service SLA'], agendaTimes: ['20m','30m','20m','20m'], minutes: { 'ag0': { disc: 'Committed to 10% volume growth with Roche in exchange for 4.5% price reduction on top 20 reagents.', dec: 'Draft revised contract by month-end. Procurement Head to lead.' }, }, actions: [
    { id: 'a6', desc: 'Draft and circulate revised Roche contract with new pricing', owner: 'Head of Procurement', ownerShort: 'HP', deadline: '2026-11-30', priority: 'high', status: 'in-progress' },
  ]},
  { id: 'm10', type: 'board', title: 'Advisory Board Formation — Discussion', date: '2026-11-07', time: '11:00', dur: '1h 30m', status: 'completed', chair: 'Venkata Cherukuri', loc: 'Begumpet HQ · Board Room', mode: '📍 In-person', attendees: ['Venkata Cherukuri','N. Sharma (CFO)','V. Subramanian (COO)','R. Krishnan (CGO)','Company Secretary'], external: [], agenda: ['Need for advisory board over Growth & Revenue','Mandate & scope','Candidate profiles','Board resolution text','Timeline for appointments'], agendaTimes: ['15m','20m','25m','20m','10m'], minutes: { 'ag0': { disc: 'Growth & Revenue needs external senior counsel. Proposal to form an Advisory Board of 3 members with diagnostics + B2B sales expertise.', dec: 'Approved in principle. Mandate to be drafted and circulated.' }, 'ag1': { disc: 'Mandate scope: strategic advice on sales channels, pricing, geographic expansion. Non-executive. Quarterly meetings.', dec: 'Mandate approved as discussed. CS to draft formal document.' }, 'ag3': { disc: 'Draft board resolution reviewed. Minor edits suggested.', dec: 'CS to finalise and circulate for signature.' }, }, actions: [
    { id: 'a7', desc: 'Draft Advisory Board formal mandate document', owner: 'Company Secretary', ownerShort: 'CS', deadline: '2026-11-21', priority: 'high', status: 'done' },
    { id: 'a8', desc: 'Shortlist 5 candidate profiles for Advisory Board seats', owner: 'R. Krishnan (CGO)', ownerShort: 'RK', deadline: '2026-11-30', priority: 'high', status: 'in-progress' },
    { id: 'a9', desc: 'Finalise and circulate board resolution for signature', owner: 'Company Secretary', ownerShort: 'CS', deadline: '2026-11-25', priority: 'medium', status: 'open' },
    { id: 'a10', desc: 'Prepare Advisory Board announcement for Nov Board Meeting', owner: 'Myself (CMD)', ownerShort: 'VC', deadline: '2026-11-27', priority: 'medium', status: 'in-progress' },
  ]},
  { id: 'm11', type: 'internal', title: 'Growth & Revenue — Weekly Pulse', date: '2026-11-03', time: '14:00', dur: '1h', status: 'completed', chair: 'Venkata Cherukuri', loc: 'Virtual', mode: '💻 Virtual', attendees: ['Venkata Cherukuri','Arjun','R. Krishnan (CGO)','3 Sales Managers'], external: [], agenda: ['Revenue vs budget','Top 20 B2B accounts','Doctor referral trend','Camp pipeline','Decisions'], agendaTimes: ['10m','20m','15m','10m','5m'], minutes: { 'ag0': { disc: 'Oct revenue 94% of budget. B2B drag primarily due to Fernandez contract delays.', dec: 'Escalate Fernandez contract negotiation to CMD level.' }, 'ag3': { disc: '8 camps confirmed for November. 3 more in pipeline.', dec: 'Approved. Marketing to assign BDs.' }, }, actions: [
    { id: 'a11', desc: 'Set up Fernandez contract escalation meeting with their CFO', owner: 'Arjun', ownerShort: 'AR', deadline: '2026-11-18', priority: 'high', status: 'overdue' },
    { id: 'a12', desc: 'Assign BDs to 8 confirmed November camps', owner: 'R. Krishnan (CGO)', ownerShort: 'RK', deadline: '2026-11-10', priority: 'medium', status: 'done' },
  ]},

  // ---------- CANCELLED ----------
  { id: 'm12', type: 'customer', title: 'Tata 1mg — Partnership Exploration', date: '2026-11-20', time: '16:00', dur: '1h', status: 'cancelled', chair: 'Venkata Cherukuri', loc: 'Virtual', mode: '💻 Virtual', attendees: ['Venkata Cherukuri','R. Krishnan (CGO)'], external: [{name:'Neha Bhatia (Tata 1mg BD)',email:'neha.b@1mg.com'}], agenda: ['Partnership concept','Technical integration','Commercials','Next steps'], agendaTimes: ['15m','15m','20m','10m'], actions: [], cancelReason: 'Cancelled by vendor — rescheduling for mid-December' },
  { id: 'm13', type: 'internal', title: 'IT Monthly — Infrastructure Review', date: '2026-11-14', time: '10:30', dur: '1h', status: 'cancelled', chair: 'Venkata Cherukuri', loc: 'Begumpet HQ', mode: '📍 In-person', attendees: ['Venkata Cherukuri','Pavan','Satya','Sai Prakash'], external: [], agenda: ['mytrustlab.co.in uptime','27 platforms status','IT roadmap Q4'], agendaTimes: ['15m','30m','15m'], actions: [], cancelReason: 'Rescheduled to following week due to conflict with board prep' },
  { id: 'm14', type: 'consultants', title: 'Legal Review — CLM Software Design', date: '2026-11-05', time: '15:00', dur: '45m', status: 'cancelled', chair: 'Venkata Cherukuri', loc: 'Virtual', mode: '💻 Virtual', attendees: ['Venkata Cherukuri'], external: [{name:'Adv. Ramesh Iyer (Legal Counsel)',email:'ramesh@iyer-legal.in'}], agenda: ['CLM scope walkthrough','Compliance requirements'], agendaTimes: ['25m','20m'], actions: [], cancelReason: 'Consultant unavailable — new date pending' },
];


// ============ MEETING REQUESTS ============
export const MEETING_REQUESTS = [
  { id: 'req1', from: 'Mohammed Fayazuddin', to: 'Venkata Cherukuri', onBehalfOf: 'Venkata Cherukuri', routedTo: 'Pallavi Elisetti',
    proposedDate: '2026-11-25', proposedTime: '15:00', durationMin: 30,
    topic: 'Quick review — Mol Bio equipment validation records', notes: 'Need 20 min to review the status of the Ishaq-flagged gaps before next week\'s mock audit.',
    status: 'pending', createdAt: '2026-11-21 18:30', respondedAt: null, responseNote: '' },
  { id: 'req2', from: 'Arjun', to: 'Venkata Cherukuri', onBehalfOf: 'Venkata Cherukuri', routedTo: 'Pallavi Elisetti',
    proposedDate: '2026-11-24', proposedTime: '11:00', durationMin: 45,
    topic: 'Adani AHC — commercial sign-off before Monday call', notes: 'Pricing is locked at ₹2,850 per employee. Need your sign-off on the final proposal before Monday\'s Adani call.',
    status: 'pending', createdAt: '2026-11-21 20:15', respondedAt: null, responseNote: '' },
  { id: 'req3', from: 'Dr. Anusha Singh', to: 'Mohammed Fayazuddin', onBehalfOf: null, routedTo: null,
    proposedDate: '2026-11-24', proposedTime: '10:00', durationMin: 30,
    topic: 'EQAS result review — November submission', notes: 'Want to walk through the Mol Bio results with you before locking the EQAS pack.',
    status: 'pending', createdAt: '2026-11-21 21:00', respondedAt: null, responseNote: '' },
];


export const ACTION_EXTRAS = {
  a1: {
    subtasks: [
      { text: 'Pull AR aging query from LedgerTrace', done: true },
      { text: 'Set up recurring Monday 8 AM scheduled email', done: true },
      { text: 'Add flag for accounts > 90 DPD in red', done: false },
      { text: 'First send to CMD', done: false },
    ],
    dependencies: [],
    comments: [
      { user: 'N. Sharma', ini: 'NS', text: 'Query is ready. Testing the scheduled job now. First send should go out Monday 24th.', at: 'Thu 19 Nov · 4:32 PM' },
      { user: 'Venkata Cherukuri', ini: 'VC', text: 'Make sure the 120 DPD cutoff is clearly flagged. I want to see it at a glance.', at: 'Fri 20 Nov · 9:12 AM' },
    ],
    history: [
      { user: 'V. Cherukuri', action: 'created the action', at: 'Mon 17 Nov · 9:42 AM' },
      { user: 'N. Sharma', action: 'took ownership', at: 'Mon 17 Nov · 10:15 AM' },
      { user: 'N. Sharma', action: 'set status → in-progress', at: 'Wed 19 Nov · 11:08 AM' },
      { user: 'N. Sharma', action: 'added 2 sub-tasks', at: 'Wed 19 Nov · 11:12 AM' },
    ]
  },
  a2: {
    subtasks: [
      { text: 'Draft notice template with legal', done: false },
      { text: 'Get CMD sign-off on template', done: false },
      { text: 'Issue to the 3 identified accounts', done: false },
    ],
    dependencies: [{ id: 'a1', desc: 'Weekly AR aging snapshot', status: 'in-progress' }],
    comments: [],
    history: [
      { user: 'V. Cherukuri', action: 'created the action', at: 'Mon 17 Nov · 9:45 AM' },
      { user: 'N. Sharma', action: 'took ownership', at: 'Mon 17 Nov · 10:17 AM' },
    ]
  },
  a7: {
    subtasks: [
      { text: 'Draft v1 of mandate document', done: true },
      { text: 'Review with legal consultant', done: true },
      { text: 'CMD sign-off', done: true },
    ],
    dependencies: [],
    comments: [
      { user: 'Company Secretary', ini: 'CS', text: 'Mandate finalised and in the governance folder. Resolution text also drafted separately.', at: 'Fri 20 Nov · 2:10 PM' },
    ],
    history: [
      { user: 'V. Cherukuri', action: 'created the action', at: 'Fri 7 Nov · 12:30 PM' },
      { user: 'Company Secretary', action: 'took ownership', at: 'Fri 7 Nov · 12:33 PM' },
      { user: 'Company Secretary', action: 'set status → done', at: 'Fri 20 Nov · 2:12 PM' },
    ]
  },
  a5: {
    subtasks: [
      { text: 'Draft invite copy', done: true },
      { text: 'Co-branding design', done: false },
      { text: 'Send to Dr. Abishekh for review', done: false },
    ],
    dependencies: [],
    comments: [
      { user: 'Venkata Cherukuri', ini: 'VC', text: 'This is overdue — status?', at: 'Thu 20 Nov · 11:00 AM' },
      { user: 'Marketing Head', ini: 'MH', text: 'Design is with the agency; they committed to deliver by 23rd. Will send to Dr. Abishekh same day.', at: 'Thu 20 Nov · 11:14 AM' },
    ],
    history: [
      { user: 'V. Cherukuri', action: 'created the action', at: 'Thu 13 Nov · 4:10 PM' },
      { user: 'Marketing Head', action: 'marked as overdue', at: 'Fri 21 Nov · 12:00 AM' },
    ]
  },
};


export const TRANSCRIPT_DEMO = [
  { speaker: 'Venkata Cherukuri', chip: 's1', time: '00:00:04', text: "Good morning everyone. Let's get started. Pallavi, do we have everyone?" },
  { speaker: 'Pallavi Elisetti', chip: 's2', time: '00:00:08', text: "Yes sir, five of five internal, and the vendor reps are joining in a moment." },
  { speaker: 'Venkata Cherukuri', chip: 's1', time: '00:00:14', text: "Good. First item — branch TAT dip in weeks 45 and 46. Subramanian, what's happening?" },
  { speaker: 'V. Subramanian', chip: 's3', time: '00:00:21', text: "Two issues came together. First, the Secunderabad branch had a reagent stockout for three days in week 45. Second, the histopathology grosser was down for calibration which added roughly four hours to TAT on those samples." },
  { speaker: 'Venkata Cherukuri', chip: 's1', time: '00:00:38', text: "Okay, two different problems. The reagent stockout — who missed the trigger point?" },
  { speaker: 'V. Subramanian', chip: 's3', time: '00:00:45', text: "Material management did not re-order on time. The buffer stock was consumed faster than modelled because of the Diwali surge." },
  { speaker: 'Venkata Cherukuri', chip: 's1', time: '00:00:55', text: "Right. Decision — we need to re-calibrate the reagent ROPs for seasonality. Not only for Diwali, but for all three major surges. Who owns that?" },
  { speaker: 'V. Subramanian', chip: 's3', time: '00:01:07', text: "Material management head. I'll task him today — deliverable by month-end." },
  { speaker: 'Venkata Cherukuri', chip: 's1', time: '00:01:12', text: "Good. Note that down. On the grosser calibration — was that scheduled or emergency?" },
  { speaker: 'V. Subramanian', chip: 's3', time: '00:01:19', text: "Scheduled. It's on the AMC calendar." },
  { speaker: 'Venkata Cherukuri', chip: 's1', time: '00:01:23', text: "Then why did the calibration hit production time? That should happen in the off-shift." },
  { speaker: 'V. Subramanian', chip: 's3', time: '00:01:30', text: "Agreed. I'll take this up with BMO head. All calibrations to be slotted into the 10 PM to 6 AM window from next cycle." },
  { speaker: 'Venkata Cherukuri', chip: 's1', time: '00:01:38', text: "Decision noted. Next item — material management stock adherence more broadly." },
];

// AI summary for the demo meeting (m1) once transcription has been run.
export const AI_SUMMARY_DEMO = {
  overview: "Review surfaced two causes for the W45-W46 branch TAT dip: (1) Secunderabad reagent stockout due to ROPs not re-calibrated for Diwali surge, and (2) histopathology grosser calibration inadvertently slotted during production hours. Both have clear owners and timelines. Material stock adherence discussion deferred; other agenda items (AP cycle, bank reconciliation) run as per plan.",
  decisions: [
    { text: "Re-calibrate reagent re-order points (ROPs) for all three major seasonal surges, not just Diwali.", owner: "Material Management Head", deadline: "Month-end" },
    { text: "All equipment calibrations to be slotted into the 10 PM–6 AM off-shift window from next cycle onwards.", owner: "BMO Head", deadline: "Next cycle" },
  ],
  actions: [
    { desc: "Re-model reagent ROPs with seasonal multipliers (Diwali, year-end, summer peak)", owner: "Material Management Head", deadline: "+10 days", priority: "high" },
    { desc: "Shift all scheduled calibrations into off-shift 10 PM–6 AM window", owner: "BMO Head", deadline: "+14 days", priority: "high" },
    { desc: "Weekly branch TAT snapshot to CMD every Monday morning", owner: "COO Office", deadline: "+7 days", priority: "medium" },
  ],
  risks: [
    "Recurring theme across 3 past meetings: ROP modelling doesn't account for predictable surges — pattern worth institutionalising.",
    "Grosser down-time during production is a repeat failure — consider policy, not just this instance.",
  ]
};


// ============ ENHANCEMENTS TO EXISTING MEETINGS ============
// Adds presence / parking lot / pre-read to upcoming meetings, plus the specific
// enrichments for m1, m2, m5. Returns a deep copy so the base data stays pristine.
export function buildInitialMeetings() {
  const MEETINGS = JSON.parse(JSON.stringify(INITIAL_MEETINGS));
  MEETINGS.forEach(m => {
    if (m.status === 'upcoming') {
      m.presence = {};
      m.attendees.forEach(a => m.presence[a] = 'tbd');
      m.parkingLot = [];
      m.preRead = m.attendees.map(a => ({ name: a, opened: Math.random() > 0.3 }));
    }
  });
  // Specific meeting enrichments
  const m1 = MEETINGS.find(x => x.id === 'm1');
  if (m1) {
    m1.contributions = [
      { from: 'V. Subramanian (COO)', text: "Add discussion on Secunderabad branch TAT — hit a 3-day dip in W46", votes: 4 },
      { from: 'N. Sharma (CFO)', text: "Can we cover budget variance for Q3 ops expenses?", votes: 2 },
    ];
    m1.carriedOver = [
      { fromMeeting: 'Accounts W46 — Weekly Review', text: "Service-hold notice template — still with Legal for sign-off", owner: "N. Sharma" },
      { fromMeeting: 'Growth & Revenue Weekly', text: "Fernandez contract escalation — still pending", owner: "Arjun" },
    ];
  }
  const m5 = MEETINGS.find(x => x.id === 'm5');
  if (m5) {
    m5.polls = [
      { question: 'Resolution 1: Approval of Advisory Board formation as per mandate document', ayes: 5, noes: 0, absts: 0, passed: true },
      { question: 'Resolution 2: Approval of revised Roche supplier contract (volume/price terms)', ayes: 4, noes: 0, absts: 1, passed: true },
    ];
  }
  const m2 = MEETINGS.find(x => x.id === 'm2');
  if (m2) {
    m2.contextCard = {
      customer: 'Adani Group',
      stats: [
        { lbl: 'Revenue YTD', val: '₹0', sub: 'New account' },
        { lbl: 'Contract Value', val: '₹2.4 Cr', sub: 'Projected' },
        { lbl: 'Expected Volume', val: '12,000', sub: 'tests/yr' },
        { lbl: 'Stage', val: 'Negotiation', sub: 'Close target: Dec' },
      ],
      pastMeetings: [
        { date: '15 Oct 2026', title: 'Initial scoping call', outcome: 'Shortlisted TrustLab vs 2 others' },
        { date: '28 Oct 2026', title: 'Technical capability demo', outcome: 'Impressed with Hyd lab tour' },
        { date: '08 Nov 2026', title: 'Package tier discussion', outcome: 'Converged on 3 package tiers' },
      ]
    };
  }
  
  return MEETINGS;
}
