# Portable OpenClaw Kit（OpenClaw 便携版组装套件）

> 一个商科生开源的"AI 随身碟"组装方案：U 盘 + OpenClaw + 一个断网时会自动接管的 64M 本地小模型。
> **本套件不包含 OpenClaw 本体**（MIT 许可证，请至官方渠道下载），只提供便携化脚本、离线助手与保姆级组装说明。

## 效果

| 场景 | 表现 |
|---|---|
| 有网 | 完整云端大模型能力（DeepSeek / Kimi / GPT，任选） |
| 断网 | **自动降级**为 U 盘里的 MiniMind 64M 小模型：告知状态、指导恢复、明确拒答超范围问题 |
| 换电脑 | 拔了就走，聊天记录、配置全在 U 盘上，插哪台 Windows 都能用（盘符自适应） |

原理一句话：**程序管事实，模型管话术**——网络状态、版本、盘符由程序注入，小模型只负责把事实说成人话。

## 快速开始

看 **[组装说明书.md](组装说明书.md)** ——从零开始 30 分钟，每一步都写了（包括插上 U 盘时每个弹窗该点哪个按钮）。

## 仓库内容

```
├── 组装说明书.md          # 保姆级组装教程（写给完全不懂技术的人）
├── 启动OpenClaw.bat       # 便携启动脚本（自动锁定更新、盘符自适应、懒加载离线助手）
├── offline-assistant/     # 断网兜底小模型服务（OpenAI 兼容，CPU 推理）
│   └── （权重从 ModelScope 下载，见说明书第六步）
├── config/                # openclaw.template.json 配置模板（含离线助手接入）
└── docs/
    ├── 踩坑日记.md         # 9 个真实坑：现象→以为→真相→解决（商科生第一人称）
    └── 故障排除.md         # 按症状查的药方
```

## 相关仓库

- 离线助手（训练数据 / 推理代码 / 评测）：[openclaw-offline-assistant](https://github.com/sparebrain-dev/openclaw-offline-assistant)
- 模型权重（ModelScope）：[sparebrain/openclaw-offline-assistant](https://modelscope.cn/models/sparebrain/openclaw-offline-assistant)
- 基座模型：[MiniMind](https://github.com/jingyaogong/minimind)（Apache 2.0）

## Roadmap

- [ ] 状态机：断网自动接管 ✅ 已有；**恢复自动切回**云端 + 释放内存（欢迎 PR）
- [ ] 官方下载地址确认（见说明书第二步 TODO）
- [ ] macOS / Linux 启动脚本
- [ ] 视频版组装教程

## 许可与免责

- 本套件：MIT（LICENSE）
- 不含 OpenClaw 本体与 MiniMind 权重；它们分别遵循其官方许可证（MIT / Apache-2.0），详见 NOTICE
- 与 OpenClaw 官方无关联，"OpenClaw" 名称仅用于描述兼容性
- 离线助手的回答基于特定版本说明书训练，仅供应急参考

## 我是谁

商科生，非程序员。这个项目是人和 AI 协作做出来的——项目文档里每一个坑都是真的。如果你也想做点"自己不会但想做"的东西，我的踩坑日记可能比代码对你更有用。
