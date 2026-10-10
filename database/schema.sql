-- ============================================
-- ECOFEAST DATABASE SCHEMA
-- Isko Supabase Dashboard > SQL Editor me paste karke RUN karo
-- ============================================

-- 1. PROFILES TABLE (Donor / NGO / Volunteer info)
-- Supabase ke built-in auth.users table se linked hai
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null,
  role text not null check (role in ('donor', 'ngo', 'volunteer')),
  organization_name text,
  phone text,
  latitude double precision,
  longitude double precision,
  address text,
  created_at timestamp with time zone default now()
);

-- 2. FOOD_ITEMS TABLE (donor jo food upload karega)
create table food_items (
  id uuid default gen_random_uuid() primary key,
  donor_id uuid references profiles(id) not null,
  food_name text not null,
  quantity_kg numeric not null,
  image_url text,
  freshness_score numeric,        -- AI se aayega (0-100)
  placement_readiness_index numeric, -- calculated field
  status text default 'available' check (status in ('available', 'claimed', 'delivered', 'expired')),
  cooked_time timestamp with time zone,
  expiry_estimate timestamp with time zone,
  created_at timestamp with time zone default now()
);

-- 3. CLAIMS TABLE (NGO ne kaunsa item claim kiya)
create table claims (
  id uuid default gen_random_uuid() primary key,
  food_item_id uuid references food_items(id) not null,
  ngo_id uuid references profiles(id) not null,
  distance_km numeric,
  match_score numeric,
  status text default 'pending' check (status in ('pending', 'accepted', 'picked_up', 'cancelled')),
  created_at timestamp with time zone default now()
);

-- 4. IMPACT_LOG TABLE (sustainability dashboard ke liye)
create table impact_log (
  id uuid default gen_random_uuid() primary key,
  food_item_id uuid references food_items(id) not null,
  meals_saved numeric,
  co2_saved_kg numeric,
  created_at timestamp with time zone default now()
);

-- ============================================
-- ROW LEVEL SECURITY (RLS) - zaroori hai security ke liye
-- ============================================
alter table profiles enable row level security;
alter table food_items enable row level security;
alter table claims enable row level security;
alter table impact_log enable row level security;

-- Har user apna profile dekh/edit kar sakta hai
create policy "Users can view all profiles" on profiles for select using (true);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);

-- Food items sab dekh sakte hain, sirf donor apna add/edit kar sakta hai
create policy "Anyone can view food items" on food_items for select using (true);
create policy "Donors can insert own items" on food_items for insert with check (auth.uid() = donor_id);
create policy "Donors can update own items" on food_items for update using (auth.uid() = donor_id);

-- Claims - NGO apna claim insert kar sakta hai, sab dekh sakte hain
create policy "Anyone can view claims" on claims for select using (true);
create policy "NGOs can insert claims" on claims for insert with check (auth.uid() = ngo_id);
create policy "NGOs can update own claims" on claims for update using (auth.uid() = ngo_id);

create policy "Anyone can view impact log" on impact_log for select using (true);
create policy "System can insert impact log" on impact_log for insert with check (true);

-- ============================================
-- STORAGE BUCKET (food images ke liye)
-- Ye Supabase Dashboard > Storage me manually bhi bana sakte ho,
-- ya niche wali query se bhi ban jayega
-- ============================================
insert into storage.buckets (id, name, public) values ('food-images', 'food-images', true)
on conflict (id) do nothing;

create policy "Anyone can view food images" on storage.objects
  for select using (bucket_id = 'food-images');
create policy "Authenticated users can upload food images" on storage.objects
  for insert with check (bucket_id = 'food-images' and auth.role() = 'authenticated');
