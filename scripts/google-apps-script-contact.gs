/**
 * 谷歌表格 — 联系表单写入脚本
 *
 * 步骤概要：
 * 1. 新建 Google 表格，第一行写上表头（与 appendRow 列顺序一致，见下方 HEADER 注释）。
 * 2. 扩展程序 → Apps Script，粘贴本文件全部内容，保存。
 * 3. 左侧「项目设置」→「脚本属性」→ 添加属性 WEBHOOK_SECRET，值为长随机串（与 Cloudflare CONTACT_WEBHOOK_SECRET 相同）。
 * 4. 部署 → 新建部署 → 类型选「网页应用」：
 *    - 说明：任意
 *    - 执行身份：我
 *    - 具有访问权限的用户：任何人（Cloudflare 服务器无 Google 登录，需选此项）
 * 5. 复制「网页应用」URL，填入 Cloudflare 环境变量 GOOGLE_SCRIPT_URL。
 * 6. 在 Apps Script 编辑器里，从下拉菜单选 doPost（如有）或保存后仅通过部署 URL 测试；首次部署后若改代码需「管理部署」→ 编辑 → 新版本。
 *
 * 表头建议（第 1 行）：
 * 提交时间 | 姓名 | 公司/组织 | 邮箱 | 电话 | 合作类型 | 预算 | 时间线 | 来源 | 项目描述
 */

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

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
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

  return jsonOut({ ok: true });
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}
