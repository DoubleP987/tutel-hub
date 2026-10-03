const options = [
  ['all', 'คละแนว', null],
  [
    'thai',
    'เพลงไทย',
    [
      'เพลงไทยฮิต',
      'เพลงไทยยุค90',
      'เพลงไทยยุค2000',
      'เพลงไทยอินดี้',
      'เพลงไทย tpop',
      'เพลงไทยเพื่อชีวิต',
    ],
  ],
  [
    'pop',
    'ป๊อป',
    [
      'popular pop song',
      'thai pop song',
      'kpop song',
      'jpop song',
      'classic pop song',
      'indie pop song',
    ],
  ],
  [
    'rock',
    'ร็อก',
    [
      'thai rock song',
      'classic rock song',
      'alternative rock song',
      'indie rock song',
      'soft rock song',
      'modern rock song',
    ],
  ],
  [
    'hiphop',
    'ฮิปฮอป / แร็ป',
    [
      'thai hip hop song',
      'hip hop song',
      'old school rap song',
      'melodic rap song',
      'japanese hip hop song',
      'underground rap song',
    ],
  ],
  [
    'rnb',
    'R&B / โซล',
    [
      'rnb song',
      'neo soul song',
      'thai rnb song',
      'classic soul song',
      'contemporary rnb song',
      'smooth rnb song',
    ],
  ],
  [
    'jazz',
    'แจ๊ส',
    [
      'jazz single',
      'vocal jazz song',
      'smooth jazz single',
      'thai jazz song',
      'jazz fusion single',
      'bossa nova song',
    ],
  ],
  [
    'lofi',
    'Lo-fi / ชิล',
    [
      'lofi single',
      'chillhop single',
      'jazzhop single',
      'lofi chill single',
      'chill beat single',
      'instrumental chill single',
    ],
  ],
  [
    'electronic',
    'อิเล็กทรอนิกส์ / EDM',
    [
      'edm song',
      'house music single',
      'dance pop song',
      'synthpop song',
      'electronic single',
      'future bass single',
    ],
  ],
  [
    'bass',
    'เบสหนัก / Bass Boosted',
    [
      'bass boosted song',
      'dubstep song',
      'trap bass song',
      'phonk song',
      'drum and bass song',
      'hardstyle song',
    ],
  ],
  [
    'country',
    'ลูกทุ่ง / หมอลำ',
    [
      'เพลงลูกทุ่งฮิต',
      'เพลงหมอลำฮิต',
      'เพลงลูกทุ่งยุค90',
      'เพลงลูกทุ่งใหม่',
      'เพลงลูกทุ่งเพื่อชีวิต',
      'เพลงลูกทุ่งอินดี้',
    ],
  ],
  [
    'acoustic',
    'อะคูสติก',
    [
      'acoustic song',
      'thai acoustic song',
      'folk acoustic song',
      'indie acoustic song',
      'acoustic pop song',
      'acoustic ballad song',
    ],
  ],
  [
    'anime',
    'อนิเมะ / Anisong',
    [
      'anime opening song',
      'anime ending song',
      'anisong single',
      'anime soundtrack song',
      'classic anime opening song',
      'new anime opening song',
    ],
  ],
  [
    'russian',
    'เพลงรัสเซีย',
    [
      'русская поп музыка песня',
      'русский рок песня',
      'русский рэп песня',
      'russian indie song',
      'russian dance song',
      'russian acoustic song',
    ],
  ],
  [
    'kpop',
    'K-pop',
    [
      'kpop title track',
      'kpop solo song',
      'kpop classic song',
      'kpop ballad song',
      'kpop indie song',
      'kpop dance song',
    ],
  ],
  [
    'jpop',
    'เพลงญี่ปุ่น',
    [
      'jpop song',
      'japanese rock song',
      'japanese city pop song',
      'jpop classic song',
      'japanese indie pop song',
      'japanese ballad song',
    ],
  ],
  [
    'metal',
    'เมทัล',
    [
      'heavy metal song',
      'power metal song',
      'symphonic metal song',
      'alternative metal song',
      'melodic metal song',
      'classic metal song',
    ],
  ],
  [
    'classical',
    'คลาสสิก',
    [
      'classical piano single',
      'classical violin piece',
      'classical cello piece',
      'short classical orchestral piece',
      'classical guitar piece',
      'classical chamber music piece',
    ],
  ],
  [
    'instrumental',
    'เพลงบรรเลง',
    [
      'instrumental piano single',
      'instrumental guitar single',
      'instrumental violin single',
      'instrumental soundtrack single',
      'instrumental jazz single',
      'instrumental acoustic single',
    ],
  ],
  [
    'ambient',
    'Ambient / ผ่อนคลาย',
    [
      'ambient music single',
      'ambient piano single',
      'chill ambient single',
      'new age music single',
      'relaxing instrumental single',
      'cinematic ambient single',
    ],
  ],
  [
    'reggae',
    'เร็กเก / สกา',
    [
      'reggae song',
      'ska song',
      'roots reggae song',
      'thai reggae song',
      'reggae pop song',
      'classic reggae song',
    ],
  ],
  [
    'latin',
    'ละติน',
    [
      'latin pop song',
      'reggaeton song',
      'salsa song',
      'bachata song',
      'latin ballad song',
      'latin acoustic song',
    ],
  ],
  [
    'chinese',
    'เพลงจีน / C-pop',
    [
      'mandopop song',
      'cantopop song',
      'chinese pop song',
      'chinese ballad song',
      'chinese indie song',
      'classic mandopop song',
    ],
  ],
  [
    'indie',
    'อินดี้ / อัลเทอร์เนทีฟ',
    [
      'indie song',
      'alternative pop song',
      'thai indie song',
      'indie rock song',
      'indie folk song',
      'indie electronic song',
    ],
  ],
  [
    'ballad',
    'เพลงสากลช้า / Pop Ballad',
    [
      '80s pop ballad song',
      'soul ballad song',
      'soft rock ballad song',
      '90s love song',
      'classic love ballad song',
      'romantic pop ballad song',
    ],
  ],
  [
    'meme',
    'เพลงมีม / อินเทอร์เน็ต',
    [
      'rickroll song',
      'nyan cat song',
      'trololo song',
      'internet meme song',
      'eurobeat meme song',
      'viral meme song',
    ],
  ],
];
export const randomGenres = options.map(([value, label, queries]) => ({
  value,
  label,
  minDuration: value === 'meme' ? 30 : 90,
  searches: queries?.map((query, i) => [`${value}-${i}`, `${query} official audio`]),
}));
export function randomGenre(value) {
  return randomGenres.find((item) => item.value === value) || randomGenres[0];
}

// Autocomplete keeps the catalog extensible beyond Discord's 25 suggestions per response.
export function genreSuggestions(query = '', translate = (label) => label) {
  const text = String(query).trim().toLowerCase();
  return randomGenres
    .filter((genre) => {
      const aliases =
        genre.value === 'bass'
          ? 'เบส เบสหนัก bass boosted dubstep trap phonk dnb drum hardstyle'
          : '';
      return `${genre.value} ${genre.label} ${translate(genre.label)} ${aliases}`
        .toLowerCase()
        .includes(text);
    })
    .slice(0, 25)
    .map((genre) => ({ name: translate(genre.label), value: genre.value }));
}
