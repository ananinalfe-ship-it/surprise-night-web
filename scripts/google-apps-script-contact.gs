/**
 * 谷歌表格 — 联系表单写入脚本
 *
 * 用法 A（推荐）：打开你的 Google 表格 → 扩展程序 → Apps Script → 粘贴本文件全部内容。
 * 用法 B：若已在 script.google.com 建了独立项目，在「脚本属性」里增加 SPREADSHEET_ID
 *        （打开表格，地址栏 …/d/xxxxxxxx/… 中间那串就是 ID）。
 *
 * 必做：
 * 1. 表格第 1 行表头（可选，方便阅读）：
 *    提交时间 | 姓名 | 公司/组织 | 邮箱 | 电话 | 合作类型 | 预算 | 时间线 | 来源 | 项目描述
 * 2. 项目设置 → 脚本属性 → WEBHOOK_SECRET = 长随机串（与 Cloudflare CONTACT_WEBHOOK_SECRET 一致）
 * 3. 部署 → 新建部署 → 网页应用：执行身份「我」，访问「任何人」
 * 4. 把部署 URL 填到 Cloudflare Pages 环境变量 GOOGLE_SCRIPT_URL，保存后重新部署 Pages
 *
 * 邮件通知（可选）：
 * - 默认发到 424117ww@gmail.com；若要改地址，在脚本属性里加 NOTIFY_EMAIL。
 * - 首次使用发信：保存代码后，在编辑器上方选函数 authorizeMailOnce → 运行 → 按提示授权 Gmail。
 * - 然后「部署」→「管理部署」→ 编辑 → 选新版本 → 部署（网页应用须用新版本）。
 */

function getTargetSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss) {
    return ss.getActiveSheet();
  }
  var id = PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");
  if (!id) {
    throw new Error("No spreadsheet: open script from Sheet (扩展程序→Apps Script) or set SPREADSHEET_ID in script properties.");
  }
  return SpreadsheetApp.openById(id).getActiveSheet();
}

function doPost(e) {
  var expected = PropertiesService.getScriptProperties().getProperty("WEBHOOK_SECRET");
  if (!expected) {
    return jsonOut({ ok: false, error: "script_not_configured" });
  }

  var data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonOut({ ok: false, error: "invalid_json" });
  }

  if (!data.secret || data.secret !== expected) {
    return jsonOut({ ok: false, error: "unauthorized" });
  }

  try {
    var sheet = getTargetSheet();
    sheet.appendRow([
      new Date(),
      data.name || "",
      data.organization || "",
      data.email || "",
      data.phone || "",
      data.partnership_type || "",
      data.budget_range || "",
      data.project_timeline || "",
      data.referral_source || "",
      data.message || "",
    ]);
  } catch (err) {
    return jsonOut({ ok: false, error: "sheet_error" });
  }

  try {
    var notifyTo =
      PropertiesService.getScriptProperties().getProperty("NOTIFY_EMAIL") ||
      "424117ww@gmail.com";
    var subj = "[惊喜之夜] 网站新咨询 — " + (data.name || "未填姓名");
    var body =
      "姓名: " +
      (data.name || "") +
      "\n公司/组织: " +
      (data.organization || "") +
      "\n邮箱: " +
      (data.email || "") +
      "\n电话: " +
      (data.phone || "") +
      "\n合作类型: " +
      (data.partnership_type || "") +
      "\n预算: " +
      (data.budget_range || "") +
      "\n时间线: " +
      (data.project_timeline || "") +
      "\n如何得知: " +
      (data.referral_source || "") +
      "\n\n项目描述:\n" +
      (data.message || "（无）");
    MailApp.sendEmail(notifyTo, subj, body);
  } catch (mailErr) {
    // 表格已写入；邮件失败不返回错误，避免用户看到提交失败
  }

  return jsonOut({ ok: true });
}

/** 在编辑器里「运行」本函数一次，完成 Gmail 发信授权；收到测试邮件后即可停止运行。 */
function authorizeMailOnce() {
  var to =
    PropertiesService.getScriptProperties().getProperty("NOTIFY_EMAIL") ||
    "424117ww@gmail.com";
  MailApp.sendEmail(
    to,
    "[惊喜之夜] 邮件通知测试",
    "若收到此信，说明 MailApp 已授权。客户提交表单后你也会收到通知邮件。"
  );
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}
