import React from 'react';

// Small, dependency-free renderer for the markdown the AI assistant returns
// (headings, bold/italic/code, bullet and numbered lists, simple tables). React escapes all text.
function inline(text: string, keyBase: string): React.ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|__[^_]+__|\*[^*\s][^*]*\*|`[^`]+`)/g).filter(Boolean).map((part, i) => {
    const k = `${keyBase}-${i}`;
    if (/^(\*\*|__)/.test(part)) return <strong key={k}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('`')) return <code key={k} style={{ background:'#EDE9FE', borderRadius:4, padding:'1px 5px', fontSize:'0.92em' }}>{part.slice(1, -1)}</code>;
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) return <em key={k}>{part.slice(1, -1)}</em>;
    return <React.Fragment key={k}>{part}</React.Fragment>;
  });
}

type Item = { text: string; indent: number };

export default function Markdown({ text, color = '#2E1065' }: { text: string; color?: string }) {
  const lines = (text || '').replace(/\r/g, '').split('\n');
  const out: React.ReactNode[] = [];
  let i = 0, n = 0;
  const p: React.CSSProperties = { margin:'0 0 10px', lineHeight:1.65 };

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }

    // table
    if (line.trim().startsWith('|') && lines[i + 1]?.trim().startsWith('|') && /^[\s|:-]+$/.test(lines[i + 1])) {
      const cells = (l: string) => l.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
      const head = cells(line); i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) rows.push(cells(lines[i++]));
      out.push(
        <div key={n++} style={{ overflowX:'auto', marginBottom:10 }}>
          <table style={{ borderCollapse:'collapse', fontSize:12, width:'100%' }}>
            <thead><tr>{head.map((h, c) => <th key={c} style={{ textAlign:'left', padding:'6px 8px', borderBottom:'2px solid #D8B4FE' }}>{inline(h, `h${n}${c}`)}</th>)}</tr></thead>
            <tbody>{rows.map((r, ri) => <tr key={ri}>{r.map((c, ci) => <td key={ci} style={{ padding:'6px 8px', borderBottom:'1px solid #EDE9FE' }}>{inline(c, `c${n}${ri}${ci}`)}</td>)}</tr>)}</tbody>
          </table>
        </div>
      );
      continue;
    }

    // heading, or a line that is only bold text
    const h = line.match(/^#{1,4}\s+(.*)$/) || line.match(/^\s*\*\*([^*]+)\*\*:?\s*$/);
    if (h) { out.push(<div key={n++} style={{ fontWeight:700, margin:'12px 0 6px', fontSize:14 }}>{inline(h[1], `t${n}`)}</div>); i++; continue; }

    if (/^\s*([-*•]|\d+[.)])\s+/.test(line)) {
      const ordered = /^\s*\d+[.)]\s+/.test(line);
      const items: Item[] = [];
      while (i < lines.length && /^\s*([-*•]|\d+[.)])\s+/.test(lines[i])) {
        const m = lines[i].match(/^(\s*)(?:[-*•]|\d+[.)])\s+(.*)$/)!;
        items.push({ text: m[2], indent: Math.min(Math.floor(m[1].length / 2), 3) });
        i++;
        // continuation lines belonging to the item
        while (i < lines.length && lines[i].trim() && !/^\s*([-*•]|\d+[.)])\s+/.test(lines[i]) && !lines[i].trim().startsWith('|')) { items[items.length - 1].text += ' ' + lines[i].trim(); i++; }
      }
      const Tag: any = ordered ? 'ol' : 'ul';
      out.push(
        <Tag key={n++} style={{ margin:'0 0 10px', paddingLeft:20, lineHeight:1.65 }}>
          {items.map((it, k) => <li key={k} style={{ marginBottom:4, marginLeft: it.indent * 16 }}>{inline(it.text, `l${n}${k}`)}</li>)}
        </Tag>
      );
      continue;
    }

    if (/^-{3,}$/.test(line.trim())) { out.push(<hr key={n++} style={{ border:0, borderTop:'1px solid #E9D5FF', margin:'12px 0' }} />); i++; continue; }

    // paragraph: join consecutive plain lines
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^\s*([-*•]|\d+[.)])\s+/.test(lines[i]) && !/^#{1,4}\s/.test(lines[i]) && !lines[i].trim().startsWith('|')) para.push(lines[i++].trim());
    out.push(<p key={n++} style={p}>{inline(para.join(' '), `p${n}`)}</p>);
  }

  return <div style={{ fontSize:13, color, wordBreak:'break-word' }}>{out}</div>;
}
