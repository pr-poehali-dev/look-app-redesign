CREATE TABLE t_p96441965_look_app_redesign.app_users (
  id text PRIMARY KEY,
  name text NOT NULL,
  handle text NOT NULL UNIQUE,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  avatar text NULL,
  created_at timestamp DEFAULT now()
);