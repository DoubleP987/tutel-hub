import { MongoClient } from 'mongodb';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { initializeSchema } from './schema.js';

const tables = new Set([
  'users',
  'sessions',
  'events',
  'guild_config',
  'reminder_log',
  'app_settings',
  'calendar_deliveries',
  'calendar_latest',
]);

const clean = (row) => {
  if (!row) {
    return null;
  }

  const { _id, ...value } = row;
  return value;
};

function identifier(value) {
  if (!/^[a-z_][a-z_0-9]*$/i.test(value)) {
    throw new Error('Invalid database field');
  }

  return `"${value}"`;
}

function tableName(name) {
  if (!tables.has(name)) {
    throw new Error('Unknown database collection');
  }

  return identifier(name);
}

function predicate(filter = {}, values = []) {
  const parts = Object.entries(filter).map(([key, value]) => {
    if (key === '$or') {
      return '(' + value.map((item) => predicate(item, values)).join(' OR ') + ')';
    }

    const field = identifier(key);

    if (value === null) {
      return `${field} IS NULL`;
    }

    if (value && typeof value === 'object') {
      return Object.entries(value)
        .map(([operator, operand]) => {
          if (operand === null && operator === '$ne') {
            return `${field} IS NOT NULL`;
          }

          const operators = {
            $ne: '<>',
            $gt: '>',
            $gte: '>=',
            $lt: '<',
            $lte: '<=',
            $like: 'LIKE',
          };

          if (!operators[operator]) {
            throw new Error('Unsupported database predicate');
          }

          values.push(operand);
          return `${field} ${operators[operator]} ?`;
        })
        .join(' AND ');
    }

    values.push(value);
    return `${field}=?`;
  });
  return parts.join(' AND ') || '1=1';
}

class SqliteStore {
  constructor(path) {
    mkdirSync(dirname(path), { recursive: true });
    this.connection = new DatabaseSync(path);
    initializeSchema(this.connection);
    this.kind = 'sqlite';
  }
  async findMany(table, filter = {}, options = {}) {
    const values = [];
    let query = `SELECT * FROM ${tableName(table)} WHERE ${predicate(filter, values)}`;

    if (options.sort) {
      query +=
        ' ORDER BY ' +
        Object.entries(options.sort)
          .map(([key, order]) => `${identifier(key)} ${order < 0 ? 'DESC' : 'ASC'}`)
          .join(',');
    }

    return this.connection.prepare(query).all(...values);
  }
  async findOne(table, filter) {
    return (await this.findMany(table, filter))[0] || null;
  }
  async count(table, filter = {}) {
    return (await this.findMany(table, filter)).length;
  }
  async insert(table, document) {
    const fields = Object.keys(document);
    const result = this.connection
      .prepare(
        `INSERT INTO ${tableName(table)} (${fields.map(identifier).join(',')}) VALUES (${fields.map(() => '?').join(',')})`,
      )
      .run(...Object.values(document));
    return { ...document, id: document.id ?? Number(result.lastInsertRowid) };
  }
  async update(table, filter, changes) {
    const values = Object.values(changes);
    const where = predicate(filter, values);
    return this.connection
      .prepare(
        `UPDATE ${tableName(table)} SET ${Object.keys(changes)
          .map((key) => `${identifier(key)}=?`)
          .join(',')} WHERE ${where}`,
      )
      .run(...values).changes;
  }
  async remove(table, filter) {
    const values = [];
    return this.connection
      .prepare(`DELETE FROM ${tableName(table)} WHERE ${predicate(filter, values)}`)
      .run(...values).changes;
  }
  async upsert(table, key, changes) {
    const document = { ...key, ...changes };
    const fields = Object.keys(document);
    this.connection
      .prepare(
        `INSERT INTO ${tableName(table)} (${fields.map(identifier).join(',')}) VALUES (${fields.map(() => '?').join(',')}) ON CONFLICT (${Object.keys(key).map(identifier).join(',')}) DO UPDATE SET ${Object.keys(
          changes,
        )
          .map((field) => `${identifier(field)}=excluded.${identifier(field)}`)
          .join(',')}`,
      )
      .run(...Object.values(document));
  }
  async insertIfMissing(table, key, document) {
    const value = { ...key, ...document };
    const fields = Object.keys(value);
    this.connection
      .prepare(
        `INSERT OR IGNORE INTO ${tableName(table)} (${fields.map(identifier).join(',')}) VALUES (${fields.map(() => '?').join(',')})`,
      )
      .run(...Object.values(value));
  }
  async close() {
    this.connection.close();
  }
}

export class MongoStore {
  constructor(client, database) {
    this.client = client;
    this.database = database;
    this.kind = 'mongodb';
  }
  collection(name) {
    tableName(name);
    return this.database.collection(name);
  }
  async findMany(table, filter = {}, options = {}) {
    // LIKE is used only for namespaced settings and never arbitrary user input.
    const converted = Object.fromEntries(
      Object.entries(filter).map(([key, value]) => [
        key,
        value?.$like
          ? {
              $regex:
                '^' +
                value.$like.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replaceAll('%', '.*') +
                '$',
            }
          : value,
      ]),
    );
    return (
      await this.collection(table)
        .find(converted, { projection: { _id: 0 } })
        .sort(options.sort || {})
        .toArray()
    ).map(clean);
  }
  async findOne(table, filter) {
    return clean(await this.collection(table).findOne(filter));
  }
  async count(table, filter = {}) {
    return this.collection(table).countDocuments(filter);
  }
  async insert(table, document) {
    const value = { ...document };

    if ((table === 'users' || table === 'events') && value.id === undefined) {
      const counter = await this.database
        .collection('counters')
        .findOneAndUpdate(
          { _id: table },
          { $inc: { value: 1 } },
          { upsert: true, returnDocument: 'after' },
        );
      value.id = counter.value;
    }

    if (
      ['users', 'events', 'calendar_deliveries', 'reminder_log'].includes(table) &&
      !value.created_at &&
      !value.sent_at
    ) {
      value[table.includes('deliveries') || table === 'reminder_log' ? 'sent_at' : 'created_at'] =
        new Date().toISOString();
    }

    if (table === 'calendar_deliveries') {
      value.active ??= 1;
    }

    if (table === 'guild_config') {
      value.timezone ??= 'Asia/Bangkok';
    }

    await this.collection(table).insertOne(value);
    return clean(value);
  }
  async update(table, filter, changes) {
    return (await this.collection(table).updateMany(filter, { $set: changes })).matchedCount;
  }
  async remove(table, filter) {
    if (table === 'events' || table === 'users') {
      const rows = await this.findMany(table, filter);

      for (const row of rows) {
        if (table === 'events') {
          await this.remove('reminder_log', { event_id: row.id });
        } else {
          await this.remove('sessions', { user_id: row.id });
        }
      }
    }

    return (await this.collection(table).deleteMany(filter)).deletedCount;
  }
  async upsert(table, key, changes) {
    await this.collection(table).updateOne(key, { $set: changes }, { upsert: true });
  }
  async insertIfMissing(table, key, document) {
    await this.collection(table).updateOne(key, { $setOnInsert: document }, { upsert: true });
  }
  async close() {
    await this.client.close();
  }
}

export async function createDataStore() {
  if ((process.env.DATABASE_PROVIDER || 'sqlite') !== 'mongodb') {
    return new SqliteStore(process.env.DATABASE_PATH || './data/tutel.sqlite');
  }

  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is required for the MongoDB provider');
  }

  const client = new MongoClient(process.env.MONGODB_URI, {
    maxPoolSize: 5,
    minPoolSize: 0,
    maxIdleTimeMS: 60000,
    serverSelectionTimeoutMS: 8000,
    connectTimeoutMS: 8000,
    socketTimeoutMS: 10000,
    appName: `Tutel-${process.env.CLUSTER_NODE_ID || 'standalone'}`,
  });
  await client.connect();
  const database = client.db(process.env.MONGODB_DATABASE || 'tutel');
  const unique = {
    users: [{ id: 1 }, { username: 1 }],
    events: [{ id: 1 }],
    sessions: [{ token_hash: 1 }],
    app_settings: [{ key: 1 }],
    guild_config: [{ guild_id: 1 }],
    calendar_latest: [{ channel_id: 1 }],
    calendar_deliveries: [
      { id: 1 },
      { guild_id: 1, channel_id: 1, event_key: 1, occurrence_at: 1, schedule_key: 1 },
    ],
    reminder_log: [{ event_id: 1, occurrence_at: 1, offset_minutes: 1 }],
  };

  for (const [table, indexes] of Object.entries(unique)) {
    for (const keys of indexes) {
      await database.collection(table).createIndex(keys, { unique: true });
    }
  }

  await database.collection('events').createIndex({ starts_at: 1 });
  await database.collection('events').createIndex({ guild_id: 1 });
  await database.collection('calendar_deliveries').createIndex({ channel_id: 1, active: 1 });
  // Numeric expires_at is retained for compatibility; expiry checks do not rely on TTL lag.
  await database.command({ ping: 1 });
  return new MongoStore(client, database);
}
