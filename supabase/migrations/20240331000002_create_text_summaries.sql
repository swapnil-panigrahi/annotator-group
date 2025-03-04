-- Create text_summaries table
create table text_summaries (
  id uuid default uuid_generate_v4() primary key,
  text text not null,
  summary text not null,
  created_at timestamp with time zone default now()
);

-- Create user_summaries table for assignments
create table user_summaries (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  summary_id uuid references text_summaries on delete cascade not null,
  assigned_at timestamp with time zone default now(),
  completed boolean default false,
  
  -- Ensure each summary is assigned to a user only once
  unique(user_id, summary_id)
);

-- Enable RLS
alter table text_summaries enable row level security;
alter table user_summaries enable row level security;

-- Policies for text_summaries
create policy "Text summaries are viewable by assigned users"
  on text_summaries for select
  using (
    exists (
      select 1 from user_summaries
      where user_summaries.summary_id = text_summaries.id
      and user_summaries.user_id = auth.uid()
    )
  );

-- Policies for user_summaries
create policy "Users can view their own summary assignments"
  on user_summaries for select
  using (auth.uid() = user_id);

-- Only allow admins to insert/update/delete user_summaries
create policy "Only admins can insert user_summaries"
  on user_summaries for insert
  using (auth.jwt()->>'role' = 'admin');

create policy "Only admins can update user_summaries"
  on user_summaries for update
  using (auth.jwt()->>'role' = 'admin');

create policy "Only admins can delete user_summaries"
  on user_summaries for delete
  using (auth.jwt()->>'role' = 'admin');

-- Function to get summaries for a user
create or replace function get_user_summaries(p_user_id uuid)
returns table (
  id uuid,
  text text,
  summary text,
  assigned_at timestamp with time zone,
  completed boolean
) language sql security definer as $$
  select 
    ts.id,
    ts.text,
    ts.summary,
    us.assigned_at,
    us.completed
  from text_summaries ts
  inner join user_summaries us on us.summary_id = ts.id
  where us.user_id = p_user_id
  order by us.assigned_at desc;
$$; 