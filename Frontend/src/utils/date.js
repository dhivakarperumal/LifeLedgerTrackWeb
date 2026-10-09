const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})/;

export const toLocalDateKey = (value = new Date()) => {
  if (typeof value === "string") {
    const dateMatch = value.match(DATE_KEY_PATTERN);
    if (dateMatch) return `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;

    const dayFirstMatch = value.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (dayFirstMatch) {
      const [, day, month, year] = dayFirstMatch;
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

export const parseDateOnly = (value) => {
  if (value instanceof Date) return value;
  const key = toLocalDateKey(value);
  const match = key.match(DATE_KEY_PATTERN);
  if (!match) return new Date(Number.NaN);
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
};

export const formatDateOnly = (value, locale = "en-US", options = {}) => {
  if (!value) return "";
  const date = parseDateOnly(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(locale, options);
};