import { randomUUID } from 'node:crypto';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';
import { t } from '../i18n/bot.js';
import { resolveMusicLink } from './links.js';
import { readPlaylist, MAX_PLAYLIST_TRACKS } from './playlist.js';
import { resolveTrack } from './stream.js';
import { enqueueMany } from './player.js';
import { getMusicSource } from './settings.js';
import { showMusicPanel, musicPanelPending, recordMusicAction } from './panel.js';
import { musicEvents, musicRequestVersion } from './events.js';

const jobs = new Map();

const cancelJob = (job) => {
  job.abort.abort();
  job.choose?.('cancel');
};

musicEvents.on('cancel', (guildId) => {
  const job = jobs.get(guildId);

  if (job) {
    cancelJob(job);
  }
});

function buttons(job, choose = false) {
  const button = (action, label, style) =>
    new ButtonBuilder()
      .setCustomId(`music:request:${job.id}:${action}`)
      .setLabel(label)
      .setStyle(style);

  return [
    new ActionRowBuilder().addComponents(
      ...(choose
        ? [
            button('single', t('เพลงเดียว'), ButtonStyle.Primary),
            button('playlist', t('ทั้ง Playlist'), ButtonStyle.Success),
          ]
        : []),
      button('cancel', t('ยกเลิก'), ButtonStyle.Secondary),
    ),
  ];
}

export async function handleMusicRequestButton(interaction) {
  if (!interaction.isButton() || !interaction.customId.startsWith('music:request:')) {
    return false;
  }

  const [, , id, action] = interaction.customId.split(':');
  const job = jobs.get(interaction.guildId);

  if (
    !job ||
    job.id !== id ||
    interaction.user.id !== job.userId ||
    interaction.channelId !== job.channelId ||
    !['single', 'playlist', 'cancel'].includes(action)
  ) {
    await interaction.reply({
      content: t('คำขอนี้หมดอายุหรือเป็นของผู้อื่น'),
      flags: MessageFlags.Ephemeral,
    });
    return true;
  }

  await interaction.deferUpdate();

  if (action === 'cancel') {
    cancelJob(job);
  } else {
    job.choose?.(action);
  }

  return true;
}

export async function playRequest(
  interaction,
  { query, next = false, voiceChannel, movePanel = true } = {},
) {
  if (!interaction.guildId) {
    return;
  }

  const channel = voiceChannel || interaction.member.voice?.channel;

  if (!channel) {
    return interaction.reply({
      content: t('เข้าห้อง voice ก่อนนะ'),
      flags: MessageFlags.Ephemeral,
    });
  }

  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  }

  const old = jobs.get(interaction.guildId);

  if (old) {
    cancelJob(old);
  }

  const job = {
    id: randomUUID(),
    userId: interaction.user.id,
    channelId: interaction.channelId,
    abort: new AbortController(),
    choose: null,
  };
  jobs.set(interaction.guildId, job);
  const version = musicRequestVersion(interaction.guildId);
  let pendingUpdate = Promise.resolve();
  let lastUpdate = 0;
  let committed = false;

  const update = (payload) => {
    pendingUpdate = pendingUpdate
      .catch(() => {})
      .then(() =>
        interaction.editReply({
          ...payload,
          allowedMentions: { parse: [] },
        }),
      );
    return pendingUpdate;
  };

  const valid = () => {
    job.abort.signal.throwIfAborted();

    if (
      jobs.get(interaction.guildId) !== job ||
      musicRequestVersion(interaction.guildId) !== version
    ) {
      throw new Error('PLAYLIST_CANCELLED');
    }

    const voiceId = interaction.guild.voiceStates.cache.get(interaction.user.id)?.channelId;

    if (voiceId !== channel.id) {
      throw new Error('VOICE_CHANGED');
    }
  };

  try {
    musicPanelPending(interaction.guildId, t('กำลังอ่านคำขอเพลง…'));

    if (movePanel) {
      await showMusicPanel(interaction);
    }

    valid();
    const link = await resolveMusicLink(query, { signal: job.abort.signal });
    valid();
    let playlist = link.playlist;

    if (link.mixed) {
      const choice = new Promise((resolve) => {
        job.choose = resolve;
      });
      const timer = setTimeout(() => cancelJob(job), 45000);
      timer.unref();

      try {
        await update({
          content: t('ลิงก์นี้มีทั้งเพลงและ Playlist เลือกภายใน 45 วินาที'),
          components: buttons(job, true),
        });
        const selected = await choice;
        job.choose = null;
        valid();
        playlist = selected === 'playlist';
      } finally {
        clearTimeout(timer);
      }
    }

    await update({
      content: playlist
        ? t('กำลังอ่าน Playlist · ยังไม่เพิ่มลงคิว (สูงสุด {0} เพลง)', MAX_PLAYLIST_TRACKS)
        : t('กำลังเปิดลิงก์หรือค้นหาเพลง…'),
      components: buttons(job),
    });
    let tracks;
    let skipped = 0;
    let limited = false;
    let partial = false;

    if (playlist) {
      const result = await readPlaylist(link.playlistUrl || query, {
        signal: job.abort.signal,
        onProgress: ({ found, skipped: unavailable }) => {
          if (Date.now() - lastUpdate < 3000 || job.abort.signal.aborted) {
            return;
          }

          lastUpdate = Date.now();
          void update({
            content: t('อ่านได้ {0} เพลง · ข้าม {1} รายการ · ยังไม่เพิ่มลงคิว', found, unavailable),
            components: buttons(job),
          }).catch(() => {});
        },
      });
      ({ tracks, skipped, limited, partial } = result);
    } else {
      tracks = [
        await resolveTrack(link.singleUrl || query, getMusicSource(interaction.guildId), {
          signal: job.abort.signal,
        }),
      ];
    }

    valid();
    const requestedBy =
      interaction.member?.displayName || interaction.user.globalName || interaction.user.username;
    tracks = tracks.map((track) => ({ ...track, requestedBy: String(requestedBy).slice(0, 80) }));
    const result = enqueueMany(interaction.guildId, channel, tracks, { next });
    committed = true;
    await recordMusicAction(
      interaction,
      playlist
        ? t('เพิ่ม Playlist {0} เพลง · {1}', result.added, tracks[0].title)
        : t('เพิ่มเพลง {0}', tracks[0].title),
    );
    const title = tracks[0].title.replace(/([\\`*_<>|])/g, '\\$1').slice(0, 180);
    await update({
      content:
        (playlist
          ? t(
              'เพิ่ม Playlist แล้ว: {0} เพลง · ข้าม {1} รายการ',
              result.added,
              skipped + result.omitted,
            )
          : t('เพิ่ม **{0}** ในคิวแล้ว', title)) +
        (next ? t('\nวางต่อจากเพลงปัจจุบัน') : '') +
        (limited ? t('\nจำกัด 100 รายการแรกต่อครั้ง') : '') +
        (partial ? t('\nอ่านได้บางส่วน รายการที่อ่านสำเร็จถูกเพิ่มแล้ว') : ''),
      components: [],
    });
  } catch (error) {
    if (committed) {
      console.warn('[music request] queued; reply update failed');
      return;
    }

    const cancelled = job.abort.signal.aborted || error.message === 'PLAYLIST_CANCELLED';

    if (!cancelled) {
      console.error('[music request]', error.message.slice(0, 1000));
    }

    const message = cancelled
      ? t('ยกเลิกคำขอแล้ว · ยังไม่ได้เพิ่มเพลงจากคำขอนี้')
      : error.message === 'VOICE_CHANGED'
        ? t('ยกเลิกการเพิ่มเพลง เพราะคุณออกหรือเปลี่ยนห้องเสียงระหว่างค้นหา')
        : error.message === 'PLAYLIST_TIMEOUT'
          ? t('อ่าน Playlist นานเกิน 45 วินาที ลองใหม่หรือลดขนาดรายการ')
          : t('เปิดเพลงหรือ Playlist ไม่สำเร็จ ตรวจสอบว่าลิงก์เป็นสาธารณะและคิวยังไม่เต็ม');
    await update({ content: message, components: [] }).catch(() => {});
  } finally {
    if (jobs.get(interaction.guildId) === job) {
      jobs.delete(interaction.guildId);
      musicPanelPending(interaction.guildId, null);
    }
  }
}
