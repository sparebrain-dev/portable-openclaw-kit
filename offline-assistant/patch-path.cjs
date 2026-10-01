// OpenClaw 离线助手 · 启动路径同步脚本
// 用法: node patch-path.js <U盘根目录，如 E:\>
// 作用: 把 openclaw.json 里 localService 的 command/cwd 改成当前实际盘符
// 原理: U盘插不同电脑盘符会变，而 openclaw 要求 localService.command 是绝对路径
const fs = require('node:fs');
const path = require('node:path');

let root = process.argv[2] || '';
if (!root) { console.error('[patch-path] 缺少盘符参数'); process.exit(1); }
root = root.replace(/\\/g, '/');
if (!root.endsWith('/')) root += '/';

const configPath = path.join(root, 'data/.openclaw/openclaw.json');
if (!fs.existsSync(configPath)) { console.error('[patch-path] 找不到 ' + configPath); process.exit(1); }

const cfg = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
const provider = cfg?.models?.providers?.['offline-assistant'];
if (!provider?.localService) { console.error('[patch-path] 配置里没有 offline-assistant.localService，跳过'); process.exit(0); }

const nextCommand = root + 'runtime/node/node.exe';
const nextCwd = root + 'offline-assistant';

if (provider.localService.command === nextCommand && provider.localService.cwd === nextCwd) {
  console.log('[patch-path] 路径已是最新，无需修改');
  process.exit(0);
}

provider.localService.command = nextCommand;
provider.localService.cwd = nextCwd;
fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2), 'utf-8');
console.log('[patch-path] 已同步离线助手路径 -> ' + nextCommand);
