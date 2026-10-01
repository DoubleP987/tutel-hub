import {readSnapshot} from '../lib/store.js';
export default async function handler(req,res){
 if(!['GET','HEAD'].includes(req.method)){res.setHeader('Allow','GET, HEAD');return res.status(405).json({error:'Method not allowed.'});}
 try{
  const snapshot=await readSnapshot();
  if(!snapshot)return res.status(503).json({error:'Calendar is waiting for its first sync.'});
  const etag='"'+snapshot.data.contentHash+'"';
  res.setHeader('Cache-Control','public, max-age=0, s-maxage=60, stale-while-revalidate=60');
  res.setHeader('ETag',etag);
  if(req.headers['if-none-match']===etag)return res.status(304).end();
  if(req.method==='HEAD')return res.status(200).end();
  return res.status(200).json(snapshot.data);
 }catch(error){console.error('[calendar] read failed:',error.name);res.setHeader('Cache-Control','no-store');return res.status(503).json({error:'Calendar data is temporarily unavailable.'});}
}
