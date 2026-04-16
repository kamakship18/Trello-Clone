import { getFileUrl } from './fileUrl';

/** Inline preview style for board backgrounds (tiles, switcher, etc.) */
export function getBoardThumbStyle(background) {
  const bg = background || '#0079bf';
  if (bg.startsWith('/uploads') || bg.startsWith('http')) {
    const url = bg.startsWith('http') ? bg : getFileUrl(bg);
    return {
      backgroundImage: `url(${url})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    };
  }
  if (bg.startsWith('linear-gradient') || bg.startsWith('radial-gradient')) {
    return { background: bg };
  }
  if (bg.startsWith('#')) {
    return { background: bg };
  }
  return { background: '#0079bf' };
}
