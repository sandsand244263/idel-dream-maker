#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const IS_DEV = process.argv.includes('--dev');
const PROJECT_ROOT = __dirname;
const APPDATA = process.env.APPDATA || '';
const GAME_DIR = path.join(APPDATA, 'Idel-DreamMaker');
const SAVE_PATH = path.join(GAME_DIR, IS_DEV ? 'save_dev.json' : 'save.json');
const SCENARIOS_PATH = path.join(PROJECT_ROOT, 'public', 'scenarios_data.json');
const RELOAD_FLAG_PATH = path.join(GAME_DIR, '.reload_flag');
const LOG_DIR = path.join(GAME_DIR, 'logs');

let Compiler = null;
try { Compiler = require('inkjs/full').Compiler; } catch {}

function sendJson(msg) {
  process.stdout.write(JSON.stringify(msg) + '\n');
}

function ok(id, result) {
  sendJson({ jsonrpc: '2.0', id, result });
}

function fail(id, code, message) {
  sendJson({ jsonrpc: '2.0', id, error: { code, message } });
}

function readSave() {
  if (!fs.existsSync(SAVE_PATH)) return null;
  return JSON.parse(fs.readFileSync(SAVE_PATH, 'utf-8'));
}

function writeSave(data) {
  const dir = path.dirname(SAVE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const tmp = SAVE_PATH + '.tmp_mcp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tmp, SAVE_PATH);
}

function readScenarios() {
  if (!fs.existsSync(SCENARIOS_PATH)) return [];
  return JSON.parse(fs.readFileSync(SCENARIOS_PATH, 'utf-8'));
}

const TOOLS = {

  ink_compile: {
    description: '编译 Ink 叙事代码，检查语法错误。返回编译结果或错误信息。',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Ink 叙事代码（不含 frontmatter 的纯 Ink 内容）' }
      },
      required: ['code']
    },
    call(args) {
      if (!Compiler) throw new Error('inkjs 依赖不可用，请确认已在项目目录下执行 npm install');
      const compiler = new Compiler(args.code);
      const story = compiler.Compile();
      const json = story.ToJson();
      return { success: true, eventCount: (JSON.parse(json).root ? 1 : 0), compiledSize: json.length };
    }
  },

  scenario_build: {
    description: '运行 build.js 编译全部副本，输出编译结果。',
    inputSchema: { type: 'object', properties: {} },
    call() {
      const output = execFileSync('node', ['build.js'], {
        cwd: PROJECT_ROOT, encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024, windowsHide: true
      });
      return { success: true, output: output.trim() };
    }
  },

  flag_check: {
    description: '验证指定副本中所有 FlagSet 是否有后续 FlagRequire 引用。不传 scenarioId 则检查全部。',
    inputSchema: {
      type: 'object',
      properties: {
        scenarioId: { type: 'string', description: '副本 ID，如 wasteland。不传则检查全部' }
      },
      required: []
    },
    call(args) {
      const argv = ['validate_flags.cjs'];
      if (args.scenarioId) argv.push(args.scenarioId);
      const output = execFileSync('node', argv, {
        cwd: PROJECT_ROOT, encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024, windowsHide: true
      });
      return { success: true, output: output.trim() };
    }
  },

  state_dump: {
    description: '读取 dev 存档，返回当前游戏状态。',
    inputSchema: { type: 'object', properties: {} },
    call() {
      const save = readSave();
      if (!save) return { success: false, error: '存档文件不存在，请先启动游戏' };
      const scenarios = readScenarios();
      const sc = scenarios.find(s => s.id === save.scenarioId);
      return {
        success: true,
        state: {
          isInHub: save.isInHub,
          scenarioId: save.scenarioId,
          scenarioName: sc ? (sc.name_cn || sc.name) : null,
          level: save.level,
          exp: save.exp,
          totalExpEarned: save.totalExpEarned,
          totalRuntimeMs: save.totalRuntimeMs,
          currentBranch: save.currentBranch || '',
          flags: save.flags || {},
          completedBranches: save.completedBranches || [],
          rebirthCount: (save.rebirthCounts && save.rebirthCounts[save.scenarioId]) || 0,
          hubLevel: save.hubLevel || 1,
          hubTotalExp: save.hubTotalExp || 0
        }
      };
    }
  },

  state_set: {
    description: '修改 dev 存档。只传需要改的字段，不传的字段保持不变。',
    inputSchema: {
      type: 'object',
      properties: {
        level: { type: 'number', description: '设置等级（自动换算 EXP）' },
        exp: { type: 'number', description: '设置 EXP（覆盖）' },
        flags: { type: 'object', description: '合并旗标，如 {"fed_wangcai": true}' },
        currentBranch: { type: 'string', description: '设置当前分支名称' }
      },
      required: []
    },
    call(args) {
      const save = readSave();
      if (!save) return { success: false, error: '存档文件不存在' };
      if (args.level !== undefined) {
        save.level = args.level;
        save.exp = args.level <= 100 ? Math.pow(args.level - 1, 2) * 100 : 980100 + (args.level - 100) * 6000;
      }
      if (args.exp !== undefined) save.exp = args.exp;
      if (args.flags) {
        if (!save.flags) save.flags = {};
        Object.assign(save.flags, args.flags);
      }
      if (args.currentBranch !== undefined) save.currentBranch = args.currentBranch;
      writeSave(save);
      return { success: true, level: save.level, exp: save.exp, flags: save.flags };
    }
  },

  simulate_levelup: {
    description: '模拟升一级，返回该级触发的事件文本。仅副本内可用。',
    inputSchema: { type: 'object', properties: {} },
    call() {
      const save = readSave();
      if (!save) return { success: false, error: '存档文件不存在' };
      if (save.isInHub) return { success: false, error: '当前在大厅，无法升级。请先进入副本' };

      const scenarios = readScenarios();
      const scenario = scenarios.find(s => s.id === save.scenarioId);
      if (!scenario) return { success: false, error: '找不到当前副本' };

      const newLevel = (save.level || 0) + 1;
      save.level = newLevel;
      save.exp = newLevel <= 100 ? Math.pow(newLevel - 1, 2) * 100 : 980100 + (newLevel - 100) * 6000;
      writeSave(save);

      let text = '';
      let hasChoices = false;

      if (scenario.format === 'ink' && scenario.ink_compiled_json) {
        try {
          const { Story } = require('inkjs');
          const story = new Story(scenario.ink_compiled_json);
          story.variablesState['player_level'] = newLevel;
          if (save.currentBranch) story.variablesState['player_branch'] = save.currentBranch;
          story.ChoosePathString('main_loop');
          let safety = 0;
          while (story.canContinue && safety < 10000) { text += story.Continue(); safety++; }
          text = text.trim();
          if (story.currentChoices.length > 0) hasChoices = true;
        } catch (e) {
          text = '[Ink 叙事运行出错] ' + e.message;
        }
      } else {
        const ev = scenario.events.find(e => e.minLevel === newLevel && (!e.branch || e.branch === save.currentBranch));
        text = ev ? ev.text : '[当前等级无事件]';
      }

      const result = { success: true, level: newLevel, text: text || '[无事件文本]' };
      if (hasChoices) result.note = '此事件包含选择分支，可通过 simulate_levelup 继续推进';
      return result;
    }
  },

  simulate_event: {
    description: '按事件 ID 查询并返回指定事件的文本内容。',
    inputSchema: {
      type: 'object',
      properties: {
        eventId: { type: 'string', description: '事件 ID，如 wasteland_e0050' },
        scenarioId: { type: 'string', description: '副本 ID，默认取当前存档中的副本' }
      },
      required: ['eventId']
    },
    call(args) {
      const scenarios = readScenarios();
      if (scenarios.length === 0) return { success: false, error: 'scenarios_data.json 为空，请先运行 scenario_build' };
      const sid = args.scenarioId || (readSave() || {}).scenarioId;
      const scenario = scenarios.find(s => s.id === sid);
      if (!scenario) return { success: false, error: '找不到副本: ' + (sid || '(无)') };
      const ev = scenario.events.find(e => e.id === args.eventId);
      if (!ev) return { success: false, error: '找不到事件: ' + args.eventId };
      return { success: true, event: { id: ev.id, text: ev.text, type: ev.type, minLevel: ev.minLevel } };
    }
  },

  game_reload: {
    description: '通知游戏重载副本数据。写入 .reload_flag 触发游戏热更新。',
    inputSchema: { type: 'object', properties: {} },
    call() {
      const dir = path.dirname(RELOAD_FLAG_PATH);
      if (!fs.existsSync(dir)) return { success: false, error: '游戏数据目录不存在，请先启动游戏（dev 模式）' };
      const seq = Date.now();
      fs.writeFileSync(RELOAD_FLAG_PATH, JSON.stringify({ seq }), 'utf-8');
      return { success: true, message: '已发送重载信号 (seq=' + seq + ')' };
    }
  },

  game_log: {
    description: '向游戏日志文件追加一条记录（类型: event/info/error）。',
    inputSchema: {
      type: 'object',
      properties: {
        type: { type: 'string', description: '日志类型: event / info / error' },
        message: { type: 'string', description: '日志内容' }
      },
      required: ['type', 'message']
    },
    call(args) {
      if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
      const logFile = path.join(LOG_DIR, 'mcp_' + new Date().toISOString().slice(0, 10) + '.log');
      const line = '[' + new Date().toISOString() + '] [mcp-' + args.type + '] ' + args.message + '\n';
      fs.appendFileSync(logFile, line, 'utf-8');
      return { success: true };
    }
  }

};

let buf = '';
process.stdin.on('data', (chunk) => {
  buf += chunk.toString();
  const lines = buf.split('\n');
  buf = lines.pop() || '';
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let msg;
    try { msg = JSON.parse(trimmed); } catch { continue; }
    handleMessage(msg);
  }
});

function handleMessage(msg) {
  const { id, method, params } = msg;

  if (method === 'initialize') {
    ok(id, {
      protocolVersion: '2024-11-05',
      capabilities: { tools: {} },
      serverInfo: { name: 'idel-dreammaker-mcp', version: '1.0.0' }
    });
    return;
  }

  if (method === 'notifications/initialized' || method === 'shutdown') {
    if (id) ok(id, {});
    return;
  }

  if (method === 'tools/list') {
    const list = Object.keys(TOOLS).map((name) => ({
      name,
      description: TOOLS[name].description,
      inputSchema: TOOLS[name].inputSchema
    }));
    ok(id, { tools: list });
    return;
  }

  if (method === 'tools/call') {
    const tool = TOOLS[params.name];
    if (!tool) { fail(id, -32601, '未知工具: ' + params.name); return; }
    try {
      const result = tool.call(params.arguments || {});
      const resultStr = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
      ok(id, { content: [{ type: 'text', text: resultStr }] });
    } catch (err) {
      fail(id, -32603, err.message);
    }
    return;
  }

  if (id) fail(id, -32601, '未知方法: ' + method);
}
