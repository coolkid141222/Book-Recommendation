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
EMBEDDING_PROVIDER=openai
RERANK_PROVIDER=openai
EMBEDDING_MODEL=text-embedding-3-small
RERANK_MODEL=gpt-4o-mini
PORT=3001
```

> 如果没有 `OPENAI_API_KEY`，系统会自动退化为基于热度/评分的兜底推荐。

如果你要先按 Qwen 来跑：

```env
DASHSCOPE_API_KEY=your_dashscope_key
DASHSCOPE_BASE_URL=https://dashscope.aliyuncs.com

EMBEDDING_PROVIDER=qwen
EMBEDDING_MODEL=text-embedding-v4
EMBEDDING_DIMENSIONS=1536

RERANK_PROVIDER=qwen
RERANK_MODEL=qwen3-rerank
QWEN_RERANK_INSTRUCT=Retrieve the books that best match the user's reading interests and borrowing intent.
```

如果你使用国际站，可以把 `DASHSCOPE_BASE_URL` 改成 `https://dashscope-intl.aliyuncs.com`。

如果要接你自己的模型服务，可以把 provider 切成 `custom`：

```env
EMBEDDING_PROVIDER=custom
CUSTOM_EMBEDDING_URL=http://127.0.0.1:8001/embeddings
CUSTOM_EMBEDDING_MODEL=your-embedding-model
CUSTOM_EMBEDDING_API_KEY=

RERANK_PROVIDER=custom
CUSTOM_RERANK_URL=http://127.0.0.1:8002/rerank
CUSTOM_RERANK_MODEL=your-rerank-model
CUSTOM_RERANK_API_KEY=
```

自定义接口约定：
- embedding 接口返回 `{"embedding":[...]}`
  或 `{"data":[{"embedding":[...]}]}`
- rerank 接口返回 `[{"id":"b1","reason":"..."}]`
  或 `{"items":[{"id":"b1","reason":"..."}]}`

## 3. 初始化数据库

```bash
cd backend
npm install
npm run db:schema
psql "$DATABASE_URL" -f sql/seed.sql
npm run embed
```

> `npm run embed` 会为 `books` 表生成 embedding 并写入 `book_embeddings`。

如果你要从 Goodbooks 这类数据集导入真实书籍和封面：

```bash
./scripts/download_goodbooks.sh
```

然后执行：

```bash
cd backend
BOOKS_CSV_PATH=../data/goodbooks/books_enriched.csv IMPORT_BOOK_LIMIT=300 npm run import:books
```

导入脚本会读取 CSV 里的 `image_url` / `small_image_url`、`genres`、`average_rating`、`ratings_count`，写入真实封面、书城展示分类、原始类别标签和评分信息。前端会优先显示真实封面，没有封面时才回退到当前占位封面。

如果要把数据集评分转换成书城交互记录：

```bash
cd backend
RATINGS_CSV_PATH=../data/goodbooks/ratings.csv IMPORT_RATING_LIMIT=30000 npm run import:interactions
```

这个脚本默认会把 `ratings.csv` 转成 `view / click / borrow / favorite` 这类隐式行为并写入 `user_events`。如果你确实要把评分也落库，可以额外设置 `INCLUDE_RATING_EVENTS=true`。

推荐你把 `ratings.csv` 留在离线实验侧，不要全量写进 Neon。在线库主要保留：
- `books`
- `book_embeddings`
- 少量真实或模拟的隐式交互（`view / click / borrow / favorite / add_to_shelf`）

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
- 书城列表页布局（搜索、分类、四列书卡网格）
- 基于 `shadcn/ui` 风格组件实现的图书卡片和交互按钮
- 对 `Goodbooks` 导入样本书籍、封面、评分的展示
- `components.json`、TypeScript 配置与 Tailwind 主题变量，便于后续继续扩展 shadcn 组件

## 5. API

### `GET /api/models`

返回当前 embedding / rerank provider 与模型配置。

### `GET /api/model-effect`

返回前端模型效果面板所需的数据，包括：
- 当前模型配置
- 书目数量、交互数量、embedding 覆盖率
- 隐式行为分布
- 当前导入样本的真实分类分布

### `POST /api/models/embedding`

请求：

```json
{
  "text": "喜欢科幻、奇幻和高评分长篇小说"
}
```

### `POST /api/models/rerank`

请求：

```json
{
  "query": "喜欢成长型奇幻和系列作品",
  "topk": 3,
  "documents": [
    "Title: The Hobbit\nAuthor: J.R.R. Tolkien\nDescription: ...",
    "Title: To Kill a Mockingbird\nAuthor: Harper Lee\nDescription: ..."
  ]
}
```

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

1. 读取用户历史隐式行为（`user_events`）并拼接用户画像文本。
2. 调用 embedding 模型得到用户向量。
3. 通过 Drizzle ORM 访问 Neon PostgreSQL，并在 pgvector 上做向量相似度检索（召回候选）。
4. 将候选交给 rerank 模型排序，返回 TopK。
5. 若模型/Key 不可用，自动走 fallback 推荐。
