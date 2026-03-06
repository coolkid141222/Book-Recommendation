import OpenAI from "openai";

const EMBEDDING_PROVIDER = process.env.EMBEDDING_PROVIDER || "openai";
const RERANK_PROVIDER = process.env.RERANK_PROVIDER || "openai";

const DEFAULT_OPENAI_EMBEDDING_MODEL = "text-embedding-3-small";
const DEFAULT_OPENAI_RERANK_MODEL = "gpt-4o-mini";
const DEFAULT_QWEN_EMBEDDING_MODEL = "text-embedding-v4";
const DEFAULT_QWEN_RERANK_MODEL = "qwen3-rerank";

const EMBEDDING_MODEL =
  process.env.EMBEDDING_MODEL ||
  (EMBEDDING_PROVIDER === "qwen" ? DEFAULT_QWEN_EMBEDDING_MODEL : DEFAULT_OPENAI_EMBEDDING_MODEL);
const RERANK_MODEL =
  process.env.RERANK_MODEL || (RERANK_PROVIDER === "qwen" ? DEFAULT_QWEN_RERANK_MODEL : DEFAULT_OPENAI_RERANK_MODEL);

const EMBEDDING_VECTOR_DIMENSIONS = Number(process.env.EMBEDDING_DIMENSIONS || 1536);
const DASHSCOPE_BASE_URL = normalizeBaseUrl(process.env.DASHSCOPE_BASE_URL || "https://dashscope.aliyuncs.com");
const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY || process.env.QWEN_API_KEY || null;
const QWEN_RERANK_INSTRUCT =
  process.env.QWEN_RERANK_INSTRUCT || "Retrieve the books that best match the user's reading interests and borrowing intent.";

const openaiClient = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;
const qwenClient = DASHSCOPE_API_KEY
  ? new OpenAI({
      apiKey: DASHSCOPE_API_KEY,
      baseURL: `${DASHSCOPE_BASE_URL}/compatible-mode/v1`
    })
  : null;

function normalizeBaseUrl(value) {
  return value.replace(/\/$/, "");
}

function parseJsonResponse(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.items)) {
    return payload.items;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  return null;
}

function validateEmbedding(embedding) {
  if (!Array.isArray(embedding)) {
    throw new Error("embedding 返回格式不正确");
  }

  if (embedding.length !== EMBEDDING_VECTOR_DIMENSIONS) {
    throw new Error(`embedding 维度不匹配，当前为 ${embedding.length}，预期为 ${EMBEDDING_VECTOR_DIMENSIONS}`);
  }

  return embedding;
}

function formatCandidateDocument(candidate) {
  return [`Title: ${candidate.title}`, `Author: ${candidate.author}`, candidate.description ? `Description: ${candidate.description}` : ""]
    .filter(Boolean)
    .join("\n");
}

function parseDashScopeRerankResults(payload) {
  if (Array.isArray(payload?.output?.results)) {
    return payload.output.results;
  }

  if (Array.isArray(payload?.results)) {
    return payload.results;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  return null;
}

async function callCustomEndpoint(url, body, apiKey) {
  if (!url) {
    throw new Error("缺少自定义模型接口地址");
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {})
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`自定义模型请求失败: ${response.status} ${text}`);
  }

  return response.json();
}

async function callDashScopeRerank(query, documents, topk) {
  if (!DASHSCOPE_API_KEY) {
    throw new Error("缺少 DASHSCOPE_API_KEY / QWEN_API_KEY");
  }

  const response = await fetch(`${DASHSCOPE_BASE_URL}/api/v1/services/rerank/text-rerank/text-rerank`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DASHSCOPE_API_KEY}`
    },
    body: JSON.stringify({
      model: RERANK_MODEL,
      query,
      documents,
      top_n: topk,
      instruct: QWEN_RERANK_INSTRUCT
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Qwen rerank 请求失败: ${response.status} ${text}`);
  }

  const payload = await response.json();
  const results = parseDashScopeRerankResults(payload);
  if (!results) {
    throw new Error("Qwen rerank 返回格式不正确");
  }

  return results.map((item) => ({
    index: Number(item.index),
    score: Number(item.relevance_score ?? item.score ?? 0)
  }));
}

function mapRankedDocuments(documents, results) {
  return results
    .filter((item) => Number.isInteger(item.index) && item.index >= 0 && item.index < documents.length)
    .map((item) => ({
      index: item.index,
      score: item.score,
      document: documents[item.index]
    }));
}

export function getModelConfig() {
  return {
    embedding: {
      provider: EMBEDDING_PROVIDER,
      model: EMBEDDING_MODEL,
      dimensions: EMBEDDING_VECTOR_DIMENSIONS
    },
    rerank: {
      provider: RERANK_PROVIDER,
      model: RERANK_MODEL
    }
  };
}

export function getRecommendationStrategyLabel() {
  return `embedding(${EMBEDDING_PROVIDER}:${EMBEDDING_MODEL}) + rerank(${RERANK_PROVIDER}:${RERANK_MODEL})`;
}

export async function createEmbedding(text) {
  if (EMBEDDING_PROVIDER === "custom") {
    const payload = await callCustomEndpoint(
      process.env.CUSTOM_EMBEDDING_URL,
      {
        input: text,
        model: process.env.CUSTOM_EMBEDDING_MODEL || EMBEDDING_MODEL
      },
      process.env.CUSTOM_EMBEDDING_API_KEY
    );

    if (Array.isArray(payload?.embedding)) {
      return validateEmbedding(payload.embedding);
    }

    if (Array.isArray(payload?.data?.[0]?.embedding)) {
      return validateEmbedding(payload.data[0].embedding);
    }

    throw new Error("自定义 embedding 接口返回格式不正确");
  }

  if (EMBEDDING_PROVIDER === "qwen") {
    if (!qwenClient) {
      throw new Error("缺少 DASHSCOPE_API_KEY / QWEN_API_KEY");
    }

    const response = await qwenClient.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text,
      dimensions: EMBEDDING_VECTOR_DIMENSIONS,
      encoding_format: "float"
    });

    return validateEmbedding(response.data[0].embedding);
  }

  if (!openaiClient) {
    return null;
  }

  const response = await openaiClient.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text
  });

  return validateEmbedding(response.data[0].embedding);
}

export async function rerankTextDocuments(query, documents, topk) {
  const normalizedDocuments = documents.filter((item) => typeof item === "string" && item.trim() !== "");
  if (!normalizedDocuments.length) {
    return [];
  }

  if (RERANK_PROVIDER === "qwen") {
    const results = await callDashScopeRerank(query, normalizedDocuments, topk);
    return mapRankedDocuments(normalizedDocuments, results);
  }

  if (RERANK_PROVIDER === "custom") {
    const payload = await callCustomEndpoint(
      process.env.CUSTOM_RERANK_URL,
      {
        query,
        documents: normalizedDocuments,
        topk,
        model: process.env.CUSTOM_RERANK_MODEL || RERANK_MODEL
      },
      process.env.CUSTOM_RERANK_API_KEY
    );

    const ranked = parseJsonResponse(payload);
    if (!ranked) {
      throw new Error("自定义 rerank 接口返回格式不正确");
    }

    return ranked.map((item) => ({
      index: Number(item.index),
      score: Number(item.score ?? item.relevanceScore ?? 0),
      document: normalizedDocuments[Number(item.index)] ?? item.document ?? null
    }));
  }

  return normalizedDocuments.slice(0, topk).map((document, index) => ({
    index,
    score: normalizedDocuments.length - index,
    document
  }));
}

export async function rerankCandidates(profileText, candidates, topk) {
  if (candidates.length === 0) {
    return [];
  }

  if (RERANK_PROVIDER === "qwen") {
    const documents = candidates.map(formatCandidateDocument);
    const ranked = await rerankTextDocuments(profileText, documents, topk);

    return ranked
      .filter((item) => Number.isInteger(item.index) && item.index >= 0 && item.index < candidates.length)
      .map((item) => ({
        id: candidates[item.index].id,
        score: item.score,
        reason: `Qwen rerank score ${item.score.toFixed(4)}`
      }));
  }

  if (RERANK_PROVIDER === "custom") {
    const payload = await callCustomEndpoint(
      process.env.CUSTOM_RERANK_URL,
      {
        profileText,
        candidates,
        topk,
        model: process.env.CUSTOM_RERANK_MODEL || RERANK_MODEL
      },
      process.env.CUSTOM_RERANK_API_KEY
    );

    const ranked = parseJsonResponse(payload);
    if (!ranked) {
      throw new Error("自定义 rerank 接口返回格式不正确");
    }
    return ranked;
  }

  if (!openaiClient) {
    return candidates.slice(0, topk);
  }

  const prompt = `你是图书推荐排序器。\n用户画像: ${profileText}\n候选图书: ${JSON.stringify(
    candidates.map((candidate) => ({
      id: candidate.id,
      title: candidate.title,
      author: candidate.author,
      description: candidate.description
    }))
  )}\n请返回JSON数组，按相关性降序，只包含id和reason，例如[{"id":"...","reason":"..."}]。`;

  const completion = await openaiClient.chat.completions.create({
    model: RERANK_MODEL,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [{ role: "user", content: prompt }]
  });

  try {
    const content = completion.choices[0].message.content;
    const parsed = JSON.parse(content);
    return parseJsonResponse(parsed) || candidates.slice(0, topk);
  } catch {
    return candidates.slice(0, topk);
  }
}
