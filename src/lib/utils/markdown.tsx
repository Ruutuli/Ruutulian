import React from 'react';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { MarkdownImage } from '@/components/content/MarkdownImage';
import {
  decodeUrlEntities,
  isImageUrl,
  preprocessMarkdownContent,
} from '@/lib/utils/googleDriveImage';

interface MarkdownProps {
  content: string | null | undefined;
  className?: string;
}

function normalizeUrlProp(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') return decodeUrlEntities(value.trim());
  if (Array.isArray(value) && value[0]) return decodeUrlEntities(String(value[0]).trim());
  return decodeUrlEntities(String(value).trim());
}

function childrenToAlt(children: React.ReactNode): string {
  if (typeof children === 'string') return children.trim() || 'Image';
  if (Array.isArray(children)) {
    const text = children
      .map((child) => (typeof child === 'string' ? child : ''))
      .join('')
      .trim();
    if (text) return text;
  }
  return 'Image';
}

const markdownComponents: Components = {
  a: ({ href, children, ...props }) => {
    const url = normalizeUrlProp(href);
    if (url && isImageUrl(url)) {
      return <MarkdownImage src={url} alt={childrenToAlt(children)} />;
    }
    return (
      <a href={url || href} target="_blank" rel="noopener noreferrer" {...props}>
        {children}
      </a>
    );
  },
  img: ({ src, alt, node }) => {
    const imageSrc =
      normalizeUrlProp(src) ||
      (node?.type === 'element' && node.tagName === 'img'
        ? normalizeUrlProp(node.properties?.src)
        : '');
    if (!imageSrc) return null;
    return <MarkdownImage src={imageSrc} alt={alt?.trim() || 'Image'} />;
  },
};

export function Markdown({ content, className = '' }: MarkdownProps) {
  if (!content) return null;

  const processed = preprocessMarkdownContent(content);

  return (
    <div className={`prose prose-invert max-w-none ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={markdownComponents}>
        {processed}
      </ReactMarkdown>
    </div>
  );
}
