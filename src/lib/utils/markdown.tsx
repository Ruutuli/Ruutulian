import React from 'react';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { MarkdownImage } from '@/components/content/MarkdownImage';
import { isImageUrl } from '@/lib/utils/googleDriveImage';

interface MarkdownProps {
  content: string | null | undefined;
  className?: string;
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
    if (href && isImageUrl(href)) {
      return <MarkdownImage src={href} alt={childrenToAlt(children)} />;
    }
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
        {children}
      </a>
    );
  },
  img: ({ src, alt, node }) => {
    const imageSrc =
      (typeof src === 'string' && src) ||
      (node?.type === 'element' && node.tagName === 'img'
        ? String(node.properties?.src ?? '')
        : '');
    if (!imageSrc) return null;
    return <MarkdownImage src={imageSrc} alt={alt?.trim() || 'Image'} />;
  },
};

export function Markdown({ content, className = '' }: MarkdownProps) {
  if (!content) return null;

  return (
    <div className={`prose prose-invert max-w-none ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={markdownComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
