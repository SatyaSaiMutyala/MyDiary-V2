import { createBrowserRouter } from 'react-router-dom';
import AppShell from '../layouts/AppShell';
import LoginPage from '../auth/LoginPage';
import { RequireAuth } from '../auth/RequireAuth';
import DashboardPage from '../modules/dashboard/DashboardPage';
import MeetingsListPage from '../modules/meetings/MeetingsListPage';
import ScheduleMeetingPage from '../modules/meetings/ScheduleMeetingPage';
import MeetingDetailPage from '../modules/meetings/MeetingDetailPage';
import DecisionsPage from '../modules/decisions/DecisionsPage';
import TemplatesPage from '../modules/templates/TemplatesPage';
import MyActivityPage from '../modules/myactivity/MyActivityPage';
import LabReadinessPage from '../modules/labreadiness/LabReadinessPage';
import DiaryPage from '../modules/diary/DiaryPage';
import DiscussionLogsPage from '../modules/logs/DiscussionLogsPage';
import RemindersPage from '../modules/reminders/RemindersPage';
import MyTodoPage from '../modules/todo/MyTodoPage';
import VisitsPage from '../modules/visits/VisitsPage';
import ProjectsPage from '../modules/projects/ProjectsPage';
import ProjectDetailPage from '../modules/projects/ProjectDetailPage';
import DepartmentsPage from '../modules/departments/DepartmentsPage';
import DepartmentDetailPage from '../modules/departments/DepartmentDetailPage';
import IntegrationsPage from '../modules/integrations/IntegrationsPage';
import SettingsPage from '../modules/settings/SettingsPage';
import { NeedsModule } from '../auth/NeedsModule';

// Route map (mirrors showView() names in the prototype):
//  dashboard → /            list → /meetings        schedule → /meetings/new     detail → /meetings/:id
//  edit a meeting → /meetings/:id/edit (the Schedule form, pre-filled, saving overwrites)
//  decisions → /decisions   templates → /templates  myactivity → /my-activity    diary → /diary
//  lab readiness board → /lab-readiness?unit=<key>&date=<YYYY-MM-DD>&phase=opening|closing
//  logs → /logs             mytodo → /todo          visits → /visits
//  projects → /projects     project-detail → /projects/:id
//  departments → /departments   department-detail → /departments/:id   integrations → /integrations
const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/', element: <RequireAuth><AppShell /></RequireAuth>, children: [
    { index: true, element: <DashboardPage /> },
    { path: 'meetings', element: <NeedsModule module="meetings"><MeetingsListPage /></NeedsModule> },
    { path: 'meetings/new', element: <NeedsModule module="meetings"><ScheduleMeetingPage /></NeedsModule> },
    { path: 'meetings/:id/edit', element: <NeedsModule module="meetings"><ScheduleMeetingPage /></NeedsModule> },
    { path: 'meetings/:id', element: <NeedsModule module="meetings"><MeetingDetailPage /></NeedsModule> },
    { path: 'decisions', element: <NeedsModule module="decisions"><DecisionsPage /></NeedsModule> },
    { path: 'templates', element: <NeedsModule module="templates"><TemplatesPage /></NeedsModule> },
    { path: 'my-activity', element: <NeedsModule module="activity"><MyActivityPage /></NeedsModule> },
    { path: 'lab-readiness', element: <NeedsModule module="labReadiness"><LabReadinessPage /></NeedsModule> },
    { path: 'diary', element: <NeedsModule module="diary"><DiaryPage /></NeedsModule> },
    { path: 'logs', element: <NeedsModule module="logs"><DiscussionLogsPage /></NeedsModule> },
    { path: 'reminders', element: <NeedsModule module="reminders"><RemindersPage /></NeedsModule> },
    { path: 'todo', element: <NeedsModule module="todo"><MyTodoPage /></NeedsModule> },
    { path: 'visits', element: <NeedsModule module="visits"><VisitsPage /></NeedsModule> },
    { path: 'projects', element: <NeedsModule module="projects"><ProjectsPage /></NeedsModule> },
    { path: 'projects/:id', element: <NeedsModule module="projects"><ProjectDetailPage /></NeedsModule> },
    { path: 'departments', element: <NeedsModule module="departments"><DepartmentsPage /></NeedsModule> },
    { path: 'departments/:id', element: <NeedsModule module="departments"><DepartmentDetailPage /></NeedsModule> },
    { path: 'integrations', element: <NeedsModule module="integrations"><IntegrationsPage /></NeedsModule> },
    { path: 'settings', element: <NeedsModule module="settings"><SettingsPage /></NeedsModule> },
  ] },
]);
export default router;
