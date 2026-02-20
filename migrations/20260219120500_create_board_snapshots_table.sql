create table board_snapshots (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references boards(id) on delete cascade,
  state bytea not null,
  version integer default 1,
  created_at timestamp with time zone default now()
);

create index idx_board_snapshots_board_id on board_snapshots(board_id);
create index idx_board_snapshots_created_at on board_snapshots(created_at desc);
