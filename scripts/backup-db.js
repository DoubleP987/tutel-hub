import 'dotenv/config';
import { DatabaseSync } from 'node:sqlite';
import { existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
const source=resolve(process.env.DATABASE_PATH||'./data/tutel.sqlite');
if(!existsSync(source))throw new Error('Database does not exist: '+source);
const stamp=new Date().toISOString().replace(/[:.]/g,'-');
const output=resolve(process.argv[2]||'./backups/tutel-'+stamp+'.sqlite');
if(existsSync(output))throw new Error('Backup destination already exists.');
mkdirSync(dirname(output),{recursive:true});
const database=new DatabaseSync(source);
try { database.exec('PRAGMA busy_timeout=5000;');database.exec("VACUUM INTO '"+output.replaceAll("'","''")+"'");console.log('SQLite backup saved: '+output); }
finally { database.close(); }
