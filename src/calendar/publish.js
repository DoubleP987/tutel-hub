import 'dotenv/config';
import { publishVercel } from './vercel-publish.js';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setting, setSetting } from './db.js';
import { listExpandedEvents, localDateTimeToIso } from './service.js';

export const siteFiles=['index.html','calendar.js','app.css','calendar.json','_redirects','_headers','preferences.js','manifest.webmanifest','sw.js','icon.png','app-icon.png','calendar-view.js'];
export function publicEvent(e) {
 const {id,title,description,all_day,holiday,publicHoliday,recurrence,starts_at,ends_at,occurrence_at,occurrence_end,systemHoliday,categories,color}=e;
 return {id,title,description,all_day,holiday,publicHoliday,recurrence,starts_at,ends_at,occurrence_at,occurrence_end,systemHoliday,categories,color};
}
export function buildSnapshot(now=new Date()) {
 const year=Number(new Intl.DateTimeFormat('en',{timeZone:'Asia/Bangkok',year:'numeric'}).format(now));
 const events=new Map();
 for(let y=year-1;y<=year+2;y++){
  for(const e of listExpandedEvents(localDateTimeToIso(y+'-01-01 00:00'),localDateTimeToIso((y+1)+'-01-01 00:00'))){
   events.set(e.id+'|'+e.occurrence_at,publicEvent(e));
  }
 }
 return {timezone:'Asia/Bangkok',from:(year-1)+'-01-01',to:(year+3)+'-01-01',generatedAt:now.toISOString(),events:[...events.values()].sort((a,b)=>a.occurrence_at.localeCompare(b.occurrence_at))};
}
export function exportSnapshot(directory=process.env.PUBLIC_SITE_DIR||resolve('netlify-public')) {
 mkdirSync(directory,{recursive:true});
 const snapshot=buildSnapshot(),data=JSON.stringify({...snapshot,generatedAt:undefined});
 const path=resolve(directory,'calendar.json');
 if(existsSync(path)){
  try{const old=JSON.parse(readFileSync(path,'utf8'));if(JSON.stringify({...old,generatedAt:undefined})===data)return {snapshot:old,path};}catch{}
 }
 writeFileSync(path+'.tmp',JSON.stringify(snapshot));renameSync(path+'.tmp',path);return {snapshot,path};
}
// ZIP contains an explicit public file whitelist; account records and .env cannot enter it.
export function publicZip(directory) {
 const locals=[],central=[];let offset=0;
 const crc32=buffer=>{let crc=0xffffffff;for(const byte of buffer){crc^=byte;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;};
 for(const file of siteFiles){
  const name=Buffer.from(file),data=readFileSync(resolve(directory,file)),crc=crc32(data);
  const header=Buffer.alloc(30);header.writeUInt32LE(0x04034b50);header.writeUInt16LE(20,4);header.writeUInt16LE(33,12);header.writeUInt32LE(crc,14);header.writeUInt32LE(data.length,18);header.writeUInt32LE(data.length,22);header.writeUInt16LE(name.length,26);
  locals.push(header,name,data);
  const entry=Buffer.alloc(46);entry.writeUInt32LE(0x02014b50);entry.writeUInt16LE(20,4);entry.writeUInt16LE(20,6);entry.writeUInt16LE(33,14);entry.writeUInt32LE(crc,16);entry.writeUInt32LE(data.length,20);entry.writeUInt32LE(data.length,24);entry.writeUInt16LE(name.length,28);entry.writeUInt32LE(offset,42);central.push(entry,name);
  offset+=header.length+name.length+data.length;
 }
 const directoryBuffer=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(siteFiles.length,8);end.writeUInt16LE(siteFiles.length,10);end.writeUInt32LE(directoryBuffer.length,12);end.writeUInt32LE(offset,16);
 return Buffer.concat([...locals,directoryBuffer,end]);
}
export async function publishSnapshot(directory,{request=fetch,token=process.env.NETLIFY_AUTH_TOKEN,site=process.env.NETLIFY_SITE_ID}={}) {
 if(process.env.PUBLIC_DEPLOY_PROVIDER==='vercel')return publishVercel(directory,{request});
 if(!token?.trim())return {pending:true};
 if(!site?.trim())throw new Error('Set NETLIFY_SITE_ID before publishing.');
 const zip=publicZip(directory),hash=createHash('sha256').update(zip).digest('hex');
 if(setting('netlify_public_hash')===hash&&setting('netlify_public_site')===site)return {unchanged:true};
 const headers={Authorization:'Bearer '+token};
 const response=await request('https://api.netlify.com/api/v1/sites/'+encodeURIComponent(site)+'/deploys',{method:'POST',headers:{...headers,'Content-Type':'application/zip'},body:zip,signal:AbortSignal.timeout(30000)});
 if(!response.ok)throw new Error('Netlify deploy HTTP '+response.status);
 let deploy=await response.json();
 if(!deploy.id)throw new Error('Netlify ไม่ส่ง deploy ID กลับมา');
 for(let n=0;deploy.state!=='ready'&&n<30;n++){
  if(['error','rejected'].includes(deploy.state))throw new Error('Netlify deploy '+deploy.state);
  await new Promise(done=>setTimeout(done,2000));
  const check=await request('https://api.netlify.com/api/v1/deploys/'+encodeURIComponent(deploy.id),{headers,signal:AbortSignal.timeout(10000)});
  if(!check.ok)throw new Error('Netlify status HTTP '+check.status);deploy=await check.json();
 }
 if(deploy.state!=='ready')throw new Error('Netlify ยังประมวลผลไม่เสร็จ จะลองใหม่ภายหลัง');
 setSetting('netlify_public_hash',hash);setSetting('netlify_public_site',site);setSetting('netlify_last_sync_at',new Date().toISOString());setSetting('netlify_last_error','');
 return {ready:true,id:deploy.id};
}
export function startCalendarPublisher() {
 let busy=false,stopped=false,retryAfter=0;
 const tick=async()=>{
  if(busy||stopped)return;busy=true;
  try{const {path}=exportSnapshot();if(Date.now()>=retryAfter)await publishSnapshot(resolve(path,'..'));}
  catch(error){retryAfter=Date.now()+300000;setSetting((process.env.PUBLIC_DEPLOY_PROVIDER==='vercel'?'vercel':'netlify')+'_last_error',error.message);console.error('[calendar] public sync:',error.message);}
  finally{busy=false;}
 };
 const timer=setInterval(()=>void tick(),60000);timer.unref();void tick();return ()=>{stopped=true;clearInterval(timer);};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const {path,snapshot}=exportSnapshot(process.argv[3]||undefined);console.log('Exported '+snapshot.events.length+' public entries to '+path);
 if(process.argv.includes('--publish'))console.log(await publishSnapshot(resolve(path,'..')));
}
