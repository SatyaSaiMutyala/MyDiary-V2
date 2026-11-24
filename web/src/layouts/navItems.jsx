import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import GavelOutlinedIcon from '@mui/icons-material/GavelOutlined';
import ListAltOutlinedIcon from '@mui/icons-material/ListAltOutlined';
import EditNoteOutlinedIcon from '@mui/icons-material/EditNoteOutlined';
import BiotechOutlinedIcon from '@mui/icons-material/BiotechOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import AlarmOutlinedIcon from '@mui/icons-material/AlarmOutlined';
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';
import TaskAltOutlinedIcon from '@mui/icons-material/TaskAltOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import FolderOpenOutlinedIcon from '@mui/icons-material/FolderOpenOutlined';
import ApartmentOutlinedIcon from '@mui/icons-material/ApartmentOutlined';
import HubOutlinedIcon from '@mui/icons-material/HubOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';

/** Menu colours per item (AIMS gives every menu its own icon colour). */
export const C = {
  dashboard: '#7FB3FF', meetings: '#FF8C1A', decisions: '#FFC400', templates: '#5FD3F3',
  activity: '#12C48B', labReadiness: '#00A9A5', diary: '#976BFF', logs: '#FF7FB6', todo: '#33CC55', visits: '#F5A300',
  reminders: '#FF6B6B',
  projects: '#2288EE', departments: '#0EA5A5', integrations: '#93A8B8', settings: '#93A8B8',
};

/** Sidebar groups: [label, items]. Badges are filled in by the rail from store counts. */
export const NAV_GROUPS = [
  [null, [{ to: '/', end: true, icon: <DashboardOutlinedIcon />, label: 'Dashboard', color: C.dashboard, module: 'dashboard' }]],
  ['Meetings', [
    { to: '/meetings', icon: <GroupsOutlinedIcon />, label: 'My Meetings', color: C.meetings, badgeKey: 'meetings', module: 'meetings' },
    { to: '/decisions', icon: <GavelOutlinedIcon />, label: 'Decisions Registry', color: C.decisions, module: 'decisions' },
    { to: '/templates', icon: <ListAltOutlinedIcon />, label: 'Templates', color: C.templates, module: 'templates' },
  ]],
  ['Personal', [
    { to: '/my-activity', icon: <EditNoteOutlinedIcon />, label: 'My Activity', color: C.activity, module: 'activity' },
    { to: '/lab-readiness', icon: <BiotechOutlinedIcon />, label: 'Lab Readiness', color: C.labReadiness, module: 'labReadiness' },
    { to: '/diary', icon: <CalendarMonthOutlinedIcon />, label: 'My Diary', color: C.diary, module: 'diary' },
    { to: '/logs', icon: <ForumOutlinedIcon />, label: 'My Discussion Logs', color: C.logs, module: 'logs' },
    { to: '/reminders', icon: <AlarmOutlinedIcon />, label: 'Reminders', color: C.reminders, module: 'reminders' },
    { to: '/todo', icon: <TaskAltOutlinedIcon />, label: 'My To-Do', color: C.todo, badgeKey: 'todo', module: 'todo' },
    { to: '/visits', icon: <FactCheckOutlinedIcon />, label: 'My Visit Observations', color: C.visits, module: 'visits' },
  ]],
  ['Project Management', [{ to: '/projects', icon: <FolderOpenOutlinedIcon />, label: 'My Projects', color: C.projects, module: 'projects' }]],
  ['Administration', [{ to: '/departments', icon: <ApartmentOutlinedIcon />, label: 'Department Master', color: C.departments, module: 'departments' }]],
  ['Settings', [
    { to: '/settings', icon: <SettingsOutlinedIcon />, label: 'Settings', color: C.settings, module: 'settings' },
    { to: '/integrations', icon: <HubOutlinedIcon />, label: 'Integrations', color: C.integrations, module: 'integrations' },
  ]],
];

/** Page names for the top bar breadcrumb: `[group, page]`. */
export const CRUMBS = {
  '/': ['Home', 'Dashboard'], '/meetings/new': ['My Meetings', 'Schedule New'], '/meetings': ['Meetings', 'My Meetings'],
  '/decisions': ['Meetings', 'Decisions Registry'], '/templates': ['Meetings', 'Templates'],
  '/my-activity': ['Personal', 'My Activity'], '/lab-readiness': ['Personal', 'Lab Readiness'], '/diary': ['Personal', 'My Diary'], '/logs': ['Personal', 'My Discussion Logs'], '/reminders': ['Personal', 'Reminders'],
  '/todo': ['Personal', 'My To-Do'], '/visits': ['Personal', 'My Visit Observations'],
  '/projects': ['Project Management', 'My Projects'], '/departments': ['Administration', 'Department Master'],
  '/integrations': ['Settings', 'Integrations'], '/settings': ['Settings', 'Settings'],
};
