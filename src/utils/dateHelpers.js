export function formatDreamDate(value, locale) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const weekday = date.toLocaleDateString(locale, { weekday: "long" });
  const time = date.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });
  const short = date.toLocaleDateString(locale, {
    month: "numeric",
    day: "numeric",
    year: "2-digit"
  });

  return `${weekday}, ${time} ${short}`;
}

// return a string like "2 days ago" or "13 hours ago" for the given date value
export function distanceOfTime(value, locale) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffDay > 0) {
    return `${diffDay} day${diffDay > 1 ? "s" : ""} ago`;
  } else if (diffHour > 0) {
    return `${diffHour} hour${diffHour > 1 ? "s" : ""} ago`;
  } else if (diffMin > 0) {
    return `${diffMin} minute${diffMin > 1 ? "s" : ""} ago`;
  } else {
    return `${diffSec} second${diffSec > 1 ? "s" : ""} ago`;
  }
}