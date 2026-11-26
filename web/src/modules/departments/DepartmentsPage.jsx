import { useState } from 'react';
import { Box, Typography } from '@mui/material';
import Grid from '@mui/material/Grid';
import { useNavigate } from 'react-router-dom';
import { PageHeader, Btn, SummaryCard, EmptyState, Icon } from '../../components';
import { tokens, fonts } from '../../theme/tokens';
import { DEPT_TEMPLATES } from '../../data/departments';
import { useListDepartmentsQuery, useRemoveDepartmentMutation } from '../../store/api/departmentsApi';
import { ApiError, Fetching, useToast } from '../settings/components/listUi';
import { useDialog } from '../../components/Dialogs';
import DepartmentModal from './modals/DepartmentModal';
import TemplatePickerModal from './modals/TemplatePickerModal';

const statL = { fontFamily: fonts.mono, fontSize: 9, color: tokens.slate, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700, mt: '3px' };
const statV = (color = tokens.ink) => ({ fontFamily: fonts.serif, fontSize: 18, fontWeight: 700, color, lineHeight: 1 });

/** VIEW: DEPARTMENT MASTER — renderDepartments (prototype 12246–12289), every row from GET /api/departments. */
export default function DepartmentsPage() {
  const navigate = useNavigate();
  const { data, error, isLoading, isFetching, refetch } = useListDepartmentsQuery({ limit: 200, sort: 'order' });
  const [removeDepartment] = useRemoveDepartmentMutation();
  const { toast, show } = useToast();
  const dlg = useDialog();

  // `editing` is a department to change, 'new' to add one, or null for closed. `template` is the
  // kit a new department starts from.
  const [editing, setEditing] = useState(null);
  const [template, setTemplate] = useState(null);
  const [picking, setPicking] = useState(false);

  const DEPARTMENTS = data?.items || [];
  const totalPositions = DEPARTMENTS.reduce((s, d) => s + d.positions.length, 0);
  const totalDaily = DEPARTMENTS.reduce((s, d) => s + d.openingTasks.length + d.closingTasks.length, 0);
  const totalWeekly = DEPARTMENTS.reduce((s, d) => s + (d.weeklyTasks || []).length, 0);
  const totalMonthly = DEPARTMENTS.reduce((s, d) => s + (d.monthlyTasks || []).length, 0);

  const newDepartment = () => { setTemplate(null); setEditing('new'); };
  const pickTemplate = (t) => { setPicking(false); setTemplate(t); setEditing('new'); };

  /** A new department opens straight away so its positions and tasks can be filled in. */
  const afterSave = (saved, created) => { if (created && saved?.id) navigate('/departments/' + saved.id); };

  const askDelete = async (d) => {
    if (!await dlg.confirm(`Delete "${d.name}"? This removes its ${d.positions.length} position${d.positions.length === 1 ? '' : 's'} and every shift task it owns. This cannot be undone.`)) return;
    try {
      await removeDepartment(d.id).unwrap();
      show(`✓ ${d.name} deleted.`);
    } catch (err) {
      show(err);
    }
  };

  return (
    <Box>
      <PageHeader
        code="TL-OPS-ORG-001"
        parts={['Administration', 'Department Master']}
        icon={<Icon name="department" />}
        title="Department Master"
        sub="The organisational backbone — every TDPL department, division, and position, with the opening and closing tasks each one owns. Everything the shift-level My Activity module fires every day is configured here."
        actions={<>
          <Btn size="lg" onClick={() => setPicking(true)}><Icon name="clipboard" />Use Template</Btn>
          <Btn variant="primary" size="lg" onClick={newDepartment}>+ New Department</Btn>
        </>}
      />

      <ApiError error={error} onRetry={refetch} sx={{ mb: '12px' }} />
      <Fetching on={isFetching} />

      <Grid container spacing="12px" sx={{ mb: '18px' }}>
        <Grid size={{ xs: 12, sm: 6, lg: 2.4 }}><SummaryCard label="Departments" value={DEPARTMENTS.length} sub="Configured" /></Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 2.4 }}><SummaryCard label="Positions" value={totalPositions} sub="Across all" accent="amber" /></Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 2.4 }}><SummaryCard label="Daily Tasks" value={totalDaily} sub="Opening + closing" /></Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 2.4 }}><SummaryCard label="Weekly Tasks" value={totalWeekly} sub="For managers" accent="purple" sx={{ bgcolor: '#F3EDFD' }} /></Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 2.4 }}><SummaryCard label="Monthly Tasks" value={totalMonthly} sub="For heads" accent="blue" sx={{ bgcolor: '#EEF2FF' }} /></Grid>
      </Grid>

      {isLoading && <Box sx={{ p: '30px', textAlign: 'center', fontFamily: fonts.mono, fontSize: 11, letterSpacing: '0.08em', color: tokens.slate, textTransform: 'uppercase' }}>Loading departments…</Box>}

      {!isLoading && !error && DEPARTMENTS.length === 0 && (
        <EmptyState icon={<Icon name="department" />} title="No departments yet" desc={<>Start with <strong><Icon name="clipboard" />Use Template</strong> for a ready-made department, or <strong>+ New Department</strong> to build one from scratch.</>} />
      )}

      {/* .dept-grid */}
      <Grid container spacing="14px" sx={{ mt: '16px' }}>
        {DEPARTMENTS.map(d => {
          const dailyCt = d.openingTasks.length + d.closingTasks.length;
          const weekCt = (d.weeklyTasks || []).length;
          const monthCt = (d.monthlyTasks || []).length;
          return (
            <Grid key={d.id} size={{ xs: 12, sm: 6, lg: 4 }}>
              <Box sx={{ bgcolor: tokens.card, border: `1px solid ${tokens.line}`, borderRadius: '10px', p: '16px 18px', cursor: 'pointer', transition: 'all 0.15s', borderTop: `4px solid ${tokens.teal}`, boxShadow: tokens.shadowSm, display: 'flex', flexDirection: 'column', height: '100%', '&:hover': { boxShadow: tokens.shadowLg, transform: 'translateY(-2px)', borderColor: tokens.slateSoft, borderTopColor: tokens.teal } }}>
                <Box onClick={() => navigate('/departments/' + d.id)} sx={{ cursor: 'pointer' }}>
                <Box sx={{ mb: '8px' }}><Icon name={d.icon} size={28} /></Box>
                <Typography sx={{ fontFamily: fonts.serif, fontSize: 18, fontWeight: 700, color: tokens.ink, lineHeight: 1.2, mb: '4px' }}>{d.name}</Typography>
                <Box sx={{ fontFamily: fonts.mono, fontSize: 10, color: tokens.slate, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700, mb: '10px' }}>{d.code}</Box>
                <Typography sx={{ fontSize: 12, color: tokens.slate, lineHeight: 1.5, mb: '14px', minHeight: 36 }}>{d.description}</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', p: '10px 0', borderTop: `1px dashed ${tokens.line}`, borderBottom: `1px dashed ${tokens.line}`, mb: '10px' }}>
                  <Box sx={{ textAlign: 'center' }}><Box sx={statV()}>{d.positions.length}</Box><Box sx={statL}>Positions</Box></Box>
                  <Box sx={{ textAlign: 'center' }}><Box sx={statV()}>{dailyCt}</Box><Box sx={statL}>Daily</Box></Box>
                  <Box sx={{ textAlign: 'center', color: '#7C3AED' }}><Box sx={statV('#7C3AED')}>{weekCt}</Box><Box sx={statL}>Weekly</Box></Box>
                  <Box sx={{ textAlign: 'center', color: '#2563EB' }}><Box sx={statV('#2563EB')}>{monthCt}</Box><Box sx={statL}>Monthly</Box></Box>
                </Box>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {d.positions.length
                    ? d.positions.map(p => <Box key={p.id} component="span" sx={{ p: '3px 8px', bgcolor: tokens.tealSofter, color: tokens.tealDark, borderRadius: '10px', fontSize: 10, fontWeight: 700, fontFamily: fonts.mono, letterSpacing: '0.04em' }}>{p.name}</Box>)
                    : <Box component="span" sx={{ p: '3px 8px', bgcolor: tokens.cream, color: tokens.slate, border: `1px dashed ${tokens.slateSoft}`, borderRadius: '10px', fontSize: 10, fontWeight: 700, fontFamily: fonts.mono, letterSpacing: '0.04em' }}>All employees do same tasks</Box>}
                </Box>
                </Box>
                {/* Add / edit / delete all live on the card, so the whole master can be managed from one screen. */}
                <Box sx={{ display: 'flex', gap: '6px', mt: 'auto', pt: '12px', borderTop: `1px dashed ${tokens.line}` }}>
                  <Btn size="sm" onClick={() => navigate('/departments/' + d.id)} sx={{ flex: 1 }}>Open →</Btn>
                  <Btn size="sm" onClick={() => { setTemplate(null); setEditing(d); }} title={`Edit ${d.name}`}>✎ Edit</Btn>
                  <Btn size="sm" variant="danger" onClick={() => askDelete(d)} title={`Delete ${d.name}`}><Icon name="remove" /></Btn>
                </Box>
              </Box>
            </Grid>
          );
        })}
      </Grid>
      <TemplatePickerModal open={picking} templates={DEPT_TEMPLATES} onClose={() => setPicking(false)} onPick={pickTemplate} />
      <DepartmentModal
        open={Boolean(editing)}
        department={editing === 'new' ? null : editing}
        template={editing === 'new' ? template : null}
        onClose={() => { setEditing(null); setTemplate(null); }}
        onSaved={afterSave}
      />
      {toast}
    </Box>
  );
}
