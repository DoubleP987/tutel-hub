import { randomBytes } from 'node:crypto';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, EmbedBuilder } from 'discord.js';
import { db, setting } from './db.js';
import { reminderOptions,notificationText } from './options.js';

export function calendarUrl(eventKey, occurrenceAt) {
 const url=new URL('/calendar',setting('public_calendar_url')||process.env.PUBLIC_CALENDAR_URL||'https://cskru.netlify.app');
 const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(occurrenceAt));
 url.searchParams.set('date',date);url.searchParams.set('event',String(eventKey));url.searchParams.set('at',occurrenceAt);
 return url.toString();
}
export async function removeOldCalendarButtons(client,channelId) {
 const latest=db.prepare('SELECT message_id FROM calendar_latest WHERE channel_id=?').get(channelId);
 if(!latest)return;
 const rows=db.prepare('SELECT id,message_id FROM calendar_deliveries WHERE channel_id=? AND active=1 AND message_id IS NOT NULL AND message_id<>?').all(channelId,latest.message_id);
 if(!rows.length)return;
 const channel=await client.channels.fetch(channelId);
 for(const row of rows){
  try{const message=await channel.messages.fetch(row.message_id);await message.edit({components:[]});db.prepare('UPDATE calendar_deliveries SET active=0 WHERE id=?').run(row.id);}
  catch(error){if(error.code===10008)db.prepare('UPDATE calendar_deliveries SET active=0 WHERE id=?').run(row.id);else console.error('[calendar] remove old button:',error.message);}
 }
}
export async function sendCalendarNotification(client,config,event,occurrence,schedule) {
 const values=[config.guild_id,config.channel_id,String(event.id),occurrence.at,schedule.key];
 if(db.prepare('SELECT id FROM calendar_deliveries WHERE guild_id=? AND channel_id=? AND event_key=? AND occurrence_at=? AND schedule_key=?').get(...values))return false;
 const channel=await client.channels.fetch(config.channel_id);
 if(!channel?.isSendable?.())throw new Error('channel นี้ส่งข้อความไม่ได้');
 const id=randomBytes(10).toString('hex');
 const when=new Intl.DateTimeFormat('th-TH',{timeZone:'Asia/Bangkok',dateStyle:'full',...(event.all_day?{}:{timeStyle:'short'})}).format(new Date(occurrence.at));
 const options=reminderOptions(config.guild_id);
 const embed=new EmbedBuilder().setColor(options.color).setDescription(notificationText(event,when+(event.all_day?' · ทั้งวัน':''),schedule,options)).setFooter({text:'Tutel Calendar · by Double_P'});
 const message=await channel.send({embeds:[embed],allowedMentions:{parse:[]},components:[new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('calendar:show:'+id).setLabel('ปฏิทิน').setStyle(ButtonStyle.Primary))]});
 const payload=JSON.stringify({title:event.title,description:event.description,allDay:!!event.all_day});
 db.prepare('INSERT INTO calendar_deliveries(id,guild_id,channel_id,event_key,occurrence_at,schedule_key,message_id,payload) VALUES(?,?,?,?,?,?,?,?)').run(id,...values,message.id,payload);
 db.prepare('INSERT INTO calendar_latest(channel_id,message_id) VALUES(?,?) ON CONFLICT(channel_id) DO UPDATE SET message_id=excluded.message_id').run(config.channel_id,message.id);
 await removeOldCalendarButtons(client,config.channel_id).catch(error=>console.error('[calendar] button cleanup:',error.message));
 return true;
}
export async function handleCalendarButton(interaction) {
 if(!interaction.isButton()||!interaction.customId.startsWith('calendar:'))return false;
 if(interaction.customId.startsWith('calendar:dismiss:')){
  if(interaction.customId!=='calendar:dismiss:'+interaction.user.id){await interaction.reply({content:'ปุ่มนี้เป็นของผู้เปิดรายละเอียด',flags:MessageFlags.Ephemeral});return true;}
  await interaction.deferUpdate();await interaction.deleteReply().catch(()=>{});return true;
 }
 await interaction.deferReply({flags:MessageFlags.Ephemeral});
 const row=db.prepare('SELECT * FROM calendar_deliveries WHERE id=?').get(interaction.customId.slice('calendar:show:'.length));
 if(!row){await interaction.editReply({content:'ไม่พบรายละเอียดแจ้งเตือนนี้',components:[]});return true;}
 const event=JSON.parse(row.payload),url=calendarUrl(row.event_key,row.occurrence_at);
 await interaction.editReply({content:('📅 **'+event.title+'**\nเปิดปฏิทินเพื่อดูรายละเอียด ข้อความนี้จะหายภายใน 30 วินาที').slice(0,1900),allowedMentions:{parse:[]},components:[new ActionRowBuilder().addComponents(new ButtonBuilder().setLabel('เปิดปฏิทิน').setStyle(ButtonStyle.Link).setURL(url),new ButtonBuilder().setLabel('Dismiss').setCustomId('calendar:dismiss:'+interaction.user.id).setStyle(ButtonStyle.Secondary))]});
 const timer=setTimeout(()=>void interaction.deleteReply().catch(()=>{}),30000);timer.unref?.();return true;
}
