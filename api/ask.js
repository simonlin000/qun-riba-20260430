"use strict";

const MODEL = process.env.MINIMAX_MODEL || process.env.LLM_MODEL || "MiniMax-M2.7-highspeed";
const API_KEY = process.env.MINIMAX_API_KEY || process.env.LLM_API_KEY || "";
const API_BASE = (process.env.MINIMAX_BASE_URL || process.env.LLM_BASE_URL || "https://api.minimaxi.com/anthropic").replace(/\/$/, "");
const MAX_TOKENS = Number(process.env.MINIMAX_MAX_TOKENS || process.env.LLM_MAX_TOKENS || "1600");
const TEMPERATURE = Number(process.env.MINIMAX_TEMPERATURE || process.env.LLM_TEMPERATURE || "0.2");

function sendJson(res, status, payload) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 100_000) {
        reject(new Error("请求太大。"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(raw));
    req.on("error", reject);
  });
}

function clipText(value, max = 900) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

function buildContext(contexts) {
  return contexts
    .slice(0, 12)
    .map((item, index) => {
      const id = item.id || index + 1;
      const when = [item.date, item.time].filter(Boolean).join(" ");
      return `【${id}】${when} ${item.who || "未知群友"}：${clipText(item.text)}`;
    })
    .join("\n\n");
}

function extractText(payload) {
  const content = payload?.content;
  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === "string") return item;
        if (item?.type === "text") return item.text || "";
        return "";
      })
      .join("")
      .trim();
  }
  return "";
}

async function callMiniMax(question, contexts, activityStats) {
  if (!API_KEY) {
    const error = new Error("MiniMax API Key 未配置。");
    error.statusCode = 503;
    throw error;
  }

  const contextText = buildContext(contexts);
  const statsText = Array.isArray(activityStats) && activityStats.length
    ? `\n\n本次解锁索引内的发言数统计：${activityStats.map((item) => `${item.who} ${item.count}条`).join("，")}`
    : "";

  const body = {
    model: MODEL,
    max_tokens: MAX_TOKENS,
    temperature: TEMPERATURE,
    system: "你是群日报网站的知识库问答助手。只能根据用户提供的群聊检索片段和统计回答。不要编造人物、链接、日期或结论。资料不足时直接说“资料里没找到”。回答要简洁，关键结论后标注引用编号，例如【1】。",
    messages: [
      {
        role: "user",
        content: `问题：${question}\n\n群聊检索片段：\n${contextText || "无命中片段"}${statsText}`,
      },
    ],
  };

  let response;
  try {
    response = await fetch(`${API_BASE}/v1/messages`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });
  } catch (error) {
    const wrapped = new Error(`模型接口连接失败：${error.cause?.message || error.message}`);
    wrapped.statusCode = 502;
    throw wrapped;
  }

  const text = await response.text();
  if (!response.ok) {
    const error = new Error(`模型接口返回 ${response.status}: ${text.slice(0, 300)}`);
    error.statusCode = 502;
    throw error;
  }

  return extractText(JSON.parse(text)) || "资料里没找到。";
}

module.exports = async function askHandler(req, res) {
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  try {
    const body = JSON.parse(await readBody(req) || "{}");
    const question = String(body.question || "").trim();
    const contexts = Array.isArray(body.contexts) ? body.contexts : [];
    const activityStats = Array.isArray(body.activityStats) ? body.activityStats : [];

    if (question.length < 2) {
      sendJson(res, 400, { error: "请先输入一个具体问题。" });
      return;
    }

    const answer = await callMiniMax(question, contexts, activityStats);
    sendJson(res, 200, {
      answer,
      sources: contexts.slice(0, 12).map((item, index) => ({
        id: item.id || index + 1,
        date: item.date || "",
        time: item.time || "",
        who: item.who || "",
        reportHref: item.reportHref || "",
      })),
    });
  } catch (error) {
    sendJson(res, error.statusCode || 500, { error: error.message || "问答失败。" });
  }
};
