import React from 'react';

interface Props {
  children: string;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function parseInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  // Patterns: code, bold+italic, bold, italic
  const re = /(`[^`]+`|\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\*[^*]+\*|__[^_]+__|_[^_]+_)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    const raw = match[0];
    if (raw.startsWith('`')) {
      nodes.push(<code key={key++} className="bg-white/10 rounded px-1 font-mono text-sm">{raw.slice(1, -1)}</code>);
    } else if (raw.startsWith('***') || raw.startsWith('___')) {
      nodes.push(<strong key={key++}><em>{raw.slice(3, -3)}</em></strong>);
    } else if (raw.startsWith('**') || raw.startsWith('__')) {
      nodes.push(<strong key={key++}>{raw.slice(2, -2)}</strong>);
    } else {
      nodes.push(<em key={key++}>{raw.slice(1, -1)}</em>);
    }
    last = match.index + raw.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export default function ReactMarkdown({ children }: Props) {
  if (!children) return null;
  const lines = children.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push(
        <pre key={key++} className="bg-white/10 rounded p-3 my-2 overflow-x-auto text-sm font-mono">
          <code>{codeLines.join('\n')}</code>
        </pre>
      );
      i++;
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2];
      const classes = ['text-2xl font-bold mt-4 mb-2','text-xl font-bold mt-3 mb-1','text-lg font-semibold mt-2 mb-1','text-base font-semibold mt-2 mb-1','text-sm font-semibold mt-1 mb-1','text-sm font-medium mt-1'];
      elements.push(React.createElement(`h${level}`, { key: key++, className: classes[level - 1] }, parseInline(text)));
      i++;
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|_{3,}|\*{3,})$/.test(line.trim())) {
      elements.push(<hr key={key++} className="border-white/20 my-3" />);
      i++;
      continue;
    }

    // Unordered list
    if (/^[-*+]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*+]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*+]\s+/, ''));
        i++;
      }
      elements.push(
        <ul key={key++} className="list-disc list-inside my-1 space-y-0.5">
          {items.map((item, idx) => <li key={idx}>{parseInline(item)}</li>)}
        </ul>
      );
      continue;
    }

    // Ordered list
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ''));
        i++;
      }
      elements.push(
        <ol key={key++} className="list-decimal list-inside my-1 space-y-0.5">
          {items.map((item, idx) => <li key={idx}>{parseInline(item)}</li>)}
        </ol>
      );
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith('> ')) {
        quoteLines.push(lines[i].slice(2));
        i++;
      }
      elements.push(
        <blockquote key={key++} className="border-l-4 border-white/30 pl-3 my-2 italic opacity-80">
          {parseInline(quoteLines.join(' '))}
        </blockquote>
      );
      continue;
    }

    // Blank line
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Paragraph
    const paraLines: string[] = [];
    while (i < lines.length && lines[i].trim() !== '' && !/^(#{1,6}\s|```|[-*+]\s|\d+\.\s|> )/.test(lines[i])) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length > 0) {
      elements.push(<p key={key++} className="my-1">{parseInline(paraLines.join(' '))}</p>);
    }
  }

  return <div className="markdown-content">{elements}</div>;
}
