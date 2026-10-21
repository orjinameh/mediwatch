import React from 'react';
import { View, Text } from 'react-native';

// Minimal markdown for AI answers: headings, **bold**, bullet and numbered lists, paragraphs
const inline = (t: string, color: string) =>
  t.split(/(\*\*[^*]+\*\*|__[^_]+__)/g).filter(Boolean).map((p, i) =>
    /^(\*\*|__)/.test(p)
      ? <Text key={i} style={{ fontWeight: '700', color }}>{p.slice(2, -2)}</Text>
      : <Text key={i}>{p}</Text>);

export default function Markdown({ text, color = '#2E1065' }: { text: string; color?: string }) {
  const lines = (text || '').replace(/\r/g, '').split('\n').filter(l => l.trim() && !/^-{3,}$/.test(l.trim()));
  return (
    <View>
      {lines.map((line, i) => {
        const heading = line.match(/^#{1,4}\s+(.*)$/) || line.match(/^\s*\*\*([^*]+)\*\*:?\s*$/);
        if (heading) return <Text key={i} style={{ fontSize: 14, fontWeight: '700', color, marginTop: i ? 10 : 0, marginBottom: 4 }}>{heading[1]}</Text>;
        const li = line.match(/^(\s*)([-*•]|\d+[.)])\s+(.*)$/);
        if (li) {
          const bullet = /\d/.test(li[2]) ? li[2] : '•';
          return (
            <View key={i} style={{ flexDirection: 'row', marginBottom: 4, paddingLeft: Math.min(li[1].length, 6) * 6 }}>
              <Text style={{ width: 20, color, fontSize: 13, lineHeight: 20 }}>{bullet}</Text>
              <Text style={{ flex: 1, color, fontSize: 13, lineHeight: 20 }}>{inline(li[3], color)}</Text>
            </View>
          );
        }
        return <Text key={i} style={{ color, fontSize: 13, lineHeight: 20, marginBottom: 6 }}>{inline(line.trim(), color)}</Text>;
      })}
    </View>
  );
}
