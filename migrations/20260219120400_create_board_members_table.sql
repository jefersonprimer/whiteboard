create table board_members (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references boards(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role text not null check (role in ('owner', 'editor', 'viewer')),
  created_at timestamp with time zone default now(),
  unique(board_id, user_id)
);

create index idx_board_members_board_id on board_members(board_id);
create index idx_board_members_user_id on board_members(user_id);
