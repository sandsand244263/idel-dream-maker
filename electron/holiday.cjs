const fs = require('fs');
const path = require('path');

let allHolidays = [];

function loadHolidays() {
  try {
    const p = path.join(__dirname, '..', 'public', 'holidays.json');
    allHolidays = JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch (e) {
    console.error('loadHolidays error:', e);
    allHolidays = [];
  }
  return allHolidays;
}

function getTodaysHoliday() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  return allHolidays.find(h => h.date.month === month && h.date.day === day) || null;
}

function getHolidayById(id) {
  return allHolidays.find(h => h.id === id) || null;
}

function getHolidayEventForScenario(holiday, scenarioId) {
  if (!holiday) return null;

  // Check per-scenario events first
  if (holiday.perScenario && holiday.perScenario[scenarioId]) {
    const texts = holiday.perScenario[scenarioId];
    if (texts && texts.length > 0) {
      return {
        text: texts[Math.floor(Math.random() * texts.length)],
        isHoliday: true,
        holidayName: holiday.name,
        holidayIcon: holiday.icon || '',
      };
    }
  }

  // Fallback to general events
  if (holiday.events && holiday.events.length > 0) {
    return {
      text: holiday.events[Math.floor(Math.random() * holiday.events.length)],
      isHoliday: true,
      holidayName: holiday.name,
      holidayIcon: holiday.icon || '',
    };
  }

  return null;
}

function getHolidayEventById(holidayId, scenarioId) {
  const holiday = getHolidayById(holidayId);
  return getHolidayEventForScenario(holiday, scenarioId);
}

function getAllHolidays() { return allHolidays; }

module.exports = { loadHolidays, getTodaysHoliday, getHolidayEventForScenario, getHolidayEventById, getAllHolidays };
