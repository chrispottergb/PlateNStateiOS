-- Community feed: posts, likes, comments

create table public.community_posts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  body        text not null check (char_length(body) between 1 and 1000),
  plate_tag   text,          -- optional plate number mention
  like_count  integer not null default 0,
  comment_count integer not null default 0,
  created_at  timestamptz not null default now()
);

create table public.community_post_likes (
  post_id   uuid not null references public.community_posts(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table public.community_post_comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.community_posts(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  parent_id  uuid references public.community_post_comments(id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);

-- Indexes
create index community_posts_created_at_idx on public.community_posts(created_at desc);
create index community_post_comments_post_idx on public.community_post_comments(post_id, created_at);

-- RLS
alter table public.community_posts enable row level security;
alter table public.community_post_likes enable row level security;
alter table public.community_post_comments enable row level security;

create policy "Anyone can read posts" on public.community_posts for select using (true);
create policy "Auth users can post" on public.community_posts for insert with check (auth.uid() = user_id);
create policy "Users can delete own posts" on public.community_posts for delete using (auth.uid() = user_id);

create policy "Anyone can read likes" on public.community_post_likes for select using (true);
create policy "Auth users can like" on public.community_post_likes for insert with check (auth.uid() = user_id);
create policy "Users can unlike" on public.community_post_likes for delete using (auth.uid() = user_id);

create policy "Anyone can read comments" on public.community_post_comments for select using (true);
create policy "Auth users can comment" on public.community_post_comments for insert with check (auth.uid() = user_id);
create policy "Users can delete own comments" on public.community_post_comments for delete using (auth.uid() = user_id);

-- Keep like_count and comment_count in sync via triggers
create or replace function public.update_post_like_count()
returns trigger language plpgsql security definer as $$
begin
  if tg_op = 'INSERT' then
    update public.community_posts set like_count = like_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update public.community_posts set like_count = greatest(like_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end;
$$;

create trigger community_post_like_count_trigger
after insert or delete on public.community_post_likes
for each row execute function public.update_post_like_count();

create or replace function public.update_post_comment_count()
returns trigger language plpgsql security definer as $$
begin
  if tg_op = 'INSERT' then
    update public.community_posts set comment_count = comment_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update public.community_posts set comment_count = greatest(comment_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end;
$$;

create trigger community_post_comment_count_trigger
after insert or delete on public.community_post_comments
for each row execute function public.update_post_comment_count();
