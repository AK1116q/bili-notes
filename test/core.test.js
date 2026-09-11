const test = require("node:test");
const assert = require("node:assert/strict");
require("../core.js");
const api = globalThis.BiliNotes;
const note = {
  id: "demo-1",
  videoId: "BV1xx411c7mD",
  part: 2,
  time: 204.8,
  text: "闭包笔记",
  title: "JavaScript 教程",
  createdAt: 1,
  updatedAt: 2,
};
test("video parsing preserves multipart identity and rejects foreign domains", () => {
  assert.deepEqual(
    api.videoContext("https://www.bilibili.com/video/BV1xx411c7mD/?p=2&t=10"),
    { videoId: note.videoId, part: 2 },
  );
  assert.equal(api.videoContext("https://evil.test/video/BV1xx411c7mD"), null);
  assert.equal(
    api.videoContext("https://www.bilibili.com/video/BV1xx411c7mD?p=0"),
    null,
  );
});
test("timestamps support hours and links preserve part", () => {
  assert.equal(api.timestamp(3661), "1:01:01");
  assert.equal(api.timestamp(204), "03:24");
  assert.equal(
    api.noteUrl(note),
    "https://www.bilibili.com/video/BV1xx411c7mD/?p=2&t=204",
  );
});
test("validation rejects empty text, invalid IDs, time and oversize notes", () => {
  for (const change of [
    { text: " " },
    { id: "../x" },
    { time: NaN },
    { text: "x".repeat(10001) },
    { videoId: "../x" },
  ])
    assert.throws(() => api.validateNote({ ...note, ...change }));
  assert.equal(api.validateNote(note).time, 204);
});
test("markdown sorts chronologically and escapes note markup", () => {
  const md = api.toMarkdown([
    { ...note, time: 90, text: "[click](javascript:x)<script>" },
    { ...note, id: "demo-2", time: 10 },
  ]);
  assert.ok(md.indexOf("00:10") < md.indexOf("01:30"));
  assert.ok(md.includes("\\[click\\]"));
  assert.ok(md.includes("\\<script\\>"));
});
