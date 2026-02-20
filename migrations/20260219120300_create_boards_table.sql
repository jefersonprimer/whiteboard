create table boards (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references users(id) on delete cascade,
  title text not null,
  is_public boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index idx_boards_owner_id on boards(owner_id);
create index idx_boards_is_public on boards(is_public);
