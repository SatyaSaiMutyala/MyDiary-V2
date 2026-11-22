import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader, TabBar } from '../../components';
import { useListUsersQuery } from '../../store/api/usersApi';
import { useListAuditQuery } from '../../store/api/auditApi';
import UsersTab from './components/UsersTab';
import ActivityLogTab from './components/ActivityLogTab';
import AccountTab from './components/AccountTab';

/** Settings — Users & Permissions · Activity Log · My account (GateBook Settings layout). Tab counts = server totals. */
export default function SettingsPage() {
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState(params.get('tab') || 'users');
  useEffect(() => { const t = params.get('tab'); if (t && t !== tab) setTab(t); }, [params]); // eslint-disable-line react-hooks/exhaustive-deps
  const change = (t) => { setTab(t); setParams(t === 'users' ? {} : { tab: t }, { replace: true }); };
  const { data: activeUsers } = useListUsersQuery({ status: 'active', limit: 1 });
  const { data: audit } = useListAuditQuery({ limit: 1 });
  return (
    <>
      <PageHeader code="TL-OPS-ADM-001" parts={['Settings', 'Administration']} icon="⚙" title="Settings"
        sub="Who can use MyDiary and what they can open, plus the server's log of every action taken in the workspace." />
      <TabBar value={tab} onChange={change} tabs={[
        { key: 'users', icon: '👥', label: 'Users & Permissions', count: activeUsers?.total },
        { key: 'activity', icon: '🧾', label: 'Activity Log', count: audit?.total },
        { key: 'account', icon: '👤', label: 'My account' },
      ]} />
      {tab === 'users' && <UsersTab />}
      {tab === 'activity' && <ActivityLogTab />}
      {tab === 'account' && <AccountTab />}
    </>
  );
}
