import { errorMessage } from '../../../store/api/baseApi';
import { useDialog } from '../../../components/Dialogs';
import { useAcceptRequestMutation, useCounterRequestMutation, useDeclineRequestMutation } from '../../../store/api/meetingRequestsApi';

/**
 * acceptMeetingRequest / declineMeetingRequest / proposeAlternative — same prompt()/alert() texts as the
 * prototype, but each one calls its endpoint: POST /api/meeting-requests/:id/accept | /decline | /counter.
 * The server creates the meeting, writes the notifications and RTK tags refresh the lists.
 *
 * The dialogs are MyDiary's own, and the provider queues them, so each one is simply awaited. The
 * setTimeout nudges that the browser's blocking alert() used to need are gone.
 *
 *   const { accept, decline, propose, busy } = useRequestActions();
 *   accept(request)   // the request object from GET /api/meeting-requests
 */
export function useRequestActions({ onDone } = {}) {
  const [acceptReq, { isLoading: accepting }] = useAcceptRequestMutation();
  const [declineReq, { isLoading: declining }] = useDeclineRequestMutation();
  const [counterReq, { isLoading: countering }] = useCounterRequestMutation();
  const dlg = useDialog();
  const fail = (err) => dlg.alert(errorMessage(err));

  const accept = async (r) => {
    if (!r) return;
    // Cancel means "do not accept after all" — it used to accept the request with an empty note.
    const note = await dlg.prompt('Add a short note for ' + r.from + '? (Optional — e.g. "Can we move to 11:30?")');
    if (note === null) return;
    try {
      const res = await acceptReq({ id: r.id, note }).unwrap();
      onDone?.({ action: 'accepted', request: res.request, meeting: res.meeting });
      await dlg.alert('✓ Accepted. Meeting scheduled for ' + r.proposedDate + ' at ' + r.proposedTime + '.' + (r.from ? ' ' + r.from + ' has been notified.' : ''));
    } catch (err) { fail(err); }
  };

  const decline = async (r) => {
    if (!r) return;
    const note = await dlg.prompt('Decline reason for ' + r.from + '? (Will be sent with the decline notification.)', '');
    if (note === null) return;
    try {
      await declineReq({ id: r.id, note }).unwrap();
      onDone?.({ action: 'declined', requestId: r.id });
      await dlg.alert('Declined. ' + r.from + ' has been notified.');
    } catch (err) { fail(err); }
  };

  const propose = async (r) => {
    if (!r) return;
    const altDate = await dlg.prompt('Propose alternative date (YYYY-MM-DD):', r.proposedDate);
    if (!altDate) return;
    const altTime = await dlg.prompt('Propose alternative time (HH:MM):', r.proposedTime);
    if (!altTime) return;
    const note = await dlg.prompt('Short note to ' + r.from + ':', 'Can we move to the above time instead?');
    if (note === null) return;
    const origFrom = r.from;
    try {
      await counterReq({ id: r.id, proposedDate: altDate, proposedTime: altTime, note }).unwrap();
      onDone?.({ action: 'countered', requestId: r.id });
      await dlg.alert('Counter-proposal sent to ' + origFrom + '.');
    } catch (err) { fail(err); }
  };

  return { accept, decline, propose, busy: accepting || declining || countering };
}
