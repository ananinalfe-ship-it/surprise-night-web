/**
 * 惊喜之夜 AI 问答助手 — 悬浮聊天组件
 * 自动注入到页面右下角，点击气泡展开聊天窗口
 */
(function () {
  "use strict";

  // === 状态 ===
  var isOpen = false;
  var isStreaming = false;
  var history = []; // {role, content} 对话历史
  var sessionKey = "sn_chat_history";

  // 恢复上次对话（刷新页面不丢）
  try {
    var saved = sessionStorage.getItem(sessionKey);
    if (saved) history = JSON.parse(saved);
  } catch (e) {}

  // === 注入样式 ===
  var css = document.createElement("style");
  css.textContent = [
    "#sn-cw{position:fixed;bottom:24px;right:24px;z-index:99999;font-family:-apple-system,BlinkMacSystemFont,'PingFang SC','Microsoft YaHei',sans-serif}",
    "#sn-cw *{box-sizing:border-box;margin:0;padding:0}",
    // 气泡按钮
    "#sn-cw-btn{width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#D4763C,#B85A28);border:none;cursor:pointer;box-shadow:0 4px 20px rgba(212,118,60,.4);display:flex;align-items:center;justify-content:center;transition:transform .25s,box-shadow .25s;position:relative}",
    "#sn-cw-btn:hover{transform:scale(1.08);box-shadow:0 6px 28px rgba(212,118,60,.5)}",
    "#sn-cw-btn svg{width:26px;height:26px;transition:opacity .2s}",
    "#sn-cw-btn .ico-close{position:absolute;opacity:0}",
    "#sn-cw-btn.open .ico-chat{opacity:0}",
    "#sn-cw-btn.open .ico-close{opacity:1}",
    // 红点
    "#sn-cw-dot{position:absolute;top:-1px;right:-1px;width:16px;height:16px;background:#EF4444;border-radius:50%;border:2px solid #fff;font-size:0}",
    "#sn-cw-dot.hide{display:none}",
    // 聊天面板
    "#sn-cw-panel{display:none;position:absolute;bottom:66px;right:0;width:370px;height:540px;background:#FBF8F4;border-radius:14px;box-shadow:0 8px 40px rgba(0,0,0,.15);overflow:hidden;flex-direction:column}",
    "#sn-cw-panel.open{display:flex;animation:snSlide .3s ease}",
    "@keyframes snSlide{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}",
    // 头部
    "#sn-cw-head{background:linear-gradient(135deg,#D4763C,#B85A28);color:#fff;padding:14px 16px;display:flex;align-items:center;gap:10px;flex-shrink:0}",
    "#sn-cw-head-icon{width:38px;height:38px;background:rgba(255,255,255,.18);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px}",
    "#sn-cw-head h3{font-size:15px;font-weight:600}",
    "#sn-cw-head p{font-size:11px;opacity:.85;margin-top:1px}",
    ".sn-dot{width:7px;height:7px;background:#4ADE80;border-radius:50%;display:inline-block;margin-right:3px;animation:snPulse 2s infinite}",
    "@keyframes snPulse{0%,100%{opacity:1}50%{opacity:.4}}",
    // 消息区
    "#sn-cw-msgs{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;scroll-behavior:smooth}",
    "#sn-cw-msgs::-webkit-scrollbar{width:3px}",
    "#sn-cw-msgs::-webkit-scrollbar-thumb{background:#ddd;border-radius:2px}",
    ".sn-msg{display:flex;gap:8px;max-width:88%;animation:snFade .25s ease}",
    ".sn-msg.user{align-self:flex-end;flex-direction:row-reverse}",
    ".sn-msg.bot{align-self:flex-start}",
    "@keyframes snFade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}",
    ".sn-av{width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0}",
    ".sn-msg.bot .sn-av{background:#F0EBE4}",
    ".sn-msg.user .sn-av{background:#D4763C;color:#fff}",
    ".sn-bub{padding:9px 13px;border-radius:14px;line-height:1.55;font-size:13.5px;word-break:break-word}",
    ".sn-msg.bot .sn-bub{background:#EDEAE5;color:#2D2A26;border-bottom-left-radius:4px}",
    ".sn-msg.user .sn-bub{background:#D4763C;color:#fff;border-bottom-right-radius:4px}",
    // 打字动画
    ".sn-typing{display:none;align-self:flex-start;gap:8px;max-width:88%}",
    ".sn-typing.show{display:flex}",
    ".sn-typing-dots{background:#EDEAE5;padding:10px 14px;border-radius:14px;border-bottom-left-radius:4px;display:flex;gap:4px}",
    ".sn-typing-dots span{width:5px;height:5px;background:#aaa;border-radius:50%;animation:snBounce 1.4s infinite}",
    ".sn-typing-dots span:nth-child(2){animation-delay:.2s}",
    ".sn-typing-dots span:nth-child(3){animation-delay:.4s}",
    "@keyframes snBounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-5px)}}",
    // 快捷按钮
    "#sn-cw-quick{padding:6px 14px;display:flex;gap:6px;overflow-x:auto;flex-shrink:0;-webkit-overflow-scrolling:touch}",
    "#sn-cw-quick::-webkit-scrollbar{display:none}",
    ".sn-qbtn{background:#fff;border:1px solid #E0DBD4;border-radius:18px;padding:6px 12px;font-size:12.5px;color:#2D2A26;cursor:pointer;white-space:nowrap;flex-shrink:0;transition:all .2s}",
    ".sn-qbtn:hover{border-color:#D4763C;color:#D4763C;background:#FDF3EC}",
    // 输入区
    "#sn-cw-input{padding:10px 14px;background:#fff;border-top:1px solid #E8E2DA;display:flex;gap:8px;align-items:flex-end;flex-shrink:0}",
    "#sn-cw-input textarea{flex:1;border:1px solid #E0DBD4;border-radius:18px;padding:8px 14px;font-size:13.5px;font-family:inherit;resize:none;outline:none;max-height:80px;line-height:1.45;background:#FBF8F4;transition:border-color .2s}",
    "#sn-cw-input textarea:focus{border-color:#D4763C}",
    "#sn-cw-input textarea::placeholder{color:#B0AAA3}",
    ".sn-send{width:38px;height:38px;background:#D4763C;border:none;border-radius:50%;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .2s;flex-shrink:0}",
    ".sn-send:hover{background:#B85A28}",
    ".sn-send:disabled{background:#ccc;cursor:not-allowed}",
    ".sn-send svg{width:18px;height:18px}",
    // 响应式
    "@media(max-width:480px){#sn-cw-panel{width:calc(100vw - 16px);height:calc(100vh - 90px);right:-16px;bottom:64px;border-radius:10px}}",
  ].join("\n");
  document.head.appendChild(css);

  // === 注入 DOM ===
  var w = document.createElement("div");
  w.id = "sn-cw";
  w.innerHTML =
    '<div id="sn-cw-panel">' +
      '<div id="sn-cw-head">' +
        '<div id="sn-cw-head-icon">\u{1F3D4}</div>' +
        "<div><h3>\u5c71\u6d77\u7ecf\u00b7\u5de8\u7075\u4e4b\u68a6</h3>" +
        '<p><span class="sn-dot"></span>\u60ca\u559c\u4e4b\u591c \u00b7 \u5728\u7ebf\u54a8\u8be2</p></div>' +
      "</div>" +
      '<div id="sn-cw-msgs"></div>' +
      '<div class="sn-typing" id="sn-cw-typing">' +
        '<div class="sn-av">\u{1F3D4}</div>' +
        '<div class="sn-typing-dots"><span></span><span></span><span></span></div>' +
      "</div>" +
      '<div id="sn-cw-quick"></div>' +
      '<div id="sn-cw-input">' +
        '<textarea id="sn-cw-ta" placeholder="\u8f93\u5165\u4f60\u7684\u95ee\u9898..." rows="1"></textarea>' +
        '<button class="sn-send" id="sn-cw-send">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>' +
        "</button>" +
      "</div>" +
    "</div>" +
    '<button id="sn-cw-btn" title="\u5728\u7ebf\u54a8\u8be2">' +
      '<span id="sn-cw-dot">1</span>' +
      '<svg class="ico-chat" viewBox="0 0 24 24" fill="white"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' +
      '<svg class="ico-close" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
    "</button>";
  document.body.appendChild(w);

  // === 元素引用 ===
  var btn = document.getElementById("sn-cw-btn");
  var panel = document.getElementById("sn-cw-panel");
  var dot = document.getElementById("sn-cw-dot");
  var msgs = document.getElementById("sn-cw-msgs");
  var typing = document.getElementById("sn-cw-typing");
  var quickBox = document.getElementById("sn-cw-quick");
  var ta = document.getElementById("sn-cw-ta");
  var sendBtn = document.getElementById("sn-cw-send");

  // === 快捷问题 ===
  var QUICK = [
    "\u8fd9\u4e2a\u5267\u8bb2\u4ec0\u4e48\uff1f",
    "\u6f14\u51fa\u5408\u4f5c\u6a21\u5f0f",
    "\u7968\u4ef7\u548c\u65f6\u957f",
    "\u6709\u4ec0\u4e48\u72ec\u7279\u4eae\u70b9\uff1f",
    "\u5bfc\u6f14\u548c\u56e2\u961f",
    "\u884d\u751f\u54c1\u5408\u4f5c",
  ];

  // 渲染快捷问题
  function renderQuick() {
    quickBox.innerHTML = "";
    QUICK.forEach(function (q) {
      var b = document.createElement("button");
      b.className = "sn-qbtn";
      b.textContent = q;
      b.onclick = function () {
        ta.value = q;
        sendMessage();
      };
      quickBox.appendChild(b);
    });
  }

  // === 初始化 ===
  function init() {
    // 如果有历史，恢复显示
    if (history.length > 0) {
      dot.classList.add("hide");
      history.forEach(function (m) {
        appendBubble(m.role === "user" ? "user" : "bot", m.content);
      });
      quickBox.style.display = "none";
    } else {
      // 欢迎语
      appendBubble(
        "bot",
        "\u4f60\u597d\uff01\u6211\u662f\u60ca\u559c\u4e4b\u591c\u7684\u54a8\u8be2\u987e\u95ee\u5c0f\u60ca\u3002\u5173\u4e8e\u6728\u5076\u5267\u300a\u5c71\u6d77\u7ecf\u00b7\u5de8\u7075\u4e4b\u68a6\u300b\u6216\u6f14\u51fa\u5408\u4f5c\uff0c\u6709\u4ec0\u4e48\u60f3\u4e86\u89e3\u7684\u5c3d\u7ba1\u95ee\u6211\u3002"
      );
      renderQuick();
    }
  }

  // === 消息气泡 ===
  function appendBubble(role, text) {
    var d = document.createElement("div");
    d.className = "sn-msg " + role;
    var av = document.createElement("div");
    av.className = "sn-av";
    av.textContent = role === "bot" ? "\u{1F3D4}" : "\u{1F464}";
    var bub = document.createElement("div");
    bub.className = "sn-bub";
    bub.textContent = text;
    d.appendChild(av);
    d.appendChild(bub);
    msgs.appendChild(d);
    msgs.scrollTop = msgs.scrollHeight;
    return bub;
  }

  // === 发送消息 ===
  async function sendMessage() {
    if (isStreaming) return;
    var text = ta.value.trim();
    if (!text) return;

    ta.value = "";
    ta.style.height = "auto";
    quickBox.style.display = "none";
    appendBubble("user", text);

    isStreaming = true;
    sendBtn.disabled = true;
    typing.classList.add("show");

    try {
      var resp = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history: history }),
      });

      typing.classList.remove("show");

      if (!resp.ok) {
        appendBubble("bot", "\u62b1\u6b49\uff0c\u7cfb\u7edf\u6682\u65f6\u51fa\u4e86\u70b9\u95ee\u9898\uff0c\u8bf7\u7a0d\u540e\u518d\u8bd5\u3002");
        return;
      }

      var bub = appendBubble("bot", "");
      var reader = resp.body.getReader();
      var decoder = new TextDecoder();
      var botText = "";

      while (true) {
        var result = await reader.read();
        if (result.done) break;
        var chunk = decoder.decode(result.value, { stream: true });
        var lines = chunk.split("\n");
        for (var i = 0; i < lines.length; i++) {
          var line = lines[i];
          if (line.indexOf("data: ") === 0) {
            var data = line.slice(6);
            if (data.trim() === "[DONE]") continue;
            try {
              var parsed = JSON.parse(data);
              var choices = parsed.choices || [];
              if (choices.length > 0) {
                var delta = choices[0].delta || {};
                var content = delta.content || "";
                if (content) {
                  botText += content;
                  bub.textContent = botText;
                }
              }
            } catch (e) {}
          }
        }
        msgs.scrollTop = msgs.scrollHeight;
      }

      // 保存到历史
      history.push({ role: "user", content: text });
      history.push({ role: "assistant", content: botText });
      // 只保留最近10轮
      if (history.length > 20) history = history.slice(-20);
      try {
        sessionStorage.setItem(sessionKey, JSON.stringify(history));
      } catch (e) {}
    } catch (err) {
      typing.classList.remove("show");
      appendBubble("bot", "\u7f51\u7edc\u4f3c\u4e4e\u4e0d\u592a\u7a33\u5b9a\uff0c\u8bf7\u7a0d\u540e\u518d\u8bd5\u3002");
    } finally {
      isStreaming = false;
      sendBtn.disabled = false;
      ta.focus();
    }
  }

  // === 事件绑定 ===
  btn.addEventListener("click", function () {
    isOpen = !isOpen;
    btn.classList.toggle("open", isOpen);
    panel.classList.toggle("open", isOpen);
    if (isOpen) {
      dot.classList.add("hide");
      ta.focus();
    }
  });

  sendBtn.addEventListener("click", sendMessage);

  ta.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  ta.addEventListener("input", function () {
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 80) + "px";
  });

  init();
})();
