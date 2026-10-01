import express from 'express';
import { checkCalendarSetupPin } from '../calendar/setup-pin.js';
import helmet from 'helmet';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, createSession, getSession, deleteSession, userByName, verifyPassword, changePassword, setting, setSetting } from '../calendar/db.js';
import { listExpandedEvents, saveEvent, deleteEvent, saveGuildConfig, listGuildConfigs } from '../calendar/service.js';
import { getDiscordClient, startBot, stopBot, botStatus } from '../bot/runtime.js';
import { getPlayer, pausePlayer, resumePlayer, stop, skip, destroyPlayer } from '../music/player.js';
import { canSendReminders, sendableChannels } from './channels.js';
import { sendCalendarNotification } from '../calendar/notifications.js';
import { reminderOptions,saveReminderOptions,normalizeOptions } from '../calendar/options.js';
import { categories } from '../calendar/categories.js';

const app=express(), here=fileURLToPath(new URL('.',import.meta.url));
app.set('trust proxy','loopback');
app.disable('x-powered-by');
app.use(helmet({crossOriginEmbedderPolicy:false,contentSecurityPolicy:{directives:{
 defaultSrc:["'self'"],scriptSrc:["'self'"],styleSrc:["'self'"],imgSrc:["'self'","data:"],connectSrc:["'self'"],objectSrc:["'none'"],baseUri:["'self'"],frameAncestors:["'none'"],formAction:["'self'"],upgradeInsecureRequests:null
}}}));
app.use(express.json({limit:'32kb'}));
app.use((req,res,next)=>{res.setHeader('Cache-Control','no-store');next();});
const publicPath=resolve(here,'public');
function cookies(req) {
 return Object.fromEntries(String(req.headers.cookie||'').split(';').map(x=>x.trim()).filter(Boolean).map(x=>{const i=x.indexOf('=');return [decodeURIComponent(x.slice(0,i)),decodeURIComponent(x.slice(i+1))];}));
}
function setCookie(res,name,value,options={}) {
 const parts=[name+'='+encodeURIComponent(value),'Path=/','SameSite=Strict'];
 if (options.httpOnly) parts.push('HttpOnly');
 if (reqSecure(options.secure)) parts.push('Secure');
 if (options.maxAge!==undefined) parts.push('Max-Age='+options.maxAge);
 res.append('Set-Cookie',parts.join('; '));
}
function reqSecure(value) { return value===true; }
function clearCookie(res,name,httpOnly=true,secure=true) {
 const parts=[name+'=','Path=/','SameSite=Strict','Max-Age=0']; if(httpOnly)parts.push('HttpOnly'); if(secure)parts.push('Secure');
 res.append('Set-Cookie',parts.join('; '));
}
function auth(req,res,next) {
 const c=cookies(req), session=getSession(c.tutel_sid);
 if (!session) return res.status(401).json({error:'กรุณาเข้าสู่ระบบ'});
 req.auth=session; next();
}
function admin(req,res,next) {
 if (req.auth.user.role!=='admin') return res.status(403).json({error:'บัญชีนี้ดูได้อย่างเดียว'});
 if (req.auth.user.mustChange && !req.path.startsWith('/api/password')) return res.status(428).json({error:'กรุณาเปลี่ยนรหัสผ่านก่อน'});
 next();
}
function csrf(req,res,next) {
 const header=req.get('x-csrf-token')||'';
 const expected=req.auth?.csrf||'';
 if (!header || !expected || header.length!==expected.length || !timingSafeEqual(Buffer.from(header),Buffer.from(expected))) return res.status(403).json({error:'CSRF token ไม่ถูกต้อง'});
 next();
}
const loginLimits=new Map();
function setSessionCookie(res,token,secure) {
 const parts=['tutel_sid='+encodeURIComponent(token),'Path=/','HttpOnly','SameSite=Strict','Max-Age=28800'];
 if(secure)parts.push('Secure');
 res.append('Set-Cookie',parts.join('; '));
}
app.get('/login',(req,res)=>{let token=cookies(req).tutel_pre;if(!token){token=randomBytes(24).toString('base64url');const c=['tutel_pre='+encodeURIComponent(token),'Path=/','SameSite=Strict','Max-Age=900'];if(req.secure)c.push('Secure');res.append('Set-Cookie',c.join('; '));}res.sendFile(resolve(publicPath,'login.html'));});
app.get('/login.js',(req,res)=>res.sendFile(resolve(publicPath,'login.js')));
app.get('/app.js',(req,res)=>res.sendFile(resolve(publicPath,'app.js')));
app.get('/app.css',(req,res)=>res.sendFile(resolve(publicPath,'app.css')));
app.get('/',(req,res)=>{const s=getSession(cookies(req).tutel_sid);res.redirect(s?.user.role==='viewer'?'/viewer':s?'/admin':'/login');});
app.get('/admin',(req,res)=>{const s=getSession(cookies(req).tutel_sid);if(!s)return res.redirect('/login');if(s.user.role!=='admin')return res.redirect('/viewer');res.sendFile(resolve(publicPath,'app.html'));});
app.get('/viewer',(req,res)=>{const s=getSession(cookies(req).tutel_sid);if(!s)return res.redirect('/login');if(s.user.role!=='viewer')return res.redirect('/admin');res.sendFile(resolve(publicPath,'app.html'));});

app.post('/api/login',(req,res)=>{
 const ip=req.ip||'unknown', now=Date.now(), attempt=loginLimits.get(ip)||{count:0,until:0};
 if(attempt.until>now)return res.status(429).json({error:'ลองเข้าสู่ระบบใหม่ภายหลัง'});
 if(attempt.count>=8 && attempt.until<now){attempt.count=0;attempt.until=now+15*60*1000;}
 const pre=cookies(req).tutel_pre;
 if(!pre||req.body.csrf!==pre)return res.status(403).json({error:'โหลดหน้าใหม่แล้วลองอีกครั้ง'});
 const user=userByName(String(req.body.username||'').trim());
 if(!user||!verifyPassword(req.body.password||'',user.password_hash)){
  attempt.count++; if(attempt.count>=8)attempt.until=now+15*60*1000; loginLimits.set(ip,attempt);
  return res.status(401).json({error:'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'});
 }
 loginLimits.delete(ip);
 const session=createSession(user.id); setSessionCookie(res,session.token,req.secure);
 clearCookie(res,'tutel_pre',false,req.secure);
 res.json({role:user.role,mustChange:!!user.must_change,redirect:user.role==='viewer'?'/viewer':'/admin'});
});
app.get('/api/session',auth,(req,res)=>res.json({user:req.auth.user,csrf:req.auth.csrf}));
app.post('/api/logout',auth,csrf,(req,res)=>{deleteSession(req.auth.tokenHash);clearCookie(res,'tutel_sid',true,req.secure);res.json({ok:true});});
app.post('/api/password',auth,csrf,(req,res)=>{
 try {
  if(!verifyPassword(req.body.currentPassword||'',userByName(req.auth.user.username).password_hash))return res.status(401).json({error:'รหัสผ่านปัจจุบันไม่ถูกต้อง'});
  changePassword(req.auth.user.id,req.body.newPassword||''); deleteSession(req.auth.tokenHash);
  const session=createSession(req.auth.user.id);setSessionCookie(res,session.token,req.secure);
  res.json({ok:true,csrf:session.csrf,mustChange:false});
 } catch(error) {res.status(400).json({error:error.message});}
});
app.get('/api/events',auth,(req,res)=>{
 try {
  const events=listExpandedEvents(req.query.from,req.query.to,req.query.guild||null);
  res.json(events);
 } catch(error) {res.status(400).json({error:error.message});}
});
app.post('/api/events',auth,admin,csrf,(req,res)=>{
 try {const {secretPin,id,...event}=req.body;res.json({id:saveEvent(event,req.auth.user.id)});} catch(error){res.status(400).json({error:error.message});}
});
app.put('/api/events/:id',auth,admin,csrf,(req,res)=>{
 try {res.json({id:saveEvent({...req.body,id:req.params.id},req.auth.user.id)});} catch(error){res.status(400).json({error:error.message});}
});
app.delete('/api/events/:id',auth,admin,csrf,(req,res)=>{
 try {deleteEvent(req.params.id);res.json({ok:true});} catch(error){res.status(404).json({error:error.message});}
});
app.get('/api/preferences',auth,(req,res)=>{let prefs={};try{prefs=JSON.parse(setting('preferences:'+req.auth.user.id)||'{}');}catch{}res.json(prefs);});
app.put('/api/preferences',auth,csrf,(req,res)=>{
 const input=req.body,theme=['system','light','dark'].includes(input.theme)?input.theme:'system';
 const filters=Array.isArray(input.filters)?input.filters.filter(id=>categories.some(c=>c.id===id)):categories.map(c=>c.id);
 setSetting('preferences:'+req.auth.user.id,JSON.stringify({theme,filters}));res.json({ok:true});
});
for(const file of ['calendar-view.js','preferences.js','manifest.webmanifest','sw.js','icon.png','app-icon.png'])app.get('/'+file,(req,res)=>res.sendFile(resolve(publicPath,file)));
app.get('/api/guilds',auth,admin,(req,res)=>{
 const client=getDiscordClient();
 if(!client?.isReady())return res.status(503).json({error:'บอทยังไม่ออนไลน์ เปิดบอทในหน้าควบคุมบอทก่อน'});
 const guilds=client?Array.from(client.guilds.cache.values()).map(g=>({id:g.id,name:g.name})): [];
 res.json({guilds,configs:listGuildConfigs().map(c=>({...c,options:reminderOptions(c.guild_id)})),categories,publicCalendarUrl:setting('public_calendar_url')||process.env.PUBLIC_CALENDAR_URL||'https://cskru.netlify.app',netlify:{provider:process.env.PUBLIC_DEPLOY_PROVIDER==='vercel'?'Vercel':'Netlify',configured:process.env.PUBLIC_DEPLOY_PROVIDER==='vercel'?!!(process.env.VERCEL_TOKEN?.trim()&&process.env.VERCEL_PROJECT_ID?.trim()):!!process.env.NETLIFY_AUTH_TOKEN?.trim(),lastSync:setting((process.env.PUBLIC_DEPLOY_PROVIDER==='vercel'?'vercel':'netlify')+'_last_sync_at'),error:setting((process.env.PUBLIC_DEPLOY_PROVIDER==='vercel'?'vercel':'netlify')+'_last_error')}});
});
app.get('/api/guilds/:id/channels',auth,admin,async(req,res)=>{
 const client=getDiscordClient(),guild=client?.guilds.cache.get(req.params.id);
 if(!guild)return res.status(404).json({error:'บอทยังไม่อยู่ใน server นี้'});
 try {
  res.json({channels:await sendableChannels(guild)});
 } catch(error){console.error('[web] channels:',error.message);res.status(500).json({error:'โหลด channel ไม่สำเร็จ ตรวจสิทธิ์ View Channels และ Send Messages ของบอท'});}
});
app.post('/api/settings/discord',auth,admin,csrf,async(req,res)=>{
 const previous=listGuildConfigs().find(c=>c.guild_id===String(req.body.guildId));
 if(previous?.channel_id!==String(req.body.channelId)){
  const pinError=checkCalendarSetupPin(req.body.secretPin,'web:'+req.auth.user.id);
  if(pinError)return res.status(403).json({error:pinError});
 }
 try {
 const options=normalizeOptions(req.body.options||{});
 const client=getDiscordClient(), guild=client?.guilds.cache.get(String(req.body.guildId||''));
 if(!client?.isReady()||!guild)return res.status(400).json({error:'บอทยังไม่ออนไลน์หรือไม่อยู่ใน server นี้'});
 if(!guild.members.me)await guild.members.fetchMe();
 const channel=await guild.channels.fetch(String(req.body.channelId||''));
 if(!canSendReminders(channel,guild))return res.status(400).json({error:'บอทต้องมีสิทธิ์ View Channels และ Send Messages ใน text channel นี้'});
 if(req.body.publicCalendarUrl){
  const url=new URL(req.body.publicCalendarUrl);
  if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw new Error('URL ปฏิทินต้องเป็น http หรือ https');
  setSetting('public_calendar_url',url.origin);
 }
 saveGuildConfig(guild.id,guild.name,channel.id,req.body.defaultReminder);
 saveReminderOptions(guild.id,options);
 res.json({ok:true});
 }catch(error){res.status(400).json({error:error.message});}
});
app.post('/api/settings/discord/test',auth,admin,csrf,async(req,res)=>{
 try{
  const config=listGuildConfigs().find(c=>c.guild_id===String(req.body.guildId));
  if(!config?.channel_id)throw new Error('บันทึก channel ก่อนส่งทดสอบ');
  const client=getDiscordClient();if(!client?.isReady())throw new Error('บอทยังไม่ออนไลน์');
  const event=listExpandedEvents(new Date(),new Date(Date.now()+30*86400000),config.guild_id)[0];
  if(!event)throw new Error('ไม่มีรายการปฏิทินสำหรับทดสอบ');
  await sendCalendarNotification(client,config,{...event,title:'ทดสอบปฏิทิน: '+event.title},{at:event.occurrence_at,end:event.occurrence_end},{key:'test:'+Date.now(),label:'ทดสอบระบบ'});
  res.json({ok:true});
 }catch(error){res.status(400).json({error:error.message});}
});
app.get('/api/bot',auth,admin,(req,res)=>{
 const client=getDiscordClient(),guilds=client?Array.from(client.guilds.cache.values()):[];
 res.json({status:botStatus(),configured:setting('bot_enabled')!=='0',guilds:guilds.map(g=>({id:g.id,name:g.name})),
  music:guilds.map(g=>{const s=getPlayer(g.id);return {guildId:g.id,guildName:g.name,playing:s?.radio?.name||s?.current?.title||null,paused:s?.player?.state?.status==='paused',queue:s?.queue?.length||0,voiceChannelId:s?.connection?.joinConfig?.channelId||null};})});
});
app.post('/api/bot/toggle',auth,admin,csrf,async(req,res)=>{
 const enable=!!req.body.enabled;
 try {
  if(enable)await startBot(); else await stopBot();
  setSetting('bot_enabled',enable?'1':'0');res.json({ok:true,status:botStatus()});
 }catch(error){res.status(500).json({error:'สั่งเปลี่ยนสถานะบอทไม่สำเร็จ: '+error.message});}
});
app.post('/api/control/music',auth,admin,csrf,(req,res)=>{
 const guildId=String(req.body.guildId||''),action=String(req.body.action||''),state=getPlayer(guildId);
 if(!state)return res.status(404).json({error:'ไม่มี player สำหรับ server นี้'});
 if(action==='pause')pausePlayer(guildId);
 else if(action==='resume')resumePlayer(guildId);
 else if(action==='skip'){if(!skip(guildId))return res.status(400).json({error:'ไม่มีเพลงให้ข้าม'});}
 else if(action==='stop')stop(guildId);
 else if(action==='leave')destroyPlayer(guildId);
 else return res.status(400).json({error:'คำสั่งไม่รองรับ'});
 res.json({ok:true});
});
app.get('/api/health',(req,res)=>res.json({ok:true}));

export function publicEvent(e) {
 const {id,title,description,all_day,holiday,publicHoliday,recurrence,starts_at,ends_at,occurrence_at,occurrence_end,systemHoliday}=e;
 return {id,title,description,all_day,holiday,publicHoliday,recurrence,starts_at,ends_at,occurrence_at,occurrence_end,systemHoliday};
}
export {app};
export async function startControlServer() {
 const port=Number(process.env.CONTROL_PORT||3000);
 const server=app.listen(port,process.env.CONTROL_HOST||'127.0.0.1',()=>console.log('[web] control panel listening on '+port));
 return server;
}
