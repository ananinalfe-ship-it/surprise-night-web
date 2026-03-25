/**
 * Cloudflare Pages Function — POST /api/contact
 *
 * 在 Cloudflare Dashboard → Pages → 项目 → Settings → Environment variables 中设置：
 *   GOOGLE_SCRIPT_URL  — Google Apps Script「网页应用」部署后的 URL（以 /exec 结尾）
 *   CONTACT_WEBHOOK_SECRET — 与 Apps Script 里 Script Properties 的 WEBHOOK_SECRET 一致的长随机串
 *
 * 本地静态预览（无 Functions）时提交会失败，属正常。
 */

var MAX_MSG = 8000;

function jsonResponse(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function trim(str, max) {
  var s = String(str == null ? "" : str);
  return s.length > max ? s.slice(0, max) : s;
}

export async function onRequestPost(context) {
  var env = context.env;

  if (!env.GOOGLE_SCRIPT_URL || !env.CONTACT_WEBHOOK_SECRET) {
    return jsonResponse({ ok: false, error: "not_configured" }, 503);
  }

  var body;
  try {
    body = await context.request.json();
  } catch (e) {
    return jsonResponse({ ok: false, error: "invalid_json" }, 400);
  }

  var name = trim(body.name, 200);
  var organization = trim(body.organization, 300);
  var email = trim(body.email, 320);
  var phone = trim(body.phone, 80);
  var partnership_type = trim(body.partnership_type, 80);
  var budget_range = trim(body.budget_range, 80);
  var project_timeline = trim(body.project_timeline, 80);
  var referral_source = trim(body.referral_source, 80);
  var message = trim(body.message, MAX_MSG);

  if (!name || !organization || !email || !partnership_type) {
    return jsonResponse({ ok: false, error: "validation" }, 400);
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonResponse({ ok: false, error: "validation" }, 400);
  }

  var payload = {
    secret: env.CONTACT_WEBHOOK_SECRET,
    name: name,
    organization: organization,
    email: email,
    phone: phone,
    partnership_type: partnership_type,
    budget_range: budget_range,
    project_timeline: project_timeline,
    referral_source: referral_source,
    message: message,
  };

  var upstream;
  try {
    upstream = await fetch(env.GOOGLE_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    return jsonResponse({ ok: false, error: "upstream" }, 502);
  }

  var text = await upstream.text();
  var parsed = null;
  try {
    parsed = JSON.parse(text);
  } catch (e) {}

  if (!upstream.ok || !parsed || parsed.ok !== true) {
    return jsonResponse({ ok: false, error: "sheet_reject" }, 502);
  }

  return jsonResponse({ ok: true });
}

export async function onRequestGet() {
  return jsonResponse({ ok: true, endpoint: "contact", method: "POST" });
}
