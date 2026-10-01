import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { initializeSchema } from './schema.js';

const databasePath = process.env.DATABASE_PATH || './data/tutel.sqlite';
mkdirSync(dirname(databasePath), { recursive: true });
export const db = new DatabaseSync(databasePath);
initializeSchema(db);
