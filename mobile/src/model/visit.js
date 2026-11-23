/**
 * A visit report, and the choices its form offers.
 *
 * Every key here is the v2 API's own word (Backend/src/models/Visit.js), and every label is the one
 * the website prints, so a visit reads the same on the desk and in the hand. Note the shapes the
 * API insists on: `org` and `host` are objects, `team` is a list of plain names, `photos` is a
 * count rather than files, and an action item has no "done" — it is dispatched, not ticked.
 */
import { realToday } from '../utils/dates';

export const visitTypes = [
  { id: 'supplier-audit', label: 'Supplier Audit' },
  { id: 'branch-office', label: 'Branch Office Visit' },
  { id: 'new-premises', label: 'New Premises' },
  { id: 'regulatory', label: 'Regulatory / Govt' },
  { id: 'customer-site', label: 'Customer Site' },
  { id: 'partner-lab', label: 'Partner Lab' },
  { id: 'consultant-review', label: 'Consultant Review' },
  { id: 'other', label: 'Other Site Visit' },
];

export const visitStatuses = [
  { id: 'draft', label: 'Draft' },
  { id: 'submitted', label: 'Submitted' },
];

/** The five verdicts, with the website's full wording kept for the picker. */
export const assessments = [
  { id: 'excellent', label: 'Excellent — exceeds expectations' },
  { id: 'good', label: 'Good — meets requirements' },
  { id: 'satisfactory', label: 'Satisfactory — acceptable with minor gaps' },
  { id: 'needs-improvement', label: 'Needs Improvement — gaps to close' },
  { id: 'unsatisfactory', label: 'Unsatisfactory — serious concerns' },
];

/** Short forms, for a pill on a card where the full sentence will not fit. */
export const assessmentShort = {
  excellent: 'Excellent',
  good: 'Good',
  satisfactory: 'Satisfactory',
  'needs-improvement': 'Needs improvement',
  unsatisfactory: 'Unsatisfactory',
};

export const assessmentTone = {
  excellent: 'good',
  good: 'info',
  satisfactory: 'yellow',
  'needs-improvement': 'watch',
  unsatisfactory: 'critical',
};

/** The server stores the category as free text and defaults it to 'Other'; these are the ones offered. */
export const observationCategories = [
  'Infrastructure',
  'Quality',
  'Safety',
  'Regulatory',
  'Staff',
  'Documentation',
  'Equipment',
  'Process',
  'Other',
].map(c => ({ id: c, label: c }));

/** The six areas a visit is scored on, 0 (not rated) to 5. */
export const ratingAreas = [
  { id: 'infra', label: 'Infrastructure & facilities' },
  { id: 'quality', label: 'Quality systems' },
  { id: 'safety', label: 'Safety & housekeeping' },
  { id: 'regulatory', label: 'Regulatory compliance' },
  { id: 'staff', label: 'Staff competency' },
  { id: 'docs', label: 'Documentation & records' },
];

export const statusTone = { draft: 'low', submitted: 'teal' };

const labelFrom = (list, id) => list.find(x => x.id === id)?.label ?? id ?? '';

export const visitTypeLabel = id => labelFrom(visitTypes, id);
export const assessmentLabel = id => labelFrom(assessments, id);

/** The mean of the areas actually scored — unrated areas do not drag it down. */
export function avgRating(v) {
  const scores = Object.values(v?.ratings ?? {}).filter(r => r > 0);
  return scores.length
    ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
    : null;
}

/** Where the organisation was, in one line. */
export const siteLine = v =>
  [v?.org?.name, v?.org?.branch, v?.org?.city].filter(Boolean).join(' · ');

/** The blank report a new visit starts from. */
export const blankVisit = owner => ({
  title: '',
  type: 'branch-office',
  owner: owner ?? '',
  date: realToday(),
  timeIn: '',
  timeOut: '',
  org: { name: '', branch: '', address: '', city: '', state: '', gps: '' },
  host: { name: '', designation: '', phone: '', email: '' },
  team: [],
  externalParticipants: '',
  purpose: '',
  scope: '',
  references: '',
  tags: [],
  ratings: Object.fromEntries(ratingAreas.map(a => [a.id, 0])),
  overallAssessment: '',
  executiveSummary: '',
  observations: [],
  photos: 0,
  actionItems: [],
  nextVisitDate: '',
  followUpRequired: false,
  additionalRemarks: '',
});

/**
 * The form's draft → the body POST /visits and PATCH /visits/:id accept.
 *
 * Only these keys exist on the API. Anything else the server sent back — id, history, avgRating,
 * createdBy, the timestamps — is dropped, because both endpoints refuse unknown fields.
 */
export function visitBody(d, status) {
  return {
    title: (d.title ?? '').trim(),
    type: d.type,
    status,
    owner: d.owner ?? '',
    date: d.date,
    timeIn: d.timeIn ?? '',
    timeOut: d.timeOut ?? '',
    org: {
      name: d.org?.name ?? '',
      branch: d.org?.branch ?? '',
      address: d.org?.address ?? '',
      city: d.org?.city ?? '',
      state: d.org?.state ?? '',
      gps: d.org?.gps ?? '',
    },
    host: {
      name: d.host?.name ?? '',
      designation: d.host?.designation ?? '',
      phone: d.host?.phone ?? '',
      email: d.host?.email ?? '',
    },
    team: [...(d.team ?? [])],
    externalParticipants: d.externalParticipants ?? '',
    purpose: d.purpose ?? '',
    scope: d.scope ?? '',
    references: d.references ?? '',
    tags: [...(d.tags ?? [])],
    ratings: Object.fromEntries(
      ratingAreas.map(a => [a.id, d.ratings?.[a.id] ?? 0]),
    ),
    overallAssessment: d.overallAssessment ?? '',
    executiveSummary: d.executiveSummary ?? '',
    observations: (d.observations ?? []).map(o => ({
      category: o.category || 'Other',
      observation: o.observation ?? '',
      evidence: o.evidence ?? '',
    })),
    photos: d.photos ?? 0,
    actionItems: (d.actionItems ?? []).map(a => ({
      text: a.text ?? '',
      owner: a.owner ?? '',
      deadline: a.deadline ?? '',
    })),
    nextVisitDate: d.nextVisitDate ?? '',
    followUpRequired: Boolean(d.followUpRequired),
    additionalRemarks: d.additionalRemarks ?? '',
  };
}

/**
 * What a visit must carry before it can be signed off, in the website's own words and order.
 * Returns the complaint, or '' when it is ready.
 */
export function whyNotSubmittable(d) {
  if (!(d.title ?? '').trim()) {
    return 'Please enter a visit title.';
  }
  if (!(d.org?.name ?? '').trim()) {
    return 'Organisation name required to submit.';
  }
  if (!(d.purpose ?? '').trim()) {
    return 'Purpose of visit required to submit.';
  }
  if (!d.overallAssessment) {
    return 'Overall Assessment required to submit.';
  }
  return '';
}
