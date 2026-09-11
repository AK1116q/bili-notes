(() => {
  if (document.getElementById("bili-notes-root")) return;
  const api = BiliNotes;
  const host = document.createElement("div");
  host.id = "bili-notes-root";
  host.style.cssText =
    "position:fixed;right:20px;bottom:24px;z-index:2147483646;";
  const shadow = host.attachShadow({ mode: "open" });
  shadow.innerHTML = `<style>
  :host{font:14px/1.6 "Segoe UI","Microsoft YaHei",sans-serif;color:#203b46}*{box-sizing:border-box}button,textarea{font:inherit}button{cursor:pointer;border:0;border-radius:8px;padding:9px 13px;background:#147d97;color:white}button:focus-visible,textarea:focus-visible{outline:3px solid #e9b543;outline-offset:2px}#toggle{box-shadow:0 5px 25px #0c415633;padding:12px 18px}#panel{width:350px;max-width:calc(100vw - 40px);max-height:75vh;overflow:auto;background:#fff;border:1px solid #d8e5e9;box-shadow:0 10px 45px #152e4133;border-radius:14px;margin-bottom:12px;padding:18px}header{display:flex;align-items:center;justify-content:space-between}h2{font-size:18px;margin:0}#close,.delete{background:#eef3f4;color:#45626d}#video-title{color:#617c87;overflow-wrap:anywhere;margin:10px 0;font-size:13px}label{display:block;font-size:13px;color:#41616c}textarea{display:block;width:100%;border:1px solid #bcd1d8;border-radius:8px;min-height:85px;resize:vertical;margin:7px 0;padding:10px;color:#203b46}#stamp{font-size:12px;color:#5c737b;margin:7px 0;overflow-wrap:anywhere}.bar{display:flex;gap:8px;justify-content:space-between}#capture,#export{background:#eef5f6;color:#286072}#status{font-size:12px;min-height:20px;margin:8px 0;color:#526e77}ul{list-style:none;padding:0;margin:8px 0}li{border-top:1px solid #e4edef;padding:12px 0}li p{white-space:pre-wrap;overflow-wrap:anywhere;margin:7px 0}li .row{display:flex;align-items:center;justify-content:space-between}.seek{padding:3px 8px;color:#147d97;background:#e8f4f6;font-weight:700}.delete{font-size:12px;padding:3px 8px}.empty{color:#72848a;font-size:13px}#export{width:100%}[hidden]{display:none!important}
  </style><section id="panel" aria-label="视频笔记" hidden><header><h2>Bili Notes</h2><button id="close" aria-label="关闭笔记面板">×</button></header><div id="video-title"></div><label for="text">记下这个时间点的想法</label><textarea id="text" maxlength="10000" placeholder="例如：这个概念需要再练习一次…"></textarea><div id="stamp"></div><div class="bar"><button id="capture">重取当前时间</button><button id="save">保存笔记</button></div><div id="status" role="status" aria-live="polite"></div><ul id="notes"></ul><button id="export">导出本视频 Markdown ↓</button></section><button id="toggle" aria-expanded="false">✎ 视频笔记</button>`;
  document.documentElement.append(host);
  const $ = (id) => shadow.getElementById(id);
  let context;
  let captured;
  let notes = [];
  let busy = false;
  let generation = 0;
  const status = (text) => {
    $("status").textContent = text;
  };
  async function send(message) {
    const result = await chrome.runtime.sendMessage(message);
    if (!result?.ok)
      throw new Error(result?.error || "扩展连接已断开，请刷新页面。");
    return result.data;
  }
  function video() {
    return (
      [...document.querySelectorAll("video")].find(
        (x) => x.getBoundingClientRect().width > 0,
      ) || document.querySelector("video")
    );
  }
  function title() {
    return (
      document.querySelector("h1.video-title,h1")?.textContent?.trim() ||
      document.title.replace(/_哔哩哔哩.*$/, "")
    );
  }
  function capture() {
    const player = video();
    const current = api.videoContext(location.href);
    if (!current || !player || !Number.isFinite(player.currentTime)) {
      status("尚未找到视频播放器，请稍后重试。");
      return false;
    }
    captured = {
      ...current,
      time: Math.floor(player.currentTime),
      title: title(),
    };
    $("stamp").textContent =
      `${api.timestamp(captured.time)} · ${captured.title} · P${captured.part}`;
    return true;
  }
  function currentNotes() {
    return notes
      .filter(
        (note) =>
          note.videoId === context?.videoId && note.part === context?.part,
      )
      .sort((a, b) => a.time - b.time);
  }
  function render() {
    $("notes").replaceChildren();
    const values = currentNotes();
    $("export").disabled = !values.length;
    if (!values.length) {
      const p = document.createElement("p");
      p.className = "empty";
      p.textContent = "还没有笔记。Alt + Shift + N 打开面板。";
      $("notes").append(p);
    }
    for (const note of values) {
      const li = document.createElement("li"),
        row = document.createElement("div"),
        seek = document.createElement("button"),
        del = document.createElement("button"),
        text = document.createElement("p");
      row.className = "row";
      seek.className = "seek";
      seek.textContent = api.timestamp(note.time);
      seek.setAttribute("aria-label", `跳转到 ${api.timestamp(note.time)}`);
      seek.onclick = () => {
        const player = video();
        if (!player || !Number.isFinite(player.duration))
          return status("播放器尚未准备好。");
        player.currentTime = Math.min(note.time, player.duration);
        status(`已跳转到 ${api.timestamp(note.time)}`);
      };
      del.className = "delete";
      del.textContent = "删除";
      del.onclick = async () => {
        if (!confirm("删除这条笔记？")) return;
        try {
          await send({ type: "delete", id: note.id });
          await refresh();
        } catch (error) {
          status(error.message);
        }
      };
      text.textContent = note.text;
      row.append(seek, del);
      li.append(row, text);
      $("notes").append(li);
    }
  }
  async function refresh() {
    const id = ++generation;
    try {
      const result = await send({ type: "list" });
      if (id === generation) {
        notes = result;
        render();
      }
    } catch (error) {
      status(error.message);
    }
  }
  function toggle(force) {
    const open = force ?? $("panel").hidden;
    $("panel").hidden = !open;
    $("toggle").setAttribute("aria-expanded", String(open));
    if (open) {
      if (!$("text").value) capture();
      $("text").focus();
      refresh();
    }
  }
  $("toggle").onclick = () => toggle();
  $("close").onclick = () => toggle(false);
  $("capture").onclick = capture;
  $("text").addEventListener("focus", () => {
    if (!captured) capture();
  });
  $("save").onclick = async () => {
    if (busy) return;
    if (!$("text").value.trim()) return status("请先写下笔记。");
    if (!captured && !capture()) return;
    busy = true;
    $("save").disabled = true;
    $("text").readOnly = true;
    const draft = $("text").value;
    try {
      const note = api.validateNote({
        ...captured,
        id: crypto.randomUUID(),
        text: draft,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      await send({ type: "save", note });
      if ($("text").value === draft) $("text").value = "";
      captured = null;
      capture();
      status("已保存到本地笔记库。");
      await refresh();
    } catch (error) {
      status(error.message);
    } finally {
      busy = false;
      $("save").disabled = false;
      $("text").readOnly = false;
    }
  };
  $("text").addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      $("save").click();
    }
  });
  $("export").onclick = () => {
    const url = URL.createObjectURL(
      new Blob([api.toMarkdown(currentNotes())], {
        type: "text/markdown;charset=utf-8",
      }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `${context.videoId}-p${context.part}-notes.md`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  document.addEventListener("keydown", (e) => {
    if (e.altKey && e.shiftKey && e.code === "KeyN") {
      e.preventDefault();
      toggle(true);
    }
  });
  chrome.storage.onChanged.addListener(() => refresh());
  function syncContext() {
    const next = api.videoContext(location.href);
    host.hidden = !next;
    if (JSON.stringify(next) !== JSON.stringify(context)) {
      context = next;
      if (!$("text").value.trim()) {
        captured = null;
        $("stamp").textContent = "";
      } else status("保留了之前视频的草稿；保存时使用上方标注的时间点。");
      refresh();
    }
    if (context) $("video-title").textContent = `${title()} · P${context.part}`;
  }
  syncContext();
  setInterval(syncContext, 750);
})();
