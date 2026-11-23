import React from 'react';

import { ChoiceGroup } from './ChoiceGroup';

export function PriorityPicker({ value, onChange, style }) {
  return (
    <ChoiceGroup
      label="Priority"
      style={style}
      value={value}
      onChange={k => k && onChange(k)}
      options={[
        { key: 'critical', label: 'Critical', tone: 'red' },
        { key: 'high', label: 'High', tone: 'amber' },
        { key: 'medium', label: 'Medium', tone: 'teal' },
        { key: 'low', label: 'Low', tone: 'slate' },
      ]}
    />
  );
}
