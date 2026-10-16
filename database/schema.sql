-- ============================================
-- ECOFEAST DATABASE SCHEMA (synced with live Supabase DB, Oct 2026)
-- Run this in Supabase Dashboard > SQL Editor.
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
create policy "Users can view all profiles" on profiles for select using (auth.uid() is not null);

-- NOTE: self-registration with the 'admin' role is allowed for testing only. Disable it before deployment.
drop policy if exists "Users can insert own profile" on profiles;
create policy "Users can insert own profile" on profiles for insert
  with check (auth.uid() = id and is_verified is not true);

drop policy if exists "Users can update own profile" on profiles;
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

drop policy if exists "Admins can update any profile" on profiles;
create policy "Admins can update any profile" on profiles for update using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- Only an admin can change role or is_verified (auth.uid() is null in the SQL Editor, which is allowed).
create or replace function protect_profile_fields() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if new.role is distinct from old.role or new.is_verified is distinct from old.is_verified then
    if not exists (select 1 from profiles where id = auth.uid() and role = 'admin') then
      raise exception 'Only admins can change role or verification status';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_fields_trg on profiles;
create trigger protect_profile_fields_trg before update on profiles
  for each row execute function protect_profile_fields();

-- ---- food_items ----
drop policy if exists "Anyone can view food items" on food_items;
create policy "Anyone can view food items" on food_items for select using (true);

drop policy if exists "Donors can insert own items" on food_items;
create policy "Donors can insert own items" on food_items for insert with check (auth.uid() = donor_id);

drop policy if exists "Donors can update own items" on food_items;
create policy "Donors can update own items" on food_items for update using (auth.uid() = donor_id);

drop policy if exists "Donors can delete own items" on food_items;
create policy "Donors can delete own items" on food_items for delete using (auth.uid() = donor_id);

-- An NGO can only move an 'available' item to 'claimed' (used by Request Pickup).
drop policy if exists "NGOs can update claimed items status" on food_items;
create policy "NGOs can update claimed items status" on food_items for update
  using (
    status = 'available'
    and exists (select 1 from profiles where id = auth.uid() and role = 'ngo')
  )
  with check (status = 'claimed');

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

-- Only the donor of the item can insert its impact row (used by Mark as Picked Up).
drop policy if exists "System can insert impact log" on impact_log;
create policy "System can insert impact log" on impact_log for insert with check (
  exists (select 1 from food_items where food_items.id = impact_log.food_item_id and food_items.donor_id = auth.uid())
);

drop policy if exists "Donors can delete impact log on their items" on impact_log;
create policy "Donors can delete impact log on their items" on impact_log for delete using (
  exists (select 1 from food_items where food_items.id = impact_log.food_item_id and food_items.donor_id = auth.uid())
);

-- ============================================
-- CATEGORIES (food_items)
-- quantity_kg is a legacy column name; it stores the quantity in the unit given by `unit`.
-- ============================================
alter table food_items add column if not exists category text not null default 'food'
  check (category in ('food', 'clothes', 'books', 'household', 'other'));
alter table food_items add column if not exists unit text not null default 'kg'
  check (unit in ('kg', 'pieces'));

-- ============================================
-- NGO REQUIREMENTS (what each NGO currently needs)
-- ============================================
create table if not exists requirements (
  id uuid default gen_random_uuid() primary key,
  ngo_id uuid references profiles(id) on delete cascade not null,
  category text not null check (category in ('food', 'clothes', 'books', 'household', 'other')),
  item_name text not null,
  quantity_required numeric not null check (quantity_required > 0),
  quantity_received numeric not null default 0 check (quantity_received >= 0),
  quantity_remaining numeric generated always as (greatest(quantity_required - quantity_received, 0)) stored,
  unit text not null default 'pieces' check (unit in ('kg', 'pieces')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  status text not null default 'active' check (status in ('active', 'paused', 'closed')),
  expires_at timestamp with time zone,
  description text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists requirements_ngo_idx on requirements (ngo_id);
create index if not exists requirements_active_idx on requirements (status, category);

-- Keeps updated_at current and closes a requirement automatically once it is fully received.
create or replace function requirements_before_write() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  if new.quantity_received >= new.quantity_required then
    new.status = 'closed';
  end if;
  return new;
end;
$$;

drop trigger if exists requirements_before_write_trg on requirements;
create trigger requirements_before_write_trg before insert or update on requirements
  for each row execute function requirements_before_write();

alter table requirements enable row level security;

-- Visible to: the owning NGO, admins, and any logged-in user when the requirement is active,
-- not expired, and the NGO is verified.
drop policy if exists "View requirements" on requirements;
create policy "View requirements" on requirements for select using (
  auth.uid() = ngo_id
  or exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  or (
    auth.uid() is not null
    and status = 'active'
    and (expires_at is null or expires_at > now())
    and exists (select 1 from profiles n where n.id = requirements.ngo_id and n.is_verified = true)
  )
);

drop policy if exists "NGOs can insert own requirements" on requirements;
create policy "NGOs can insert own requirements" on requirements for insert with check (
  auth.uid() = ngo_id
  and exists (select 1 from profiles where id = auth.uid() and role = 'ngo')
);

drop policy if exists "NGOs can update own requirements" on requirements;
create policy "NGOs can update own requirements" on requirements for update
  using (auth.uid() = ngo_id) with check (auth.uid() = ngo_id);

drop policy if exists "NGOs can delete own requirements" on requirements;
create policy "NGOs can delete own requirements" on requirements for delete using (auth.uid() = ngo_id);

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
