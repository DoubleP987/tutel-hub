import 'dotenv/config';
import { createDataStore } from './store.js';

export const data = await createDataStore();
