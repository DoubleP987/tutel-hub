'use strict';
const $=selector=>document.querySelector(selector);
const TZ='Asia/Bangkok',query=new URLSearchParams(location.search);
const dateKey=date=>{const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date).map(x=>[x.type,x.value]));return p.year+'-'+p.month+'-'+p.day;};
const today=()=>dateKey(new Date());
const validDay=value=>/^\d{4}-\d{2}-\d{2}$/.test(value||'')&&!Number.isNaN(new Date(value+'T12:00:00Z').valueOf())&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;
const selected=validDay(query.get('date'))?query.get('date'):today();
const state={day:selected,month:new Date(selected.slice(0,7)+'-01T12:00:00Z'),events:[],snapshot:null,opened:false,request:0};
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('show');setTimeout(()=>$('#toast').classList.remove('show'),4000);}
function occursOn(event,day){const start=new Date(day+'T00:00:00+07:00').getTime();return new Date(event.occurrence_at).getTime()<start+86400000&&new Date(event.occurrence_end).getTime()>start;}
function showDetails(event){
 $('#detail-title').textContent=event.title;
 $('#detail-when').textContent=new Intl.DateTimeFormat('th-TH',{timeZone:TZ,dateStyle:'full',...(event.all_day?{}:{timeStyle:'short'})}).format(new Date(event.occurrence_at))+(event.all_day?' · ทั้งวัน':'');
 $('#detail-description').textContent=event.description||'ไม่มีรายละเอียดเพิ่มเติม';
 if(!$('#details-dialog').open)$('#details-dialog').showModal();
}
function selectDay(day){state.day=day;document.querySelectorAll('.day').forEach(x=>x.classList.toggle('selected',x.dataset.day===day));renderList();}
function renderList(){
 $('#selected-title').textContent='รายการวันที่ '+new Intl.DateTimeFormat('th-TH',{timeZone:TZ,dateStyle:'long'}).format(new Date(state.day+'T00:00:00+07:00'));
 const events=state.events.filter(e=>TutelPrefs.visible(e)&&occursOn(e,state.day));
 $('#event-list').innerHTML=events.length?events.map((e,n)=>'<article class="event-card" tabindex="0" role="button" data-index="'+n+'"><div class="event-date">'+(e.all_day?'ทั้งวัน':esc(new Intl.DateTimeFormat('th-TH',{timeZone:TZ,timeStyle:'short'}).format(new Date(e.occurrence_at))))+'</div><div class="event-info"><b>'+esc(e.title)+'</b><p>'+esc(e.systemHoliday?(e.publicHoliday?'วันหยุด':'วันสำคัญ'):e.description||'')+'</p></div></article>').join(''):'<div class="muted">ไม่มีรายการในวันนี้</div>';
 document.querySelectorAll('.event-card').forEach(x=>{x.style.borderLeftColor=events[Number(x.dataset.index)].color||'#4285f4';x.onclick=()=>showDetails(events[Number(x.dataset.index)]);x.onkeydown=e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();x.click();}};});
}
let workspace;
function renderCalendar(){if(!workspace)workspace=new TutelCalendar($('#calendar-workspace'),{day:state.day,onNavigate:day=>{state.day=day;state.month=new Date(day.slice(0,7)+'-01T12:00:00Z');renderList();},onSelect:day=>selectDay(day),onOpen:showDetails});workspace.update({events:state.events,day:state.day});renderList();}
function changeMonth(offset){state.month=new Date(Date.UTC(state.month.getUTCFullYear(),state.month.getUTCMonth()+offset,1,12));state.day=state.month.toISOString().slice(0,10);renderCalendar();}
async function loadSnapshot(){
 const request=++state.request;
 try{
  const response=await fetch('/api/calendar',{cache:'no-cache',headers:state.snapshot?.contentHash?{'If-None-Match':'\"'+state.snapshot.contentHash+'\"'}:{}});if(response.status===304)return;if(!response.ok)throw new Error('โหลดข้อมูล HTTP '+response.status);
  const data=await response.json();if(!Array.isArray(data.events))throw new Error('รูปแบบข้อมูลปฏิทินไม่ถูกต้อง');if(request!==state.request)return;
  const changed=state.snapshot?.contentHash!==data.contentHash;state.events=data.events;state.snapshot=data;if(changed||!workspace)renderCalendar();
  $('#sync-status').textContent='ข้อมูลล่าสุด '+new Intl.DateTimeFormat('th-TH',{timeZone:TZ,dateStyle:'medium',timeStyle:'short'}).format(new Date(data.generatedAt));
  if(query.get('event')&&!state.opened){const event=state.events.find(e=>String(e.id)===query.get('event')&&(query.get('at')?e.occurrence_at===query.get('at'):occursOn(e,state.day)));if(event){showDetails(event);state.opened=true;}else if(request===1)toast('ยังไม่พบรายการนี้ อาจรอซิงก์หรือถูกลบแล้ว');}
 }catch(error){$('#sync-status').textContent='โหลดปฏิทินไม่สำเร็จ: '+error.message;if(request===1)toast('ยังโหลดข้อมูลไม่ได้ กรุณาลองใหม่อีกครั้ง');}
}
$('#close-details').onclick=()=>$('#details-dialog').close();
void loadSnapshot();setInterval(()=>void loadSnapshot(),60000);

window.addEventListener('tutel:display',()=>renderCalendar());

document.addEventListener('visibilitychange',()=>{if(!document.hidden)void loadSnapshot();});
