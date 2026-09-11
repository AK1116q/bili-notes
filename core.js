(() => {
  "use strict";
  function videoContext(raw) {
    try {
      const url = new URL(raw);
      if (url.protocol !== "https:" || url.hostname !== "www.bilibili.com")
        return null;
      const match = url.pathname.match(
        /^\/video\/(BV[0-9a-zA-Z]{10}|av\d+)\/?$/,
      );
      if (!match) return null;
      const part = Number(url.searchParams.get("p") || 1);
      if (!Number.isSafeInteger(part) || part < 1 || part > 100000) return null;
      return { videoId: match[1], part };
    } catch {
      return null;
    }
  }
  function timestamp(value) {
    const seconds = Math.max(0, Math.floor(Number(value) || 0));
    const h = Math.floor(seconds / 3600),
      m = Math.floor((seconds % 3600) / 60),
      s = seconds % 60;
    return (
      (h ? `${h}:` : "") +
      String(m).padStart(2, "0") +
      ":" +
      String(s).padStart(2, "0")
    );
  }
  function noteUrl(note) {
    return `https://www.bilibili.com/video/${note.videoId}/?p=${note.part}&t=${Math.floor(note.time)}`;
  }
  function validateNote(value) {
    if (!value || typeof value !== "object")
      throw new Error("笔记格式不正确。");
    if (typeof value.id !== "string" || !/^[a-zA-Z0-9-]{1,80}$/.test(value.id))
      throw new Error("笔记 ID 不正确。");
    const context = videoContext(
      `https://www.bilibili.com/video/${value.videoId}/?p=${value.part}`,
    );
    if (
      !context ||
      !Number.isFinite(value.time) ||
      value.time < 0 ||
      value.time > 604800
    )
      throw new Error("视频或时间点不正确。");
    if (
      typeof value.text !== "string" ||
      !value.text.trim() ||
      value.text.length > 10000
    )
      throw new Error("笔记需为 1–10,000 个字符。");
    return {
      id: value.id,
      ...context,
      time: Math.floor(value.time),
      text: value.text.trim(),
      title: String(value.title || value.videoId).slice(0, 500),
      createdAt: Number.isFinite(value.createdAt)
        ? value.createdAt
        : Date.now(),
      updatedAt: Number.isFinite(value.updatedAt)
        ? value.updatedAt
        : Date.now(),
    };
  }
  function escapeMarkdown(text) {
    return String(text)
      .replace(/[\\`*_{}\[\]<>#|!]/g, "\\$&")
      .replace(/\r?\n/g, " ");
  }
  function toMarkdown(notes) {
    const groups = new Map();
    for (const note of notes.map(validateNote)) {
      const key = `${note.videoId}:p${note.part}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(note);
    }
    const lines = ["# Bili Notes 视频笔记", ""];
    for (const group of groups.values()) {
      group.sort((a, b) => a.time - b.time);
      lines.push(
        `## ${escapeMarkdown(group[0].title)} · P${group[0].part}`,
        "",
      );
      for (const note of group)
        lines.push(
          `- [${timestamp(note.time)}](${noteUrl(note)}) ${escapeMarkdown(note.text)}`,
        );
      lines.push("");
    }
    return lines.join("\n");
  }
  globalThis.BiliNotes = Object.freeze({
    videoContext,
    timestamp,
    noteUrl,
    validateNote,
    toMarkdown,
  });
})();
