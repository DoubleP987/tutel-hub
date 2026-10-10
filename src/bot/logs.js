const entries = [];
export const logInstance = `${process.pid}-${Date.now()}`;
let sequence = 0;
const streams = new Map();

export function redactLog(value) {
  let text = String(value).replace(/\x1b\[[0-9;]*m/g, '');

  for (const [key, secret] of Object.entries(process.env)) {
    if (
      /TOKEN|SECRET|PASSWORD|MONGO.*URI|DATABASE_URL|PIN|CREDENTIAL|PRIVATE_KEY/i.test(key) &&
      secret?.length >= 4
    ) {
      text = text.split(secret).join('[redacted]');
    }
  }

  return text
    .replace(/(authorization["']?\s*[:=]\s*["']?)(?:Bearer|Bot)\s+[^\s,"'}]+/gi, '$1[redacted]')
    .replace(/(\/interactions\/\d+\/)[^\s/?]+/g, '$1[redacted]')
    .replace(/(mongodb(?:\+srv)?:\/\/)[^@\s]+@/g, '$1[redacted]@')
    .replace(
      /((?:token|secret|password|authorization|pin)["']?\s*[:=]\s*["']?)[^\s,"'}]+/gi,
      '$1[redacted]',
    )
    .slice(0, 2000);
}

export function appendLog(level, text) {
  entries.push({ id: ++sequence, at: new Date().toISOString(), level, text: redactLog(text) });

  if (entries.length > 500) {
    entries.shift();
  }
}

export function botLogs(after = 0) {
  return {
    node: process.env.CLUSTER_NODE_ID || 'local',
    instance: logInstance,
    entries: entries.filter((entry) => entry.id > after).slice(-200),
    latest: sequence,
  };
}

for (const [stream, level] of [
  [process.stdout, 'info'],
  [process.stderr, 'error'],
]) {
  const original = stream.write.bind(stream);
  streams.set(stream, '');

  stream.write = function (chunk, ...args) {
    const result = original(chunk, ...args);
    const text = streams.get(stream) + String(chunk);
    const lines = text.split(/\r?\n|\r/);
    const remainder = lines.pop();

    for (const line of lines) {
      if (line.trim()) {
        appendLog(level, line);
      }
    }

    streams.set(stream, remainder.length > 4000 ? '' : remainder);

    if (remainder.length > 4000) {
      appendLog(level, remainder);
    }

    return result;
  };
}
