create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trigger_users_updated_at
before update on users
for each row
execute function update_updated_at_column();

create trigger trigger_boards_updated_at
before update on boards
for each row
execute function update_updated_at_column();
