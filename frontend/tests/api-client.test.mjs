import assert from "node:assert/strict";
import { test } from "node:test";
import { ApiError, apiRequest } from "../src/lib/api/client.ts";

test("sends JSON and preserves custom headers", async (t) => {
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.match(url, /\/assessments$/);
    assert.equal(options.method, "POST");
    assert.equal(options.headers.get("Content-Type"), "application/json");
    assert.equal(options.headers.get("X-Request-ID"), "example");
    assert.equal(options.body, JSON.stringify({ address: "Example address" }));
    return Response.json({ id: "123" });
  });
  assert.deepEqual(await apiRequest("/assessments", {
    method: "POST",
    headers: { "X-Request-ID": "example" },
    body: JSON.stringify({ address: "Example address" }),
  }), { id: "123" });
});

test("lets the browser set the multipart boundary for photo uploads", async (t) => {
  const form = new FormData();
  form.append("photo", new Blob(["example"], { type: "image/png" }), "photo.png");
  t.mock.method(globalThis, "fetch", async (_, options) => {
    assert.equal(options.headers.has("Content-Type"), false);
    assert.equal(options.body, form);
    return new Response(null, { status: 204 });
  });
  assert.equal(await apiRequest("/photos", { method: "POST", body: form }), undefined);
});

test("preserves FastAPI validation details and HTTP status", async (t) => {
  const detail = { detail: [{ loc: ["body", "address"], msg: "Field required" }] };
  t.mock.method(globalThis, "fetch", async () => Response.json(detail, { status: 422 }));
  await assert.rejects(apiRequest("/assessments"), (error) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 422);
    assert.deepEqual(error.detail, detail);
    return true;
  });
});

test("handles non-JSON server errors", async (t) => {
  t.mock.method(globalThis, "fetch", async () => new Response("Unavailable", { status: 503 }));
  await assert.rejects(apiRequest("/health"), (error) => {
    assert.equal(error.status, 503);
    assert.equal(error.detail, "Unavailable");
    return true;
  });
});

test("forwards cancellation and provides a default timeout signal", async (t) => {
  const controller = new AbortController();
  const signals = [];
  t.mock.method(globalThis, "fetch", async (_, options) => {
    signals.push(options.signal);
    return Response.json({ status: "ok" });
  });
  await apiRequest("/health", { signal: controller.signal });
  await apiRequest("/health");
  assert.equal(signals[0], controller.signal);
  assert.ok(signals[1] instanceof AbortSignal);
});

test("rejects absolute and protocol-relative API paths", async () => {
  await assert.rejects(apiRequest("https://example.com/health"));
  await assert.rejects(apiRequest("//example.com/health"));
});
