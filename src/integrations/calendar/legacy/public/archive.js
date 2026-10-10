import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export const siteFiles = [
  'index.html',
  'calendar.js',
  'app.css',
  'calendar.json',
  '_redirects',
  '_headers',
  'preferences.js',
  'manifest.webmanifest',
  'sw.js',
  'icon.png',
  'app-icon.png',
  'calendar-view.js',
];
// ZIP contains an explicit public file whitelist; account records and .env cannot enter it.
export function publicZip(directory) {
  const locals = [],
    central = [];
  let offset = 0;
  const crc32 = (buffer) => {
    let crc = 0xffffffff;
    for (const byte of buffer) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
    return (crc ^ 0xffffffff) >>> 0;
  };
  for (const file of siteFiles) {
    const name = Buffer.from(file),
      data = readFileSync(resolve(directory, file)),
      crc = crc32(data);
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(33, 12);
    header.writeUInt32LE(crc, 14);
    header.writeUInt32LE(data.length, 18);
    header.writeUInt32LE(data.length, 22);
    header.writeUInt16LE(name.length, 26);
    locals.push(header, name, data);
    const entry = Buffer.alloc(46);
    entry.writeUInt32LE(0x02014b50);
    entry.writeUInt16LE(20, 4);
    entry.writeUInt16LE(20, 6);
    entry.writeUInt16LE(33, 14);
    entry.writeUInt32LE(crc, 16);
    entry.writeUInt32LE(data.length, 20);
    entry.writeUInt32LE(data.length, 24);
    entry.writeUInt16LE(name.length, 28);
    entry.writeUInt32LE(offset, 42);
    central.push(entry, name);
    offset += header.length + name.length + data.length;
  }
  const directoryBuffer = Buffer.concat(central),
    end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50);
  end.writeUInt16LE(siteFiles.length, 8);
  end.writeUInt16LE(siteFiles.length, 10);
  end.writeUInt32LE(directoryBuffer.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, directoryBuffer, end]);
}
