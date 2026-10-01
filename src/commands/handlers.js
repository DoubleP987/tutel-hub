import { checkCalendarSetupPin } from '../calendar/setup-pin.js';
import { resolveTrack } from '../music/stream.js';
import { db } from '../calendar/db.js';
import { localDateTimeToIso, listExpandedEvents, saveEvent, deleteEvent, saveGuildConfig, listGuildConfigs, formatThai } from '../calendar/service.js';
import { enqueue, enableRandomMode, getPlayer, skip, stop, destroyPlayer, playRadio } from '../music/player.js';
const duration = seconds => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return String(m) + ':' + String(s).padStart(2, '0');
};
const guildOnly = i => {
  if (!i.guild) { i.reply({ content: 'คำสั่งนี้ใช้ได้ใน server เท่านั้น', ephemeral: true }); return false; }
  return true;
};
const RADIO_STATIONS = [
  { name: 'EFM 94', frequency: '94', aliases: ['efm', '94', 'efm 94'], region: 'bangkok', url: 'https://atimehd.smartclick.co.th/efm/hls/efm.m3u8' },
  { name: 'สวท.สงขลา FM 89.5', frequency: '89.5', aliases: ['สวท.สงขลา', 'สวท สงขลา', 'radio thailand songkhla', '89.5', '89.5 mhz', 'หาดใหญ่', 'hatyai', 'songkhla', 'สงขลา'], region: 'hatyai', url: 'https://radio-org-01-ott.prd.go.th/ska_fm89_50' },
  { name: 'สวท.สงขลา FM 90.5', frequency: '90.5', aliases: ['90.5', '90.5 mhz', 'fm 90.5', 'สงขลา'], region: 'hatyai', url: 'https://radio-org-01-ott.prd.go.th/ska_fm90_5' },
  { name: 'INDY FM 107.75 · หาดใหญ่/สงขลา', frequency: '107.75', aliases: ['indy', 'indy fm', 'indyfm', '107.75', '107.75 mhz', 'hatyai', 'หาดใหญ่', 'สงขลา'], region: 'hatyai', url: 'https://radio.servradio.com/9448/;' },
  { name: 'OnAir Hatyai · ดนตรีสีสัน FM (ออนไลน์)', frequency: '', aliases: ['onair hatyai', 'onair plus', 'ดนตรีสีสัน', 'hatyai online'], region: 'hatyai', url: 'https://media.onair.one:8170/radio.mp3' },
  { name: 'HotWave', frequency: '91.5', aliases: ['hotwave', '91.5'], region: 'bangkok', url: 'https://atimehd.smartclick.co.th/hotwave/hls/hotwave.m3u8' }
];
const norm = value => String(value || '').toLowerCase().trim();
const RADIO_REGIONS = {
  bangkok: ['bangkok', 'กรุงเทพ'],
  north: ['chiang mai','chiang rai','lampang','lamphun','nan','phayao','phrae','mae hong son','อุตรดิตถ์','เชียงใหม่','เชียงราย','ลำปาง','ลำพูน','น่าน','พะเยา','แพร่','แม่ฮ่องสอน'],
  central: ['ayutthaya','chainat','lop buri','nakhon nayok','nakhon pathom','nakhon sawan','nonthaburi','pathum thani','phichit','phitsanulok','samut sakhon','samut songkhram','saraburi','sing buri','suphan buri','uthai thani','พระนครศรีอยุธยา','ชัยนาท','ลพบุรี','นครนายก','นครปฐม','นครสวรรค์','นนทบุรี','ปทุมธานี','พิจิตร','พิษณุโลก','สระบุรี','สิงห์บุรี','สุพรรณบุรี','อุทัยธานี'],
  east: ['chachoengsao','chanthaburi','chonburi','prachin buri','rayong','sa kaeo','trat','ฉะเชิงเทรา','จันทบุรี','ชลบุรี','ปราจีนบุรี','ระยอง','สระแก้ว','ตราด','พัทยา'],
  northeast: ['amnat charoen','bueng kan','buriram','chaiyaphum','kalasin','khon kaen','loei','maha sarakham','mukdahan','nakhon phanom','nakhon ratchasima','nong khai','nong bua lamphu','roi et','sakon nakhon','si sa ket','surin','ubon ratchathani','udon thani','yasothon','อำนาจเจริญ','บึงกาฬ','บุรีรัมย์','ชัยภูมิ','กาฬสินธุ์','ขอนแก่น','เลย','มหาสารคาม','มุกดาหาร','นครพนม','นครราชสีมา','หนองคาย','หนองบัวลำภู','ร้อยเอ็ด','สกลนคร','ศรีสะเกษ','สุรินทร์','อุบลราชธานี','อุดรธานี','ยโสธร'],
  west: ['kanchanaburi','phetchaburi','prachuap khiri khan','ratchaburi','กาญจนบุรี','เพชรบุรี','ประจวบคีรีขันธ์','ราชบุรี'],
  hatyai: ['hat yai','hatyai','songkhla','หาดใหญ่','สงขลา'],
  south: ['chumphon','krabi','nakhon si thammarat','narathiwat','pattani','phang nga','phatthalung','phuket','ranong','satun','songkhla','surat thani','trang','yala','ชุมพร','กระบี่','นครศรีธรรมราช','นราธิวาส','ปัตตานี','พังงา','พัทลุง','ภูเก็ต','ระนอง','สตูล','สงขลา','สุราษฎร์ธานี','ตรัง','ยะลา','hat yai','หาดใหญ่']
};
let radioDirectory = { expires: 0, data: [] };
async function getRadioDirectory() {
  if (radioDirectory.expires > Date.now() && radioDirectory.data.length) return radioDirectory.data;
  const response = await fetch('https://de1.api.radio-browser.info/json/stations/bycountrycodeexact/TH?hidebroken=true', {
    headers: { 'User-Agent': 'TutelBotRadio/1.0' }, signal: AbortSignal.timeout(8000)
  });
  if (!response.ok) throw new Error('Radio directory HTTP ' + response.status);
  const rows = await response.json();
  radioDirectory = { expires: Date.now() + 10 * 60 * 1000, data: Array.isArray(rows) ? rows : [] };
  return radioDirectory.data;
}
function stationMatchesRegion(station, region) {
  if (!region) return true;
  const terms = RADIO_REGIONS[region] || [];
  const haystack = norm([station.state, station.name, station.tags, station.homepage].filter(Boolean).join(' '));
  return terms.some(term => haystack.includes(norm(term)));
}
function stationFrequency(station) {
  const values = String(station.name || '').match(/\\d{2,3}(?:\\.\\d{1,2})?/g) || [];
  const match = values.find(value => Number(value) >= 87 && Number(value) <= 108);
  return match || '';
}

export const commandHandlers = {
  async calendar(i) {
    if (!guildOnly(i)) return;
    const sub=i.options.getSubcommand(), guildId=i.guildId;
    if (sub==='setup') {
      const pinError=checkCalendarSetupPin(i.options.getString('pin'),'discord:'+i.user.id);
      if(pinError)return i.reply({content:pinError,ephemeral:true});
      const channel=i.options.getChannel('channel');
      const existing=listGuildConfigs().find(x=>x.guild_id===guildId);
      saveGuildConfig(guildId,i.guild.name,channel.id,existing?.default_reminder??15);
      return i.reply({content:'ตั้ง channel แจ้งเตือนเป็น <#'+channel.id+'> แล้ว',ephemeral:true});
    }
    if (sub==='add') {
      try {
        const starts=i.options.getString('starts',true), duration=i.options.getInteger('duration')??60;
        const start=localDateTimeToIso(starts);
        const end=new Date(new Date(start).getTime()+duration*60000);
        const endLocal=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(end).replace(', ',' ');
        const repeat=i.options.getString('repeat')||'none';
        const cfg=listGuildConfigs().find(x=>x.guild_id===guildId);
        const reminder=i.options.getInteger('reminder')??cfg?.default_reminder??15;
        const id=saveEvent({guildId,title:i.options.getString('title',true),description:i.options.getString('description')||'',startsAt:starts,endsAt:endLocal,recurrence:repeat,reminders:[reminder]},null);
        return i.reply('เพิ่มกิจกรรม **'+i.options.getString('title',true)+'** (ID '+id+') แล้ว · '+formatThai(start));
      } catch(error) { return i.reply({content:error.message,ephemeral:true}); }
    }
    if (sub==='list') {
      const from=new Date(),to=new Date(Date.now()+30*86400000);
      const items=listExpandedEvents(from,to,guildId).slice(0,10);
      return i.reply(items.length?items.map(e=>'#'+e.id+' · **'+e.title+'** — '+formatThai(e.occurrence_at)+(e.holiday?' · วันสำคัญ':'')).join('\n'):'ไม่มีรายการใน 30 วันนี้');
    }
    if (sub==='delete') {
      try { deleteEvent(i.options.getInteger('id',true),guildId); return i.reply('ลบรายการแล้ว'); }
      catch(error) { return i.reply({content:error.message,ephemeral:true}); }
    }
    if (sub==='config') {
      const configs=listGuildConfigs(), cfg=configs.find(x=>x.guild_id===guildId);
      if(!cfg?.channel_id)return i.reply({content:'ตั้ง channel ก่อนด้วย /calendar setup',ephemeral:true});
      saveGuildConfig(guildId,i.guild.name,cfg.channel_id,i.options.getInteger('reminder',true));
      return i.reply('ตั้งค่าเตือนล่วงหน้าเป็น '+i.options.getInteger('reminder',true)+' นาทีแล้ว');
    }
    if (sub==='test') {
      const cfg=listGuildConfigs().find(x=>x.guild_id===guildId);
      if(!cfg?.channel_id)return i.reply({content:'ตั้ง channel ก่อนด้วย /calendar setup',ephemeral:true});
      const channel=await i.client.channels.fetch(cfg.channel_id);
      await channel.send({content:'✅ Tutel Calendar พร้อมส่งการแจ้งเตือนใน channel นี้',allowedMentions:{parse:[]}});
      return i.reply({content:'ส่งข้อความทดสอบแล้ว',ephemeral:true});
    }
  },

  async radio(i) {
    if (!guildOnly(i)) return;
    const sub = i.options.getSubcommand();
    const region = i.options.getString('area');
    if (sub === 'list') {
      await i.deferReply();
      try {
        const dynamicRows = await getRadioDirectory();
        const staticRows = RADIO_STATIONS.filter(station => !region || station.region === region || (region === 'south' && station.region === 'hatyai'));
        const liveRows = dynamicRows.filter(station => station.lastcheckok === 1 && (station.url_resolved || station.url) && stationMatchesRegion(station, region))
          .sort((a, b) => (b.clickcount || 0) - (a.clickcount || 0))
          .map(station => ({
            name: station.name, frequency: stationFrequency(station), aliases: [],
            region: region || station.state || 'Thailand', url: station.url_resolved || station.url,
            state: station.state || ''
          }));
        const seen = new Set(staticRows.map(station => station.url));
        const rows = [...staticRows, ...liveRows.filter(station => !seen.has(station.url))].slice(0, 12);
        if (!rows.length) return i.editReply('API ยังไม่พบสตรีมที่ตรวจว่าออนไลน์ในภาคนี้ ลองเลือกภาคอื่นหรือค้นด้วยชื่อสถานี');
        return i.editReply('สถานีออนไลน์ที่ค้นได้จากไดเรกทอรี\n' + rows.map(station =>
          '• ' + station.name + (station.frequency ? ' (' + station.frequency + ' MHz)' : '') +
          (station.state ? ' · ' + station.state : '')
        ).join('\n') + '\nเปิดด้วย /radio play แล้วใส่ชื่อสถานี');
      } catch (error) {
        console.error('[radio] directory lookup failed:', error);
        return i.editReply('ค้นไดเรกทอรีวิทยุไม่สำเร็จชั่วคราว ลองใหม่อีกครั้ง');
      }
    }

    const query = norm(i.options.getString('station', true));
    const station = RADIO_STATIONS.find(item =>
      (!region || item.region === region || (region === 'south' && item.region === 'hatyai')) &&
      (item.aliases.some(alias => norm(alias) === query) || norm(item.name) === query || item.frequency === query)
    );
    let selected = station;
    if (!selected) {
      await i.deferReply();
      try {
        const rows = await getRadioDirectory();
        const numeric = /^\d{2,3}(?:\.\d{1,2})?$/.test(query);
        const found = rows.filter(row => {
          if (row.lastcheckok !== 1 || !(row.url_resolved || row.url) || !stationMatchesRegion(row, region)) return false;
          const name = norm(row.name || '');
          const tags = norm(row.tags || '');
          if (numeric) return stationFrequency(row) === query || name.includes(query) || tags.includes(query);
          return name.includes(query) || tags.includes(query);
        }).sort((a, b) => {
          const exactA = norm(a.name) === query ? 1 : 0, exactB = norm(b.name) === query ? 1 : 0;
          return exactB - exactA || (b.clickcount || 0) - (a.clickcount || 0);
        });
        if (!found.length) return i.editReply('ไดเรกทอรียังไม่มีสตรีมออนไลน์ที่ตรงกับความถี่/ชื่อและภาคนี้ ลอง /radio list เลือกสถานีจากรายการ');
        if (found.length > 1 && norm(found[0].name) !== query && (found[1].clickcount || 0) >= (found[0].clickcount || 0) * 0.8) {
          return i.editReply('พบหลายสถานีใกล้เคียง: ' + found.slice(0, 5).map(row => row.name + (row.state ? ' (' + row.state + ')' : '')).join(' · ') + '\nคัดลอกชื่อสถานีที่ต้องการมาใส่ใน /radio play');
        }
        const row = found[0];
        selected = { name: row.name, frequency: stationFrequency(row) || query, region: region || row.state || 'Thailand', url: row.url_resolved || row.url };
      } catch (error) {
        console.error('[radio] directory lookup failed:', error);
        return i.editReply('ค้นสตรีมวิทยุไม่สำเร็จชั่วคราว ลองใหม่อีกครั้ง');
      }
    }
    const channel = i.member.voice && i.member.voice.channel;
    if (!channel) {
      if (i.deferred) return i.editReply('เข้าห้อง voice ก่อนนะ');
      return i.reply({ content: 'เข้าห้อง voice ก่อนนะ', ephemeral: true });
    }
    if (!i.deferred) await i.deferReply();
    playRadio(i.guildId, channel, selected);
    return i.editReply('กำลังเปิดวิทยุสด ' + selected.name + (selected.frequency ? ' (' + selected.frequency + ' MHz)' : ''));
  },
  async play(i) {
    if (!guildOnly(i)) return;
    const channel = i.member.voice && i.member.voice.channel;
    if (!channel) return i.reply({ content: 'เข้าห้อง voice ก่อนนะ', ephemeral: true });
    await i.deferReply();
    const track = await resolveTrack(i.options.getString('query', true));
    const count = enqueue(i.guildId, channel, track);
    return i.editReply('เพิ่ม **' + track.title + '**' + (track.duration ? ' (' + duration(track.duration) + ')' : '') + ' ในคิวแล้ว · รอ ' + count + ' เพลง');
  },
  async randommusic(i) {
    if (!guildOnly(i)) return;
    const channel = i.member.voice && i.member.voice.channel;
    if (!channel) return i.reply({ content: 'เข้าห้อง voice ก่อนนะ', ephemeral: true });
    enableRandomMode(i.guildId, channel);
    return i.reply('เปิดโหมดสุ่มเพลงจาก SoundCloud แล้ว เพลงจะเล่นต่อเนื่องจนกด /stop หรือ /leave');
  },
  async queue(i) {
    if (!guildOnly(i)) return;
    const state = getPlayer(i.guildId);
    if (!state || (!state.radio && !state.current && !state.queue.length)) return i.reply('คิวว่างอยู่');
    const playing = state.radio ? 'วิทยุสด · ' + state.radio.name : (state.current && state.current.title) || 'ไม่มี';
    const lines = ['กำลังเล่น: **' + playing + '**', ...state.queue.slice(0, 10).map((t, n) => (n + 1) + '. ' + t.title)];
    if (state.queue.length > 10) lines.push('และอีก ' + (state.queue.length - 10) + ' เพลง');
    return i.reply(lines.join('\n'));
  },
  async skip(i) {
    if (!guildOnly(i)) return;
    if (getPlayer(i.guildId) && getPlayer(i.guildId).radio) return i.reply('กำลังฟังวิทยุ ใช้ /radio play เพื่อเปลี่ยน หรือ /stop เพื่อหยุด');
    return i.reply(skip(i.guildId) ? 'ข้ามเพลงแล้ว' : 'ไม่มีเพลงที่กำลังเล่น');
  },
  async stop(i) { if (!guildOnly(i)) return; stop(i.guildId); return i.reply('หยุดเพลงและล้างคิวแล้ว'); },
  async pause(i) { if (!guildOnly(i)) return; const ok = getPlayer(i.guildId) && getPlayer(i.guildId).player.pause(); return i.reply(ok ? 'พักเพลงแล้ว' : 'ไม่มีเพลงที่กำลังเล่น'); },
  async resume(i) { if (!guildOnly(i)) return; const ok = getPlayer(i.guildId) && getPlayer(i.guildId).player.unpause(); return i.reply(ok ? 'เล่นเพลงต่อแล้ว' : 'ไม่มีเพลงที่พักอยู่'); },
  async nowplaying(i) {
    if (!guildOnly(i)) return;
    const state = getPlayer(i.guildId);
    if (state && state.radio) return i.reply('กำลังฟังวิทยุสด ' + state.radio.name + ' (' + state.radio.frequency + ' MHz)');
    const track = state && state.current;
    return i.reply(track ? 'กำลังเล่น **' + track.title + '**' + (track.duration ? ' (' + duration(track.duration) + ')' : '') : 'ไม่มีเพลงที่กำลังเล่น');
  },
  async leave(i) { if (!guildOnly(i)) return; destroyPlayer(i.guildId); return i.reply('ออกจาก voice channel แล้ว'); }
};
