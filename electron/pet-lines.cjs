// ── v4 宠物语台词池（设计文档 §7.3）──
// 结构：层(layer) → 通用池(common) + 男宠池(male) + 女宠池(female)
// 抽取规则：70% 通用池 / 30% 性别池；同层不连续重复
// 本文件内容由用户逐类确认后填充（阶段 5b）；当前为占位结构
module.exports = {
  lines: {
    // 日常闲聊（点击时）
    casual: { common: [], male: [], female: [] },
    // 升级祝贺
    levelup: { common: [], male: [], female: [] },
    // 成就祝贺
    achievement: { common: [], male: [], female: [] },
    // 低落（饿/脏/无聊，点击时优先）
    low: { common: [], male: [], female: [] },
    // 满足（三维全绿时点击）
    satisfied: { common: [], male: [], female: [] },
    // 特定时刻（进世界等，该时刻后第一次点击）
    special: { common: [], male: [], female: [] },
    // 食物反馈（喂食后）
    feed: { common: [], male: [], female: [] },
    // 洗澡反馈（洗澡后）
    wash: { common: [], male: [], female: [] },
    // 节日（节日当天点击优先；key = 节日 id，common 为通用节日台词）
    holiday: { common: [], male: [], female: [] },
  },
};
