import Holidays from 'date-holidays';
import { readFileSync } from 'node:fs';

const holyDays = JSON.parse(readFileSync(new URL('./holy-days.json', import.meta.url), 'utf8'));

// Thai months 9/11 have 29 days and 10/12 have 30. Lent's published start
// anchors the festivals below; annual official overrides take precedence.
const fixed = [
  ['01-13', 'วันการบินแห่งชาติ'],
  ['01-14', 'วันอนุรักษ์ทรัพยากรป่าไม้ของชาติ'],
  ['01-16', 'วันครู'],
  ['01-17', 'วันโคนมแห่งชาติ'],
  ['01-18', 'วันกองทัพไทย / วันสมเด็จพระนเรศวรมหาราช'],
  ['02-02', 'วันนักประดิษฐ์'],
  ['02-03', 'วันทหารผ่านศึก'],
  ['02-14', 'วันวาเลนไทน์'],
  ['02-24', 'วันศิลปินแห่งชาติ'],
  ['02-26', 'วันสหกรณ์แห่งชาติ'],
  ['03-08', 'วันสตรีสากล'],
  ['03-13', 'วันช้างไทย'],
  ['03-20', 'วันอาสาสมัครสาธารณสุขแห่งชาติ'],
  ['03-22', 'วันน้ำโลก'],
  ['03-27', 'วันที่ระลึกกองทัพอากาศ'],
  ['03-31', 'วันพระบาทสมเด็จพระนั่งเกล้าเจ้าอยู่หัว'],
  ['04-01', 'วันข้าราชการพลเรือน'],
  ['04-02', 'วันอนุรักษ์มรดกไทย'],
  ['04-07', 'วันอนามัยโลก'],
  ['04-13', 'วันผู้สูงอายุแห่งชาติ'],
  ['04-14', 'วันครอบครัว'],
  ['04-22', 'วันคุ้มครองโลก'],
  ['04-25', 'วันนเรศวรมหาราช'],
  ['05-01', 'วันแรงงานแห่งชาติ'],
  ['05-08', 'วันกาชาดสากล'],
  ['05-31', 'วันงดสูบบุหรี่โลก'],
  ['06-05', 'วันสิ่งแวดล้อมโลก'],
  ['06-08', 'วันทะเลโลก'],
  ['06-09', 'วันอานันทมหิดล'],
  ['06-26', 'วันสุนทรภู่ / วันต่อต้านยาเสพติดโลก'],
  ['07-01', 'วันสถาปนาคณะลูกเสือแห่งชาติ'],
  ['07-11', 'วันประชากรโลก'],
  ['07-29', 'วันภาษาไทยแห่งชาติ'],
  ['08-01', 'วันสตรีไทย'],
  ['08-07', 'วันรพี'],
  ['08-16', 'วันสันติภาพไทย'],
  ['08-18', 'วันวิทยาศาสตร์แห่งชาติ'],
  ['09-01', 'วันสืบ นาคะเสถียร'],
  ['09-15', 'วันศิลป์ พีระศรี'],
  ['09-16', 'วันโอโซนโลก'],
  ['09-20', 'วันเยาวชนแห่งชาติ / วันอนุรักษ์รักษาคูคลองแห่งชาติ'],
  ['09-21', 'วันสันติภาพสากล'],
  ['09-24', 'วันมหิดล'],
  ['09-28', 'วันพระราชทานธงชาติไทย'],
  ['10-01', 'วันผู้สูงอายุสากล'],
  ['10-10', 'วันสุขภาพจิตโลก'],
  ['10-16', 'วันอาหารโลก'],
  ['10-17', 'วันตำรวจ'],
  ['10-21', 'วันพยาบาลแห่งชาติ / วันสังคมสงเคราะห์แห่งชาติ'],
  ['10-24', 'วันสหประชาชาติ'],
  ['10-31', 'วันฮาโลวีน'],
  ['11-14', 'วันเบาหวานโลก'],
  ['11-20', 'วันเด็กสากล'],
  ['11-25', 'วันสมเด็จพระมหาธีรราชเจ้า'],
  ['11-27', 'วันสาธารณสุขแห่งชาติ'],
  ['12-01', 'วันเอดส์โลก'],
  ['12-03', 'วันคนพิการสากล'],
  ['12-04', 'วันสิ่งแวดล้อมไทย'],
  ['12-09', 'วันต่อต้านคอร์รัปชันสากล'],
  ['12-16', 'วันกีฬาแห่งชาติ'],
  ['12-25', 'วันคริสต์มาส'],
  ['12-28', 'วันสมเด็จพระเจ้าตากสินมหาราช'],
];
const sources = {
  public: 'https://www.bot.or.th/th/financial-institutions-holiday.html',
  culture: 'https://www.culture.go.th/',
  year2026: 'https://www.thaipbs.or.th/news/content/500481',
  lunar: 'https://www.culture.go.th/culture_th/ewt_news.php?filename=i&nid=5247',
};
const annual = {
  2026: [
    ['01-02', 'วันหยุดราชการเพิ่มเป็นกรณีพิเศษ', 'public'],
    ['02-17', 'วันตรุษจีน', 'observance'],
    ['05-11', 'วันพืชมงคล (วันหยุดราชการ)', 'public'],
    ['09-27', 'สารทเดือนสิบ — วันรับตายาย', 'observance'],
    ['10-11', 'วันสารทไทย / สารทเดือนสิบ — วันส่งตายาย', 'observance'],
    ['10-26', 'วันออกพรรษา', 'observance'],
    ['10-27', 'วันเทโวโรหณะ', 'observance'],
    ['11-24', 'วันลอยกระทง', 'observance'],
  ],
};
const cache = new Map();

export function thaiImportantDays(year) {
  if (cache.has(year)) {
    return cache.get(year);
  }

  const lib = new Holidays('TH', { timezone: 'Asia/Bangkok', languages: ['th', 'en'] });
  const rows = lib.getHolidays(year).map((h) => ({
    date: h.date.slice(0, 10),
    title: h.name,
    type: h.type,
    source: sources.public,
  }));

  for (const row of rows) {
    if (row.date.endsWith('-10-13')) {
      row.title = 'วันนวมินทรมหาราช — วันคล้ายวันสวรรคต รัชกาลที่ 9';
    }

    if (row.date.endsWith('-12-05')) {
      row.title += ' / วันชาติ / วันพ่อแห่งชาติ';
    }

    if (row.date.endsWith('-08-12')) {
      row.title += ' / วันแม่แห่งชาติ';
    }
  }

  for (const [day, title] of fixed) {
    rows.push({
      date: `${year}-${day}`,
      title,
      type: day === '05-01' ? 'bank' : 'observance',
      source: sources.culture,
    });
  }

  const secondSaturday = 8 + ((6 - new Date(Date.UTC(year, 0, 8)).getUTCDay() + 7) % 7);
  rows.push({
    date: `${year}-01-${String(secondSaturday).padStart(2, '0')}`,
    title: 'วันเด็กแห่งชาติ',
    type: 'observance',
    source: sources.culture,
  });
  const lent = rows.find((x) => x.title === 'วันเข้าพรรษา');

  if (lent) {
    for (const [offset, title] of [
      [59, 'สารทเดือนสิบ — วันรับตายาย'],
      [73, 'วันสารทไทย / สารทเดือนสิบ — วันส่งตายาย'],
      [88, 'วันออกพรรษา'],
      [89, 'วันเทโวโรหณะ'],
      [117, 'วันลอยกระทง'],
    ]) {
      const day = new Date(lent.date + 'T00:00:00Z');
      day.setUTCDate(day.getUTCDate() + offset);
      rows.push({
        date: day.toISOString().slice(0, 10),
        title,
        type: 'observance',
        source: sources.lunar,
      });
    }
  }

  const chinese = new Intl.DateTimeFormat('en-u-ca-chinese', {
    timeZone: 'Asia/Bangkok',
    month: 'numeric',
    day: 'numeric',
  });

  for (let n = 0; n < 40; n++) {
    const day = new Date(Date.UTC(year, 0, 20 + n, 12));
    const parts = Object.fromEntries(chinese.formatToParts(day).map((x) => [x.type, x.value]));

    if (parts.month === '1' && parts.day === '1') {
      rows.push({
        date: day.toISOString().slice(0, 10),
        title: 'วันตรุษจีน',
        type: 'observance',
        source: sources.culture,
      });
      break;
    }
  }

  for (const [day, title, type] of annual[year] || []) {
    rows.push({
      date: `${year}-${day}`,
      title,
      type,
      source: year === 2026 ? sources.year2026 : sources.culture,
    });
  }
  // Weekend substitutions apply to recurring nationwide public holidays, not observances.
  const publicDates = new Set(rows.filter((x) => x.type === 'public').map((x) => x.date));

  for (const row of [...rows].filter((x) => x.type === 'public')) {
    const d = new Date(row.date + 'T00:00:00Z');

    if (![0, 6].includes(d.getUTCDay())) {
      continue;
    }

    do {
      d.setUTCDate(d.getUTCDate() + 1);
    } while ([0, 6].includes(d.getUTCDay()) || publicDates.has(d.toISOString().slice(0, 10)));

    const date = d.toISOString().slice(0, 10);
    publicDates.add(date);
    rows.push({ date, title: 'ชดเชย' + row.title, type: 'public', source: row.source });
  }

  for (const day of holyDays.years[year] || []) {
    rows.push({
      date: day.date,
      title:
        'วันพระ ' +
        (day.day.endsWith('+') ? 'ขึ้น ' : 'แรม ') +
        day.day.slice(0, -1) +
        ' ค่ำ เดือน ' +
        day.month,
      type: 'holy',
      source: holyDays.source,
    });
  }

  const unique = Array.from(new Map(rows.map((x) => [x.date + '|' + x.title, x])).values()).sort(
    (a, b) => a.date.localeCompare(b.date),
  );

  if (cache.size > 8) {
    cache.clear();
  }

  cache.set(year, unique);
  return unique;
}
