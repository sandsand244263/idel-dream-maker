const HOLIDAY_DATES = {
  new_year:        { month: 1, day: 1 },
  valentine:       { month: 2, day: 14 },
  april_fools:     { month: 4, day: 1 },
  halloween:       { month: 10, day: 31 },
  christmas:       { month: 12, day: 25 },
  mid_autumn:      { month: 8, day: 15 },
  lantern_festival:{ month: 2, day: 12 },
  childrens_day:   { month: 6, day: 1 },
};

const HOLIDAY_NAMES = {
  new_year: '元旦',
  valentine: '情人节',
  april_fools: '愚人节',
  halloween: '万圣节',
  christmas: '圣诞节',
  mid_autumn: '中秋节',
  lantern_festival: '元宵节',
  childrens_day: '儿童节',
};

const HOLIDAY_ICONS = {
  new_year: '🎆',
  valentine: '❤',
  april_fools: '😂',
  halloween: '🎃',
  christmas: '🎄',
  mid_autumn: '🌙',
  lantern_festival: '🏮',
  childrens_day: '🧒',
};

function getTodaysHolidayId() {
  const now = new Date();
  const m = now.getMonth() + 1, d = now.getDate();
  for (const [id, date] of Object.entries(HOLIDAY_DATES)) {
    if (date.month === m && date.day === d) return id;
  }
  return null;
}

function getHolidayName(id) { return HOLIDAY_NAMES[id] || id; }
function getHolidayIcon(id) { return HOLIDAY_ICONS[id] || ''; }

function getHolidayEventFromScenario(scenario, holidayId) {
  if (!scenario || !scenario.holidayEvents) return null;
  const pool = scenario.holidayEvents.filter(e => e.holidayId === holidayId);
  if (pool.length === 0) return null;
  const chosen = pool[Math.floor(Math.random() * pool.length)];
  return {
    text: chosen.text,
    isHoliday: true,
    holidayName: getHolidayName(holidayId),
    holidayIcon: getHolidayIcon(holidayId),
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

module.exports = { getTodaysHolidayId, getHolidayName, getHolidayIcon, getHolidayEventFromScenario, getRandomHolidayEvent };
