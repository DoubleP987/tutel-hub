import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const source = new URL('../src/', import.meta.url).href;
const check = `
import assert from 'node:assert/strict';
import { botLanguage, botConfig } from '${source}config/bot.js';
import { t } from '${source}i18n/bot.js';
import { commands } from '${source}commands/definitions.js';
import { helpReply, help } from '${source}commands/help.js';
import { botProfileDescription } from '${source}config/profile.js';
import { buildDailySummary, calendarDay } from '${source}calendar/daily-summary.js';
import { data } from '${source}database/connection.js';
try {
  const english = botLanguage === 'en';
  assert.equal(botConfig.language, 'th');
  assert.equal(t('⏭ ข้าม'), english ? '⏭ Skip' : '⏭ ข้าม');
  assert.equal(t('คิวถัดไป · {0} เพลง', 2), english ? 'Up next · 2 songs' : 'คิวถัดไป · 2 เพลง');
  const payloads = commands;
  assert(payloads.some(command => command.name === 'help'));
  if (english) {
    function descriptions(item) {
      if (item.description) assert(!/[\u0e00-\u0e7f]/.test(item.description));
      for(const child of item.options || []) descriptions(child);
    }
    payloads.forEach(descriptions);
  }
  const reply = helpReply();
  assert.equal(reply.flags, 64);
  const buttons = reply.components[0].toJSON().components;
  assert.equal(buttons[0].url, 'https://tutelbot.vercel.app/');
  assert.equal(buttons[1].url, 'https://tutelbot.vercel.app/guide.html');
  assert(buttons.every(button => button.style === 5 && !button.custom_id));
  assert.equal(buttons[0].label, english ? '🌐 Website' : '🌐 เปิดเว็บไซต์');
  let sent;
  await help({ reply: async value => { sent=value; } });
  assert.equal(sent.flags,64);
  const day = calendarDay(new Date('2026-10-02T02:00:00Z'));
  const event = {id: 1, title:'ชื่อกิจกรรมของผู้ใช้', description:'รายละเอียดเดิม', all_day:true, occurrence_at:day.startsAt, occurrence_end:day.endsAt, categories:['custom']};
  const summary = buildDailySummary(day,[event],{template:'{title}',showDetails:true,color:'#4285f4'});
  assert(summary.fullText.includes(event.title));
  assert(summary.fullText.includes(event.description));
  assert(summary.title.includes(english ? "Today's calendar" : 'ปฏิทินวันนี้'));
  assert(summary.fullText.includes(english ? 'All day' : 'ทั้งวัน'));
  assert(botProfileDescription().includes('https://tutelbot.vercel.app'));
  assert(botProfileDescription().length <= 400);
  console.log('Language, command payloads, private help, dates, profile and user content: PASS');
} finally { await data.close(); }
`;
function run(language, body = check) {
  const directory = mkdtempSync(join(tmpdir(), 'tutel-language-'));
  try {
    return spawnSync(process.execPath, ['--input-type=module', '-e', body], {
      cwd: directory,
      encoding: 'utf8',
      env: {
        ...process.env,
        BOT_LANGUAGE: language,
        BOT_WEBSITE_URL: 'https://tutelbot.vercel.app',
        DATABASE_PROVIDER: 'sqlite',
        DATABASE_PATH: join(directory, 'test.sqlite'),
        DATA_DIR: directory,
        CLUSTER_NODE_ID: '',
        DISCORD_TOKEN: '',
      },
    });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}
for (const language of ['th', 'en', '']) {
  test(`Bot language ${language || 'default Thai'}`, () => {
    const result = run(language);
    assert.equal(result.status, 0, result.stdout + result.stderr);
  });
}
test('Invalid language is rejected', () => {
  const result = run('fr', `await import('${source}config/bot.js');`);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /BOT_LANGUAGE must be th or en/);
});
