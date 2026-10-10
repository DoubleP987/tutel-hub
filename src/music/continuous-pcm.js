import { Readable } from 'node:stream';

const TAIL = 48000,
  BYTES = 4,
  QUANTUM = 960,
  FADE = 16800;
// One persistent PCM stream -> one Opus encoder -> one Discord audio resource.
// Switching decoded sources never stops/replaces the Discord resource.
export class ContinuousPcm extends Readable {
  constructor({ onSwitch, onEnd, smooth = true }) {
    super({ highWaterMark: QUANTUM * BYTES });
    this.onSwitch = onSwitch;
    this.onEnd = onEnd;
    this.smooth = smooth;
    this.active = null;
    this.next = null;
    this.fade = null;
    this.skipRequested = false;
    this.demand = false;
    this.pumping = false;
  }
  packet(source, track) {
    const packet = { source, track, buffer: Buffer.alloc(0), ended: false };
    packet.wake = () => this.pump();
    packet.end = () => {
      packet.ended = true;
      this.pump();
    };
    source.pcm.on('readable', packet.wake);
    source.pcm.once('end', packet.end);
    source.pcm.once('error', packet.end);
    return packet;
  }
  setActive(source, track) {
    this.active = this.packet(source, track);
    this.pump();
  }
  setNext(source, track) {
    if (this.next?.source === source) return;
    this.clearNext();
    this.next = this.packet(source, track);
    this.fill(this.next);
    this.pump();
  }
  release(packet) {
    if (!packet) return;
    packet.source.pcm.off('readable', packet.wake);
    packet.source.pcm.off('end', packet.end);
    packet.source.pcm.off('error', packet.end);
    packet.source.stop();
  }
  clearNext() {
    if (this.fade) return false;
    this.release(this.next);
    this.next = null;
    return true;
  }
  requestSkip() {
    this.skipRequested = true;
    this.pump();
  }
  requestFinish() {
    this.finishRequested = true;
    this.pump();
  }
  fill(packet) {
    if (!packet) return;
    let chunk;
    while (
      packet.buffer.length < (TAIL + QUANTUM * 2) * BYTES &&
      (chunk = packet.source.pcm.read()) !== null
    ) {
      packet.buffer = Buffer.concat([packet.buffer, chunk]);
    }
    if (packet.source.pcm.readableEnded || packet.source.pcm.destroyed) packet.ended = true;
    if (packet.ended && !packet.trimmed) {
      // Remove digital silence at the decoded tail, never pauses within music.
      let end = packet.buffer.length - (packet.buffer.length % BYTES);
      while (
        end >= BYTES &&
        Math.abs(packet.buffer.readInt16LE(end - 4)) <= 16 &&
        Math.abs(packet.buffer.readInt16LE(end - 2)) <= 16
      )
        end -= BYTES;
      packet.buffer = packet.buffer.subarray(0, end);
      packet.trimmed = true;
    }
  }
  take(packet, frames) {
    const result = packet.buffer.subarray(0, frames * BYTES);
    packet.buffer = packet.buffer.subarray(frames * BYTES);
    return result;
  }
  _read() {
    this.demand = true;
    this.pump();
  }
  pump() {
    if (this.pumping || !this.demand || this.destroyed || !this.active) return;
    this.pumping = true;
    try {
      while (this.demand && this.active && !this.destroyed) {
        this.fill(this.active);
        this.fill(this.next);
        const available = Math.floor(this.active.buffer.length / BYTES);
        const nextFrames = Math.floor((this.next?.buffer.length || 0) / BYTES);
        if (this.finishRequested && !available) {
          // Skip must also end a stalled or empty decoder; there is no tail to fade.
          const old = this.active;
          this.active = null;
          this.release(old);
          this.push(null);
          break;
        }
        const ready = nextFrames >= FADE || (this.next?.ended && nextFrames > 0);
        const boundary = this.skipRequested || (this.active.ended && available <= FADE);
        if (!this.fade && this.finishRequested && available > 0)
          this.fade = { frames: Math.min(FADE, available), at: 0, skipped: true, ending: true };
        if (!this.fade && boundary && ready) {
          this.fade = {
            frames: this.smooth ? Math.min(FADE, available, nextFrames) : 0,
            at: 0,
            skipped: this.skipRequested,
          };
        }
        if (this.fade) {
          const fade = this.fade;
          const count = Math.min(QUANTUM, fade.frames - fade.at);
          if (count > 0 && (available < count || (!fade.ending && nextFrames < count))) break;
          if (count > 0) {
            const old = this.take(this.active, count),
              next = fade.ending ? Buffer.alloc(count * BYTES) : this.take(this.next, count);
            const output = Buffer.allocUnsafe(count * BYTES);
            for (let frame = 0; frame < count; frame++) {
              const progress = (fade.at + frame + 1) / fade.frames;
              for (let channel = 0; channel < 2; channel++) {
                const offset = frame * BYTES + channel * 2;
                output.writeInt16LE(
                  Math.round(
                    old.readInt16LE(offset) * (1 - progress) + next.readInt16LE(offset) * progress,
                  ),
                  offset,
                );
              }
            }
            fade.at += count;
            this.demand = this.push(output);
          }
          if (fade.at >= fade.frames) {
            if (fade.ending) {
              this.release(this.active);
              this.active = null;
              this.fade = null;
              this.push(null);
              break;
            }
            const old = this.active,
              next = this.next;
            this.active = next;
            this.next = null;
            this.fade = null;
            this.skipRequested = false;
            this.release(old);
            this.onSwitch(old.track, next.track, fade.skipped, next.source);
          }
          continue;
        }
        const keep = this.smooth ? (this.active.ended ? FADE : TAIL) : 0;
        if (available > keep) {
          const count = Math.min(QUANTUM, available - keep);
          this.demand = this.push(this.take(this.active, count));
          continue;
        }
        if (this.active.ended) {
          // Prepared successor comes through the same encoder. If no successor
          // exists, drain the tail and finish normally instead of injecting zeros.
          if (this.onEnd(this.active.track)) break;
          if (available) this.demand = this.push(this.take(this.active, available));
          const old = this.active;
          this.active = null;
          this.release(old);
          this.push(null);
        }
        break;
      }
    } finally {
      this.pumping = false;
    }
  }
  _destroy(error, callback) {
    this.release(this.active);
    this.release(this.next);
    this.active = this.next = null;
    callback(error);
  }
}
