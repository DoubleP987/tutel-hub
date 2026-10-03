import { searchTracks } from './search.js';
import { randomGenre, randomGenres } from './genres.js';

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
  { guildId = 'default', signal, genre = 'all' } = {},
) {
  let session = sessions.get(guildId);
  if (!session || session.source !== source || session.genre !== genre) {
    session = { source, genre, bag: [], artists: [], styles: [], cache: new Map() };
    sessions.set(guildId, session);
  }
  const excluded = new Set(genre === 'all' ? excludedUrls : excludedUrls.slice(-30));
  const genreSearches = randomGenre(genre).searches || [
    ...searches,
    ...randomGenres.slice(1).flatMap((item) => item.searches.slice(0, 2)),
  ];
  for (let attempt = 0; attempt < 4; attempt++) {
    if (signal?.aborted) throw new Error('Music search cancelled');
    if (!session.bag.length) session.bag = shuffle(genreSearches);
    const index = session.bag.findIndex(([style]) => !session.styles.slice(-2).includes(style));
    const [style, query] = session.bag.splice(index < 0 ? 0 : index, 1)[0];
    let cached = session.cache.get(query);
    if (!cached || Date.now() - cached.at > 10 * 60000) {
      try {
        const tracks = await searchTracks(
          source === 'soundcloud'
            ? 'scsearch12:' + query.replace(/\bofficial (?:audio|music video|mv)\b/gi, '').trim()
            : 'ytsearch12:' + query,
          { flat: true, signal },
        );
        cached = { at: Date.now(), tracks };
        if (session.cache.size >= 20) session.cache.delete(session.cache.keys().next().value);
        session.cache.set(query, cached);
      } catch (error) {
        if (signal?.aborted) throw error;
        console.warn('[random] search failed:', error.message.slice(0, 200));
        continue;
      }
    }
    const candidates = cached.tracks.filter(
      (track) =>
        ((track.duration >= randomGenre(genre).minDuration && track.duration <= 600) ||
          (source === 'soundcloud' && !track.duration)) &&
        !track.live &&
        !compilations.test(track.title) &&
        !excluded.has(track.url),
    );
    const varied = candidates.filter(
      (track) => !track.artist || !session.artists.slice(-5).includes(track.artist.toLowerCase()),
    );
    // Try another style rather than immediately repeating a recent artist/channel.
    if (!varied.length && (attempt < 3 || !candidates.length)) continue;
    let track = shuffle(varied.length ? varied : candidates)[0];
    if (source === 'soundcloud' && !track.duration) {
      try {
        const [details] = await searchTracks(track.url, { signal });
        if (
          !details ||
          details.duration < randomGenre(genre).minDuration ||
          details.duration > 600 ||
          details.live ||
          compilations.test(details.title)
        )
          continue;
        track = details;
      } catch (error) {
        if (signal?.aborted) throw error;
        continue;
      }
    }
    if (track.artist) session.artists.push(track.artist.toLowerCase());
    session.styles.push(style);
    session.artists = session.artists.slice(-10);
    session.styles = session.styles.slice(-5);
    console.log(`[random] selected ${track.title} (${track.duration}s; ${style}; ${source})`);
    return track;
  }
  throw new Error('ยังไม่พบเพลงเดี่ยวที่เหมาะสม ระบบจะเปลี่ยนคำค้นแล้วลองต่อ');
}
