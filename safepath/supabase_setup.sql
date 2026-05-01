-- ============================================================
-- SAFEPATH DRIVING SCHOOL - SUPABASE DATABASE SETUP
-- Run this entire file in Supabase SQL Editor
-- ============================================================

-- PROFILES TABLE (extends Supabase auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  email text,
  phone text,
  role text check (role in ('manager', 'instructor', 'student')) not null default 'student',
  date_of_birth date,
  licence_type text check (licence_type in ('learner', 'provisional', 'full')),
  qualification text,
  specialties text,
  notes text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- BOOKINGS TABLE
create table if not exists public.bookings (
  id uuid default gen_random_uuid() primary key,
  student_id uuid references public.profiles(id) on delete cascade not null,
  instructor_id uuid references public.profiles(id) on delete cascade not null,
  lesson_datetime timestamptz not null,
  duration_minutes integer default 60,
  location text,
  notes text,
  status text check (status in ('confirmed', 'completed', 'cancelled', 'pending')) default 'confirmed',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- PROGRESS RECORDS TABLE
create table if not exists public.progress_records (
  id uuid default gen_random_uuid() primary key,
  student_id uuid references public.profiles(id) on delete cascade not null,
  instructor_id uuid references public.profiles(id) on delete cascade not null,
  booking_id uuid references public.bookings(id) on delete set null,
  skill_name text not null,
  skill_level text check (skill_level in ('beginner', 'developing', 'proficient')) not null,
  instructor_feedback text,
  date_recorded timestamptz default now(),
  created_at timestamptz default now()
);

-- PAYMENTS TABLE
create table if not exists public.payments (
  id uuid default gen_random_uuid() primary key,
  booking_id uuid references public.bookings(id) on delete cascade not null,
  amount numeric(10,2) not null,
  payment_date timestamptz,
  method text check (method in ('cash', 'card', 'bank transfer', 'other')) default 'cash',
  status text check (status in ('paid', 'unpaid')) default 'unpaid',
  notes text,
  created_at timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) - keeps data private and secure
-- ============================================================

alter table public.profiles enable row level security;
alter table public.bookings enable row level security;
alter table public.progress_records enable row level security;
alter table public.payments enable row level security;

-- Helper function to get current user's role
create or replace function public.get_my_role()
returns text as $$
  select role from public.profiles where id = auth.uid()
$$ language sql security definer stable;

-- PROFILES policies
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Managers and instructors can view all profiles" on public.profiles
  for select using (public.get_my_role() in ('manager', 'instructor'));

create policy "Managers can insert profiles" on public.profiles
  for insert with check (public.get_my_role() = 'manager');

create policy "Managers can update any profile" on public.profiles
  for update using (public.get_my_role() = 'manager');

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- BOOKINGS policies
create policy "Students see own bookings" on public.bookings
  for select using (auth.uid() = student_id);

create policy "Instructors see own bookings" on public.bookings
  for select using (auth.uid() = instructor_id);

create policy "Managers see all bookings" on public.bookings
  for select using (public.get_my_role() = 'manager');

create policy "Managers can insert bookings" on public.bookings
  for insert with check (public.get_my_role() in ('manager', 'student', 'instructor'));

create policy "Students can book lessons" on public.bookings
  for insert with check (auth.uid() = student_id);

create policy "Managers and instructors can update bookings" on public.bookings
  for update using (public.get_my_role() in ('manager', 'instructor') or auth.uid() = student_id);

create policy "Managers can delete bookings" on public.bookings
  for delete using (public.get_my_role() = 'manager');

-- PROGRESS RECORDS policies
create policy "Students see own progress" on public.progress_records
  for select using (auth.uid() = student_id);

create policy "Instructors see their records" on public.progress_records
  for select using (auth.uid() = instructor_id);

create policy "Managers see all progress" on public.progress_records
  for select using (public.get_my_role() = 'manager');

create policy "Instructors and managers can insert progress" on public.progress_records
  for insert with check (public.get_my_role() in ('instructor', 'manager'));

create policy "Instructors and managers can update progress" on public.progress_records
  for update using (public.get_my_role() in ('instructor', 'manager'));

-- PAYMENTS policies
create policy "Students see own payments" on public.payments
  for select using (
    exists (select 1 from public.bookings where id = booking_id and student_id = auth.uid())
  );

create policy "Managers see all payments" on public.payments
  for select using (public.get_my_role() = 'manager');

create policy "Managers can insert payments" on public.payments
  for insert with check (public.get_my_role() = 'manager');

create policy "Managers can update payments" on public.payments
  for update using (public.get_my_role() = 'manager');

-- ============================================================
-- AUTO-CREATE PROFILE TRIGGER
-- Creates a profile row when a new user signs up
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'student')
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- DEMO DATA - creates 3 test accounts
-- NOTE: You must FIRST create these users in Supabase Auth
-- (Authentication > Users > Invite User) with password: SafePath2026!
-- Then run the INSERT statements below with the correct UUIDs.
-- ============================================================

-- After creating users in Auth, run something like:
-- UPDATE public.profiles SET role = 'manager', full_name = 'Sarah Bell' WHERE email = 'manager@safepath.com.au';
-- UPDATE public.profiles SET role = 'instructor', full_name = 'James Chen', qualification = 'Cert IV Driving Instruction' WHERE email = 'instructor@safepath.com.au';
-- The student profile is created automatically.

-- Example bookings (replace UUIDs with real ones from your profiles table):
-- INSERT INTO public.bookings (student_id, instructor_id, lesson_datetime, duration_minutes, location, status)
-- VALUES ('STUDENT_UUID', 'INSTRUCTOR_UUID', now() + interval '2 days', 60, '12 Main St, Parramatta', 'confirmed');
