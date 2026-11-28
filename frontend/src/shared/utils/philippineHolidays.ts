export interface CalendarHoliday {
  date: string; // YYYY-MM-DD
  name: string;
  isClinicOverride?: boolean;
}

/**
 * Official Philippine Regular Holidays for a given year.
 * Matches backend ClinicScheduleService::getPhilippineRegularHolidays().
 */
export function getPhilippineRegularHolidays(year: number): CalendarHoliday[] {
  // Anonymous Gregorian algorithm for Easter Sunday
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const easterMonth = Math.floor((h + l - 7 * m + 114) / 31);
  const easterDay = ((h + l - 7 * m + 114) % 31) + 1;

  const pad = (n: number) => String(n).padStart(2, '0');
  const formatYMD = (dt: Date) =>
    `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;

  const easter = new Date(year, easterMonth - 1, easterDay);
  const maundyThursday = new Date(easter.getFullYear(), easter.getMonth(), easter.getDate() - 3);
  const goodFriday = new Date(easter.getFullYear(), easter.getMonth(), easter.getDate() - 2);

  // Last Monday of August (National Heroes Day)
  const aug31 = new Date(year, 7, 31);
  const lastMonAug = 31 - ((aug31.getDay() + 6) % 7);

  return [
    { date: `${year}-01-01`, name: "New Year's Day" },
    { date: formatYMD(maundyThursday), name: 'Maundy Thursday' },
    { date: formatYMD(goodFriday), name: 'Good Friday' },
    { date: `${year}-04-09`, name: 'Araw ng Kagitingan' },
    { date: `${year}-05-01`, name: 'Labor Day' },
    { date: `${year}-06-12`, name: 'Independence Day' },
    { date: `${year}-08-${pad(lastMonAug)}`, name: 'National Heroes Day' },
    { date: `${year}-11-30`, name: 'Bonifacio Day' },
    { date: `${year}-12-25`, name: 'Christmas Day' },
    { date: `${year}-12-30`, name: 'Rizal Day' },
  ].sort((x, y) => x.date.localeCompare(y.date));
}
