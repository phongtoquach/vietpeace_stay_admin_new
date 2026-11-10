const ALL_MONTHS = 'all';

function parseYear(value) {
  const year = Number(value);
  return Number.isInteger(year) && year >= 2000 && year <= 2100 ? year : null;
}

function parseMonth(value) {
  const month = Number(value);
  return Number.isInteger(month) && month >= 1 && month <= 12 ? month : null;
}

export function readReportPeriod(searchParams) {
  const now = new Date();
  const year = parseYear(searchParams.get('year')) || now.getFullYear();
  const rawMonth = searchParams.get('month');

  if (rawMonth === ALL_MONTHS) {
    return { year, month: null };
  }

  return {
    year,
    month: parseMonth(rawMonth) || now.getMonth() + 1,
  };
}

export function withReportPeriod(searchParams, year, month) {
  const next = new URLSearchParams(searchParams);
  next.set('year', String(year));
  next.set('month', month === null ? ALL_MONTHS : String(month));
  return next;
}

export function buildReportPeriodQuery(year, month) {
  const params = new URLSearchParams({ year: String(year) });
  params.set('month', month === null ? ALL_MONTHS : String(month));
  return params.toString();
}

export function buildReportPath(pathname, year, month) {
  return `${pathname}?${buildReportPeriodQuery(year, month)}`;
}
