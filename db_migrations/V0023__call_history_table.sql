CREATE TABLE IF NOT EXISTS call_history (
  id BIGSERIAL PRIMARY KEY,
  caller_id TEXT NOT NULL,
  caller_name TEXT,
  callee_id TEXT NOT NULL,
  callee_name TEXT,
  mode TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'initiated',
  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  answered_at TIMESTAMP,
  ended_at TIMESTAMP,
  duration_sec INTEGER DEFAULT 0,
  room_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_call_history_caller ON call_history(caller_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_call_history_callee ON call_history(callee_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_call_history_room ON call_history(room_id);