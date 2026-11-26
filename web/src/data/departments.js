// Department Master — departments, positions, shift tasks, seeds, review cadence, templates.
const DEPARTMENTS_BASE = [
  { id: 'd1', code: 'TDPL-CLIN-001', name: 'Clinical Laboratory', icon: 'lab',
    description: 'Core processing units — Biochemistry, Haematology, Serology, Microbiology, Histopathology, Molecular Biology.',
    positions: [
      { id: 'p1', name: 'Lab Technician', description: 'Operates analysers, runs IQC, processes samples' },
      { id: 'p2', name: 'Lab In-charge', description: 'Approves IQC, signs off critical values, QA oversight' },
      { id: 'p3', name: 'Phlebotomist', description: 'Sample collection and pre-analytical handling' },
    ],
    openingTasks: [
      { id: 't1', order: 1, text: 'Switch on analysers and confirm boot-up diagnostics', defaultTime: '07:00', positionId: 'p1' },
      { id: 't2', order: 2, text: 'Run daily Internal Quality Control (IQC) on all assays', defaultTime: '07:15', positionId: 'p1' },
      { id: 't3', order: 3, text: 'Review & approve IQC results; release lot for the day', defaultTime: '07:45', positionId: 'p2' },
      { id: 't4', order: 4, text: 'Set up phlebotomy stations — needles, tubes, labels, biohazard', defaultTime: '07:00', positionId: 'p3' },
      { id: 't5', order: 5, text: 'Verify reagent stock levels against day\'s expected volume', defaultTime: '07:30', positionId: null },
      { id: 't6', order: 6, text: 'Fridge & freezer temperature log readings captured', defaultTime: '07:15', positionId: null },
    ],
    closingTasks: [
      { id: 'c1', order: 1, text: 'End-of-day shut-down protocol on all analysers', defaultTime: '19:30', positionId: 'p1' },
      { id: 'c2', order: 2, text: 'Sign off day\'s critical value notification log', defaultTime: '19:00', positionId: 'p2' },
      { id: 'c3', order: 3, text: 'Clear phlebotomy counters, discard bio-waste as per BMW SOP', defaultTime: '19:00', positionId: 'p3' },
      { id: 'c4', order: 4, text: 'Fridge & freezer closing temperature log entry', defaultTime: '19:15', positionId: null },
    ],
  },
  { id: 'd2', code: 'TDPL-LOG-001', name: 'Logistics', icon: 'logistics',
    description: 'Sample transport from branches to central lab, report delivery, inter-branch movement.',
    positions: [
      { id: 'p1', name: 'Dispatch Co-ordinator', description: 'Routes planning and driver supervision' },
      { id: 'p2', name: 'Driver / Rider', description: 'Physical sample and report transport' },
    ],
    openingTasks: [
      { id: 't1', order: 1, text: 'Vehicle check — fuel, tyres, cold-box ice packs, TDPL branding', defaultTime: '06:30', positionId: 'p2' },
      { id: 't2', order: 2, text: 'Print route sheets for the day\'s pickup slots', defaultTime: '06:45', positionId: 'p1' },
      { id: 't3', order: 3, text: 'Reconcile returned reports from previous day', defaultTime: '07:00', positionId: 'p1' },
    ],
    closingTasks: [
      { id: 'c1', order: 1, text: 'Log final run delivery confirmation at each branch', defaultTime: '20:00', positionId: 'p2' },
      { id: 'c2', order: 2, text: 'Cold-box cleaning & cold-chain log', defaultTime: '20:30', positionId: 'p2' },
      { id: 'c3', order: 3, text: 'Next day\'s route plan finalised', defaultTime: '20:45', positionId: 'p1' },
    ],
  },
  { id: 'd3', code: 'TDPL-HR-001', name: 'HR', icon: 'people',
    description: 'People operations — hiring, induction, attendance, training, employee grievance.',
    positions: [
      { id: 'p1', name: 'HR Executive', description: 'Day-to-day HR ops, attendance, grievances' },
      { id: 'p2', name: 'HR Head', description: 'Strategy, approvals, escalations' },
    ],
    openingTasks: [
      { id: 't1', order: 1, text: 'Pull & review previous day\'s attendance anomalies', defaultTime: '09:00', positionId: 'p1' },
      { id: 't2', order: 2, text: 'Check interview schedule for the day; confirm with candidates', defaultTime: '09:15', positionId: 'p1' },
      { id: 't3', order: 3, text: 'Review grievance inbox and route to concerned HOD', defaultTime: '09:30', positionId: 'p1' },
    ],
    closingTasks: [
      { id: 'c1', order: 1, text: 'Close day\'s attendance exceptions with notes', defaultTime: '18:00', positionId: 'p1' },
      { id: 'c2', order: 2, text: 'Update joining tracker for tomorrow\'s inductees', defaultTime: '18:30', positionId: 'p1' },
    ],
  },
  { id: 'd4', code: 'TDPL-PROC-001', name: 'Procurement', icon: 'cart',
    description: 'Vendor management, PO raising, stock replenishment for reagents, consumables, non-medical supplies.',
    positions: [
      { id: 'p1', name: 'Procurement Executive', description: 'POs, vendor quotations, follow-ups' },
      { id: 'p2', name: 'Procurement Head', description: 'Strategic sourcing, price negotiations, approvals' },
    ],
    openingTasks: [
      { id: 't1', order: 1, text: 'Review indent queue from BMO, MM, Clinical, Admin', defaultTime: '09:30', positionId: 'p1' },
      { id: 't2', order: 2, text: 'Check pending vendor confirmations on yesterday\'s POs', defaultTime: '09:45', positionId: 'p1' },
      { id: 't3', order: 3, text: 'Approve POs > ₹50K (escalation queue)', defaultTime: '10:00', positionId: 'p2' },
    ],
    closingTasks: [
      { id: 'c1', order: 1, text: 'Log vendor follow-up calls made & pending', defaultTime: '18:00', positionId: 'p1' },
      { id: 'c2', order: 2, text: 'Update next-day priority indent list', defaultTime: '18:30', positionId: 'p1' },
    ],
  },
  { id: 'd5', code: 'TDPL-ARC-001', name: 'Audit, Risk & Compliance', icon: 'quality',
    description: 'Internal audit, statutory compliance tracker, risk register maintenance, NCR follow-ups.',
    positions: [
      { id: 'p1', name: 'Compliance Officer', description: 'Compliance calendar, filing deadlines, NCR tracking' },
      { id: 'p2', name: 'Internal Auditor', description: 'Branch audits, process audits, findings' },
    ],
    openingTasks: [
      { id: 't1', order: 1, text: 'Compliance calendar — today\'s due filings flagged', defaultTime: '09:30', positionId: 'p1' },
      { id: 't2', order: 2, text: 'Open NCRs status update to responsible HODs', defaultTime: '10:00', positionId: 'p1' },
      { id: 't3', order: 3, text: 'Today\'s audit schedule review', defaultTime: '09:45', positionId: 'p2' },
    ],
    closingTasks: [
      { id: 'c1', order: 1, text: 'Log day\'s compliance actions and acknowledgements', defaultTime: '18:00', positionId: 'p1' },
      { id: 'c2', order: 2, text: 'Audit findings entered in audit log', defaultTime: '18:30', positionId: 'p2' },
    ],
  },
  { id: 'd6', code: 'TDPL-MM-001', name: 'Material Management', icon: 'package',
    description: 'Inward/outward stock movement, warehouse, ROP, expiry tracker, inter-branch transfers.',
    positions: [
      { id: 'p1', name: 'Store Keeper', description: 'Physical inward/outward, shelving, cycle count' },
      { id: 'p2', name: 'Material Head', description: 'ROP governance, expiry mgmt, branch distribution' },
    ],
    openingTasks: [
      { id: 't1', order: 1, text: 'Open warehouse; temperature log for cold storage', defaultTime: '08:00', positionId: 'p1' },
      { id: 't2', order: 2, text: 'Verify yesterday\'s inward GRN against PO; flag mismatches', defaultTime: '08:15', positionId: 'p1' },
      { id: 't3', order: 3, text: 'Items nearing expiry (30-day window) flagged for distribution', defaultTime: '08:30', positionId: 'p2' },
      { id: 't4', order: 4, text: 'Branch-wise reagent request list reviewed and released', defaultTime: '09:00', positionId: 'p2' },
    ],
    closingTasks: [
      { id: 'c1', order: 1, text: 'Day\'s inward + outward reconciliation', defaultTime: '19:00', positionId: 'p1' },
      { id: 'c2', order: 2, text: 'Close warehouse; cold storage closing temperature log', defaultTime: '19:30', positionId: 'p1' },
    ],
  },
  { id: 'd7', code: 'TDPL-IT-001', name: 'Information Technology', icon: 'computer',
    description: 'LIS/HIS uptime, network, hardware, user access, software module releases, data integrity.',
    positions: [
      { id: 'p1', name: 'Support Executive', description: 'L1/L2 helpdesk, user access, hardware issues' },
      { id: 'p2', name: 'IT Head', description: 'Infra, LIS, security, dev liaison with Pavan/Satya' },
    ],
    openingTasks: [
      { id: 't1', order: 1, text: 'LIS/HIS uptime check — Begumpet + all 14 branch endpoints', defaultTime: '07:30', positionId: 'p1' },
      { id: 't2', order: 2, text: 'Overnight backup success verified', defaultTime: '07:45', positionId: 'p1' },
      { id: 't3', order: 3, text: 'Helpdesk ticket queue reviewed & prioritised', defaultTime: '09:00', positionId: 'p1' },
      { id: 't4', order: 4, text: 'Review any security alerts from overnight', defaultTime: '08:00', positionId: 'p2' },
    ],
    closingTasks: [
      { id: 'c1', order: 1, text: 'Day\'s open tickets logged with status', defaultTime: '18:30', positionId: 'p1' },
      { id: 'c2', order: 2, text: 'Scheduled nightly backup confirmed queued', defaultTime: '19:00', positionId: 'p1' },
    ],
  },
  { id: 'd8', code: 'TDPL-CSD-001', name: 'Customer Service Desk (CSD)', icon: 'phone',
    description: 'Front-desk patient queries, appointment confirmations, complaint handling, report release requests.',
    positions: [
      { id: 'p1', name: 'CSD Executive', description: 'Phone, walk-in, WhatsApp query handling' },
      { id: 'p2', name: 'CSD Supervisor', description: 'Escalations, SLA monitoring, coaching' },
    ],
    openingTasks: [
      { id: 't1', order: 1, text: 'Login to CRM; check overnight voicemails & WhatsApp queue', defaultTime: '08:30', positionId: 'p1' },
      { id: 't2', order: 2, text: 'Today\'s report-release requests triaged', defaultTime: '09:00', positionId: 'p1' },
      { id: 't3', order: 3, text: 'Yesterday\'s complaint closure status review', defaultTime: '09:15', positionId: 'p2' },
    ],
    closingTasks: [
      { id: 'c1', order: 1, text: 'EOD summary — queries handled, pending, SLA breaches', defaultTime: '19:00', positionId: 'p2' },
    ],
  },
  { id: 'd9', code: 'TDPL-CRM-001', name: 'CRM / Home Collections', icon: 'home',
    description: 'Doctor relationship management, home-collection operations, loyalty programme, refer-a-friend.',
    positions: [
      { id: 'p1', name: 'Home Collection Phlebotomist', description: 'Field sample collection at patient homes' },
      { id: 'p2', name: 'CRM Executive', description: 'Doctor outreach, referral tracking, CRM data entry' },
      { id: 'p3', name: 'CRM Head', description: 'Strategy, campaigns, home-collection operations' },
    ],
    openingTasks: [
      { id: 't1', order: 1, text: 'Day\'s home-collection roster reviewed & assigned', defaultTime: '07:00', positionId: 'p3' },
      { id: 't2', order: 2, text: 'Carry-bag check — kits, ID, cold-box, device, uniform', defaultTime: '07:15', positionId: 'p1' },
      { id: 't3', order: 3, text: 'Doctor visit plan for the day pulled from CRM', defaultTime: '09:00', positionId: 'p2' },
    ],
    closingTasks: [
      { id: 'c1', order: 1, text: 'All samples deposited at lab; feedback form submitted', defaultTime: '18:00', positionId: 'p1' },
      { id: 'c2', order: 2, text: 'Day\'s doctor interactions logged in CRM with outcome', defaultTime: '18:30', positionId: 'p2' },
    ],
  },
  { id: 'd10', code: 'TDPL-BMO-001', name: 'Biomedical (BMO)', icon: 'engineering',
    description: 'Equipment uptime, calibration, AMC, preventive maintenance, breakdown response.',
    positions: [
      { id: 'p1', name: 'Biomedical Engineer', description: 'Daily rounds, calibration checks, breakdown fixes' },
      { id: 'p2', name: 'BMO Head', description: 'AMC contracts, capex planning, vendor management' },
    ],
    openingTasks: [
      { id: 't1', order: 1, text: 'Morning equipment round — all critical analysers status check', defaultTime: '07:30', positionId: 'p1' },
      { id: 't2', order: 2, text: 'Calibration due-today list reviewed', defaultTime: '08:00', positionId: 'p1' },
      { id: 't3', order: 3, text: 'AMC visit calendar — vendor visits scheduled for today', defaultTime: '09:00', positionId: 'p2' },
    ],
    closingTasks: [
      { id: 'c1', order: 1, text: 'Day\'s breakdown log closed', defaultTime: '19:00', positionId: 'p1' },
      { id: 'c2', order: 2, text: 'AMC vendor visit outcomes recorded', defaultTime: '19:15', positionId: 'p2' },
    ],
  },
  { id: 'd11', code: 'TDPL-QMS-001', name: 'Quality (QMS)', icon: 'quality',
    description: 'ISO 15189 compliance, NCR follow-ups, document control, internal audits, management reviews.',
    positions: [
      { id: 'p1', name: 'Quality Officer', description: 'Document control, EQAS data, IQC trend analysis' },
      { id: 'p2', name: 'Quality Manager', description: 'Audit lead, MR, NCR disposition' },
    ],
    openingTasks: [
      { id: 't1', order: 1, text: 'EQAS/PT submission deadlines reviewed', defaultTime: '09:00', positionId: 'p1' },
      { id: 't2', order: 2, text: 'IQC trend charts — any out-of-control flags escalated', defaultTime: '09:15', positionId: 'p1' },
      { id: 't3', order: 3, text: 'NCR follow-up calls planned for the day', defaultTime: '10:00', positionId: 'p2' },
    ],
    closingTasks: [
      { id: 'c1', order: 1, text: 'Day\'s NCR movements updated in QMS portal', defaultTime: '18:00', positionId: 'p2' },
    ],
  },
  { id: 'd12', code: 'TDPL-TAT-001', name: 'TAT (Turn-Around-Time)', icon: '⏱',
    description: 'End-to-end TAT governance — DOS targets, outlier investigation, reporting, process improvement.',
    positions: [
      { id: 'p1', name: 'TAT Analyst', description: 'Daily DOS pull, outlier identification, root-cause' },
    ],
    openingTasks: [
      { id: 't1', order: 1, text: 'Pull yesterday\'s DOS vs target by test group', defaultTime: '09:30', positionId: 'p1' },
      { id: 't2', order: 2, text: 'Identify tests breaching TAT; initiate root-cause with HOD', defaultTime: '10:00', positionId: 'p1' },
    ],
    closingTasks: [
      { id: 'c1', order: 1, text: 'EOD TAT dashboard refresh and share with CMD', defaultTime: '19:00', positionId: 'p1' },
    ],
  },
  { id: 'd13', code: 'TDPL-AP-001', name: 'Accounts Payable', icon: 'money',
    description: 'Vendor invoice processing, payment runs, GST reconciliation, TDS, vendor reconciliation.',
    positions: [
      { id: 'p1', name: 'AP Executive', description: 'Invoice entry, 3-way match, payment scheduling' },
    ],
    openingTasks: [
      { id: 't1', order: 1, text: 'Check vendor invoice inbox; register new invoices', defaultTime: '09:30', positionId: 'p1' },
      { id: 't2', order: 2, text: '3-way match — PO, GRN, invoice', defaultTime: '10:00', positionId: 'p1' },
    ],
    closingTasks: [
      { id: 'c1', order: 1, text: 'Day\'s payment schedule queued for next-day approval', defaultTime: '18:00', positionId: 'p1' },
    ],
  },
  { id: 'd14', code: 'TDPL-AR-001', name: 'Accounts Receivable', icon: 'money',
    description: 'Corporate billing, B2B invoicing, collection follow-ups, credit control, revenue recognition.',
    positions: [
      { id: 'p1', name: 'AR Executive', description: 'Invoicing, collection calls, receipt posting' },
    ],
    openingTasks: [
      { id: 't1', order: 1, text: 'Overdue invoices > 30 days — call list for the day', defaultTime: '09:30', positionId: 'p1' },
      { id: 't2', order: 2, text: 'Previous day\'s receipts posted in TruFlow', defaultTime: '10:00', positionId: 'p1' },
    ],
    closingTasks: [
      { id: 'c1', order: 1, text: 'Day\'s collection outcomes logged with next-step date', defaultTime: '18:00', positionId: 'p1' },
    ],
  },
  { id: 'd15', code: 'TDPL-CA-001', name: 'Corporate Affairs', icon: 'board',
    description: 'Secretarial, statutory filings, board governance, licences, legal matters, intellectual property.',
    positions: [
      { id: 'p1', name: 'Company Secretary', description: 'ROC filings, board meetings, resolutions' },
      { id: 'p2', name: 'Legal Executive', description: 'Contracts review, vendor agreements, disputes' },
    ],
    openingTasks: [
      { id: 't1', order: 1, text: 'MCA portal — any new circulars / due filings review', defaultTime: '10:00', positionId: 'p1' },
      { id: 't2', order: 2, text: 'Contract renewals due this month — status check', defaultTime: '10:30', positionId: 'p2' },
    ],
    closingTasks: [
      { id: 'c1', order: 1, text: 'Day\'s documents sent for signature logged', defaultTime: '18:00', positionId: 'p1' },
    ],
  },
  { id: 'd16', code: 'TDPL-CS-001', name: 'Corporate Services (Business Head)', icon: 'briefcase',
    description: 'Cross-functional oversight — Finance, Admin, HR, Legal rollup; CFO/CAO office.',
    positions: [
      { id: 'p1', name: 'Business Head — Corporate Services', description: 'Oversight across CFO/CAO verticals' },
    ],
    openingTasks: [
      { id: 't1', order: 1, text: 'Overnight finance / admin / HR escalations review', defaultTime: '09:30', positionId: 'p1' },
      { id: 't2', order: 2, text: 'Today\'s approval queue triaged', defaultTime: '10:00', positionId: 'p1' },
    ],
    closingTasks: [
      { id: 'c1', order: 1, text: 'EOD rollup to CMD of pending items', defaultTime: '19:00', positionId: 'p1' },
    ],
  },
  { id: 'd17', code: 'TDPL-EA-001', name: 'EA to CMD', icon: 'book',
    description: 'Executive support — calendar, travel, correspondence, meeting prep, follow-ups.',
    positions: [
      { id: 'p1', name: 'Executive Assistant', description: 'Full EA scope' },
    ],
    openingTasks: [
      { id: 't1', order: 1, text: 'CMD\'s calendar for the day reviewed; confirmations sent', defaultTime: '08:00', positionId: 'p1' },
      { id: 't2', order: 2, text: 'Day\'s meeting prep notes assembled', defaultTime: '08:30', positionId: 'p1' },
      { id: 't3', order: 3, text: 'Yesterday\'s action-items follow-up calls / nudges', defaultTime: '09:00', positionId: 'p1' },
    ],
    closingTasks: [
      { id: 'c1', order: 1, text: 'Tomorrow\'s calendar finalised with briefs', defaultTime: '18:30', positionId: 'p1' },
    ],
  },
  { id: 'd18', code: 'TDPL-CMD-001', name: 'CMD Office', icon: 'cmd',
    description: 'Chairman & Managing Director — approvals, governance, oversight, strategy. The apex of TrustLab.',
    positions: [
      { id: 'p1', name: 'CMD', description: 'Chairman & Managing Director' },
      { id: 'p2', name: 'CGO', description: 'Chief Growth Officer — commercial strategy & delivery' },
    ],
    openingTasks: [
      { id: 't1', order: 1, text: 'Check CMD Approval Hub — clear pending approvals from all departments', defaultTime: '07:00', positionId: 'p1' },
      { id: 't2', order: 2, text: 'Review overnight escalations flagged by EA / HODs', defaultTime: '07:15', positionId: 'p1' },
      { id: 't3', order: 3, text: 'KPI dashboard review — yesterday\'s numbers vs plan', defaultTime: '07:30', positionId: 'p1' },
      { id: 't4', order: 4, text: 'Scan Notifications & inbox — route & delegate to EA', defaultTime: '07:45', positionId: 'p1' },
      { id: 't5', order: 5, text: 'Day\'s calendar walk-through with EA', defaultTime: '08:00', positionId: 'p1' },
      { id: 't6', order: 6, text: 'Sales pipeline review — this week\'s open deals', defaultTime: '09:00', positionId: 'p2' },
    ],
    closingTasks: [
      { id: 'c1', order: 1, text: 'Day\'s decisions logged in Decisions Registry', defaultTime: '19:00', positionId: 'p1' },
      { id: 'c2', order: 2, text: 'Any open approvals in Approval Hub cleared before end-of-day', defaultTime: '19:15', positionId: 'p1' },
      { id: 'c3', order: 3, text: 'Tomorrow\'s calendar + priorities confirmed with EA', defaultTime: '19:30', positionId: 'p1' },
      { id: 'c4', order: 4, text: 'EOD rollup from Business Head reviewed', defaultTime: '19:45', positionId: 'p1' },
    ],
  },
];

// Pre-seed weekly & monthly tasks for the 17 departments
// Day of week: 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat, 0=Sun
// Day of month: 1-28 (or 'last' for last day)

export const DEPT_SEED = {
  d1: { // Clinical Laboratory
    weekly: [
      { order: 1, text: 'Review week\'s EQAS/PT submission queue and assign owners', defaultTime: '10:00', positionId: 'p2', dayOfWeek: 1 },
      { order: 2, text: 'Weekly IQC trend analysis — flag any drifts for review', defaultTime: '11:00', positionId: 'p2', dayOfWeek: 1 },
      { order: 3, text: 'Internal spot-audit of one lab section (random pick)', defaultTime: '14:00', positionId: 'p2', dayOfWeek: 5 },
    ],
    monthly: [
      { order: 1, text: 'Month\'s IQC trend charts prepared and signed off', defaultTime: '11:00', positionId: 'p2', dayOfMonth: 1 },
      { order: 2, text: 'Submit EQAS results for the previous month', defaultTime: '14:00', positionId: 'p2', dayOfMonth: 5 },
      { order: 3, text: 'Monthly rejection-rate report for all sections', defaultTime: '15:00', positionId: 'p2', dayOfMonth: 3 },
    ],
  },
  d2: { // Logistics
    weekly: [
      { order: 1, text: 'Vehicle preventive maintenance check — all fleet', defaultTime: '09:00', positionId: 'p1', dayOfWeek: 0 },
      { order: 2, text: 'Weekly route-optimisation review with branch managers', defaultTime: '11:00', positionId: 'p1', dayOfWeek: 1 },
    ],
    monthly: [
      { order: 1, text: 'Fuel consumption + mileage report for the fleet', defaultTime: '10:00', positionId: 'p1', dayOfMonth: 1 },
      { order: 2, text: 'Cold-chain breach incidents review for the month', defaultTime: '14:00', positionId: 'p1', dayOfMonth: 3 },
    ],
  },
  d3: { // HR
    weekly: [
      { order: 1, text: 'Previous week\'s attendance summary to all HODs', defaultTime: '10:00', positionId: 'p1', dayOfWeek: 1 },
      { order: 2, text: 'Birthdays & anniversaries list for coming week', defaultTime: '15:00', positionId: 'p1', dayOfWeek: 5 },
      { order: 3, text: 'Hiring pipeline review — all open positions', defaultTime: '11:00', positionId: 'p2', dayOfWeek: 1 },
    ],
    monthly: [
      { order: 1, text: 'Payroll inputs locked and submitted to Finance', defaultTime: '11:00', positionId: 'p2', dayOfMonth: 1 },
      { order: 2, text: 'Attendance exceptions summary to CMD', defaultTime: '14:00', positionId: 'p2', dayOfMonth: 5 },
      { order: 3, text: 'Monthly attrition + joining report', defaultTime: '15:00', positionId: 'p2', dayOfMonth: 3 },
    ],
  },
  d4: { // Procurement
    weekly: [
      { order: 1, text: 'Vendor performance scorecard update', defaultTime: '11:00', positionId: 'p2', dayOfWeek: 1 },
      { order: 2, text: 'Open-PO ageing review; chase overdue ones', defaultTime: '14:00', positionId: 'p1', dayOfWeek: 5 },
    ],
    monthly: [
      { order: 1, text: 'Monthly consumption vs budget by category', defaultTime: '11:00', positionId: 'p2', dayOfMonth: 1 },
      { order: 2, text: 'Supplier rate card revision / renegotiation review', defaultTime: '14:00', positionId: 'p2', dayOfMonth: 25 },
    ],
  },
  d5: { // ARC
    weekly: [
      { order: 1, text: 'Compliance tracker — this week\'s due filings flagged', defaultTime: '10:00', positionId: 'p1', dayOfWeek: 1 },
      { order: 2, text: 'Open NCRs ageing report to HODs', defaultTime: '14:00', positionId: 'p1', dayOfWeek: 5 },
    ],
    monthly: [
      { order: 1, text: 'All statutory filings due this month — status pack', defaultTime: '11:00', positionId: 'p1', dayOfMonth: 1 },
      { order: 2, text: 'Monthly internal audit of one department', defaultTime: '10:00', positionId: 'p2', dayOfMonth: 15 },
      { order: 3, text: 'Risk register refresh for CMD review', defaultTime: '15:00', positionId: 'p1', dayOfMonth: 25 },
    ],
  },
  d6: { // Material Management
    weekly: [
      { order: 1, text: 'Weekly reagent consumption vs forecast', defaultTime: '10:00', positionId: 'p2', dayOfWeek: 1 },
      { order: 2, text: 'Items expiring in next 30 days — distribution plan', defaultTime: '14:00', positionId: 'p2', dayOfWeek: 5 },
    ],
    monthly: [
      { order: 1, text: 'Monthly stock valuation & variance report', defaultTime: '11:00', positionId: 'p2', dayOfMonth: 1 },
      { order: 2, text: 'ROP re-calibration across all SKUs', defaultTime: '14:00', positionId: 'p2', dayOfMonth: 25 },
    ],
  },
  d7: { // IT
    weekly: [
      { order: 1, text: 'Patch-Tuesday deployment status review', defaultTime: '11:00', positionId: 'p2', dayOfWeek: 3 },
      { order: 2, text: 'User-access review — terminations + role changes', defaultTime: '14:00', positionId: 'p1', dayOfWeek: 5 },
      { order: 3, text: 'LIS/HIS uptime scorecard for the week', defaultTime: '15:00', positionId: 'p2', dayOfWeek: 1 },
    ],
    monthly: [
      { order: 1, text: 'Monthly uptime / incident report to CMD', defaultTime: '11:00', positionId: 'p2', dayOfMonth: 1 },
      { order: 2, text: 'Data backup restore drill (DR test)', defaultTime: '10:00', positionId: 'p2', dayOfMonth: 15 },
    ],
  },
  d8: { // CSD
    weekly: [
      { order: 1, text: 'Weekly complaint & query trend report', defaultTime: '10:00', positionId: 'p2', dayOfWeek: 1 },
    ],
    monthly: [
      { order: 1, text: 'Monthly SLA scorecard + Net-Promoter insights', defaultTime: '11:00', positionId: 'p2', dayOfMonth: 1 },
    ],
  },
  d9: { // CRM / Home Collections
    weekly: [
      { order: 1, text: 'Weekly doctor-touch coverage report by territory', defaultTime: '10:00', positionId: 'p3', dayOfWeek: 5 },
      { order: 2, text: 'Home-collection SLA review — breaches + recovery', defaultTime: '14:00', positionId: 'p3', dayOfWeek: 1 },
    ],
    monthly: [
      { order: 1, text: 'Loyalty programme signups + referrals report', defaultTime: '11:00', positionId: 'p3', dayOfMonth: 1 },
      { order: 2, text: 'Referral revenue vs target by doctor / clinic', defaultTime: '14:00', positionId: 'p3', dayOfMonth: 3 },
    ],
  },
  d10: { // BMO
    weekly: [
      { order: 1, text: 'Calibration due this week — assign engineers', defaultTime: '10:00', positionId: 'p2', dayOfWeek: 1 },
      { order: 2, text: 'Breakdown trend — equipment with repeat failures', defaultTime: '14:00', positionId: 'p2', dayOfWeek: 5 },
    ],
    monthly: [
      { order: 1, text: 'AMC renewals due next month — vendor engagement', defaultTime: '11:00', positionId: 'p2', dayOfMonth: 25 },
      { order: 2, text: 'Monthly uptime scorecard per analyser', defaultTime: '14:00', positionId: 'p2', dayOfMonth: 1 },
    ],
  },
  d11: { // QMS
    weekly: [
      { order: 1, text: 'NCR ageing & closure-rate report', defaultTime: '11:00', positionId: 'p2', dayOfWeek: 1 },
      { order: 2, text: 'Document control — version expiries flagged', defaultTime: '14:00', positionId: 'p1', dayOfWeek: 5 },
    ],
    monthly: [
      { order: 1, text: 'Management Review Meeting prep pack', defaultTime: '10:00', positionId: 'p2', dayOfMonth: 10 },
      { order: 2, text: 'IQC monthly rollup for CMD', defaultTime: '14:00', positionId: 'p2', dayOfMonth: 1 },
    ],
  },
  d12: { // TAT
    weekly: [
      { order: 1, text: 'Previous week TAT breach patterns + root cause', defaultTime: '10:00', positionId: 'p1', dayOfWeek: 1 },
    ],
    monthly: [
      { order: 1, text: 'Monthly TAT scorecard to CMD by test group', defaultTime: '11:00', positionId: 'p1', dayOfMonth: 1 },
      { order: 2, text: 'Outsource & LPD TAT review', defaultTime: '14:00', positionId: 'p1', dayOfMonth: 3 },
    ],
  },
  d13: { // AP
    weekly: [
      { order: 1, text: 'Weekly payment run — approvals pack to CFO', defaultTime: '14:00', positionId: 'p1', dayOfWeek: 1 },
    ],
    monthly: [
      { order: 1, text: 'Month-end vendor payment run', defaultTime: '14:00', positionId: 'p1', dayOfMonth: 25 },
      { order: 2, text: 'GST reconciliation for previous month', defaultTime: '11:00', positionId: 'p1', dayOfMonth: 5 },
      { order: 3, text: 'TDS deduction register + challan reconciliation', defaultTime: '15:00', positionId: 'p1', dayOfMonth: 5 },
    ],
  },
  d14: { // AR
    weekly: [
      { order: 1, text: 'Overdue invoices > 30 days — chase list', defaultTime: '10:00', positionId: 'p1', dayOfWeek: 1 },
    ],
    monthly: [
      { order: 1, text: 'Month-end collection drive — call every open account', defaultTime: '10:00', positionId: 'p1', dayOfMonth: 25 },
      { order: 2, text: 'Monthly ageing report to CMD + bad-debt flag', defaultTime: '11:00', positionId: 'p1', dayOfMonth: 1 },
    ],
  },
  d15: { // Corporate Affairs
    weekly: [
      { order: 1, text: 'Statutory calendar — this week\'s filings status', defaultTime: '10:00', positionId: 'p1', dayOfWeek: 1 },
    ],
    monthly: [
      { order: 1, text: 'GST return filing (GSTR-1, 3B)', defaultTime: '14:00', positionId: 'p1', dayOfMonth: 11 },
      { order: 2, text: 'TDS return filing', defaultTime: '14:00', positionId: 'p1', dayOfMonth: 7 },
      { order: 3, text: 'PF / ESI return filing', defaultTime: '11:00', positionId: 'p1', dayOfMonth: 15 },
      { order: 4, text: 'Board resolution register updated for the month', defaultTime: '15:00', positionId: 'p1', dayOfMonth: 25 },
    ],
  },
  d16: { // Corporate Services (Business Head)
    weekly: [
      { order: 1, text: 'Weekly rollup of Finance, HR, Admin KPIs to CMD', defaultTime: '10:00', positionId: 'p1', dayOfWeek: 1 },
      { order: 2, text: 'Approval queue review across verticals', defaultTime: '14:00', positionId: 'p1', dayOfWeek: 5 },
    ],
    monthly: [
      { order: 1, text: 'Monthly corporate scorecard to CMD + board pack prep', defaultTime: '11:00', positionId: 'p1', dayOfMonth: 1 },
    ],
  },
  d17: { // EA
    weekly: [
      { order: 1, text: 'Week ahead — CMD\'s calendar shared with household + office', defaultTime: '09:00', positionId: 'p1', dayOfWeek: 0 },
      { order: 2, text: 'Last week\'s action-items follow-up status to CMD', defaultTime: '10:00', positionId: 'p1', dayOfWeek: 1 },
    ],
    monthly: [
      { order: 1, text: 'Previous month expense claims assembled & submitted', defaultTime: '11:00', positionId: 'p1', dayOfMonth: 1 },
      { order: 2, text: 'Travel calendar for next month finalised', defaultTime: '15:00', positionId: 'p1', dayOfMonth: 25 },
    ],
  },
  d18: { // CMD Office
    weekly: [
      { order: 1, text: 'Weekly Review Meeting — all HODs, previous week\'s performance', defaultTime: '10:00', positionId: 'p1', dayOfWeek: 6 },
      { order: 2, text: 'Weekly P&L review with CFO', defaultTime: '15:00', positionId: 'p1', dayOfWeek: 5 },
      { order: 3, text: 'Week ahead planning with EA — priorities & calendar', defaultTime: '09:30', positionId: 'p1', dayOfWeek: 1 },
      { order: 4, text: 'Weekly sales pipeline + forecast review with CGO', defaultTime: '14:00', positionId: 'p1', dayOfWeek: 2 },
      { order: 5, text: 'CMD Approval Hub — weekly backlog sweep', defaultTime: '11:00', positionId: 'p1', dayOfWeek: 5 },
      { order: 6, text: 'Weekly commercial review — pipeline, closures, slippages', defaultTime: '11:00', positionId: 'p2', dayOfWeek: 1 },
    ],
    monthly: [
      { order: 1, text: 'Monthly Business Review (MBR) with all heads — full P&L + KPIs', defaultTime: '10:00', positionId: 'p1', dayOfMonth: 7 },
      { order: 2, text: 'Previous month P&L sign-off with CFO', defaultTime: '11:00', positionId: 'p1', dayOfMonth: 5 },
      { order: 3, text: 'Board pack prep review', defaultTime: '14:00', positionId: 'p1', dayOfMonth: 15 },
      { order: 4, text: 'Growth & Strategy session — next 90 days plan', defaultTime: '10:00', positionId: 'p1', dayOfMonth: 25 },
      { order: 5, text: 'Monthly KPI scorecard review (all 17 depts)', defaultTime: '09:00', positionId: 'p1', dayOfMonth: 3 },
      { order: 6, text: 'CapEx & major approvals sign-off batch', defaultTime: '15:00', positionId: 'p1', dayOfMonth: 20 },
      { order: 7, text: 'Monthly commercial forecast & target-setting', defaultTime: '11:00', positionId: 'p2', dayOfMonth: 5 },
    ],
  },
};

// Normalise: ensure every dept has weekly + monthly arrays, and seed demo data from DEPT_SEED

export const REVIEW_CADENCE_SEED = {
  d1: { // Clinical Laboratory
    weekly: { daysOfWeek: [4], time: '08:30', duration: 45 },   // Thursday 8:30 AM
    monthly: { dayOfMonth: 5, time: '10:00', duration: 90 },
    owner: 'Lab Head · Dr. Anusha Singh',
    primarySystems: ['LIS', 'EQAS Portal', 'QMS'],
    weeklyAgenda: [
      { id: 'a1', order: 1, heading: 'IQC Performance', points: [
        { id: 'p1', text: 'IQC out-of-control events this week — root cause + CAPA', indicator: 'red' },
        { id: 'p2', text: 'Levey-Jennings trend review per analyser' },
        { id: 'p3', text: 'Lot-change validation outcomes' },
      ]},
      { id: 'a2', order: 2, heading: 'TAT & Rejections', points: [
        { id: 'p4', text: 'Tests breaching TAT this week — by discipline', indicator: 'amber' },
        { id: 'p5', text: 'Sample rejection count + root cause' },
        { id: 'p6', text: 'Critical values communicated on time? (any misses)' },
      ]},
      { id: 'a3', order: 3, heading: 'Equipment & Reagents', points: [
        { id: 'p7', text: 'Equipment breakdown incidents' },
        { id: 'p8', text: 'Reagent stock health — any shortages ahead' },
        { id: 'p9', text: 'AMC visits this week — outcomes' },
      ]},
    ],
    monthlyAgenda: [
      { id: 'a1', order: 1, heading: 'Monthly IQC Rollup', points: [
        { id: 'p1', text: 'Monthly CV% per assay vs vendor claim' },
        { id: 'p2', text: 'IQC pass rate by discipline' },
        { id: 'p3', text: 'EQAS submission done + results review' },
      ]},
      { id: 'a2', order: 2, heading: 'TAT Scorecard', points: [
        { id: 'p4', text: 'Monthly TAT by test category vs target' },
        { id: 'p5', text: 'Outsource & LPD TAT variance' },
      ]},
      { id: 'a3', order: 3, heading: 'NCR Status', points: [
        { id: 'p6', text: 'NCRs raised this month vs closed' },
        { id: 'p7', text: 'Ageing NCRs — root cause + closure plan' },
      ]},
    ],
  },
  d6: { // Material Management
    weekly: { daysOfWeek: [4], time: '09:30', duration: 45 },
    monthly: { dayOfMonth: 4, time: '10:00', duration: 90 },
    owner: 'Head of Stores / Materials',
    primarySystems: ['TruFlow · Forecast Module', 'GRN Portal'],
    weeklyAgenda: [
      { id: 'a1', order: 1, heading: 'Stockouts & Near-Stockouts', points: [
        { id: 'p1', text: 'Stockout incidents this week — tests delayed / cancelled (link to Clinical Ops)', indicator: 'red' },
        { id: 'p2', text: 'Items at min stock — branch-wise' },
        { id: 'p3', text: 'Critical reagents flagged' },
      ]},
      { id: 'a2', order: 2, heading: 'Expiry Watch', points: [
        { id: 'p4', text: 'Items expiring in 30 days — value & quantity' },
        { id: 'p5', text: 'Mitigation: transfer / accelerated use / write-off plan' },
        { id: 'p6', text: 'Items expired this week — write-off value', indicator: 'amber' },
      ]},
      { id: 'a3', order: 3, heading: 'Branch Stock Health', points: [
        { id: 'p7', text: 'Inter-branch transfers requested vs delivered' },
        { id: 'p8', text: 'Reagent consumption vs forecast — variance by branch' },
        { id: 'p9', text: 'Cold-chain breach incidents' },
      ]},
    ],
    monthlyAgenda: [
      { id: 'a1', order: 1, heading: 'Monthly Stock Valuation', points: [
        { id: 'p1', text: 'Closing stock value — variance vs last month' },
        { id: 'p2', text: 'Dead stock + obsolete items' },
        { id: 'p3', text: 'Stock turn (days)' },
      ]},
      { id: 'a2', order: 2, heading: 'Supplier Performance', points: [
        { id: 'p4', text: 'On-time delivery scorecard by supplier' },
        { id: 'p5', text: 'Rejection rate by supplier' },
        { id: 'p6', text: 'Pricing drift vs contract' },
      ]},
      { id: 'a3', order: 3, heading: 'ROP Governance', points: [
        { id: 'p7', text: 'ROP recalibration for next quarter' },
        { id: 'p8', text: 'SKUs added / retired this month' },
      ]},
    ],
  },
  d11: { // Quality (QMS)
    weekly: { daysOfWeek: [1], time: '11:00', duration: 45 },   // Mondays
    monthly: { dayOfMonth: 10, time: '14:00', duration: 90 },
    owner: 'Quality Manager · Mohammed Fayazuddin',
    primarySystems: ['QMS Portal', 'NCR Register'],
    weeklyAgenda: [
      { id: 'a1', order: 1, heading: 'NCR Register', points: [
        { id: 'p1', text: 'NCRs raised this week — by discipline' },
        { id: 'p2', text: 'NCRs closed this week with CAPA evidence' },
        { id: 'p3', text: 'Ageing NCRs > 30 days', indicator: 'red' },
      ]},
      { id: 'a2', order: 2, heading: 'Document Control', points: [
        { id: 'p4', text: 'SOPs due for review in next 30 days' },
        { id: 'p5', text: 'Version-expiry breaches', indicator: 'amber' },
      ]},
      { id: 'a3', order: 3, heading: 'Audit Calendar', points: [
        { id: 'p6', text: 'Audits conducted this week + findings' },
        { id: 'p7', text: 'Next week\'s audit schedule' },
      ]},
    ],
    monthlyAgenda: [
      { id: 'a1', order: 1, heading: 'Management Review Meeting Input', points: [
        { id: 'p1', text: 'IQC & EQAS monthly scorecards consolidated' },
        { id: 'p2', text: 'Customer complaints trend' },
        { id: 'p3', text: 'Internal audit summary' },
      ]},
      { id: 'a2', order: 2, heading: 'Compliance Posture', points: [
        { id: 'p4', text: 'NABL-related compliance items — status' },
        { id: 'p5', text: 'Open NCRs ageing bucket' },
      ]},
    ],
  },
  d7: { // IT
    weekly: { daysOfWeek: [1], time: '15:00', duration: 45 },
    monthly: { dayOfMonth: 1, time: '11:00', duration: 60 },
    owner: 'IT Head',
    primarySystems: ['LIS', 'HIS', 'Network Monitor', 'Ticketing'],
    weeklyAgenda: [
      { id: 'a1', order: 1, heading: 'Uptime & Incidents', points: [
        { id: 'p1', text: 'LIS/HIS uptime this week by branch' },
        { id: 'p2', text: 'Incidents / unplanned outages — RCA + preventive' },
        { id: 'p3', text: 'Security alerts actioned' },
      ]},
      { id: 'a2', order: 2, heading: 'Ticket Queue', points: [
        { id: 'p4', text: 'Open tickets by priority' },
        { id: 'p5', text: 'SLA breaches', indicator: 'red' },
      ]},
    ],
    monthlyAgenda: [
      { id: 'a1', order: 1, heading: 'Monthly IT Scorecard', points: [
        { id: 'p1', text: 'Uptime % per critical system vs SLA' },
        { id: 'p2', text: 'Mean time to resolution (MTTR)' },
        { id: 'p3', text: 'DR test outcome for the month' },
      ]},
      { id: 'a2', order: 2, heading: 'Project Delivery', points: [
        { id: 'p4', text: 'Software modules in flight — status (Pavan / Satya)' },
        { id: 'p5', text: 'Hardware / infra capex plan' },
      ]},
    ],
  },
  d18: { // CMD Office
    weekly: { daysOfWeek: [6], time: '10:00', duration: 120 },  // Saturday 10 AM
    monthly: { dayOfMonth: 7, time: '10:00', duration: 240 },   // 7th of month, half day
    owner: 'CMD · Venkata Cherukuri',
    primarySystems: ['CMD Approval Hub', 'TruFin', 'All Dept Dashboards'],
    weeklyAgenda: [
      { id: 'a1', order: 1, heading: 'Last Week Performance', points: [
        { id: 'p1', text: 'Topline revenue vs weekly target — by business line' },
        { id: 'p2', text: 'TAT scorecard rollup from Clinical Ops', indicator: null },
        { id: 'p3', text: 'Collection numbers (branch + home collection + corporate)' },
        { id: 'p4', text: 'Any P1 incidents / escalations closed' },
      ]},
      { id: 'a2', order: 2, heading: 'HOD Departmental Updates', points: [
        { id: 'p5', text: 'Quality Manager — NCRs, IQC trends, audit prep' },
        { id: 'p6', text: 'COO — operations, branches, home collection' },
        { id: 'p7', text: 'CFO — cash flow, AR ageing, AP run, compliance' },
        { id: 'p8', text: 'CGO / BD — pipeline, new client wins, lost deals' },
        { id: 'p9', text: 'IT Head — uptime, modules in flight, incidents' },
        { id: 'p10', text: 'HR Head — hiring pipeline, attrition, grievances' },
      ]},
      { id: 'a3', order: 3, heading: 'Open Decisions & Approvals', points: [
        { id: 'p11', text: 'Items pending CMD approval > 48 hours — clear or delegate' },
        { id: 'p12', text: 'This week\'s key decisions logged in Decisions Registry' },
      ]},
      { id: 'a4', order: 4, heading: 'Next Week Priorities', points: [
        { id: 'p13', text: 'Top 3 CMD focus items for the coming week' },
        { id: 'p14', text: 'Any new escalations to pre-empt' },
      ]},
    ],
    monthlyAgenda: [
      { id: 'a1', order: 1, heading: 'Previous Month P&L', points: [
        { id: 'p1', text: 'Revenue vs target — total, by business line, by branch' },
        { id: 'p2', text: 'Gross margin by test category' },
        { id: 'p3', text: 'EBITDA & bottom line' },
        { id: 'p4', text: 'Variance analysis vs budget' },
      ]},
      { id: 'a2', order: 2, heading: 'KPI Scorecard — All 17 Departments', points: [
        { id: 'p5', text: 'Clinical Ops — TAT, rejection rate, test volume' },
        { id: 'p6', text: 'Material Mgmt — stock-outs, expiry writes-offs, stock turn' },
        { id: 'p7', text: 'HR — attrition, hiring, training completion' },
        { id: 'p8', text: 'Quality — NCR ageing, EQAS performance' },
        { id: 'p9', text: 'IT — uptime, MTTR, incident rate' },
        { id: 'p10', text: 'Finance — DSO, collection, compliance status' },
      ]},
      { id: 'a3', order: 3, heading: 'Strategic Initiatives', points: [
        { id: 'p11', text: 'Progress on active strategic projects' },
        { id: 'p12', text: 'New initiatives to kick off' },
      ]},
      { id: 'a4', order: 4, heading: 'People & Governance', points: [
        { id: 'p13', text: 'Key hires, promotions, exits' },
        { id: 'p14', text: 'Board / investor updates' },
      ]},
    ],
  },
  d3: { // HR
    weekly: { daysOfWeek: [1], time: '10:30', duration: 45 },
    monthly: { dayOfMonth: 5, time: '14:00', duration: 90 },
    owner: 'HR Head',
    primarySystems: ['HRMS', 'PACE'],
    weeklyAgenda: [
      { id: 'a1', order: 1, heading: 'Attendance & Leave', points: [
        { id: 'p1', text: 'Previous week\'s exceptions by branch' },
        { id: 'p2', text: 'Unplanned absences trending' },
      ]},
      { id: 'a2', order: 2, heading: 'Hiring Pipeline', points: [
        { id: 'p3', text: 'Open positions status by dept' },
        { id: 'p4', text: 'Offers made vs accepted', indicator: 'amber' },
      ]},
      { id: 'a3', order: 3, heading: 'Grievances', points: [
        { id: 'p5', text: 'New grievances this week' },
        { id: 'p6', text: 'Pending > 7 days', indicator: 'red' },
      ]},
    ],
    monthlyAgenda: [
      { id: 'a1', order: 1, heading: 'Monthly HR Scorecard', points: [
        { id: 'p1', text: 'Attrition rate (voluntary + involuntary)' },
        { id: 'p2', text: 'Joining count vs plan' },
        { id: 'p3', text: 'Training completion %' },
      ]},
    ],
  },
};

// Seed review cadence onto departments

export const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const DAYS_OF_WEEK_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Builds the fully normalised department list (weekly/monthly seeds, review cadence,
// positionIds[] migration, daysOfWeek[] migration) — exactly what the prototype does on load.
export function buildInitialDepartments() {
  const DEPARTMENTS = JSON.parse(JSON.stringify(DEPARTMENTS_BASE));
  DEPARTMENTS.forEach(d => {
    if (!d.weeklyTasks) d.weeklyTasks = [];
    if (!d.monthlyTasks) d.monthlyTasks = [];
    const seed = DEPT_SEED[d.id];
    if (seed) {
      seed.weekly.forEach((t, i) => {
        if (d.weeklyTasks.find(x => x.text === t.text)) return;
        d.weeklyTasks.push({ id: 'w' + d.id + '-' + i, ...t });
      });
      seed.monthly.forEach((t, i) => {
        if (d.monthlyTasks.find(x => x.text === t.text)) return;
        d.monthlyTasks.push({ id: 'm' + d.id + '-' + i, ...t });
      });
    }
  });
  
  // ========== REVIEW CADENCE SEED ==========
  // Pre-planned departmental review meetings (weekly + monthly), with a baseline agenda template
  // that each meeting instance walks through. Points can carry an indicator (red/amber/green) for RAG status.
  DEPARTMENTS.forEach(d => {
    const seed = REVIEW_CADENCE_SEED[d.id];
    if (seed && !d.reviewCadence) d.reviewCadence = JSON.parse(JSON.stringify(seed));
    // Default empty cadence skeleton for other departments so UI never crashes
    if (!d.reviewCadence) {
      d.reviewCadence = {
        weekly: { daysOfWeek: [], time: '', duration: 45 },
        monthly: { dayOfMonth: '', time: '', duration: 60 },
        owner: '',
        primarySystems: [],
        weeklyAgenda: [],
        monthlyAgenda: [],
      };
    }
  });
  
  // Migrate legacy single positionId → positionIds[] so a task can be tagged to multiple positions
  DEPARTMENTS.forEach(d => {
    ['openingTasks','closingTasks','weeklyTasks','monthlyTasks'].forEach(kind => {
      (d[kind] || []).forEach(t => {
        if (!Array.isArray(t.positionIds)) {
          t.positionIds = (t.positionId != null && t.positionId !== '') ? [t.positionId] : [];
        }
      });
    });
  });
  
  DEPARTMENTS.forEach(d => {
    (d.weeklyTasks || []).forEach(t => {
      if (!t.daysOfWeek || !Array.isArray(t.daysOfWeek) || t.daysOfWeek.length === 0) {
        t.daysOfWeek = (typeof t.dayOfWeek === 'number') ? [t.dayOfWeek] : [1];
      }
    });
    // Monthly: dayOfMonth stays — number 1..31 or string 'last'
    (d.monthlyTasks || []).forEach(t => {
      if (t.dayOfMonth == null) t.dayOfMonth = 1;
    });
  });
  
  return DEPARTMENTS;
}

// ========== EMPLOYEE → DEPARTMENT / POSITION ASSIGNMENTS ==========
export const EMPLOYEE_ASSIGNMENTS = {
  // CMD Office
  'Venkata Cherukuri': { departmentId: 'd18', positionId: 'p1', role: 'cmd' }, // CMD — gets personal activities + org rollup
  'Pallavi Elisetti': { departmentId: 'd17', positionId: 'p1' },
  // Corporate Services
  'N. Sharma': { departmentId: 'd16', positionId: 'p1' },
  'Accounts Head': { departmentId: 'd13', positionId: 'p1' },
  'HR Head': { departmentId: 'd3', positionId: 'p2' },
  'Madhavi': { departmentId: 'd3', positionId: 'p1' },
  'Company Secretary': { departmentId: 'd15', positionId: 'p1' },
  // Operations
  'V. Subramanian': { departmentId: 'd1', positionId: null, role: 'head' }, // COO — sees whole dept
  'Dr. Anusha Singh': { departmentId: 'd1', positionId: 'p2' },
  'Dr. P. Reddy': { departmentId: 'd1', positionId: 'p2' },
  'Dr. Bharath': { departmentId: 'd1', positionId: 'p2' },
  'Dr. Salman': { departmentId: 'd1', positionId: 'p2' },
  'Clinical Ops Head': { departmentId: 'd12', positionId: 'p1' },
  'Home Collections Head': { departmentId: 'd9', positionId: 'p3' },
  'Logistics Head': { departmentId: 'd2', positionId: 'p1' },
  // Commercial
  'R. Krishnan': { departmentId: 'd18', positionId: 'p2', role: 'cgo' },
  'Arjun': { departmentId: 'd9', positionId: 'p2' },
  'Marketing Head': { departmentId: 'd9', positionId: 'p3' },
  'CSD Head': { departmentId: 'd8', positionId: 'p2' },
  'Growth & Revenue Head': { departmentId: null, positionId: null, role: 'head' },
  // Quality, Audit & Risk
  'Mohammed Fayazuddin': { departmentId: 'd11', positionId: 'p2' },
  'S. Iyer': { departmentId: 'd11', positionId: 'p1' },
  'Audit, Risk & Compliance Head': { departmentId: 'd5', positionId: 'p1' },
  // Procurement & Materials
  'Head of Procurement': { departmentId: 'd4', positionId: 'p2' },
  'Material Management Head': { departmentId: 'd6', positionId: 'p2' },
  'BMO Head': { departmentId: 'd10', positionId: 'p2' },
  // IT & Digital
  'IT Head': { departmentId: 'd7', positionId: 'p2' },
  'Pavan': { departmentId: 'd7', positionId: 'p1' },
  'Satya': { departmentId: 'd7', positionId: 'p1' },
  'Sai Prakash': { departmentId: 'd7', positionId: 'p1' },
};

export function getEmployeeAssignment(name) {
  return EMPLOYEE_ASSIGNMENTS[name] || { departmentId: null, positionId: null };
}

// ========== ACTIVITY STATE ==========
// Tracks which tasks each person has ticked for each day.

// ============ DEPARTMENT TEMPLATES ============
export const DEPT_TEMPLATES = [
  { id: 'dt-clinical', icon: 'lab', name: 'Clinical Lab Department',
    description: 'Standard lab processing department with Tech + In-charge + Phlebotomist positions and IQC-centric shift tasks.',
    preset: {
      positions: [
        { name: 'Lab Technician', description: 'Operates analysers, runs IQC, processes samples' },
        { name: 'Lab In-charge', description: 'Approves IQC, signs off critical values, QA oversight' },
        { name: 'Phlebotomist', description: 'Sample collection and pre-analytical handling' },
      ],
      openingTasks: [
        { text: 'Switch on analysers and confirm boot-up diagnostics', defaultTime: '07:00', position: 0 },
        { text: 'Run daily Internal Quality Control (IQC)', defaultTime: '07:15', position: 0 },
        { text: 'Review & approve IQC results; release lot for the day', defaultTime: '07:45', position: 1 },
        { text: 'Set up phlebotomy stations', defaultTime: '07:00', position: 2 },
      ],
      closingTasks: [
        { text: 'End-of-day shut-down protocol', defaultTime: '19:30', position: 0 },
        { text: 'Sign off day\'s critical value notification log', defaultTime: '19:00', position: 1 },
      ],
    },
  },
  { id: 'dt-admin', icon: 'clipboard', name: 'Admin / Support Department',
    description: 'Office-based support department with Executive + Head positions and inbox/calendar-centric routines.',
    preset: {
      positions: [
        { name: 'Executive', description: 'Day-to-day execution' },
        { name: 'Head', description: 'Oversight, approvals, strategy' },
      ],
      openingTasks: [
        { text: 'Inbox review — route & assign', defaultTime: '09:30', position: 0 },
        { text: 'Yesterday\'s pending items status', defaultTime: '09:45', position: 0 },
        { text: 'Day\'s priority items reviewed', defaultTime: '10:00', position: 1 },
      ],
      closingTasks: [
        { text: 'EOD status of day\'s items', defaultTime: '18:00', position: 0 },
      ],
    },
  },
  { id: 'dt-field', icon: 'logistics', name: 'Field Operations',
    description: 'Field-based operations department with Co-ordinator + Field Staff positions — routes, vehicles, equipment.',
    preset: {
      positions: [
        { name: 'Field Co-ordinator', description: 'Route planning, scheduling, supervision' },
        { name: 'Field Staff', description: 'On-ground execution — collection, delivery, inspection' },
      ],
      openingTasks: [
        { text: 'Vehicle check — fuel, kit, uniform, ID', defaultTime: '06:30', position: 1 },
        { text: 'Day\'s route sheets printed and assigned', defaultTime: '06:45', position: 0 },
        { text: 'Previous day returns reconciled', defaultTime: '07:00', position: 0 },
      ],
      closingTasks: [
        { text: 'Final run confirmed; cold-chain log closed', defaultTime: '20:00', position: 1 },
        { text: 'Next day\'s plan finalised', defaultTime: '20:30', position: 0 },
      ],
    },
  },
  { id: 'dt-finance', icon: 'money', name: 'Finance Sub-department',
    description: 'Finance sub-function (AP/AR/Taxation) with Executive position and ledger-centric routines.',
    preset: {
      positions: [
        { name: 'Finance Executive', description: 'Transaction processing, reconciliation' },
        { name: 'Finance Lead', description: 'Review, approvals, reporting' },
      ],
      openingTasks: [
        { text: 'Previous day\'s transactions posted & reconciled', defaultTime: '09:30', position: 0 },
        { text: 'Bank balance check', defaultTime: '09:45', position: 0 },
        { text: 'Compliance calendar — today\'s items flagged', defaultTime: '10:00', position: 1 },
      ],
      closingTasks: [
        { text: 'Day\'s payment queue prepared for approval', defaultTime: '17:30', position: 0 },
        { text: 'EOD cash + ledger balance verified', defaultTime: '18:00', position: 1 },
      ],
    },
  },
  { id: 'dt-tech', icon: 'engineering', name: 'Technical / Engineering',
    description: 'Equipment/engineering department with Engineer + Head positions — breakdowns, calibrations, AMC.',
    preset: {
      positions: [
        { name: 'Engineer', description: 'Daily rounds, breakdown response, calibrations' },
        { name: 'Engineering Head', description: 'AMC contracts, capex planning, vendor mgmt' },
      ],
      openingTasks: [
        { text: 'Morning equipment round — all critical equipment status', defaultTime: '07:30', position: 0 },
        { text: 'Calibration due-today list reviewed', defaultTime: '08:00', position: 0 },
        { text: 'AMC vendor visits scheduled for today confirmed', defaultTime: '09:00', position: 1 },
      ],
      closingTasks: [
        { text: 'Day\'s breakdown log closed with status', defaultTime: '19:00', position: 0 },
      ],
    },
  },
  { id: 'dt-sales', icon: 'trending', name: 'Sales / Commercial Division',
    description: 'Field sales / BD division with Sales Rep + Manager positions — pipeline, visits, forecast.',
    preset: {
      positions: [
        { name: 'Sales Representative', description: 'Field visits, customer coverage, lead qualification' },
        { name: 'Sales Manager', description: 'Pipeline, forecast, team management' },
      ],
      openingTasks: [
        { text: 'Day\'s visit plan reviewed and locked', defaultTime: '09:00', position: 0 },
        { text: 'CRM — yesterday\'s activity updated', defaultTime: '09:15', position: 0 },
        { text: 'Team pipeline health review', defaultTime: '09:30', position: 1 },
      ],
      closingTasks: [
        { text: 'Day\'s visits logged in CRM with outcome', defaultTime: '18:30', position: 0 },
        { text: 'Team EOD rollup', defaultTime: '19:00', position: 1 },
      ],
    },
  },
  { id: 'dt-single-role', icon: 'person', name: 'Single-Role Department',
    description: 'Lean department with one position only — e.g. a specialist role or small function.',
    preset: {
      positions: [
        { name: 'Specialist', description: 'Full scope of the department' },
      ],
      openingTasks: [
        { text: 'Daily morning review', defaultTime: '09:30', position: 0 },
      ],
      closingTasks: [
        { text: 'EOD status log', defaultTime: '18:00', position: 0 },
      ],
    },
  },
  { id: 'dt-blank', icon: 'document', name: 'Blank Department',
    description: 'Start from scratch — no positions or tasks pre-filled.',
    preset: { positions: [], openingTasks: [], closingTasks: [] },
  },
];
