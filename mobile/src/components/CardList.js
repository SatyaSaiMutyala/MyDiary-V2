import React from 'react';
import { View } from 'react-native';
import { s } from '../theme';
import { Card, Divider } from './Card';

export function CardList({ children, inset = 16, style }) {
  const rows = React.Children.toArray(children);
  return (
    <Card style={style}>
      {rows.map((row, i) => (
        <View key={i}>
          {i > 0 ? (
            <Divider style={{ marginLeft: s(inset), marginRight: s(16) }} />
          ) : null}
          {row}
        </View>
      ))}
    </Card>
  );
}
