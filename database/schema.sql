-- ============================================
-- ECOFEAST DATABASE SCHEMA (synced with live Supabase DB, Oct 2026)
-- Supabase Dashboard > SQL Editor me paste karke RUN karo.
-- Rerun-safe: tables "if not exists", policies "drop if exists + create".
-- ============================================

-- 1. PROFILES
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null,
  role text not null check (role in ('donor', 'ngo', 'volunteer', 'admin')),
  organization_name text,
  phone text,
  latitude double precision,
  longitude double precision,
  address text,
  is_verified boolean default false,
  created_at timestamp with time zone default now()
);

-- 2. FOOD_ITEMS
create table if not exists food_items (
  id uuid default gen_random_uuid() primary key,
  donor_id uuid references profiles(id) not null,
  food_name text not null,
  quantity_kg numeric not null,
  image_url text,
  freshness_score numeric,
  placement_readiness_index numeric,
  status text default 'available' check (status in ('available', 'claimed', 'delivered', 'expired')),
  cooked_time timestamp with time zone,
  expiry_estimate timestamp with time zone,
  created_at timestamp with time zone default now()
);

-- 3. CLAIMS
create table if not exists claims (
  id uuid default gen_random_uuid() primary key,
  food_item_id uuid references food_items(id) not null,
  ngo_id uuid references profiles(id) not null,
  distance_km numeric,
  match_score numeric,
  status text default 'pending' check (status in ('pending', 'accepted', 'picked_up', 'cancelled')),
  created_at timestamp with time zone default now()
);

-- 4. IMPACT_LOG
create table if not exists impact_log (
  id uuid default gen_random_uuid() primary key,
  food_item_id uuid references food_items(id) not null,
  meals_saved numeric,
  co2_saved_kg numeric,
  created_at timestamp with time zone default now()
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
alter table profiles enable row level security;
alter table food_items enable row level security;
alter table claims enable row level security;
alter table impact_log enable row level security;

-- ---- profiles ----
drop policy if exists "Users can view all profiles" on profiles;
create policy "Users can view all profiles" on profiles for select using (true);

drop policy if exists "Users can insert own profile" on profiles;
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on profiles;
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

drop policy if exists "Admins can update any profile" on profiles;
create policy "Admins can update any profile" on profiles for update using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- ---- food_items ----
drop policy if exists "Anyone can view food items" on food_items;
create policy "Anyone can view food items" on food_items for select using (true);

drop policy if exists "Donors can insert own items" on food_items;
create policy "Donors can insert own items" on food_items for insert with check (auth.uid() = donor_id);

drop policy if exists "Donors can update own items" on food_items;
create policy "Donors can update own items" on food_items for update using (auth.uid() = donor_id);

drop policy if exists "Donors can delete own items" on food_items;
create policy "Donors can delete own items" on food_items for delete using (auth.uid() = donor_id);

-- KNOWN ISSUE: using (true) means any logged-in user can update any food item.
-- To be tightened in the security module.
drop policy if exists "NGOs can update claimed items status" on food_items;
create policy "NGOs can update claimed items status" on food_items for update using (true);

-- ---- claims ----
drop policy if exists "Anyone can view claims" on claims;
create policy "Anyone can view claims" on claims for select using (true);

drop policy if exists "NGOs can insert claims" on claims;
create policy "NGOs can insert claims" on claims for insert with check (auth.uid() = ngo_id);

drop policy if exists "NGOs can update own claims" on claims;
create policy "NGOs can update own claims" on claims for update using (auth.uid() = ngo_id);

drop policy if exists "Donors can update claims on their items" on claims;
create policy "Donors can update claims on their items" on claims for update using (
  exists (select 1 from food_items where food_items.id = claims.food_item_id and food_items.donor_id = auth.uid())
);

drop policy if exists "Donors can delete claims on their items" on claims;
create policy "Donors can delete claims on their items" on claims for delete using (
  exists (select 1 from food_items where food_items.id = claims.food_item_id and food_items.donor_id = auth.uid())
);

-- ---- impact_log ----
drop policy if exists "Anyone can view impact log" on impact_log;
create policy "Anyone can view impact log" on impact_log for select using (true);

-- KNOWN ISSUE: check (true) lets anyone insert fake impact rows.
drop policy if exists "System can insert impact log" on impact_log;
create policy "System can insert impact log" on impact_log for insert with check (true);

drop policy if exists "Donors can delete impact log on their items" on impact_log;
create policy "Donors can delete impact log on their items" on impact_log for delete using (
  exists (select 1 from food_items where food_items.id = impact_log.food_item_id and food_items.donor_id = auth.uid())
);

-- ============================================
-- STORAGE BUCKET (food images)
-- NOTE: storage policies were NOT re-read from the live DB; verify later.
-- ============================================
insert into storage.buckets (id, name, public) values ('food-images', 'food-images', true)
on conflict (id) do nothing;

drop policy if exists "Anyone can view food images" on storage.objects;
create policy "Anyone can view food images" on storage.objects
  for select using (bucket_id = 'food-images');

drop policy if exists "Authenticated users can upload food images" on storage.objects;
create policy "Authenticated users can upload food images" on storage.objects
  for insert with check (bucket_id = 'food-images' and auth.role() = 'authenticated');
