CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
  id          uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        varchar     NOT NULL UNIQUE,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conversations (
  id          uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  "userId"    uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  room        varchar     NOT NULL,
  model       varchar     NOT NULL,
  messages    jsonb       NOT NULL DEFAULT '[]'::jsonb,
  "startedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations ("userId");
CREATE INDEX IF NOT EXISTS idx_conversations_room ON conversations (room);
