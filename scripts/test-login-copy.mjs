import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const source = readFileSync(new URL("../app.js", import.meta.url), "utf8");
assert.match(html, /<h1 id="loginTitle">통합 관리프로그램<\/h1>/);
assert.ok(!html.includes("invite-only-note"));
assert.ok(!source.includes("계정은 관리자 초대 또는 초대코드로 등록합니다."));

const applySettings = source.match(/function applySettings\(\) \{[\s\S]*?\n\}/)?.[0];
assert.ok(applySettings);
for (const [saved, expected] of [[undefined, "통합 관리프로그램"], ["개인 관리 프로그램", "통합 관리프로그램"], ["통합 관리프로그램", "통합 관리프로그램"], ["사용자 지정 이름", "사용자 지정 이름"]]) {
  const context = { store: { settings: { siteName: saved } }, document: {}, loginTitle: {}, brandName: {}, brandMark: {} };
  vm.runInNewContext(`${applySettings}\napplySettings();`, context);
  assert.equal(context.loginTitle.textContent, expected);
  assert.equal(context.document.title, expected);
  assert.equal(context.brandName.textContent, expected);
  assert.equal(context.store.settings.siteName, saved);
}
console.log("PASS login copy: heading, removed note, legacy default and custom name preservation");
