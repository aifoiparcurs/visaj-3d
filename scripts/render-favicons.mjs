import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(root, "public/favicon-source.png");

const BG = [0x2e, 0x28, 0x52];
const GOLD = [0xff, 0xd9, 0x5a];
const LETTER_START = [0xe9, 0xd5, 0xff];
const LETTER_MID = [0xc7, 0xa7, 0xff];
const LETTER_END = [0x8b, 0x5c, 0xf6];

function clamp(n) {
  return Math.max(0, Math.min(1, n));
}

function mix(a, b, t) {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

function letterColor(x, y, width, height) {
  const t = clamp(x / width * 0.35 + y / height * 0.65);
  if (t < 0.5) return mix(LETTER_START, LETTER_MID, t * 2);
  return mix(LETTER_MID, LETTER_END, (t - 0.5) * 2);
}

const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const out = Buffer.from(data);

for (let i = 0; i < out.length; i += 4) {
  const px = i / 4;
  const x = px % info.width;
  const y = Math.floor(px / info.width);
  const r = out[i];
  const g = out[i + 1];
  const b = out[i + 2];
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  const warmth = clamp((r - b) / 170) * clamp(r / 140);
  const letter = clamp((lum - 0.42) / 0.48) * (1 - warmth);

  const final = mix(mix(BG, GOLD, warmth), letterColor(x, y, info.width, info.height), letter);

  out[i] = Math.round(final[0]);
  out[i + 1] = Math.round(final[1]);
  out[i + 2] = Math.round(final[2]);
}

const branded = await sharp(out, {
  raw: { width: info.width, height: info.height, channels: 4 },
})
  .png()
  .toBuffer();

async function png(size, name) {
  const buf = await sharp(branded).resize(size, size).png().toBuffer();
  writeFileSync(resolve(root, "public", name), buf);
  return buf;
}

function pngsToIco(images) {
  const count = images.length;
  const header = Buffer.alloc(6 + 16 * count);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);

  let offset = header.length;
  const chunks = [header];

  images.forEach((img, i) => {
    const entry = 6 + i * 16;
    header.writeUInt8(img.size >= 256 ? 0 : img.size, entry);
    header.writeUInt8(img.size >= 256 ? 0 : img.size, entry + 1);
    header.writeUInt8(0, entry + 2);
    header.writeUInt8(0, entry + 3);
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(img.buf.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    chunks.push(img.buf);
    offset += img.buf.length;
  });

  return Buffer.concat(chunks);
}

const png16 = await png(16, "favicon-16.png");
const png32 = await png(32, "favicon-32.png");
await png(180, "apple-touch-icon.png");
await png(192, "icon-192.png");
const png512 = await png(512, "icon-512.png");

writeFileSync(
  resolve(root, "public/favicon.svg"),
  `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <image width="512" height="512" href="data:image/png;base64,${png512.toString("base64")}"/>
</svg>
`,
);

writeFileSync(
  resolve(root, "public/favicon.ico"),
  pngsToIco([
    { size: 16, buf: png16 },
    { size: 32, buf: png32 },
  ]),
);

console.log("Favicons branded with Visaj colors.");
