// Helper utility for generating or retrieving AI topic thumbnails with dynamic SVG fallback
import React, { useState } from 'react';

const TOPIC_PRESETS: { [key: string]: string } = {
  science: 'https://images.unsplash.com/photo-1507668077129-56e32842fceb?auto=format&fit=crop&w=300&q=80',
  physics: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=300&q=80',
  chemistry: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=300&q=80',
  biology: 'https://images.unsplash.com/photo-1530026405186-ed1f139313f8?auto=format&fit=crop&w=300&q=80',
  math: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=300&q=80',
  mathematics: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=300&q=80',
  technology: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=300&q=80',
  tech: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=300&q=80',
  coding: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=300&q=80',
  javascript: 'https://images.unsplash.com/photo-1579468118864-1b9ea3c0db4a?auto=format&fit=crop&w=300&q=80',
  react: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&w=300&q=80',
  python: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=300&q=80',
  history: 'https://images.unsplash.com/photo-1461360370896-922624d12aa1?auto=format&fit=crop&w=300&q=80',
  geography: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=300&q=80',
  literature: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=300&q=80',
  english: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=300&q=80',
  general: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=300&q=80',
  art: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=300&q=80',
  music: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=300&q=80',
  business: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=300&q=80',
  finance: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=300&q=80',
  exam: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=300&q=80',
  quiz: 'https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?auto=format&fit=crop&w=300&q=80'
};

const COLOR_GRADIENTS = [
  ['#3b82f6', '#8b5cf6'], // blue to purple
  ['#ec4899', '#8b5cf6'], // pink to purple
  ['#10b981', '#3b82f6'], // emerald to blue
  ['#f59e0b', '#ef4444'], // amber to red
  ['#06b6d4', '#3b82f6'], // cyan to blue
  ['#8b5cf6', '#d946ef'], // purple to fuchsia
];

export function getSvgFallbackThumbnail(text: string): string {
  const hash = Math.abs((text || 'Q').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0));
  const gradient = COLOR_GRADIENTS[hash % COLOR_GRADIENTS.length];
  const initial = (text ? text.trim().charAt(0) : 'Q').toUpperCase();

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240">
    <defs>
      <linearGradient id="g_${hash}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${gradient[0]}" />
        <stop offset="100%" stop-color="${gradient[1]}" />
      </linearGradient>
    </defs>
    <rect width="240" height="240" rx="36" fill="url(#g_${hash})" />
    <circle cx="120" cy="120" r="65" fill="white" fill-opacity="0.18" />
    <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="900" font-size="90" fill="#ffffff" letter-spacing="-2">${initial}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function getTopicThumbnail(text: string, customUrl?: string): string {
  if (customUrl && customUrl.trim().length > 5) {
    return customUrl;
  }

  const clean = (text || '').toLowerCase().trim();
  
  for (const [key, url] of Object.entries(TOPIC_PRESETS)) {
    if (clean.includes(key)) {
      return url;
    }
  }

  return getSvgFallbackThumbnail(text || 'Quiz');
}

export interface TopicImageProps {
  title: string;
  customUrl?: string;
  className?: string;
  alt?: string;
}

export const TopicImage: React.FC<TopicImageProps> = ({ title, customUrl, className, alt }) => {
  const primaryUrl = getTopicThumbnail(title, customUrl);
  const [imgSrc, setImgSrc] = useState(primaryUrl);

  const handleError = () => {
    // If external image fails to load, fallback to colorful SVG
    setImgSrc(getSvgFallbackThumbnail(title));
  };

  return (
    <img
      src={imgSrc}
      alt={alt || title}
      className={className || "w-12 h-12 rounded-2xl object-cover border border-slate-200 dark:border-slate-800 shadow-sm"}
      onError={handleError}
    />
  );
};


