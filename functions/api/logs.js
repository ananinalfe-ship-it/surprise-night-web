/**
 * Cloudflare Pages Function — GET /api/logs
 *
 * 查看 AI 聊天记录后台。需要密码访问。
 * 在 Cloudflare Dashboard → Pages → Settings → Environment variables 中设置：
 *   LOGS_PASSWORD — 后台查看密码（例如 surprise2024）
 */

export async function onRequestGet(context) {
  var env = context.env;
  var url = new URL(context.request.url);
  var pwd = url.searchParams.get("pwd");

  // 密码验证
  if (!env.LOGS_PASSWORD || pwd !== env.LOGS_PASSWORD) {
    return new Response("需要密码。用法: /api/logs?pwd=你的密码", {
      status: 401,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  if (!env.CHAT_LOGS) {
    return new Response("CHAT_LOGS KV 未绑定", {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  // 读取所有聊天记录（最近500条）— 并行读，避免串行循环超出 CF Function 10 秒超时
  var list = await env.CHAT_LOGS.list({ prefix: "chat_", limit: 500 });
  var vals = await Promise.all(list.keys.map(function (k) {
    return env.CHAT_LOGS.get(k.name);
  }));
  var logs = [];
  for (var i = 0; i < vals.length; i++) {
    if (vals[i]) {
      try {
        logs.push(JSON.parse(vals[i]));
      } catch (e) {}
    }
  }

  // 按时间倒序（最新的在前）
  logs.sort(function (a, b) {
    return new Date(b.time) - new Date(a.time);
  });

  // 返回一个好看的 HTML 页面
  var rows = "";
  for (var j = 0; j < logs.length; j++) {
    var log = logs[j];
    var t = new Date(log.time);
    var timeStr = t.getFullYear() + "-" +
      String(t.getMonth() + 1).padStart(2, "0") + "-" +
      String(t.getDate()).padStart(2, "0") + " " +
      String(t.getHours()).padStart(2, "0") + ":" +
      String(t.getMinutes()).padStart(2, "0") + ":" +
      String(t.getSeconds()).padStart(2, "0");
    var q = (log.question || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    var a = (log.answer || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    var ip = (log.ip || "—").replace(/</g, "&lt;");
    var city = (log.city || "").replace(/</g, "&lt;");
    var country = (log.country || "").replace(/</g, "&lt;");
    var location = (city && country) ? city + ", " + country : (city || country || "");
    // IP 脱敏：只显示前两段 + *.*
    var ipShort = ip;
    if (ip && ip !== "—" && ip.indexOf(".") > 0) {
      var parts = ip.split(".");
      ipShort = parts[0] + "." + parts[1] + ".*.*";
    }
    var visitorInfo = ipShort + (location ? " (" + location + ")" : "");
    rows += "<tr><td>" + timeStr + "</td><td class='visitor'>" + visitorInfo + "</td><td>" + q + "</td><td>" + a + "</td></tr>\n";
  }

  var html = '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<title>惊喜 AI 聊天记录</title>' +
    '<style>' +
    'body{font-family:-apple-system,sans-serif;margin:0;padding:20px;background:#f5f5f5}' +
    'h1{font-size:20px;margin-bottom:10px}' +
    '.count{color:#666;font-size:14px;margin-bottom:20px}' +
    'table{width:100%;border-collapse:collapse;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1)}' +
    'th{background:#1a1a2e;color:#fff;padding:12px;text-align:left;font-size:13px}' +
    'td{padding:10px 12px;border-bottom:1px solid #eee;font-size:13px;vertical-align:top;max-width:400px;word-wrap:break-word}' +
    'tr:hover{background:#f9f9f9}' +
    '.q{color:#333;font-weight:500}.a{color:#555}.visitor{color:#888;font-size:12px}' +
    '</style></head><body>' +
    '<h1>惊喜 AI 聊天记录</h1>' +
    '<div class="count">共 ' + logs.length + ' 条记录（最近90天）</div>' +
    '<table><tr><th style="width:140px">时间</th><th style="width:140px">访客</th><th>用户问题</th><th>AI 回答</th></tr>' +
    rows +
    '</table></body></html>';

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
