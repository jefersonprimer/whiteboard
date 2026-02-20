create table sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  token_hash text not null,
  expires_at timestamp with time zone not null,
  created_at timestamp with time zone default now()
);

create index idx_sessions_user_id on sessions(user_id);
create index idx_sessions_token_hash on sessions(token_hash);
