import { createHash } from 'node:crypto';
import { thaiImportantDays } from './holidays.js';
import { sendCalendarNotification, removeOldCalendarButtons } from './notifications.js';
import { db } from './db.js';
import { eventCategories } from './categories.js';
import { reminderOptions,shouldNotify } from './options.js';

const TZ = 'Asia/Bangkok';
const dateParts = date => {
 const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date).map(x=>[x.type,x.value]));
 return { y:+p.year,m:+p.month,d:+p.day,h:+p.hour,min:+p.minute };
};
export function localDateTimeToIso(value) {
 const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/);
 if (!match) throw new Error('กรุณาใช้วันเวลาแบบ YYYY-MM-DD HH:mm (เวลาไทย)');
 const [,ys,ms,ds,hs,mins]=match;
 const check=new Date(Date.UTC(+ys,+ms-1,+ds));
 if(check.getUTCFullYear()!==+ys||check.getUTCMonth()!==+ms-1||check.getUTCDate()!==+ds||+hs>23||+mins>59)throw new Error('วันเวลาไม่ถูกต้อง');
 const date=new Date(Date.UTC(+ys,+ms-1,+ds,+hs-7,+mins));
 if (Number.isNaN(date.valueOf())) throw new Error('วันเวลาไม่ถูกต้อง');
 return date.toISOString();
}
function addLocal(p, recurrence, anchorDay=p.d) {
 let d = new Date(Date.UTC(p.y,p.m-1,p.d));
 if (recurrence === 'daily') d.setUTCDate(d.getUTCDate()+1);
 else if (recurrence === 'weekly') d.setUTCDate(d.getUTCDate()+7);
 else if (recurrence === 'monthly') {
  const day=anchorDay; d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth()+1);
  const last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();
  d.setUTCDate(Math.min(day,last));
 } else if (recurrence === 'yearly') {
  const month=p.m, day=anchorDay; d.setUTCFullYear(d.getUTCFullYear()+1);
  d.setUTCMonth(month-1,1);
  const last=new Date(Date.UTC(d.getUTCFullYear(),month,0)).getUTCDate();
  d.setUTCDate(Math.min(day,last));
 }
 return { y:d.getUTCFullYear(),m:d.getUTCMonth()+1,d:d.getUTCDate(),h:p.h,min:p.min };
}
function fromLocal(p) { return new Date(Date.UTC(p.y,p.m-1,p.d,p.h-7,p.min)).toISOString(); }
export function eventOccurrences(event, from, to) {
 const starts=new Date(event.starts_at), ends=new Date(event.ends_at);
 const duration=ends-starts, result=[];
 let p=dateParts(starts), cursor=starts, guard=0;
 if(event.recurrence && event.recurrence!=='none' && cursor<from){
  const target=dateParts(new Date(from.valueOf()-duration));
  if(event.recurrence==='daily'||event.recurrence==='weekly'){
   const a=Date.UTC(p.y,p.m-1,p.d), b=Date.UTC(target.y,target.m-1,target.d);
   const gap=Math.floor((b-a)/86400000), unit=event.recurrence==='weekly'?7:1;
   const steps=Math.max(0,Math.floor(gap/unit));
   const shifted=new Date(Date.UTC(p.y,p.m-1,p.d+steps*unit));
   p={...p,y:shifted.getUTCFullYear(),m:shifted.getUTCMonth()+1,d:shifted.getUTCDate()};
  } else if(event.recurrence==='monthly'){
   const gap=(target.y-p.y)*12+target.m-p.m;
   if(gap>0){const day=p.d, monthIndex=p.y*12+p.m-1+gap, y=Math.floor(monthIndex/12),m=monthIndex%12+1,last=new Date(Date.UTC(y,m,0)).getUTCDate();p={...p,y,m,d:Math.min(day,last)};}
  } else if(event.recurrence==='yearly' && target.y>p.y){
   const gap=target.y-p.y, month=p.m,day=p.d,last=new Date(Date.UTC(p.y+gap,month,0)).getUTCDate();p={...p,y:p.y+gap,m:month,d:Math.min(day,last)};
  }
  cursor=new Date(fromLocal(p));
 }
 while (cursor < to && guard++ < 800) {
  if (cursor.getTime()+duration > from.valueOf()) result.push({ at:cursor.toISOString(), end:new Date(cursor.getTime()+duration).toISOString() });
  if (!event.recurrence || event.recurrence==='none') break;
  p=addLocal(p,event.recurrence,dateParts(starts).d); cursor=new Date(fromLocal(p));
 }
 return result;
}
export function listExpandedEvents(fromValue,toValue,guildId=null) {
 const from=new Date(fromValue), to=new Date(toValue);
 if (Number.isNaN(from.valueOf()) || Number.isNaN(to.valueOf()) || to<=from || to-from>1000*60*60*24*400) throw new Error('ช่วงวันที่ไม่ถูกต้อง');
 const rows=guildId
  ? db.prepare('SELECT * FROM events WHERE guild_id IS NULL OR guild_id=? ORDER BY starts_at').all(guildId)
  : db.prepare('SELECT * FROM events ORDER BY starts_at').all();
 const expanded=rows.flatMap(event=>eventOccurrences(event,from,to).map(occ=>({...event,occurrence_at:occ.at,occurrence_end:occ.end,reminders:JSON.parse(event.reminders)})));
 for(let year=dateParts(from).y;year<=dateParts(to).y;year++){
  for(const h of thaiImportantDays(year)){
   const at=localDateTimeToIso(h.date+' 00:00'),d=dateParts(new Date(at));
   if(new Date(at)<from||new Date(at)>=to)continue;
   const end=fromLocal(addLocal({...d,h:0,min:0},'daily'));
   const key='holiday:'+h.date+':'+createHash('sha1').update(h.title).digest('hex').slice(0,10);
   expanded.push({id:key,guild_id:null,title:h.title,description:(h.type==='public'?'วันหยุดราชการ':h.type==='bank'?'วันหยุดธนาคาร/วันสำคัญ':'วันสำคัญ (ไม่ใช่วันหยุดราชการ)'),starts_at:at,ends_at:end,all_day:1,holiday:1,holidayType:h.type,publicHoliday:h.type==='public',recurrence:'none',reminder_mode:'standard',reminders:[],occurrence_at:at,occurrence_end:end,systemHoliday:true});
  }
 }
 return expanded.map(e=>({...e,color:e.color||'#4285f4',categories:eventCategories(e)})).sort((a,b)=>a.occurrence_at.localeCompare(b.occurrence_at));
}
export function saveEvent(input, creatorId) {
 const title=String(input.title||'').trim().slice(0,160);
 if (!title) throw new Error('ใส่ชื่อกิจกรรมก่อน');
 const existing=input.id?db.prepare('SELECT color FROM events WHERE id=?').get(input.id):null;
 const color=input.color??existing?.color??'#4285f4';
 if(typeof color!=='string'||!/^#[\da-f]{6}$/i.test(color))throw new Error('สีกิจกรรมไม่ถูกต้อง');
 const allDay=!!input.allDay, day=String(input.date||input.startsAt||'').slice(0,10);
 const start=localDateTimeToIso(allDay?day+' 00:00':input.startsAt);
 const end=allDay?new Date(new Date(localDateTimeToIso((input.endDate||day)+' 00:00')).getTime()+86400000).toISOString():input.endsAt ? localDateTimeToIso(input.endsAt) : new Date(new Date(start).getTime()+60*60*1000).toISOString();
 if (new Date(end)<=new Date(start)) throw new Error('เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่ม');
 const recurrence=['none','daily','weekly','monthly','yearly'].includes(input.recurrence)?input.recurrence:'none';
 const reminders=Array.isArray(input.reminders)?input.reminders.map(Number).filter(x=>Number.isInteger(x)&&x>=0&&x<=10080).slice(0,5):[15];
 const mode=allDay||input.reminderMode==='standard'||!Array.isArray(input.reminders)?'standard':'offsets';
 const values=[input.guildId||null,title,String(input.description||'').slice(0,2000),start,end,allDay?1:0,input.holiday?1:0,recurrence,JSON.stringify(reminders),mode,color,creatorId||null];
 if (input.id) {
  const result=db.prepare('UPDATE events SET guild_id=?,title=?,description=?,starts_at=?,ends_at=?,all_day=?,holiday=?,recurrence=?,reminders=?,reminder_mode=?,color=? WHERE id=?').run(...values.slice(0,11),input.id);
  if (!result.changes) throw new Error('ไม่พบกิจกรรมนี้');
  db.prepare('DELETE FROM reminder_log WHERE event_id=?').run(input.id);
  return Number(input.id);
 }
 const result=db.prepare('INSERT INTO events(guild_id,title,description,starts_at,ends_at,all_day,holiday,recurrence,reminders,reminder_mode,color,created_by) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').run(...values);
 return Number(result.lastInsertRowid);
}
export function deleteEvent(id,guildId=null) {
 const result=guildId?db.prepare('DELETE FROM events WHERE id=? AND guild_id=?').run(Number(id),String(guildId)):db.prepare('DELETE FROM events WHERE id=?').run(Number(id));
 if (!result.changes) throw new Error('ไม่พบกิจกรรมนี้');
}
export function saveGuildConfig(guildId,guildName,channelId,defaultReminder=15) {
 db.prepare('INSERT INTO guild_config(guild_id,guild_name,channel_id,default_reminder) VALUES(?,?,?,?) ON CONFLICT(guild_id) DO UPDATE SET guild_name=excluded.guild_name,channel_id=excluded.channel_id,default_reminder=excluded.default_reminder')
  .run(String(guildId),String(guildName||''),channelId?String(channelId):null,Math.min(10080,Math.max(0,Number(defaultReminder)||0)));
}
export function listGuildConfigs() { return db.prepare('SELECT * FROM guild_config').all(); }

export function reminderSchedules(event,occurrence,options=null) {
 if(event.all_day||event.reminder_mode==='standard'){
  const p=dateParts(new Date(occurrence.at)),previous=new Date(Date.UTC(p.y,p.m-1,p.d-1));
  const prev={y:previous.getUTCFullYear(),m:previous.getUTCMonth()+1,d:previous.getUTCDate(),h:12,min:0};
  const [bh,bm]=(options?.beforeTime||'12:00').split(':').map(Number),[dh,dm]=(options?.dayTime||'07:00').split(':').map(Number);
  return [{key:'previous-noon',at:fromLocal({...prev,h:bh,min:bm}),label:'พรุ่งนี้'},
   {key:'day-of',at:event.all_day?fromLocal({...p,h:dh,min:dm}):occurrence.at,label:event.all_day?'วันนี้':'ถึงเวลาแล้ว'}].filter(s=>s.key==='previous-noon'?options?.beforeEnabled!==false:options?.dayEnabled!==false);
 }
 return event.reminders.map(offset=>({key:'offset:'+offset,at:new Date(new Date(occurrence.at).getTime()-offset*60000).toISOString(),label:offset===0?'ถึงเวลาแล้ว':'อีก '+offset+' นาที'}));
}
export async function runReminderTick(client,now=Date.now()) {
 if(!client?.isReady())return;
 const configs=listGuildConfigs().filter(c=>c.channel_id);
 if(!configs.length)return;
 const events=listExpandedEvents(new Date(now-8*86400000),new Date(now+8*86400000));
 for(const config of configs){
  const options=reminderOptions(config.guild_id);
  await removeOldCalendarButtons(client,config.channel_id).catch(error=>console.error('[calendar] cleanup:',error.message));
  for(const event of events){
   if(event.guild_id&&event.guild_id!==config.guild_id)continue;
   if(!shouldNotify(event,options))continue;
   const occurrence={at:event.occurrence_at,end:event.occurrence_end};
   for(const schedule of reminderSchedules(event,occurrence,options)){
    const fireAt=new Date(schedule.at).getTime();
    // A one-hour recovery window handles restarts without replaying old reminders.
    if(fireAt>now||now-fireAt>3600000)continue;
    if(schedule.key.startsWith('offset:')&&!event.systemHoliday&&db.prepare('SELECT 1 FROM reminder_log WHERE event_id=? AND occurrence_at=? AND offset_minutes=?').get(event.id,occurrence.at,Number(schedule.key.slice(7))))continue;
    try{await sendCalendarNotification(client,config,event,occurrence,schedule);}
    catch(error){console.error('[calendar] send failed:',config.guild_id,error.message);}
   }
  }
 }
}
export function startReminderScheduler(getClient) {
 let busy=false,stopped=false;
 const tick=async()=>{if(busy||stopped)return;busy=true;try{await runReminderTick(getClient());}catch(error){console.error('[calendar] scheduler:',error.message);}finally{busy=false;}};
 const timer=setInterval(()=>void tick(),20000);timer.unref();void tick();
 return ()=>{stopped=true;clearInterval(timer);};
}
export function formatThai(iso) {
 return new Intl.DateTimeFormat('th-TH',{timeZone:TZ,dateStyle:'medium',timeStyle:'short'}).format(new Date(iso));
}
