export const DATE_FILTER_OPTIONS = [
  "All",
  "Today",
  "Yesterday",
  "This Week",
  "Last Week",
  "This Month",
  "Last Month",
  "This Year",
  "Last Year",
  "Custom Date Range",
];

const toDateKey = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const shiftDate = (date, days) => {
  const shifted = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  shifted.setDate(shifted.getDate() + days);
  return shifted;
};

export const resolveDateRange = (filter, customStartDate = "", customEndDate = "", now = new Date()) => {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thisWeekStart = shiftDate(today, -((today.getDay() + 6) % 7));
  const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  let start = "";
  let end = "";

  switch (filter) {
    case "Today":
      start = end = toDateKey(today);
      break;
    case "Yesterday":
      start = end = toDateKey(shiftDate(today, -1));
      break;
    case "This Week":
      start = toDateKey(thisWeekStart);
      end = toDateKey(shiftDate(thisWeekStart, 6));
      break;
    case "Last Week": {
      const lastWeekStart = shiftDate(thisWeekStart, -7);
      start = toDateKey(lastWeekStart);
      end = toDateKey(shiftDate(thisWeekStart, -1));
      break;
    }
    case "This Month":
      start = toDateKey(thisMonthStart);
      end = toDateKey(new Date(today.getFullYear(), today.getMonth() + 1, 0));
      break;
    case "Last Month":
      start = toDateKey(new Date(today.getFullYear(), today.getMonth() - 1, 1));
      end = toDateKey(new Date(today.getFullYear(), today.getMonth(), 0));
      break;
    case "This Year":
      start = toDateKey(new Date(today.getFullYear(), 0, 1));
      end = toDateKey(new Date(today.getFullYear(), 11, 31));
      break;
    case "Last Year":
      start = toDateKey(new Date(today.getFullYear() - 1, 0, 1));
      end = toDateKey(new Date(today.getFullYear() - 1, 11, 31));
      break;
    case "Custom Date Range":
      start = customStartDate;
      end = customEndDate;
      break;
    default:
      break;
  }

  return { start, end };
};

export const matchesDateRange = (value, range) => {
  const key = toDateKey(value);
  return Boolean(key) && (!range.start || key >= range.start) && (!range.end || key <= range.end);
};