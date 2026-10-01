// OpenClaw 离线助手 · Node 版本地推理服务（U盘便携，无 Python 依赖）
// 用法: node server.js [--port 18795]
// 接口: POST /v1/chat/completions（OpenAI 兼容，支持 stream SSE）, GET /healthz
// 注意: openclaw 的 openai-completions 适配器会发 stream=true，必须回 SSE
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as ort from 'onnxruntime-node';
import { AutoTokenizer, env } from '@huggingface/transformers';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ONNX_PATH = path.join(__dirname, 'offline_assistant_fp32.onnx');
const TOKENIZER_DIR = path.join(__dirname, 'model');
const STATE_PATH = path.join(__dirname, 'state.json');

const FALLBACK_ANSWER = '我是离线应急助手，能力有限，没能理解你的问题。恢复网络后可以获得完整帮助。';
const MAX_NEW_TOKENS_CAP = 128;
const EOS_ID = 2;
const CJK = /[一-鿿]/;

const args = process.argv.slice(2);
const PORT = parseInt(args[args.indexOf('--port') + 1] || '18795', 10);

env.allowLocalModels = true;
env.allowRemoteModels = false;

// 盘符从服务自身所在位置推导（U盘插哪台电脑、是哪个盘符，都自动正确）
const myDrive = path.parse(__dirname).root.replace(/[\\/]$/, ''); // "E:\\" -> "E:"
const state = { network: 'offline', cloud_model: 'unknown', version: '2026.7.35', usb_drive: myDrive };
if (fs.existsSync(STATE_PATH)) Object.assign(state, JSON.parse(fs.readFileSync(STATE_PATH, 'utf-8')));

const tokenizer = await AutoTokenizer.from_pretrained(TOKENIZER_DIR);
const session = await ort.InferenceSession.create(ONNX_PATH, { executionProviders: ['cpu'] });
console.log(`[offline-assistant] model loaded. http://127.0.0.1:${PORT} state=${JSON.stringify(state)}`);

function buildSystem() {
  return `[系统状态] network=${state.network} | cloud_model=${state.cloud_model} | version=${state.version}`;
}

function buildPrompt(question) {
  return `<|im_start|>system\n${buildSystem()}<|im_end|>\n<|im_start|>user\n${question}<|im_end|>\n<|im_start|>assistant\n`;
}

async function generate(question, maxNewTokens = 64) {
  const prompt = buildPrompt(question);
  const enc = tokenizer.encode(prompt);
  let ids = Array.from(enc.input_ids || enc);
  const promptLen = ids.length;
  const cap = Math.min(maxNewTokens || 64, MAX_NEW_TOKENS_CAP);
  for (let step = 0; step < cap; step++) {
    const input = new ort.Tensor('int64', BigInt64Array.from(ids.map(BigInt)), [1, ids.length]);
    const out = await session.run({ input_ids: input });
    const logits = out.logits.data;
    const vocab = out.logits.dims[2];
    const rowOffset = (out.logits.dims[1] - 1) * vocab;
    let best = 0;
    for (let i = 1; i < vocab; i++) if (logits[rowOffset + i] > logits[rowOffset + best]) best = i;
    if (best === EOS_ID) break;
    ids = ids.concat([best]);
  }
  let answer = tokenizer.decode(ids.slice(promptLen), { skip_special_tokens: true }).trim();
  answer = answer.replaceAll('{usb_drive}', state.usb_drive);
  if (!CJK.test(answer)) answer = FALLBACK_ANSWER.replaceAll('{usb_drive}', state.usb_drive);
  return answer;
}

const server = http.createServer(async (req, res) => {
  const url = req.url.split('?')[0];
  if (req.method === 'GET' && url === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: true, state }));
    return;
  }
  if (req.method === 'POST' && url === '/v1/chat/completions') {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', async () => {
      try {
        const json = JSON.parse(body);
        const messages = json.messages || [];
        const userMsg = [...messages].reverse().find((m) => m.role === 'user');
        // content 可能是字符串，也可能是 [{type:'text',text:...}] 数组
        let question = userMsg ? userMsg.content : '';
        if (Array.isArray(question)) {
          question = question.filter((p) => p && (p.type === 'text' || typeof p === 'string'))
            .map((p) => (typeof p === 'string' ? p : p.text || '')).join('\n');
        }
        const st = Date.now();
        const answer = await generate(String(question || ''), json.max_tokens);
        const completion = {
          id: 'chatcmpl-offline',
          object: 'chat.completion',
          created: Math.floor(Date.now() / 1000),
          model: json.model || 'offline-assistant',
          choices: [{ index: 0, message: { role: 'assistant', content: answer }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0, elapsed_ms: Date.now() - st },
        };
        if (json.stream) {
          // SSE 流式：一次性吐出全部内容（模型本身就一次性生成完）
          res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' });
          const chunk = {
            id: completion.id, object: 'chat.completion.chunk', created: completion.created, model: completion.model,
            choices: [{ index: 0, delta: { role: 'assistant', content: answer }, finish_reason: null }],
          };
          res.write(`data: ${JSON.stringify(chunk)}\n\n`);
          res.write(`data: ${JSON.stringify({ ...chunk, choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] })}\n\n`);
          res.write('data: [DONE]\n\n');
          res.end();
        } else {
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify(completion));
        }
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: String(e && e.message || e) }));
      }
    });
    return;
  }
  if (req.method === 'GET' && url === '/v1/models') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ object: 'list', data: [{ id: 'minimind-64m-offline', object: 'model', created: 0, owned_by: 'offline-assistant' }] }));
    return;
  }
  res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ error: 'not found' }));
});

server.listen(PORT, '127.0.0.1');
