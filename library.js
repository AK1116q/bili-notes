const $ = (id) => document.getElementById(id);
let notes = [];
let generation = 0;
const status = (text) => {
  $("status").textContent = text;
};
async function send(message) {
  const result = await chrome.runtime.sendMessage(message);
  if (!result?.ok) throw new Error(result?.error || "无法连接笔记库。");
  return result.data;
}
function filtered() {
  const query = $("search").value.toLowerCase();
  return notes.filter((note) =>
    (note.title + " " + note.text + " " + note.videoId)
      .toLowerCase()
      .includes(query),
  );
}
function download(text, name, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function refresh() {
  const id = ++generation;
  try {
    const result = await send({ type: "list" });
    if (id !== generation) return;
    notes = result;
    render();
  } catch (error) {
    status(error.message);
  }
}
function render() {
  const values = filtered();
  $("list").replaceChildren();
  $("markdown").disabled = !values.length;
  $("backup").disabled = !notes.length;
  status(`${values.length} 条匹配笔记 · 共 ${notes.length} 条`);
  if (!values.length) {
    const p = document.createElement("p");
    p.className = "empty";
    p.textContent = notes.length
      ? "没有匹配的笔记。"
      : "还没有笔记。打开一个 B 站视频，点击右下角「视频笔记」开始。";
    $("list").append(p);
  }
  for (const note of values) {
    const card = document.createElement("article");
    card.className = "note";
    const h = document.createElement("h2"),
      a = document.createElement("a"),
      text = document.createElement("p"),
      meta = document.createElement("div"),
      buttons = document.createElement("div"),
      edit = document.createElement("button"),
      del = document.createElement("button");
    a.href = BiliNotes.noteUrl(note);
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = `${note.title} · P${note.part} · ${BiliNotes.timestamp(note.time)}`;
    h.append(a);
    text.textContent = note.text;
    meta.className = "meta";
    meta.textContent = `${note.videoId} · ${new Date(note.updatedAt).toLocaleString()}`;
    edit.textContent = "编辑";
    edit.className = "secondary";
    del.textContent = "删除";
    del.className = "secondary";
    buttons.className = "buttons";
    edit.onclick = () => {
      const area = document.createElement("textarea");
      area.value = note.text;
      area.maxLength = 10000;
      area.setAttribute("aria-label", "编辑笔记");
      text.replaceWith(area);
      buttons.replaceChildren();
      const save = document.createElement("button"),
        cancel = document.createElement("button");
      save.textContent = "保存";
      cancel.textContent = "取消";
      cancel.className = "secondary";
      cancel.onclick = render;
      save.onclick = async () => {
        save.disabled = true;
        try {
          await send({ type: "save", note: { ...note, text: area.value } });
          await refresh();
        } catch (error) {
          status(error.message);
          save.disabled = false;
        }
      };
      buttons.append(cancel, save);
      area.focus();
    };
    del.onclick = async () => {
      if (!confirm("删除这条笔记？")) return;
      try {
        await send({ type: "delete", id: note.id });
        await refresh();
      } catch (error) {
        status(error.message);
      }
    };
    buttons.append(edit, del);
    card.append(h, text, meta, buttons);
    $("list").append(card);
  }
}
$("search").oninput = render;
$("markdown").onclick = () =>
  download(
    BiliNotes.toMarkdown(filtered()),
    "bili-notes.md",
    "text/markdown;charset=utf-8",
  );
$("backup").onclick = () =>
  download(
    JSON.stringify({ version: 1, notes }, null, 2),
    "bili-notes-backup.json",
    "application/json",
  );
$("restore").onchange = async (e) => {
  const file = e.target.files[0];
  e.target.value = "";
  if (!file) return;
  try {
    if (file.size > 10 * 1024 * 1024) throw new Error("备份超过 10 MB。");
    const value = JSON.parse((await file.text()).replace(/^\uFEFF/, ""));
    if (value.version !== 1 || !Array.isArray(value.notes))
      throw new Error("不支持的备份格式。");
    const count = await send({ type: "import", notes: value.notes });
    await refresh();
    status(`已恢复 ${count} 条新增或较新的笔记。`);
  } catch (error) {
    status(`恢复失败：${error.message}`);
  }
};
chrome.storage.onChanged.addListener(() => refresh());
refresh();
