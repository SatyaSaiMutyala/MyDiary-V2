export const DIARY_CATS = {
  meeting:   { label: 'Meeting',   icon: 'handshake', color: '#0F8F76' },
  focus:     { label: 'Focus',     icon: 'target', color: '#7C3AED' },
  personal:  { label: 'Personal',  icon: 'personal', color: '#D53F8C' },
  travel:    { label: 'Travel',    icon: 'travel', color: '#DD6B20' },
  ooo:       { label: 'OOO',       icon: 'ooo', color: '#6B6B6B' },
  reminder:  { label: 'Reminder',  icon: 'bell', color: '#F0B429' },
  tentative: { label: 'Tentative · pending meeting request', icon: 'request', color: '#DD6B20' },
};

// Sample diary entries (non-meeting ones; meetings are pulled in auto)
export const DIARY_ENTRIES = [
  { id: 'e1', owner: 'Venkata Cherukuri', title: 'Deep focus — Q3 ops prep', cat: 'focus', date: '2026-11-23', startTime: '09:00', endTime: '11:00', loc: 'Begumpet HQ · Office', notes: 'Pull branch TAT numbers from LedgerTrace. Draft points for Mon review.', attendees: [], external: [], createdBy: 'self' },
  { id: 'e2', owner: 'Venkata Cherukuri', title: 'Lunch with Dr. Abishekh', cat: 'personal', date: '2026-11-24', startTime: '13:00', endTime: '14:30', loc: 'Taj Deccan · Royal China', notes: 'Follow up on CME planning. Order ahead if possible.', attendees: [], external: [{name:'Dr. Abishekh (MD, Care & Cure)',email:'md@careandcure.in'}], createdBy: 'self' },
  { id: 'e3', owner: 'Venkata Cherukuri', title: 'Flight to Delhi · AI 2764', cat: 'travel', date: '2026-11-25', startTime: '06:30', endTime: '09:00', loc: 'Hyderabad T1 → Delhi T3', notes: 'PNR: XYZQ12 · Seat 4A. Check-in via app the night before.', attendees: [], external: [], createdBy: 'ea' },
  { id: 'e4', owner: 'Venkata Cherukuri', title: 'Investor meeting — Delhi', cat: 'meeting', date: '2026-11-25', startTime: '12:00', endTime: '14:00', loc: 'Taj Palace · Executive Suite', notes: 'Bring exit memo + updated projections. Deepti to brief 30 min prior.', attendees: ['Deepti'], external: [{name:'Rohan Mehta (Everstone Capital)',email:'rohan@everstone.in'},{name:'Sanjay Rao (Everstone Associate)',email:'sanjay@everstone.in'}], createdBy: 'ea' },
  { id: 'e5', owner: 'Venkata Cherukuri', title: 'Flight back to Hyderabad', cat: 'travel', date: '2026-11-25', startTime: '19:00', endTime: '21:30', loc: 'Delhi T3 → Hyderabad T1', notes: 'AI 2759. Seat 2F.', attendees: [], external: [], createdBy: 'ea' },
  { id: 'e6', owner: 'Venkata Cherukuri', title: 'Board pack review (final sweep)', cat: 'focus', date: '2026-11-27', startTime: '18:00', endTime: '20:00', loc: 'Home office', notes: 'Final read of BM-2026-11 pack. Review auditor observations. Flag concerns to CFO before Sat.', attendees: [], external: [], createdBy: 'self' },
  { id: 'e7', owner: 'Venkata Cherukuri', title: 'Akhil cricket match', cat: 'personal', date: '2026-11-22', startTime: '15:00', endTime: '17:00', loc: 'DLF Academy Grounds', notes: 'Away match. Try to catch the second innings.', attendees: [], external: [], createdBy: 'self' },
  { id: 'e8', owner: 'Venkata Cherukuri', title: 'Pay PT quarterly', cat: 'reminder', date: '2026-11-30', startTime: '09:00', endTime: '09:15', loc: '', notes: 'Last day. CFO to confirm done.', allDay: false, attendees: [], external: [], createdBy: 'ea' },
  { id: 'e9', owner: 'Venkata Cherukuri', title: 'Diwali Lakshmi Puja', cat: 'personal', date: '2026-11-28', allDay: true, loc: 'Home', notes: 'Family gathering. All work meetings blocked.', attendees: [], external: [], createdBy: 'self' },
  { id: 'e10', owner: 'Venkata Cherukuri', title: 'Vacation — Family · Goa', cat: 'ooo', date: '2026-12-22', endDate: '2026-12-30', allDay: true, loc: 'Goa', notes: 'Out of office. Urgent only via Pallavi.', attendees: [], external: [], createdBy: 'ea' },
  { id: 'e11', owner: 'Venkata Cherukuri', title: '1:1 · N. Sharma (CFO)', cat: 'meeting', date: '2026-11-23', startTime: '16:00', endTime: '16:30', loc: 'CMD cabin', notes: 'Weekly recurring. AR, AP highlights, treasury.', attendees: ['N. Sharma'], external: [], createdBy: 'ea' },
  { id: 'e12', owner: 'Venkata Cherukuri', title: '1:1 · R. Krishnan (CGO)', cat: 'meeting', date: '2026-11-24', startTime: '16:00', endTime: '16:30', loc: 'CMD cabin', notes: 'Pipeline, top accounts, growth strategy.', attendees: ['R. Krishnan'], external: [], createdBy: 'ea' },
  { id: 'e13', owner: 'Venkata Cherukuri', title: 'Morning gym / run', cat: 'personal', date: '2026-11-23', startTime: '06:30', endTime: '07:45', loc: 'Home', notes: '', attendees: [], external: [], createdBy: 'self' },
  { id: 'e14', owner: 'Venkata Cherukuri', title: 'Morning gym / run', cat: 'personal', date: '2026-11-24', startTime: '06:30', endTime: '07:45', loc: 'Home', notes: '', attendees: [], external: [], createdBy: 'self' },
  { id: 'e15', owner: 'Venkata Cherukuri', title: 'Morning gym / run', cat: 'personal', date: '2026-11-27', startTime: '06:30', endTime: '07:45', loc: 'Home', notes: '', attendees: [], external: [], createdBy: 'self' },
  { id: 'e16', owner: 'Venkata Cherukuri', title: 'Wedding anniversary 🎉', cat: 'reminder', date: '2026-12-04', allDay: true, loc: '', notes: 'Book a nice place. Flowers in the morning.', attendees: [], external: [], createdBy: 'ea' },
  { id: 'e17', owner: 'Venkata Cherukuri', title: 'Call with Ishaq Ahmed (prep)', cat: 'focus', date: '2026-11-30', startTime: '09:30', endTime: '10:00', loc: 'Virtual · Zoom', notes: 'Final prep before QMS walkthrough on Dec 1. Review document gaps list.', attendees: [], external: [{name:'Mr. Ishaq Ahmed (Andromeda Dubai)',email:'ishaq.ahmed@andromeda-qms.ae'}], createdBy: 'ea' },
  // A couple on Pallavi's diary to show the EA perspective
  { id: 'e18', owner: 'Pallavi Elisetti', title: 'Prepare board packs (print + distribute)', cat: 'focus', date: '2026-11-26', startTime: '10:00', endTime: '13:00', loc: 'Office', notes: '5 hard copies, 1 soft via secure portal. Statutory auditor copy by courier.', attendees: [], external: [], createdBy: 'self' },
  { id: 'e19', owner: 'Pallavi Elisetti', title: 'Travel coordination · CMD Delhi trip', cat: 'reminder', date: '2026-11-24', startTime: '14:00', endTime: '14:30', loc: '', notes: 'Confirm cab pickups both ends. Reconfirm hotel.', attendees: [], external: [], createdBy: 'self' },
];

// Who can view/edit whose diary (delegation matrix)
export const DELEGATIONS = [
  { owner: 'Venkata Cherukuri', delegate: 'Pallavi Elisetti', permission: 'edit' },  // EA full access
];
