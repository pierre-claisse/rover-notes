import { fileURLToPath } from "node:url";
import { chromium, type Browser } from "playwright-core";
import { createServer } from "vite";
import { decodeBase64, encodeBase64, utf8 } from "../src/crypto/bytes";
import { openObject, parseEnvelope, sealObject, type VaultEnvelope } from "../src/crypto/envelope";

const dataKey = Uint8Array.from({ length: 32 }, (_, index) => index + 8);
const nonce = Uint8Array.from({ length: 12 }, (_, index) => index + 4);
const objectId = "ababababababababababab";
const plaintext = utf8("café — déjà — Node et navigateur");

const server = await createServer({
  configFile: false,
  root: fileURLToPath(new URL("./roundtrip", import.meta.url)),
  server: { host: "127.0.0.1", port: 5199, strictPort: true, fs: { allow: [fileURLToPath(new URL("..", import.meta.url))] } },
  logLevel: "error",
});
await server.listen();
const browser = await launchChrome();
try {
  const page = await browser.newPage();
  await page.goto("http://127.0.0.1:5199/");
  await page.waitForFunction(() => (window as unknown as { __ready?: boolean }).__ready === true);
  const envelope = await sealObject(dataKey, "k1", objectId, plaintext, nonce);
  const opened = await page.evaluate(
    async (input: { key: string; env: VaultEnvelope }) => {
      const api = (window as unknown as { __roundtrip: { open: (key: string, env: VaultEnvelope) => Promise<string> } }).__roundtrip;
      return api.open(input.key, input.env);
    },
    { key: encodeBase64(dataKey), env: envelope },
  );
  if (Buffer.from(decodeBase64(opened)).toString("utf8") !== Buffer.from(plaintext).toString("utf8")) {
    throw new Error("Le navigateur n’a pas ouvert l’enveloppe Node.");
  }
  const fromBrowser = await page.evaluate(
    async (input: { key: string; plain: string; nonceB64: string }) => {
      const api = (window as unknown as { __roundtrip: { seal: (key: string, keyId: string, objectId: string, plain: string, nonce: string) => Promise<VaultEnvelope> } }).__roundtrip;
      return api.seal(input.key, "k1", "ababababababababababab", input.plain, input.nonceB64);
    },
    { key: encodeBase64(dataKey), plain: encodeBase64(plaintext), nonceB64: encodeBase64(nonce) },
  );
  const back = await openObject(dataKey, parseEnvelope(fromBrowser));
  if (Buffer.from(back).toString("utf8") !== Buffer.from(plaintext).toString("utf8")) {
    throw new Error("Node n’a pas ouvert l’enveloppe du navigateur.");
  }
  console.log("Aller-retour Node ↔ navigateur confirmé.");
} finally {
  await browser.close();
  await server.close();
}

async function launchChrome(): Promise<Browser> {
  const args = ["--no-sandbox", "--disable-dev-shm-usage"];
  const attempts: Array<{ channel?: "chrome"; executablePath?: string; args: string[] }> = [
    { channel: "chrome", args },
    { executablePath: "/usr/local/bin/google-chrome", args },
    { executablePath: "/usr/bin/google-chrome", args },
    { executablePath: "/usr/bin/chromium", args },
  ];
  let reason = "Chrome introuvable";
  for (const attempt of attempts) {
    try {
      return await chromium.launch(attempt);
    } catch (error) {
      reason = error instanceof Error ? error.message : reason;
    }
  }
  throw new Error(`Chrome introuvable pour l’aller-retour navigateur. ${reason}`);
}
