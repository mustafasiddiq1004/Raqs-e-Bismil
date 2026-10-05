import { DatabaseSync } from 'node:sqlite';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const db = new DatabaseSync(path.join(__dirname, 'shayari.db'));

db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS posts (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT,
  content     TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT
);

CREATE TABLE IF NOT EXISTS likes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id     INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  ip          TEXT NOT NULL,
  user_agent  TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(post_id, ip)
);

CREATE TABLE IF NOT EXISTS visits (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  ip          TEXT NOT NULL,
  user_agent  TEXT,
  page        TEXT,
  referrer    TEXT,
  visited_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS admins (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_likes_post  ON likes(post_id);
CREATE INDEX IF NOT EXISTS idx_visits_time ON visits(visited_at);
`);

/* ---- Seed default admin ---- */
if (db.prepare('SELECT COUNT(*) AS c FROM admins').get().c === 0) {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  db.prepare('INSERT INTO admins (username, password_hash) VALUES (?, ?)')
    .run(username, bcrypt.hashSync(password, 10));
  console.log(`✔ Admin created → username: ${username} | password: ${password}`);
}

/* ---- Seed a welcome shayari ---- */
if (db.prepare('SELECT COUNT(*) AS c FROM posts').get().c === 0) {
  db.prepare('INSERT INTO posts (title, content) VALUES (?, ?)').run(
    'خوش آمدید',
    'دل کی بات لبوں پر لا کر ہم نے سب کچھ کھو دیا\nتم سے کیا کہتے، اپنے آپ سے ہار گئے'
  );
}

export default db;