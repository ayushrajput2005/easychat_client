/**
 * Formats a date-time string to a short readable time.
 * - Same day: "2:30 PM"
 * - This week: "Mon"
 * - Older: "12/07"
 */
export function formatChatTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();

  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: 'short' });
  }

  return date.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
}

/**
 * Returns the initials for an avatar (up to 2 chars).
 */
export function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Generates a deterministic color from a string (for avatars without images).
 */
export function stringToColor(str) {
  const palette = [
    '#6c63ff', '#e84393', '#22c55e', '#f59e0b',
    '#06b6d4', '#8b5cf6', '#f97316', '#14b8a6',
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return palette[Math.abs(hash) % palette.length];
}

/**
 * Truncates a string to maxLen characters, appending '...'
 */
export function truncate(str, maxLen = 40) {
  if (!str) return '';
  return str.length > maxLen ? str.slice(0, maxLen) + '…' : str;
}
