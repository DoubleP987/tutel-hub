import { Transform } from 'node:stream';

export const FADE_MS = 350;
const FRAME_BYTES = 4; // Signed 16-bit stereo, 48 kHz.
const FADE_FRAMES = Math.round((48000 * FADE_MS) / 1000);

// Keep a short PCM tail so even unknown-duration tracks fade at their actual EOF.
// Node stream backpressure bounds the remaining audio while a resource is prepared.
export class SmoothPcm extends Transform {
  constructor(enabled = false) {
    super();
    this.enabled = enabled;
    this.tail = Buffer.alloc(0);
    this.frames = 0;
  }
  render(buffer, ending = false) {
    const frames = buffer.length / FRAME_BYTES;
    if (!this.enabled) {
      this.frames += frames;
      return buffer;
    }
    const limit = ending ? frames : Math.min(frames, Math.max(0, FADE_FRAMES - this.frames));
    if (!limit) {
      this.frames += frames;
      return buffer;
    }
    const output = Buffer.from(buffer);
    for (let frame = 0; frame < limit; frame++) {
      const fadeIn = Math.min(1, (this.frames + frame) / FADE_FRAMES);
      const fadeOut = ending ? Math.min(1, (frames - frame - 1) / FADE_FRAMES) : 1;
      const gain = Math.min(fadeIn, fadeOut);
      for (let channel = 0; channel < 2; channel++) {
        const offset = frame * FRAME_BYTES + channel * 2;
        output.writeInt16LE(Math.round(output.readInt16LE(offset) * gain), offset);
      }
    }
    this.frames += frames;
    return output;
  }
  _transform(chunk, encoding, callback) {
    const buffer = Buffer.concat([this.tail, chunk]);
    const complete = buffer.length - (buffer.length % FRAME_BYTES);
    const keep = this.enabled ? FADE_FRAMES * FRAME_BYTES : 0;
    const emit = Math.max(0, complete - keep);
    if (emit) this.push(this.render(buffer.subarray(0, emit)));
    this.tail = Buffer.from(buffer.subarray(emit));
    callback();
  }
  _flush(callback) {
    const complete = this.tail.length - (this.tail.length % FRAME_BYTES);
    if (complete) this.push(this.render(this.tail.subarray(0, complete), true));
    this.tail = Buffer.alloc(0);
    callback();
  }
}

export function resourceReady(stream, signal, timeout = 25000) {
  const readable = stream.pcm || stream.resource.playStream;
  return new Promise((resolve, reject) => {
    const finish = (error) => {
      clearTimeout(timer);
      readable.off('readable', check);
      readable.off('end', ended);
      readable.off('close', ended);
      readable.off('error', finish);
      signal.removeEventListener('abort', cancelled);
      error ? reject(error) : resolve();
    };
    const check = () => {
      if (stream.failed) finish(new Error('PRELOAD_FAILED'));
      else if (readable.readableLength > 0) finish();
    };
    const ended = () => finish(new Error('PRELOAD_EMPTY'));
    const cancelled = () => finish(new Error('PRELOAD_CANCELLED'));
    const timer = setTimeout(() => finish(new Error('PRELOAD_TIMEOUT')), timeout);
    timer.unref?.();
    readable.on('readable', check);
    readable.once('end', ended);
    readable.once('close', ended);
    readable.once('error', finish);
    signal.addEventListener('abort', cancelled, { once: true });
    if (signal.aborted) cancelled();
    else if (readable.destroyed || readable.readableEnded) ended();
    else check();
  });
}
