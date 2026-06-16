const { getLunar } = require('chinese-lunar-calendar');

const ADVANCE_DAYS = 3;

// ── Fixed date holidays ──
const FIXED_HOLIDAYS = [
  { id: 'new_year',        name: '元旦',     icon: '🎆', month: 1,  day: 1  },
  { id: 'valentine',       name: '情人节',   icon: '❤',  month: 2,  day: 14 },
  { id: 'women_day',       name: '妇女节',   icon: '♀',  month: 3,  day: 8  },
  { id: 'white_day',       name: '白色情人节', icon: '🍬', month: 3,  day: 14 },
  { id: 'april_fools',     name: '愚人节',   icon: '😂', month: 4,  day: 1  },
  { id: 'earth_day',       name: '地球日',   icon: '🌍', month: 4,  day: 22 },
  { id: 'labor_day',       name: '劳动节',   icon: '⚒',  month: 5,  day: 1  },
  { id: 'childrens_day',   name: '儿童节',   icon: '🧒', month: 6,  day: 1  },
  { id: 'environment_day', name: '环境日',   icon: '🌿', month: 6,  day: 5  },
  { id: 'peace_day',       name: '国际和平日', icon: '🕊', month: 9,  day: 21 },
  { id: 'halloween',       name: '万圣节',   icon: '🎃', month: 10, day: 31 },
  { id: 'christmas_eve',   name: '平安夜',   icon: '🕯', month: 12, day: 24 },
  { id: 'christmas',       name: '圣诞节',   icon: '🎄', month: 12, day: 25 },
  { id: 'new_year_eve',    name: '跨年夜',   icon: '🎉', month: 12, day: 31 },
];

// ── Lunar calendar holidays ──
const LUNAR_HOLIDAYS = [
  { id: 'spring_festival',  name: '春节',   icon: '🧧', lunarMonth: 1, lunarDay: 1  },
  { id: 'lantern_festival', name: '元宵节', icon: '🏮', lunarMonth: 1, lunarDay: 15 },
  { id: 'dragon_boat',      name: '端午节', icon: '🐉', lunarMonth: 5, lunarDay: 5  },
  { id: 'qixi',             name: '七夕',   icon: '💑', lunarMonth: 7, lunarDay: 7  },
  { id: 'zhongyuan',        name: '中元节', icon: '🕯', lunarMonth: 7, lunarDay: 15 },
  { id: 'mid_autumn',       name: '中秋节', icon: '🌙', lunarMonth: 8, lunarDay: 15 },
  { id: 'double_ninth',     name: '重阳节', icon: '🍁', lunarMonth: 9, lunarDay: 9  },
];

// ── Movable holidays ──
// qingming detected via solarTerm field from getLunar()
const MOVABLE_HOLIDAYS = [
  { id: 'easter',      name: '复活节', icon: '🐣', calcFn: calcEaster },
  { id: 'mothers_day', name: '母亲节', icon: '🌸', calcFn: (y) => calcNthWeekday(y, 5, 0, 2) },
  { id: 'fathers_day', name: '父亲节', icon: '🌻', calcFn: (y) => calcNthWeekday(y, 6, 0, 3) },
  { id: 'thanksgiving',name: '感恩节', icon: '🦃', calcFn: (y) => calcNthWeekday(y, 11, 4, 4) },
];

// ── Calculator helpers ──

function calcEaster(year) {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  return { month: Math.floor((h + l - 7 * m + 114) / 31), day: ((h + l - 7 * m + 114) % 31) + 1 };
}

function calcNthWeekday(year, month, weekday, n) {
  const firstDay = new Date(year, month - 1, 1).getDay();
  const offset = (weekday - firstDay + 7) % 7;
  return { month, day: 1 + offset + (n - 1) * 7 };
}

// ── Holiday detection core ──

function checkDate(year, month, day) {
  // Fixed date
  for (const h of FIXED_HOLIDAYS) {
    if (h.month === month && h.day === day) return h.id;
  }

  // Lunar + solar term
  try {
    const info = getLunar(year, month, day);
    if (info) {
      // Solar term: 清明
      if (info.solarTerm === '清明') return 'qingming';
      // Lunar month/day match
      for (const h of LUNAR_HOLIDAYS) {
        if (info.lunarMonth === h.lunarMonth && info.lunarDate === h.lunarDay) return h.id;
      }
    }
  } catch (e) { /* skip */ }

  // Movable
  for (const h of MOVABLE_HOLIDAYS) {
    const r = h.calcFn(year);
    if (r.month === month && r.day === day) return h.id;
  }

  return null;
}

// ── Public API ──

function getTodaysHolidayId() {
  const now = new Date();
  const id = checkDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
  if (id) {
    return { id, type: 'day' };
  }
  return null;
}

function getUpcomingHolidayId() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();

  // Scan forward ADVANCE_DAYS days
  for (let offset = 1; offset <= ADVANCE_DAYS; offset++) {
    const d = new Date(year, month - 1, day + offset);
    const id = checkDate(d.getFullYear(), d.getMonth() + 1, d.getDate());
    if (id) {
      return { id, type: 'advance' };
    }
  }
  return null;
}

function getHolidayName(id) {
  for (const group of [FIXED_HOLIDAYS, LUNAR_HOLIDAYS, MOVABLE_HOLIDAYS]) {
    const h = group.find(g => g.id === id);
    if (h) return h.name;
  }
  return id;
}

function getHolidayIcon(id) {
  for (const group of [FIXED_HOLIDAYS, LUNAR_HOLIDAYS, MOVABLE_HOLIDAYS]) {
    const h = group.find(g => g.id === id);
    if (h) return h.icon;
  }
  return '';
}

function getHolidayEventFromScenario(scenario, holidayId, type) {
  if (!scenario || !scenario.holidayEvents) return null;
  const pool = scenario.holidayEvents.filter(e =>
    e.holidayId === holidayId && (!type || e.type === type)
  );
  if (pool.length === 0) return null;
  const chosen = pool[Math.floor(Math.random() * pool.length)];
  return {
    text: chosen.text,
    isHoliday: true,
    holidayName: getHolidayName(holidayId),
    holidayIcon: getHolidayIcon(holidayId),
    holidayType: type || 'day',
  };
}

function getRandomHolidayEvent(scenario) {
  if (!scenario || !scenario.holidayEvents || scenario.holidayEvents.length === 0) return null;
  const grouped = {};
  for (const e of scenario.holidayEvents) {
    if (!grouped[e.holidayId]) grouped[e.holidayId] = [];
    grouped[e.holidayId].push(e);
  }
  const ids = Object.keys(grouped);
  if (ids.length === 0) return null;
  const randomId = ids[Math.floor(Math.random() * ids.length)];
  const pool = grouped[randomId];
  const chosen = pool[Math.floor(Math.random() * pool.length)];
  return {
    id: chosen.holidayId,
    text: chosen.text,
    isHoliday: true,
    holidayName: getHolidayName(randomId),
    holidayIcon: getHolidayIcon(randomId),
  };
}

module.exports = {
  getTodaysHolidayId,
  getUpcomingHolidayId,
  getHolidayName,
  getHolidayIcon,
  getHolidayEventFromScenario,
  getRandomHolidayEvent,
};
