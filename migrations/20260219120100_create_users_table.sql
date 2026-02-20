create table users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  username text not null unique,
  password_hash text not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index idx_users_email on users(email);
create index idx_users_username on users(username);
