/**
 * The starting set of the Integrations register — a copy of web/src/data/integrations.js (the 15 cards the
 * prototype showed), plus a `category` for filtering and an `order` so the page keeps the prototype's order.
 *
 * These rows describe WHICH third-party tools are switched on for MyDiary. Nothing here opens a real
 * connection: `status` and `lastSync` are stored text, there is no OAuth, webhook, token or secret.
 */

/** @type {{ name: string, ico: string, desc: string, category: string, status: string, lastSync: string }[]} */
export const DEFAULT_INTEGRATIONS = [
  { name: 'Google Calendar', ico: '📅', category: 'calendar', desc: 'Two-way sync of meetings — invites, RSVPs, updates. Attendee calendar conflict detection.', status: 'connected', lastSync: 'Just now' },
  { name: 'Microsoft Outlook', ico: '📧', category: 'calendar', desc: 'Calendar sync + .ics invite distribution for attendees on Outlook.', status: 'connected', lastSync: '5 min ago' },
  { name: 'Zoom', ico: '💻', category: 'video', desc: 'Auto-create Zoom links for virtual meetings. Bot joins for recording + transcription.', status: 'connected', lastSync: '12 min ago' },
  { name: 'Microsoft Teams', ico: '💻', category: 'video', desc: 'Auto-create Teams links. Bot joins for recording + transcription.', status: 'connected', lastSync: '1 hour ago' },
  { name: 'Google Meet', ico: '💻', category: 'video', desc: 'Auto-create Meet links. Native Google Meet transcript ingestion.', status: 'pending', lastSync: 'Setup in progress' },
  { name: 'WhatsApp Business', ico: '💬', category: 'chat', desc: 'Push meeting reminders and action-item nudges to attendees via WhatsApp.', status: 'disconnected', lastSync: 'Not connected' },
  { name: 'Slack / Teams Chat', ico: '💬', category: 'chat', desc: 'Post meeting summary to channel; tag owners of new action items.', status: 'disconnected', lastSync: 'Not connected' },
  { name: 'SalesPulse 365 (CRM)', ico: '📈', category: 'crm', desc: 'Pull customer context into meeting prep. Push decisions to customer timeline.', status: 'connected', lastSync: '2 hours ago' },
  { name: 'LedgerTrace (AP)', ico: '💰', category: 'finance', desc: 'Pull AP context for vendor meetings. Push decisions to payment workflow.', status: 'connected', lastSync: '30 min ago' },
  { name: 'TruFlow (AR)', ico: '💳', category: 'finance', desc: 'Pull customer AR for customer meetings. Push credit-hold decisions to AR workflow.', status: 'connected', lastSync: '1 hour ago' },
  { name: 'MyDiary My To-Do', ico: '✅', category: 'tasks', desc: "Auto-push action items to owner's unified To-Do inbox in MyDiary.", status: 'connected', lastSync: 'Real-time' },
  { name: 'CMD Approval Hub', ico: '🛡', category: 'tasks', desc: 'Route action items needing CMD approval through the approval mother app.', status: 'pending', lastSync: 'Setup in progress' },
  { name: 'Deepgram (Transcription)', ico: '🎙', category: 'ai', desc: 'Live transcription with speaker diarization. English + Hindi + Telugu support.', status: 'connected', lastSync: 'API healthy' },
  { name: 'Claude AI (Summary)', ico: '✨', category: 'ai', desc: 'Post-meeting AI summary, action extraction, decision detection.', status: 'connected', lastSync: 'API healthy' },
  { name: 'Document Storage (SharePoint)', ico: '📁', category: 'storage', desc: 'Minutes and attachments auto-filed to the right folder structure.', status: 'connected', lastSync: '15 min ago' },
];
