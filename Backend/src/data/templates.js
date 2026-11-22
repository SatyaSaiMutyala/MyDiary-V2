/**
 * The starting set of agenda templates — the 12 of web/src/data/templates.js, with the agenda items
 * each one's `agendaCount` promised in the prototype written out (text + duration).
 * Inserted by services/templates.js `ensureTemplateSeed()` when the collection is empty.
 */

/** @typedef {{ name: string, type: string, ico: string, desc: string, agenda: { text: string, time: string }[] }} TemplateSeed */

/** @type {TemplateSeed[]} */
export const TEMPLATE_SEED = [
  {
    name: 'Weekly Ops Review',
    type: 'internal',
    ico: '📊',
    desc: 'Standard weekly departmental ops review — KPIs, exceptions, open actions, decisions.',
    agenda: [
      { text: 'Opening & context setting', time: '5m' },
      { text: 'KPI dashboard — TAT, volumes, revenue', time: '15m' },
      { text: 'Exceptions & escalations', time: '10m' },
      { text: 'Open actions from last week', time: '10m' },
      { text: 'Decisions & asks', time: '10m' },
      { text: 'Next week priorities', time: '5m' },
    ],
  },
  {
    name: 'HOD Monthly Review',
    type: 'internal',
    ico: '🏢',
    desc: 'Monthly HOD check-in — monthly numbers, team health, open commitments, next-month plan.',
    agenda: [
      { text: 'Monthly numbers vs plan', time: '15m' },
      { text: 'Team health & staffing', time: '10m' },
      { text: 'Open commitments review', time: '10m' },
      { text: 'Risks & support needed', time: '10m' },
      { text: 'Next-month plan', time: '10m' },
    ],
  },
  {
    name: 'Quarterly Business Review',
    type: 'customer',
    ico: '📈',
    desc: 'Formal QBR with B2B customers — volume trends, service levels, feedback, roadmap, renewal.',
    agenda: [
      { text: 'Welcome & agenda confirmation', time: '5m' },
      { text: 'Volume trends for the quarter', time: '15m' },
      { text: 'Service levels & TAT performance', time: '15m' },
      { text: 'Customer feedback & complaints', time: '10m' },
      { text: 'Roadmap & new test offerings', time: '15m' },
      { text: 'Commercials & renewal', time: '15m' },
      { text: 'Agreed actions & next review date', time: '10m' },
    ],
  },
  {
    name: 'Customer Pitch',
    type: 'customer',
    ico: '🤝',
    desc: 'New business pitch — introduction, understanding needs, our offering, pricing, next steps.',
    agenda: [
      { text: 'Introductions', time: '5m' },
      { text: 'Understanding your needs', time: '15m' },
      { text: 'Our offering & accreditations', time: '15m' },
      { text: 'Pricing & commercial terms', time: '10m' },
      { text: 'Next steps', time: '5m' },
    ],
  },
  {
    name: 'Customer Escalation',
    type: 'customer',
    ico: '🚨',
    desc: 'Structured handling of a customer complaint — issue recap, RCA, resolution, prevention plan.',
    agenda: [
      { text: 'Issue recap as the customer sees it', time: '10m' },
      { text: 'Root cause analysis', time: '15m' },
      { text: 'Resolution & make-good', time: '15m' },
      { text: 'Prevention plan & review date', time: '10m' },
    ],
  },
  {
    name: 'Vendor Price Negotiation',
    type: 'supplier',
    ico: '💰',
    desc: 'Price review with a supplier — volume commits, price asks, SLAs, credit terms.',
    agenda: [
      { text: 'Volume commitments for the year', time: '10m' },
      { text: 'Price asks & benchmarking', time: '20m' },
      { text: 'Service levels & delivery terms', time: '15m' },
      { text: 'Credit terms & close', time: '15m' },
    ],
  },
  {
    name: 'Vendor Dispute Resolution',
    type: 'supplier',
    ico: '⚖',
    desc: 'Dispute walkthrough — timeline, RCA, commercial resolution, go-forward decision.',
    agenda: [
      { text: 'Timeline of events', time: '10m' },
      { text: 'Root cause analysis', time: '15m' },
      { text: 'Contractual position', time: '10m' },
      { text: 'Commercial resolution', time: '15m' },
      { text: 'Go-forward decision', time: '10m' },
    ],
  },
  {
    name: 'QMS Audit Review',
    type: 'consultants',
    ico: '🎓',
    desc: 'Pre-assessment or post-audit review with QMS consultant — findings, gaps, action plan.',
    agenda: [
      { text: 'Scope & readiness check', time: '10m' },
      { text: 'Audit findings & non-conformities', time: '20m' },
      { text: 'Gap analysis against the standard', time: '15m' },
      { text: 'Corrective action plan & owners', time: '15m' },
      { text: 'Assessment timeline', time: '10m' },
    ],
  },
  {
    name: 'Ordinary Board Meeting',
    type: 'board',
    ico: '⚖',
    desc: 'Statutory ordinary board meeting (Companies Act 2013) — minutes confirmation, CFO update, resolutions, AoB.',
    agenda: [
      { text: 'Quorum & confirmation of previous minutes', time: '10m' },
      { text: 'CMD report', time: '15m' },
      { text: 'CFO financial update', time: '20m' },
      { text: 'Resolutions for approval', time: '20m' },
      { text: 'Statutory & compliance matters', time: '10m' },
      { text: 'Any other business', time: '10m' },
    ],
  },
  {
    name: 'Audit Committee',
    type: 'board',
    ico: '🛡',
    desc: 'Audit committee review — audit findings, controls, risk register, compliance status.',
    agenda: [
      { text: 'Internal audit findings', time: '20m' },
      { text: 'Statutory auditor observations', time: '15m' },
      { text: 'Internal controls review', time: '15m' },
      { text: 'Risk register update', time: '15m' },
      { text: 'Compliance status', time: '10m' },
    ],
  },
  {
    name: 'AGM',
    type: 'board',
    ico: '🏛',
    desc: 'Annual general meeting — directors report, financial statements, dividend, auditor appointment.',
    agenda: [
      { text: 'Quorum & chairman opening', time: '10m' },
      { text: "Directors' report", time: '15m' },
      { text: 'Audited financial statements', time: '20m' },
      { text: 'Dividend declaration', time: '10m' },
      { text: 'Appointment / reappointment of directors', time: '15m' },
      { text: 'Appointment of auditors & remuneration', time: '10m' },
      { text: 'Shareholder questions', time: '20m' },
      { text: 'Close & vote of thanks', time: '5m' },
    ],
  },
  {
    name: '1:1 Catch-up',
    type: 'internal',
    ico: '👥',
    desc: "Lightweight 1:1 — what's on your mind, blockers, feedback, growth, follow-ups.",
    agenda: [
      { text: "What's on your mind", time: '10m' },
      { text: 'Blockers & support needed', time: '10m' },
      { text: 'Feedback both ways', time: '10m' },
      { text: 'Growth & follow-ups', time: '10m' },
    ],
  },
];

/** The `usedCount` the prototype shipped each template with, so the library looks lived-in. */
export const SEED_USED_COUNT = { 'Weekly Ops Review': 142, 'HOD Monthly Review': 36, 'Quarterly Business Review': 24, 'Customer Pitch': 18, 'Customer Escalation': 9, 'Vendor Price Negotiation': 15, 'Vendor Dispute Resolution': 6, 'QMS Audit Review': 12, 'Ordinary Board Meeting': 8, 'Audit Committee': 4, AGM: 2, '1:1 Catch-up': 68 };
