// Standalone (ad-hoc) tasks — allocated to someone without a meeting / visit source
export const STANDALONE_TASKS = [
  { id: 'sa1', desc: 'Review draft lease agreement for Kondapur Phase II premises', owner: 'Venkata Cherukuri', ownerType: 'internal', creator: 'Pallavi Elisetti', deadline: '2026-11-24', priority: 'high', status: 'open', createdAt: '2026-11-19' },
  { id: 'sa2', desc: 'Sign off on November payroll register', owner: 'Venkata Cherukuri', ownerType: 'internal', creator: 'Madhavi', deadline: '2026-11-22', priority: 'critical', status: 'open', createdAt: '2026-11-20' },
  { id: 'sa3', desc: 'Share Adani AHC proposal v3 with CFO for pricing sanity', owner: 'N. Sharma', ownerType: 'internal', creator: 'Venkata Cherukuri', deadline: '2026-11-23', priority: 'high', status: 'open', createdAt: '2026-11-20' },
  { id: 'sa4', desc: 'Pull Q2 branch P&L in TruFin format for board pack', owner: 'N. Sharma', ownerType: 'internal', creator: 'Venkata Cherukuri', deadline: '2026-11-26', priority: 'medium', status: 'in-progress', createdAt: '2026-11-18' },
  { id: 'sa5', desc: 'Draft 2027 compliance calendar for Begumpet + all branches', owner: 'Mohammed Fayazuddin', ownerType: 'internal', creator: 'Venkata Cherukuri', deadline: '2026-12-05', priority: 'medium', status: 'open', createdAt: '2026-11-17' },
];

// Unifies a task from any source into { id, desc, owner, deadline, priority, status, source, sourceId, sourceTitle, creator, ownerType, raw }
