# 知识库智能体后端服务

本服务使用 Express 提供本地知识库 API，数据落在 `server/data`：

- `knowledge-db.json`：知识库目录、文件元数据、文本分块、AI 配置
- `vector-index.json`：本地哈希向量索引，用余弦相似度做检索

## 启动

```bash
npm run server
```

默认端口：`8787`，可通过环境变量指定：

```bash
KNOWLEDGE_AGENT_PORT=8788 npm run server
```

## 主要接口

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/health` | 健康检查 |
| POST | `/api/knowledge/folder` | 设置知识库目录并扫描索引，body: `{ "folderPath": "D:/docs" }` |
| POST | `/api/knowledge/refresh` | 重新扫描当前知识库目录 |
| GET | `/api/knowledge/files` | 查询文件列表 |
| POST | `/api/knowledge/files/text` | 新增 Markdown 文档，body: `{ "name": "note.md", "content": "..." }` |
| POST | `/api/knowledge/files/upload` | 上传文件到知识库目录，body: `{ "name": "a.md", "contentBase64": "..." }` |
| DELETE | `/api/knowledge/files/:id` | 删除文件和索引，默认同时删除磁盘文件 |
| GET | `/api/knowledge/search?q=关键词&topK=5` | 知识库检索 |
| POST | `/api/knowledge/summary` | 智能总结，body: `{ "scope": "all" }` 或 `{ "scope": "selected", "fileIds": [] }` |
| POST | `/api/chat` | 知识库对话，body: `{ "message": "...", "onlyKb": true }` |
| GET | `/api/config` | 查询 AI 配置 |
| PUT | `/api/config` | 保存 AI 配置 |
| POST | `/api/config/test` | 使用当前配置真实调用 `/chat/completions` 测试连接 |

## 说明

当前版本已经完成本地 JSON 存储、文件分块、向量索引和检索链路。`.md` 文件会读取正文内容；`pdf/doc/docx/ppt/pptx` 先按文件元数据入库，后续可以接入专门解析器抽取正文。

保存 `API Base URL`、`API Key`、`对话模型` 后，`/api/chat` 和 `/api/knowledge/summary` 会优先调用 OpenAI 兼容的 `/chat/completions` 接口。未配置 API Key 时会回退到本地演示回答。

`Embedding 模型` 默认为 `local-hash-vector` 时使用本地哈希向量；如果改成真实模型名并保存配置，服务会调用 OpenAI 兼容的 `/embeddings` 接口重建索引，后续知识库搜索也会使用该模型生成查询向量。
