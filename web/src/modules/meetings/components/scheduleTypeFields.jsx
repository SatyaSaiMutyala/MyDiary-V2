import { Box } from '@mui/material';
import Grid from '@mui/material/Grid';
import { tokens, fonts, TYPE_COLORS } from '../../../theme/tokens';
import { Field, FieldLabel, TextInput, TextArea, SelectInput, ToggleRow } from '../../../components';

/** .type-specific-badge — colour follows body[data-type] */
export function TypeSpecificBadge({ type, children }) {
  const tc = TYPE_COLORS[type] || TYPE_COLORS.internal;
  return <Box component="span" sx={{ fontFamily: fonts.mono, fontSize: 9, p: '3px 8px', borderRadius: '10px', bgcolor: tc.soft, color: tc.color, letterSpacing: '0.1em', fontWeight: 700, textTransform: 'uppercase' }}>{children}</Box>;
}

const Req = () => <Box component="span" sx={{ color: tokens.red }}>*</Box>;
/** .row (2 cols) / .row.three / .row.one as a 12-col Grid */
export function Row({ sx, children }) {
  return <Grid container spacing={1.75} sx={{ mb: '14px', ...sx }}>{children}</Grid>;
}
export const col2 = { xs: 12, lg: 6 };
export const col3 = { xs: 12, sm: 6, lg: 4 };
export const col1 = { xs: 12 };

const opts = (arr) => arr.map(o => <option key={o}>{o}</option>);

/**
 * Type-specific blocks of Card 2 (.type-only.internal/.customer/...).
 *  ts: free-form values keyed by field id;  setTs(key, value)
 *  tg: toggle values;                       setTg(key, bool)
 */
export default function ScheduleTypeFields({ type, ts, setTs, tg, setTg }) {
  const v = (k, d = '') => ts[k] ?? d;
  const on = (k) => (e) => setTs(k, e.target.value);
  const Badge = ({ children }) => <TypeSpecificBadge type={type}>{children}</TypeSpecificBadge>;

  if (type === 'internal') return (
    <Box>
      <Row>
        <Grid size={col2}><Field><FieldLabel>Department Owner <Badge>Internal</Badge></FieldLabel>
          <SelectInput value={v('deptOwner', '— Select —')} onChange={on('deptOwner')}>{opts(['— Select —', 'Accounts', 'HR', 'Customer Service', 'Material Management', 'Information Technology', 'Logistics', 'Clinical Ops (TAT)', 'Quality (QMS)', 'Procurement', 'Biomedical Operations', 'Audit, Risk & Compliance', 'Growth & Revenue', 'Home Collections', 'Cross-functional'])}</SelectInput></Field></Grid>
        <Grid size={col2}><Field label="Sub-type"><SelectInput value={v('subType', 'Ops Review')} onChange={on('subType')}>{opts(['Ops Review', '1:1 Catch-up', 'Project Sync', 'HOD Meeting', 'Incident Review', 'Strategy Session', 'Training'])}</SelectInput></Field></Grid>
      </Row>
      <ToggleRow label="Link to DRM Cadence (TL-EXEC-RVW-001)" desc="If this is part of the weekly / monthly department review cadence, link it so minutes roll up." on={!!tg.drm} onChange={x => setTg('drm', x)} />
      <ToggleRow label="Recurring Meeting" desc="Weekly / monthly / quarterly — auto-schedule future instances." on={!!tg.recurring} onChange={x => setTg('recurring', x)} />
    </Box>
  );

  if (type === 'customer') return (
    <Box>
      <Row>
        <Grid size={col2}><Field><FieldLabel>Customer / Client <Req /> <Badge>Customer</Badge></FieldLabel><TextInput value={v('customer')} onChange={on('customer')} placeholder="Search by name or client code (e.g. TG-0142-H-CR)" /></Field></Grid>
        <Grid size={col2}><Field label="Account Owner (Internal)"><SelectInput value={v('acctOwner', '— Select —')} onChange={on('acctOwner')}>{opts(['— Select —', 'Mr. Arjun — Sales', 'Growth & Revenue Head', 'Myself (CMD)'])}</SelectInput></Field></Grid>
      </Row>
      <Row>
        <Grid size={col2}><Field label="Meeting Purpose"><SelectInput value={v('purpose', 'New Business Pitch')} onChange={on('purpose')}>{opts(['New Business Pitch', 'Contract / Commercials', 'Quarterly Business Review', 'Escalation / Complaint', 'Relationship Catch-up', 'Package / Pricing Discussion', 'Operational Review'])}</SelectInput></Field></Grid>
        <Grid size={col2}><Field label="Linked Opportunity / Deal"><TextInput value={v('deal')} onChange={on('deal')} placeholder="e.g. Adani AHC · Care & Cure Portal" /></Field></Grid>
      </Row>
      <ToggleRow label="Commercially Sensitive" desc="Pricing, discounts or contract terms will be discussed — minutes restricted." on={!!tg.commSensitive} onChange={x => setTg('commSensitive', x)} />
      <ToggleRow label="NDA in Place" desc="Mutual NDA signed with this customer." on={tg.nda !== false} onChange={x => setTg('nda', x)} />
    </Box>
  );

  if (type === 'supplier') return (
    <Box>
      <Row>
        <Grid size={col2}><Field><FieldLabel>Supplier / Vendor <Req /> <Badge>Supplier</Badge></FieldLabel><TextInput value={v('supplier')} onChange={on('supplier')} placeholder="Search by name or vendor code" /></Field></Grid>
        <Grid size={col2}><Field label="Procurement Owner"><SelectInput value={v('procOwner', '— Select —')} onChange={on('procOwner')}>{opts(['— Select —', 'Head of Procurement', 'Material Management Head', 'Biomedical Operations Head', 'Myself (CMD)'])}</SelectInput></Field></Grid>
      </Row>
      <Row>
        <Grid size={col2}><Field label="Topic"><SelectInput value={v('topic', 'Price Negotiation')} onChange={on('topic')}>{opts(['Price Negotiation', 'New Product Introduction', 'Contract Renewal', 'Quality Issue / Dispute', 'Delivery / SLA Review', 'AMC / Service', 'Onboarding'])}</SelectInput></Field></Grid>
        <Grid size={col2}><Field label="Contract / PO Reference"><TextInput value={v('poRef')} onChange={on('poRef')} placeholder="e.g. PO/2026/0421 · AMC-TAMS-089" /></Field></Grid>
      </Row>
      <ToggleRow label="Dispute / Escalation Context" desc="Loop in Audit, Risk & Compliance for any dispute-related discussion." on={!!tg.dispute} onChange={x => setTg('dispute', x)} />
    </Box>
  );

  if (type === 'consultants') return (
    <Box>
      <Row>
        <Grid size={col2}><Field><FieldLabel>Consultant / Firm <Req /> <Badge>Consultants</Badge></FieldLabel><TextInput value={v('consultant')} onChange={on('consultant')} placeholder="e.g. Mr. Ishaq Ahmed (Andromeda) · Deepti (sales)" /></Field></Grid>
        <Grid size={col2}><Field label="Engagement Area"><SelectInput value={v('engArea', 'QMS / NABL')} onChange={on('engArea')}>{opts(['QMS / NABL', 'Legal', 'Tax / Statutory', 'Sales / Growth', 'Investor / M&A', 'Technology / Software', 'Brand / Marketing', 'HR / Organisation'])}</SelectInput></Field></Grid>
      </Row>
      <Row>
        <Grid size={col2}><Field label="Engagement Reference"><TextInput value={v('engRef')} onChange={on('engRef')} placeholder="SOW / Contract # / LOE" /></Field></Grid>
        <Grid size={col2}><Field label="Billing Mode"><SelectInput value={v('billing', 'Retainer — monthly')} onChange={on('billing')}>{opts(['Retainer — monthly', 'Milestone-based', 'Hourly / T&M', 'Fixed Fee', 'Pro-bono / Advisory'])}</SelectInput></Field></Grid>
      </Row>
      <ToggleRow label="Deliverable Expected from This Meeting" desc="A document, report or decision is expected as output." on={tg.deliverable !== false} onChange={x => setTg('deliverable', x)} />
    </Box>
  );

  if (type === 'board') return (
    <Box>
      <Row>
        <Grid size={col2}><Field><FieldLabel>Board Meeting # <Req /> <Badge>Board</Badge></FieldLabel><TextInput value={v('boardNo')} onChange={on('boardNo')} placeholder="e.g. BM-2026-11 · AGM-2026" /></Field></Grid>
        <Grid size={col2}><Field label="Meeting Classification"><SelectInput value={v('classification', 'Board Meeting (Ordinary)')} onChange={on('classification')}>{opts(['Board Meeting (Ordinary)', 'Board Meeting (Extraordinary)', 'AGM', 'EGM', 'Audit Committee', 'Nomination & Remuneration Committee', 'Advisory Board'])}</SelectInput></Field></Grid>
      </Row>
      <Row>
        <Grid size={col3}><Field label="Quorum Required"><TextInput value={v('quorum')} onChange={on('quorum')} placeholder="e.g. 3 of 5 directors" /></Field></Grid>
        <Grid size={col3}><Field label="Resolutions on Agenda"><TextInput type="number" inputProps={{ min: 0 }} value={v('resolutions', '0')} onChange={on('resolutions')} /></Field></Grid>
        <Grid size={col3}><Field label="Notice Days"><TextInput type="number" inputProps={{ min: 0 }} value={v('noticeDays', '7')} onChange={on('noticeDays')} /></Field></Grid>
      </Row>
      <ToggleRow label="Independent Director Present" desc="At least one independent director will attend." on={tg.indDirector !== false} onChange={x => setTg('indDirector', x)} />
      <ToggleRow label="Statutory Notice Compliant" desc="Notice period and circulation meets Companies Act / AOA requirements." on={tg.statNotice !== false} onChange={x => setTg('statNotice', x)} />
      <ToggleRow label="Board Pack Attached" desc="Pre-read circulated at least 48 hours prior." on={!!tg.boardPack} onChange={x => setTg('boardPack', x)} />
    </Box>
  );

  if (type === 'other') return (
    <Box>
      <Row>
        <Grid size={col2}><Field><FieldLabel>Category <Badge>Other</Badge></FieldLabel><TextInput value={v('category')} onChange={on('category')} placeholder="e.g. Industry event · Networking · Site visit" /></Field></Grid>
        <Grid size={col2}><Field label="Host / Organiser"><TextInput value={v('host')} onChange={on('host')} placeholder="Who is hosting this meeting" /></Field></Grid>
      </Row>
      <Row>
        <Grid size={col1}><Field label="Additional Context"><TextArea value={v('context')} onChange={on('context')} placeholder="Anything relevant about this meeting type..." /></Field></Grid>
      </Row>
    </Box>
  );

  return null;
}
