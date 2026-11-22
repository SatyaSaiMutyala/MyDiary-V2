import { Box, Typography } from '@mui/material';
import Grid from '@mui/material/Grid';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/AppStore';
import { PageHeader, Btn, SummaryCard } from '../../components';
import { tokens, fonts } from '../../theme/tokens';
import { DEPT_TEMPLATES } from '../../data/departments';
import { buildDepartmentFromTemplate, buildBlankDepartment } from './utils';

const statL = { fontFamily: fonts.mono, fontSize: 9, color: tokens.slate, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700, mt: '3px' };
const statV = (color = tokens.ink) => ({ fontFamily: fonts.serif, fontSize: 18, fontWeight: 700, color, lineHeight: 1 });

/** VIEW: DEPARTMENT MASTER — renderDepartments (prototype 12246–12289) */
export default function DepartmentsPage() {
  const { state, mutate } = useAppStore();
  const navigate = useNavigate();
  const DEPARTMENTS = state.departments;

  const totalPositions = DEPARTMENTS.reduce((s, d) => s + d.positions.length, 0);
  const totalDaily = DEPARTMENTS.reduce((s, d) => s + d.openingTasks.length + d.closingTasks.length, 0);
  const totalWeekly = DEPARTMENTS.reduce((s, d) => s + (d.weeklyTasks || []).length, 0);
  const totalMonthly = DEPARTMENTS.reduce((s, d) => s + (d.monthlyTasks || []).length, 0);

  const pickDepartmentTemplate = () => {
    const dept = buildDepartmentFromTemplate(DEPT_TEMPLATES, DEPARTMENTS.length);
    if (!dept) return;
    mutate('departments', ds => { ds.push(dept); });
    navigate('/departments/' + dept.id);
  };
  const openDepartmentEditor = () => {
    const dept = buildBlankDepartment(DEPARTMENTS.length);
    if (!dept) return;
    mutate('departments', ds => { ds.push(dept); });
    navigate('/departments/' + dept.id);
  };

  return (
    <Box>
      <PageHeader
        code="TL-OPS-ORG-001"
        parts={['Administration', 'Department Master']}
        icon="🏢"
        title="Department Master"
        sub="The organisational backbone — every TDPL department, division, and position, with the opening and closing tasks each one owns. Everything the shift-level My Activity module fires every day is configured here."
        actions={<>
          <Btn size="lg" onClick={pickDepartmentTemplate}>📋 Use Template</Btn>
          <Btn variant="primary" size="lg" onClick={openDepartmentEditor}>+ New Department</Btn>
        </>}
      />

      <Grid container spacing="12px" sx={{ mb: '18px' }}>
        <Grid size={{ xs: 12, sm: 6, lg: 2.4 }}><SummaryCard label="Departments" value={DEPARTMENTS.length} sub="Configured" /></Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 2.4 }}><SummaryCard label="Positions" value={totalPositions} sub="Across all" accent="amber" /></Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 2.4 }}><SummaryCard label="Daily Tasks" value={totalDaily} sub="Opening + closing" /></Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 2.4 }}><SummaryCard label="Weekly Tasks" value={totalWeekly} sub="For managers" accent="purple" sx={{ bgcolor: '#F3EDFD' }} /></Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 2.4 }}><SummaryCard label="Monthly Tasks" value={totalMonthly} sub="For heads" accent="blue" sx={{ bgcolor: '#EEF2FF' }} /></Grid>
      </Grid>

      {/* .dept-grid */}
      <Grid container spacing="14px" sx={{ mt: '16px' }}>
        {DEPARTMENTS.map(d => {
          const dailyCt = d.openingTasks.length + d.closingTasks.length;
          const weekCt = (d.weeklyTasks || []).length;
          const monthCt = (d.monthlyTasks || []).length;
          return (
            <Grid key={d.id} size={{ xs: 12, sm: 6, lg: 4 }}>
              <Box onClick={() => navigate('/departments/' + d.id)} sx={{ bgcolor: tokens.card, border: `1px solid ${tokens.line}`, borderRadius: '10px', p: '16px 18px', cursor: 'pointer', transition: 'all 0.15s', borderTop: `4px solid ${tokens.teal}`, boxShadow: tokens.shadowSm, display: 'flex', flexDirection: 'column', height: '100%', '&:hover': { boxShadow: tokens.shadowLg, transform: 'translateY(-2px)', borderColor: tokens.slateSoft, borderTopColor: tokens.teal } }}>
                <Box sx={{ fontSize: 28, mb: '8px' }}>{d.icon}</Box>
                <Typography sx={{ fontFamily: fonts.serif, fontSize: 18, fontWeight: 700, color: tokens.ink, lineHeight: 1.2, mb: '4px' }}>{d.name}</Typography>
                <Box sx={{ fontFamily: fonts.mono, fontSize: 10, color: tokens.slate, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700, mb: '10px' }}>{d.code}</Box>
                <Typography sx={{ fontSize: 12, color: tokens.slate, lineHeight: 1.5, mb: '14px', minHeight: 36 }}>{d.description}</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', p: '10px 0', borderTop: `1px dashed ${tokens.line}`, borderBottom: `1px dashed ${tokens.line}`, mb: '10px' }}>
                  <Box sx={{ textAlign: 'center' }}><Box sx={statV()}>{d.positions.length}</Box><Box sx={statL}>Positions</Box></Box>
                  <Box sx={{ textAlign: 'center' }}><Box sx={statV()}>{dailyCt}</Box><Box sx={statL}>Daily</Box></Box>
                  <Box sx={{ textAlign: 'center', color: '#7C3AED' }}><Box sx={statV('#7C3AED')}>{weekCt}</Box><Box sx={statL}>Weekly</Box></Box>
                  <Box sx={{ textAlign: 'center', color: '#2563EB' }}><Box sx={statV('#2563EB')}>{monthCt}</Box><Box sx={statL}>Monthly</Box></Box>
                </Box>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '4px', mt: 'auto' }}>
                  {d.positions.length
                    ? d.positions.map(p => <Box key={p.id} component="span" sx={{ p: '3px 8px', bgcolor: tokens.tealSofter, color: tokens.tealDark, borderRadius: '10px', fontSize: 10, fontWeight: 700, fontFamily: fonts.mono, letterSpacing: '0.04em' }}>{p.name}</Box>)
                    : <Box component="span" sx={{ p: '3px 8px', bgcolor: tokens.cream, color: tokens.slate, border: `1px dashed ${tokens.slateSoft}`, borderRadius: '10px', fontSize: 10, fontWeight: 700, fontFamily: fonts.mono, letterSpacing: '0.04em' }}>All employees do same tasks</Box>}
                </Box>
              </Box>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}
