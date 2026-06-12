import { calculateLevel, getCurrentTitle, getUnlockedTitles } from './scenario.js';

export class GameState {
  constructor() {
    this.playerName = 'Worker';
    this.scenarioId = '';
    this.level = 1;
    this.exp = 0;
    this.totalExpEarned = 0;
    this.totalRuntimeMs = 0;
    this.lastSaveTime = Date.now();
    this.equippedTitleIndex = 0;
    this.triggeredEvents = [];
    this.unlockedAchievements = [];
    this.selectedFontTheme = 'green';
    this.isInHub = true;
    this.hubTotalExp = 0;
    this.scenarioAlias = '';
    this.unlockedTitleSets = {};
    this.language = 'zh';
    this.aiOutputLanguage = 'zh';
    this.scenarioProgress = {};
  }
}

export class ScenarioProgress {
  constructor() {
    this.totalExpEarned = 0;
    this.totalRuntimeMs = 0;
    this.triggeredEvents = [];
    this.unlockedAchievements = [];
    this.equippedTitleIndex = 0;
  }
}

export function resetGameForScenario(game, scenario, alias) {
  game.scenarioId = scenario.id;
  game.isInHub = false;
  game.scenarioAlias = alias || '';

  const p = game.scenarioProgress[scenario.id];
  if (p) {
    game.totalExpEarned = p.totalExpEarned;
    game.level = calculateLevel(p.totalExpEarned);
    game.totalRuntimeMs = p.totalRuntimeMs;
    game.equippedTitleIndex = p.equippedTitleIndex;
    game.triggeredEvents = [...p.triggeredEvents];
    game.unlockedAchievements = [...p.unlockedAchievements];
    game.exp = 0;
  } else {
    game.level = 1;
    game.exp = 0;
    game.totalExpEarned = 0;
    game.totalRuntimeMs = 0;
    game.equippedTitleIndex = 0;
    game.triggeredEvents = [];
    game.unlockedAchievements = [];
  }
}

export function exitToHub(game) {
  if (game.scenarioId) {
    game.scenarioProgress[game.scenarioId] = {
      totalExpEarned: game.totalExpEarned,
      totalRuntimeMs: game.totalRuntimeMs,
      triggeredEvents: [...game.triggeredEvents],
      unlockedAchievements: [...game.unlockedAchievements],
      equippedTitleIndex: game.equippedTitleIndex,
    };
  }
  game.hubTotalExp += game.totalExpEarned;
  game.scenarioId = '';
  game.level = 1;
  game.exp = 0;
  game.totalExpEarned = 0;
  game.totalRuntimeMs = 0;
  game.equippedTitleIndex = 0;
  game.triggeredEvents = [];
  game.unlockedAchievements = [];
  game.scenarioAlias = '';
  game.isInHub = true;
}

export function checkAndTriggerEvent(game, scenario) {
  const runtimeHours = game.totalRuntimeMs / 3600000;
  const triggerChance = runtimeHours < 12 ? 0.4 : runtimeHours < 72 ? 0.3 : 0.15;

  if (Math.random() >= triggerChance) return null;

  const available = scenario.events.filter(e =>
    e.minLevel <= game.level &&
    e.minHours <= runtimeHours &&
    (!e.once || !game.triggeredEvents.includes(e.id))
  );

  if (available.length === 0) return null;

  const totalWeight = available.reduce((sum, e) => sum + (e.weight || 1), 0);
  let roll = Math.random() * totalWeight;
  let cumulative = 0;
  const chosen = available.find(e => {
    cumulative += e.weight || 1;
    return roll < cumulative;
  });

  if (chosen) {
    if (chosen.once) game.triggeredEvents.push(chosen.id);
    const title = getCurrentTitle(scenario, game.level);
    return {
      id: chosen.id,
      text: chosen.text,
      title: title ? title.name : '事件',
      color: title ? title.color : '#FFA500',
    };
  }
  return null;
}

export function checkAchievements(game, scenario) {
  const unlocked = [];
  for (const ach of scenario.achievements) {
    if (game.unlockedAchievements.includes(ach.id)) continue;

    let met = false;
    switch (ach.condition.type) {
      case 'level':
        met = game.level >= ach.condition.value;
        break;
      case 'runtime':
        met = game.totalRuntimeMs >= ach.condition.value;
        break;
      case 'events':
        met = game.triggeredEvents.length >= ach.condition.value;
        break;
      case 'titles':
        met = getUnlockedTitles(scenario, game.level).length >= ach.condition.value;
        break;
    }

    if (met) {
      game.unlockedAchievements.push(ach.id);
      unlocked.push(ach);
    }
  }
  return unlocked;
}
