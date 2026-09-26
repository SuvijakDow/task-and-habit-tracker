import React from 'react';
import { TaskLinkChip } from '@/types';
import {
  Link,
  ExternalLink,
  FileText,
  Code2,
  Video,
  BookOpen,
  Globe,
  FolderGit2,
} from 'lucide-react';

export interface TaskSmartChipProps {
  chip?: TaskLinkChip;
  className?: string;
}

const GithubIcon: React.FC<{ className?: string }> = ({ className = 'w-3.5 h-3.5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

const FigmaIcon: React.FC<{ className?: string }> = ({ className = 'w-3.5 h-3.5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 5.5A3.5 3.5 0 0 1 8.5 2H12v7H8.5A3.5 3.5 0 0 1 5 5.5z" />
    <path d="M12 2h3.5a3.5 3.5 0 1 1 0 7H12V2z" />
    <path d="M12 12.5a3.5 3.5 0 1 1 7 0 3.5 3.5 0 1 1-7 0z" />
    <path d="M5 19.5A3.5 3.5 0 0 1 8.5 16H12v3.5a3.5 3.5 0 1 1-7 0z" />
    <path d="M5 12.5A3.5 3.5 0 0 1 8.5 9H12v7H8.5A3.5 3.5 0 0 1 5 12.5z" />
  </svg>
);

export const renderChipIcon = (iconName?: string, className = 'w-3.5 h-3.5') => {
  switch (iconName) {
    case 'github':
      return <GithubIcon className={className} />;
    case 'drive':
      return <FolderGit2 className={className} />;
    case 'document':
      return <FileText className={className} />;
    case 'code':
      return <Code2 className={className} />;
    case 'video':
      return <Video className={className} />;
    case 'book':
      return <BookOpen className={className} />;
    case 'figma':
      return <FigmaIcon className={className} />;
    case 'globe':
      return <Globe className={className} />;
    case 'link':
    default:
      return <Link className={className} />;
  }
};

export const CHIP_ICON_OPTIONS = [
  { id: 'link', label: 'Link', icon: Link },
  { id: 'github', label: 'GitHub', icon: GithubIcon },
  { id: 'drive', label: 'Drive / Doc', icon: FolderGit2 },
  { id: 'document', label: 'Document', icon: FileText },
  { id: 'code', label: 'Code', icon: Code2 },
  { id: 'video', label: 'Video', icon: Video },
  { id: 'book', label: 'Book / Study', icon: BookOpen },
  { id: 'figma', label: 'Figma', icon: FigmaIcon },
  { id: 'globe', label: 'Website', icon: Globe },
];

export const autoDetectLinkChip = (rawUrl: string): { icon: string; suggestedLabel: string } => {
  const url = rawUrl.trim().toLowerCase();
  if (!url) return { icon: 'link', suggestedLabel: '' };

  if (url.includes('github.com')) {
    const parts = rawUrl.split('github.com/')[1]?.split('/').filter(Boolean) || [];
    const repoName = parts[1] || parts[0] || 'GitHub Repo';
    return { icon: 'github', suggestedLabel: repoName };
  }

  if (url.includes('drive.google.com') || url.includes('docs.google.com')) {
    return { icon: 'drive', suggestedLabel: 'Google Drive Doc' };
  }

  if (url.includes('figma.com')) {
    return { icon: 'figma', suggestedLabel: 'Figma File' };
  }

  if (url.includes('youtube.com') || url.includes('youtu.be') || url.includes('vimeo.com')) {
    return { icon: 'video', suggestedLabel: 'Video Link' };
  }

  if (url.includes('notion.so') || url.includes('notion.site')) {
    return { icon: 'document', suggestedLabel: 'Notion Doc' };
  }

  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    const host = parsed.hostname.replace(/^www\./, '');
    return { icon: 'globe', suggestedLabel: host };
  } catch {
    return { icon: 'link', suggestedLabel: 'Web Link' };
  }
};

export const TaskSmartChip: React.FC<TaskSmartChipProps> = ({ chip, className = '' }) => {
  if (!chip || !chip.url || !chip.url.trim()) return null;

  let formattedUrl = chip.url.trim();
  if (!/^https?:\/\//i.test(formattedUrl)) {
    formattedUrl = `https://${formattedUrl}`;
  }

  const displayLabel =
    chip.label?.trim() ||
    formattedUrl.replace(/^https?:\/\/(www\.)?/, '').split('/')[0] ||
    'Link';

  return (
    <a
      href={formattedUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[9px] sm:text-xs font-semibold bg-purple-100/90 text-purple-900 border border-purple-200/90 hover:bg-purple-200 hover:text-purple-950 hover:border-purple-300 hover:shadow-2xs transition-all duration-150 group max-w-full shrink-0 ${className}`}
      title={formattedUrl}
    >
      <span className="shrink-0 text-purple-600 group-hover:scale-110 transition-transform">
        {renderChipIcon(chip.icon, 'w-3.5 h-3.5')}
      </span>
      <span className="truncate max-w-[140px] sm:max-w-[220px] font-medium">
        {displayLabel}
      </span>
      <ExternalLink className="w-3 h-3 text-purple-400 group-hover:text-purple-600 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity" />
    </a>
  );
};
