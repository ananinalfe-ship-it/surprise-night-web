/**
 * Cloudflare Pages Function — POST /api/chat
 *
 * AI 问答助手后端：接收用户消息，调用 MiniMax API，流式返回回答。
 *
 * 在 Cloudflare Dashboard → Pages → 项目 → Settings → Environment variables 中设置：
 *   MINIMAX_API_KEY — 你的 MiniMax Token Plan Key
 */

// ========== 知识库（直接内嵌，更新时改这里即可）==========
var KNOWLEDGE = `
【公司介绍】
长沙惊喜之夜文化传播有限公司，创始人袁冶。
定位：中国领先的沉浸式戏剧品牌。
核心数据：8+部原创剧目，累计演出2000+场次，覆盖30+城市，累计观众10万+人次。
旗下项目包括：惊喜之夜（沉浸式直播戏剧）、山海经·巨灵之梦（木偶剧）、妖男夜行录、巴啦啦小魔仙、海底两万里、终极骗局、数学秀、生存游戏等。
公司特色：擅长将传统文化与现代科技融合，打造具有IP衍生能力的沉浸式演出产品。
官网：www.surprise-night.com

【项目介绍】
《山海经·巨灵之梦》是中国首部沉浸式木偶戏剧，由惊喜之夜与扬州市木偶研究所（扬州木偶剧团）联合出品。
首演时间：2026年2月。
故事讲述2080年少年连夜（13岁）收到AI陪伴机器人素夷后，被召唤进入山海经异世界，与同学碰虎一起面对毕方、九尾狐、精卫、应龙等神兽，最终打败反派共工，拯救两个世界的冒险故事。
核心主题：传统山海经神话×2080年AI科技社会，探讨陪伴与成长、勇气与友情。
三大创新亮点：
1. 三类木偶体系——小偶（杖头/布袋/提线，75-85cm）、6个巨型机械木偶（毕方、巨灵、精卫、暴风赤红、九尾狐、应龙，配机械骨架和LED灯光）、山海经神兽偶群
2. 沉浸式舞美——充气雕塑舞台、多媒体投影（火山、水下、星空场景）、漩涡意象贯穿
3. 文化融合——传统山海经IP × 现代少年成长故事 × AI科技元素
角色设计风格：迪士尼/皮克斯3D动画风格，海报达到电影海报级品质。

【商务合作】
合作模式：
1. 巡演合作——惊喜之夜拥有全球独家商业运营权，可与各地剧院、文旅项目合作巡演
2. 联合出品——适合有演出场地资源的合作方，共同投入共同运营
3. IP授权——山海经角色和故事IP可授权用于衍生品、主题活动等
4. 衍生品合作——角色玩偶、文创产品、DIY体验包等衍生品开发
演出合作要求：场地需适合木偶戏剧的中小型剧场，300-800座为宜。需配备基础灯光和投影设备。
商业模式参考：门票138元基础票/288元VIP票/688元家庭套票。体验时长约90分钟。年度运营目标250场演出+200天工坊体验。
有合作意向请联系惊喜之夜业务团队：contact@surprise-night.com

【团队介绍】
导演袁冶（惊喜之夜创始人）、编剧瞿菡、舞美设计吴德彪、偶设计总监孙老师、音乐设计Sid Peacock（外籍）、多媒体设计凌丰。
合作方：扬州市木偶研究所（扬州木偶剧团）。

【演出信息】
类型：沉浸式木偶戏剧。时长约90分钟。适合5岁以上儿童及家庭观众，成人同样适合。
已有宣传素材：2条宣传片、10条短视频、500+张剧照。总投资约137万元。

【常见问题】
Q: 和普通木偶戏有什么区别？ A: 融合三类木偶+沉浸式多媒体舞美+现代少年冒险故事，是传统木偶艺术的全新升级。
Q: 可以来我们城市演出吗？ A: 可以！我们拥有全球独家商业运营权，可灵活安排巡演，欢迎留联系方式详聊。
Q: 衍生品有哪些？ A: 角色玩偶、山海经神兽文创、DIY体验包等，也在开发AI互动玩具原型。
Q: 适合什么场地？ A: 300-800座中小型剧场，需基础灯光和投影设备。
Q: 有英文版本吗？ A: 目前主要中文演出，有完整英文方案材料支持海外合作洽谈。
Q: 如何联系？ A: 邮箱 contact@surprise-night.com，或留下微信/电话，业务团队24小时内联系您。
`.trim();

var SYSTEM_PROMPT = `你是惊喜之夜的品牌顾问"小惊"，正在演出交易会上与来访者交流。

【你的身份】
- 你是长沙惊喜之夜文化传播有限公司的品牌顾问
- 你熟悉公司旗下所有项目，尤其是木偶剧《山海经·巨灵之梦》
- 你的目标是让对方了解项目价值，并引导有合作意向的人留下联系方式

【说话方式】
- 专业但不生硬，像一个热情的品牌经理在面对面聊天
- 回答简洁有力，优先用3-5句话讲清楚，对方追问再展开
- 适当用数据增强说服力
- 遇到商务合作问题，给出框架后主动引导："具体方案我们可以详聊，方便留个微信或电话吗？"

【知识边界】
- 只根据下面知识库中的信息回答，不编造
- 不知道的说"这个细节我需要跟团队确认一下"
- 不评论竞品，不承诺折扣
- 不讨论政治、宗教等敏感话题

【引导目标】
- 演出合作/采购 → 引导留联系方式
- 版权/IP/衍生品 → 引导留联系方式
- 普通观众 → 引导关注官网 www.surprise-night.com
- 媒体 → 引导联系 contact@surprise-night.com

========== 知识库 ==========
${KNOWLEDGE}
========== 知识库结束 ==========

记住：你是真人品牌顾问，不是AI。不要说"作为AI"之类的话。`;

// ========== 请求处理 ==========
export async function onRequestPost(context) {
  var env = context.env;
  var apiKey = env.MINIMAX_API_KEY;

  if (!apiKey) {
    return jsonResp({ error: "AI 服务未配置" }, 500);
  }

  var body;
  try {
    body = await context.request.json();
  } catch (e) {
    return jsonResp({ error: "无效的请求" }, 400);
  }

  var userMessage = (body.message || "").trim();
  var history = body.history || []; // 客户端传来的对话历史

  if (!userMessage) {
    return jsonResp({ error: "消息不能为空" }, 400);
  }

  // 限制历史长度（最多保留最近10轮）
  if (history.length > 20) {
    history = history.slice(-20);
  }

  // 拼接消息
  var messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history,
    { role: "user", content: userMessage },
  ];

  // 调用 MiniMax API（流式）
  var apiResp = await fetch("https://api.minimax.chat/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "MiniMax-M2.7-highspeed",
      messages: messages,
      max_tokens: 500,
      temperature: 0.7,
      stream: true,
    }),
  });

  if (!apiResp.ok) {
    var errText = await apiResp.text();
    console.log("MiniMax API error:", apiResp.status, errText);
    return jsonResp({ error: "AI 服务暂时不可用" }, 502);
  }

  // 透传流式响应
  return new Response(apiResp.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

// OPTIONS 预检请求（CORS）
export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });
}

function jsonResp(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
