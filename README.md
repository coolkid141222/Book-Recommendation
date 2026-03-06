# 图书推荐系统（React + TypeScript + Tailwind + shadcn/ui + Node.js + Drizzle + Neon + LLM）

按你的要求，这版采用了**新方案**：
- 前端：React + TypeScript + Tailwind CSS 4 + shadcn/ui（Vite）
- 后端：Node.js + Express + Drizzle ORM
- 云数据库：Neon PostgreSQL 17
- 推荐链路：**Embedding 召回 + LLM Rerank**

## 1. 目录结构

- `frontend/`：React 前端（TypeScript、Tailwind、shadcn 风格组件、推荐结果展示）
- `backend/`：API 服务与推荐逻辑
- `backend/src/schema.js`：Drizzle ORM 表结构定义
- `backend/sql/schema.sql`：PostgreSQL / pgvector 建表
- `backend/sql/seed.sql`：示例图书与评分行为

## 2. 环境变量

在 `backend/.env` 放置：

```env
DATABASE_URL=postgresql://neondb_owner:npg_4eFPAdzlY5JG@ep-nameless-poetry-ai6m0ab8-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
OPENAI_API_KEY=your_openai_key
EMBEDDING_MODEL=text-embedding-3-small
RERANK_MODEL=gpt-4o-mini
PORT=3001
```

> 如果没有 `OPENAI_API_KEY`，系统会自动退化为基于热度/评分的兜底推荐。

## 3. 初始化数据库

```bash
cd backend
npm install
psql "$DATABASE_URL" -f sql/schema.sql
psql "$DATABASE_URL" -f sql/seed.sql
npm run embed
```

> `npm run embed` 会为 `books` 表生成 embedding 并写入 `book_embeddings`。

## 4. 启动服务

### 启动后端

```bash
cd backend
npm run dev
```

### 启动前端

```bash
cd frontend
npm install
npm run dev
```

默认打开 `http://localhost:5173`，页面会调用 `http://localhost:3001/api/recommend`。

前端当前包含：
- 首页推荐链路说明与系统状态卡片
- 基于 `shadcn/ui` 风格组件实现的查询表单
- 图书目录预览和推荐结果解释区
- `components.json`、TypeScript 配置与 Tailwind 主题变量，便于后续继续扩展 shadcn 组件

## 5. API

### `POST /api/recommend`

请求：

```json
{
  "userId": "u1",
  "topk": 5
}
```

返回：

```json
{
  "userId": "u1",
  "strategy": "embedding + llm rerank",
  "totalCandidates": 20,
  "items": [
    { "id": "b6", "title": "Recommender Systems Handbook", "score": 0.84, "reason": "..." }
  ]
}
```

## 6. 算法流程

1. 读取用户历史评分行为（`user_events`）并拼接用户画像文本。
2. 调用 embedding 模型得到用户向量。
3. 通过 Drizzle ORM 访问 Neon PostgreSQL，并在 pgvector 上做向量相似度检索（召回候选）。
4. 将候选交给 LLM 做 rerank，返回 TopK。
5. 若 LLM/Key 不可用，自动走 fallback 推荐。
