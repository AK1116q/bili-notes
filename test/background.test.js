const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const path = require("node:path");
function harness() {
  const data = {};
  let listener;
  const context = vm.createContext({
    console,
    URL,
    Date,
    Promise,
    chrome: {
      runtime: {
        id: "test-extension",
        onMessage: {
          addListener(fn) {
            listener = fn;
          },
        },
      },
      storage: {
        local: {
          async get(keys) {
            if (keys === null) return structuredClone(data);
            return Object.fromEntries(
              keys
                .filter((key) => key in data)
                .map((key) => [key, structuredClone(data[key])]),
            );
          },
          async set(values) {
            Object.assign(data, structuredClone(values));
          },
          async remove(key) {
            delete data[key];
          },
        },
      },
    },
  });
  context.importScripts = (file) =>
    vm.runInContext(
      fs.readFileSync(path.join(__dirname, "..", file), "utf8"),
      context,
    );
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "../background.js"), "utf8"),
    context,
  );
  return {
    send: (message) =>
      new Promise((resolve) =>
        listener(message, { id: "test-extension" }, resolve),
      ),
    data,
  };
}
const note = (id) => ({
  id,
  videoId: "BV1xx411c7mD",
  part: 1,
  time: 5,
  text: "test",
  title: "demo",
  createdAt: 1,
  updatedAt: 2,
});
test("concurrent notes are stored independently and all messages resolve", async () => {
  const h = harness();
  const results = await Promise.all(
    Array.from({ length: 20 }, (_, i) =>
      h.send({ type: "save", note: note("n-" + i) }),
    ),
  );
  assert.ok(results.every((x) => x.ok));
  assert.equal((await h.send({ type: "list" })).data.length, 20);
});
test("an invalid import does not partially write and worker recovers after an error", async () => {
  const h = harness();
  const result = await h.send({
    type: "import",
    notes: [note("good"), { id: "bad" }],
  });
  assert.equal(result.ok, false);
  assert.equal(Object.keys(h.data).length, 0);
  assert.equal((await h.send({ type: "save", note: note("next") })).ok, true);
});
test("restore preserves a newer stored record and delete touches only specified note", async () => {
  const h = harness();
  await h.send({ type: "save", note: note("a") });
  await h.send({ type: "save", note: note("b") });
  await h.send({ type: "import", notes: [{ ...note("a"), text: "old" }] });
  assert.equal(h.data["note:a"].text, "test");
  await h.send({ type: "delete", id: "a" });
  assert.ok(!h.data["note:a"]);
  assert.ok(h.data["note:b"]);
});
test("expectedUpdatedAt prevents stale edit overwrite and deleted note resurrection", async () => {
  const h = harness();
  const saved = await h.send({ type: "save", note: note("a") });
  await h.send({
    type: "save",
    note: { ...saved.data, text: "newer" },
    expectedUpdatedAt: saved.data.updatedAt,
  });
  const stale = await h.send({
    type: "save",
    note: { ...saved.data, text: "stale" },
    expectedUpdatedAt: saved.data.updatedAt,
  });
  assert.equal(stale.ok, false);
  assert.equal(h.data["note:a"].text, "newer");
  const beforeDelete = h.data["note:a"].updatedAt;
  await h.send({ type: "delete", id: "a" });
  const deleted = await h.send({
    type: "save",
    note: { ...note("a"), text: "back" },
    expectedUpdatedAt: beforeDelete,
  });
  assert.equal(deleted.ok, false);
  assert.ok(!h.data["note:a"]);
});
