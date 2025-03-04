-- Create annotations table
create table annotations (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  text_summary_id text not null,
  comprehensiveness integer check (comprehensiveness between 1 and 5),
  layness integer check (layness between 1 and 5),
  factuality integer check (factuality between 1 and 5),
  usefulness integer check (usefulness between 1 and 5),
  labels jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),

  unique(user_id, text_summary_id)
);

-- Enable RLS
alter table annotations enable row level security;

-- Policies
create policy "Users can view their own annotations."
  on annotations for select
  using (auth.uid() = user_id);

create policy "Users can insert their own annotations."
  on annotations for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own annotations."
  on annotations for update
  using (auth.uid() = user_id);

create policy "Users can delete their own annotations."
  on annotations for delete
  using (auth.uid() = user_id);

-- Function to update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger to automatically update updated_at
create trigger update_annotations_updated_at
  before update on annotations
  for each row
  execute function update_updated_at_column(); 