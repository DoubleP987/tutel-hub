import { searchTracks } from './search.js';

// Rotate a shuffled bag so one style cannot dominate consecutive searches.
const searches = [
  ['thai-pop', 'เพลงไทยฮิต official music video'],
  ['thai-rock', 'เพลงไทย ร็อค official audio'],
  ['thai-country', 'เพลงลูกทุ่ง ยอดนิยม official mv'],
  ['thai-indie', 'เพลงไทย อินดี้ official music video'],
  ['thai-classics', 'เพลงไทย ยุค90 official audio'],
  ['thai-hiphop', 'เพลงไทย hip hop official music video'],
  ['thai-pop', 'เพลงไทย tpop official mv'],
  ['thai-country', 'เพลงลูกทุ่ง หมอลำ official audio'],
  ['thai-rock', 'เพลงเพื่อชีวิต official audio'],
  ['thai-classics', 'เพลงไทย ยุค2000 official music video'],
  ['international-pop', 'popular pop song official music video'],
  ['international-rock', 'popular rock song official music video'],
  ['international-rnb', 'popular rnb song official audio'],
  ['international-hiphop', 'popular hip hop song official music video'],
];
const sessions = new Map();
const compilations =
  /playlist|long\s?play|full\s?album|compilation|non[ -]?stop|medley|รวมเพลง|รวมฮิต|เพลงรวม|ยาวๆ|ยาว ๆ|ต่อเนื่อง|อัลบั้มเต็ม|\b\d+\s*(hours?|ชั่วโมง)\b/i;
function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
export function clearRandomSession(guildId) {
  sessions.delete(guildId);
}
export async function resolveRandomTrack(
  excludedUrls = [],
  source = 'youtube',
  { guildId = 'default', signal } = {},
) {
  let session = sessions.get(guildId);
  if (!session || session.source !== source) {
    session = { source, bag: [], artists: [], styles: [], cache: new Map() };
    sessions.set(guildId, session);
  }
  const excluded = new Set(excludedUrls);
  for (let attempt = 0; attempt < 4; attempt++) {
    if (signal?.aborted) throw new Error('Music search cancelled');
    if (!session.bag.length) session.bag = shuffle(searches);
    const index = session.bag.findIndex(([style]) => !session.styles.slice(-2).includes(style));
    const [style, query] = session.bag.splice(index < 0 ? 0 : index, 1)[0];
    let cached = session.cache.get(query);
    if (!cached || Date.now() - cached.at > 10 * 60000) {
      try {
        const tracks = await searchTracks(
          (source === 'soundcloud' ? 'scsearch12:' : 'ytsearch12:') + query,
          { flat: true, signal },
        );
        cached = { at: Date.now(), tracks };
        session.cache.set(query, cached);
      } catch (error) {
        if (signal?.aborted) throw error;
        console.warn('[random] search failed:', error.message.slice(0, 200));
        continue;
      }
    }
    const candidates = cached.tracks.filter(
      (track) =>
        track.duration >= 90 &&
        track.duration <= 600 &&
        !track.live &&
        !compilations.test(track.title) &&
        !excluded.has(track.url),
    );
    const varied = candidates.filter(
      (track) => !track.artist || !session.artists.slice(-5).includes(track.artist.toLowerCase()),
    );
    // Try another style rather than immediately repeating a recent artist/channel.
    if (!varied.length) continue;
    const track = shuffle(varied)[0];
    if (track.artist) session.artists.push(track.artist.toLowerCase());
    session.styles.push(style);
    session.artists = session.artists.slice(-10);
    session.styles = session.styles.slice(-5);
    console.log(`[random] selected ${track.title} (${track.duration}s; ${style}; ${source})`);
    return track;
  }
  throw new Error('ยังไม่พบเพลงเดี่ยวที่เหมาะสม ระบบจะเปลี่ยนคำค้นแล้วลองต่อ');
}
