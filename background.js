importScripts("core.js");
const PREFIX = "note:";
let queue = Promise.resolve();
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (
    sender.id !== chrome.runtime.id ||
    !message ||
    typeof message.type !== "string"
  )
    return false;
  // Serializing mutations in the worker prevents multi-tab read/modify/write races.
  const task = queue.then(async () => {
    if (message.type === "list") {
      const data = await chrome.storage.local.get(null);
      return Object.entries(data)
        .filter(([key]) => key.startsWith(PREFIX))
        .map(([, value]) => BiliNotes.validateNote(value))
        .sort((a, b) => b.updatedAt - a.updatedAt);
    }
    if (message.type === "save") {
      const note = BiliNotes.validateNote(message.note);
      note.updatedAt = Date.now();
      await chrome.storage.local.set({ [PREFIX + note.id]: note });
      return note;
    }
    if (message.type === "delete") {
      if (
        typeof message.id !== "string" ||
        !/^[a-zA-Z0-9-]{1,80}$/.test(message.id)
      )
        throw new Error("无效笔记 ID。");
      await chrome.storage.local.remove(PREFIX + message.id);
      return true;
    }
    if (message.type === "import") {
      if (!Array.isArray(message.notes) || message.notes.length > 5000)
        throw new Error("备份最多支持 5,000 条笔记。");
      const notes = message.notes.map(BiliNotes.validateNote);
      const existing = await chrome.storage.local.get(
        notes.map((note) => PREFIX + note.id),
      );
      const updates = Object.fromEntries(
        notes
          .filter(
            (note) =>
              !existing[PREFIX + note.id] ||
              note.updatedAt > existing[PREFIX + note.id].updatedAt,
          )
          .map((note) => [PREFIX + note.id, note]),
      );
      await chrome.storage.local.set(updates);
      return Object.keys(updates).length;
    }
    throw new Error("不支持的操作。");
  });
  queue = task.catch(() => {});
  task.then(
    (data) => respond({ ok: true, data }),
    (error) => respond({ ok: false, error: error.message }),
  );
  return true;
});
