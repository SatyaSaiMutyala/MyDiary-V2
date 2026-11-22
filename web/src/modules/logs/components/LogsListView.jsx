import { useState } from 'react';
import { Box, InputBase } from '@mui/material';
import { tokens } from '../../../theme/tokens';
import { CHANNELS } from '../../../data/logs';
import { EmptyState, SelectInput } from '../../../components';
import { useDebounced } from '../../../utils/useDebounced';
import { useListLogsQuery, useLogTagsQuery } from '../../../store/api/logsApi';
import { ApiError, Fetching, PAGE_SIZE, Pager } from '../../settings/components/listUi';
import { groupLogsByDay } from '../utils';
import { DayGroups } from './LogCard';

const filterInputSx = { p: '8px 10px', border: `1px solid ${tokens.line}`, borderRadius: '5px', bgcolor: tokens.cream, fontSize: 12, fontFamily: 'inherit', height: 'auto', boxSizing: 'border-box', '&:focus': { outline: 'none', borderColor: tokens.teal } };

/**
 * renderLogsListView — .logs-filters + day groups (All Logs tab). The search box, the channel and the tag
 * are the API's `search=`, `channel=` and `tag=` params; the day grouping is done here on the page of logs
 * the server sends back.
 */
export default function LogsListView({ mine, search, setSearch, channel, setChannel, tag, setTag, onOpen, onFocusPerson }) {
  const q = useDebounced(search.trim(), 300);
  const sig = JSON.stringify([q, channel, tag]);
  const [pageState, setPageState] = useState({ sig, page: 1 });
  const page = pageState.sig === sig ? pageState.page : 1;
  const setPage = (p) => setPageState({ sig, page: p });

  const { data, error, isLoading, isFetching, refetch } = useListLogsQuery({ ...mine, page, limit: PAGE_SIZE, search: q, channel, tag });
  const { data: tagData } = useLogTagsQuery({ ...mine });
  const allTags = (tagData?.items || []).map(t => t.tag).sort();
  const logs = data?.items || [];

  const filters = (
    <Box sx={{ bgcolor: tokens.card, border: `1px solid ${tokens.line}`, borderRadius: tokens.radius, p: '12px 16px', mb: '14px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
      <InputBase value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search logs — person, topic, content..." sx={{ flex: 1, minWidth: { xs: '100%', sm: 200 }, '& .MuiInputBase-input': filterInputSx }} />
      <SelectInput value={channel} onChange={e => setChannel(e.target.value)} sx={{ width: { xs: '100%', sm: 'auto' }, p: '8px 28px 8px 10px', borderRadius: '5px', fontSize: 12, backgroundPosition: 'right 10px center' }}>
        <option value="">All channels</option>
        {Object.entries(CHANNELS).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
      </SelectInput>
      <SelectInput value={tag} onChange={e => setTag(e.target.value)} sx={{ width: { xs: '100%', sm: 'auto' }, p: '8px 28px 8px 10px', borderRadius: '5px', fontSize: 12, backgroundPosition: 'right 10px center' }}>
        <option value="">All tags</option>
        {allTags.map(t => <option key={t} value={t}>{t}</option>)}
      </SelectInput>
    </Box>
  );

  const head = <>{filters}<ApiError error={error} onRetry={refetch} sx={{ mb: '14px' }} /><Fetching on={isFetching} /></>;

  if (error) return head;
  if (logs.length === 0) {
    if (isLoading) return head;
    return <>{head}<EmptyState icon="💬" title="No matching logs" desc="Try broader search or clear filters." /></>;
  }
  return (
    <>
      {head}
      <DayGroups groups={groupLogsByDay(logs)} onOpen={onOpen} onFocusPerson={onFocusPerson} />
      {data?.pages > 1 && <Pager data={data} page={page} onPage={setPage} loading={isFetching} />}
    </>
  );
}
