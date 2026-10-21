-- =====================================================================
--  PYTAGOTECH BENGKEL — SUPABASE SCHEMA
--  Jalankan seluruh file ini di SQL Editor Supabase (Dashboard > SQL).
--  Aman dijalankan berulang kali (semua perintah pakai IF NOT EXISTS).
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
--  TIPE
-- ---------------------------------------------------------------------
do $$
begin
  create type public.user_role as enum ('admin', 'customer');
exception
  when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------
--  TABEL
-- ---------------------------------------------------------------------

-- Info bengkel (baris tunggal, id = 1)
create table if not exists public.workshop_info (
  id          int primary key default 1 check (id = 1),
  nama        text not null default 'Pytagotech Bengkel',
  alamat      text not null default '',
  kontak      text not null default '',
  email       text not null default '',
  jam_buka    text not null default '',
  hari_buka   text not null default '',
  updated_at  timestamptz not null default now()
);

-- Data customer (master data, sama dengan tabel Customers di portal admin)
create table if not exists public.customers (
  id             bigint primary key,
  kode           text not null default '',
  nama           text not null,
  telepon        text not null default '',
  email          text not null default '',
  alamat         text not null default '',
  catatan        text not null default '',
  registered_at  timestamptz not null default now(),
  registered_via text not null default 'admin',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Data mekanik
create table if not exists public.mechanics (
  id           bigint primary key,
  kode         text not null default '',
  nama         text not null,
  spesialisasi text not null default '',
  telepon      text not null default '',
  status       text not null default 'Aktif',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Stok sparepart
create table if not exists public.spareparts (
  id         bigint primary key,
  kode       text not null default '',
  nama       text not null,
  kategori   text not null default '',
  harga      numeric(12, 2) not null default 0,
  stok       integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Kendaraan + service digabung (satu baris = satu pekerjaan service)
create table if not exists public.services (
  id              bigint primary key,
  kode            text not null default '',
  polisi          text not null,
  jenis           text not null default '',
  merk            text not null default '',
  customer_id     bigint references public.customers (id) on delete set null,
  pelanggan       text not null default '',
  keluhan         text not null default '',
  status          text not null default 'Menunggu',
  mechanic_id     bigint references public.mechanics (id) on delete set null,
  mekanik         text not null default '',
  tanggal_service date,
  biaya_jasa      numeric(12, 2) not null default 0,
  spareparts      jsonb not null default '[]'::jsonb,
  pembayaran      text not null default 'Belum Lunas',
  requested_by    text not null default 'admin',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Jejak perubahan / aktivitas (siapa mengubah apa)
create table if not exists public.activity_logs (
  id          bigint primary key,
  waktu       timestamptz not null default now(),
  aktor       text not null default '',
  role        text not null default 'admin',
  aksi        text not null default '',
  entitas     text not null default '',
  kode        text not null default '',
  keterangan  text not null default '',
  created_at  timestamptz not null default now()
);

-- Profil pengguna (satu baris per akun login)
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  nama        text not null default '',
  telepon     text not null default '',
  email       text not null default '',
  alamat      text not null default '',
  role        public.user_role not null default 'customer',
  customer_id bigint references public.customers (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
--  INDEX
-- ---------------------------------------------------------------------
create index if not exists idx_customers_email on public.customers (lower(email));
create index if not exists idx_customers_kode on public.customers (kode);
create index if not exists idx_services_kode on public.services (kode);
create index if not exists idx_services_customer on public.services (customer_id);
create index if not exists idx_services_status on public.services (status);
create index if not exists idx_profiles_customer on public.profiles (customer_id);
create index if not exists idx_activity_waktu on public.activity_logs (waktu desc);

-- ---------------------------------------------------------------------
--  HELPER FUNCTION
-- ---------------------------------------------------------------------

-- Apakah user yang sedang login adalah admin?
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- Id data customer milik user yang sedang login
create or replace function public.my_customer_id()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select customer_id from public.profiles where id = auth.uid();
$$;

-- Otomatis isi updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end $$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'workshop_info', 'customers', 'mechanics', 'spareparts', 'services', 'profiles',
    'activity_logs'
  ] loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format(
      'create trigger set_updated_at before update on public.%I
       for each row execute function public.set_updated_at()', t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------
--  TRIGGER PENDAFTARAN PENGGUNA
--  Saat ada user baru di auth.users, buat profile + data customer.
--  Kalau email-nya sudah ada di tabel customers, akunnya DIHUBUNGKAN
--  ke customer tersebut (bukan membuat data ganda).
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id bigint;
  v_nama        text;
  v_telepon     text;
  v_alamat      text;
  v_role        public.user_role;
begin
  v_nama    := coalesce(nullif(new.raw_user_meta_data ->> 'nama', ''), split_part(new.email, '@', 1));
  v_telepon := coalesce(new.raw_user_meta_data ->> 'telepon', '');
  v_alamat  := coalesce(new.raw_user_meta_data ->> 'alamat', '');

  -- Email admin demo otomatis jadi role admin
  v_role := case
    when lower(new.email) = 'admin@workshop.com' then 'admin'::public.user_role
    else 'customer'::public.user_role
  end;

  -- Coba hubungkan ke data customer yang sudah ada
  select id into v_customer_id
  from public.customers
  where lower(email) = lower(new.email)
  limit 1;

  -- Customer baru (bukan admin) -> buat data customer
  if v_customer_id is null and v_role = 'customer' then
    insert into public.customers (nama, telepon, email, alamat, registered_via)
    values (v_nama, v_telepon, new.email, v_alamat, 'customer')
    returning id into v_customer_id;
  end if;

  insert into public.profiles (id, nama, telepon, email, alamat, role, customer_id)
  values (new.id, v_nama, v_telepon, new.email, v_alamat, v_role, v_customer_id)
  on conflict (id) do update
    set nama        = excluded.nama,
        telepon     = excluded.telepon,
        email       = excluded.email,
        alamat      = excluded.alamat,
        customer_id = excluded.customer_id,
        updated_at  = now();

  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
--  ROW LEVEL SECURITY
--  Customer hanya boleh melihat & mengubah datanya sendiri.
--  Admin melihat & mengubah semuanya.
-- ---------------------------------------------------------------------
alter table public.workshop_info enable row level security;
alter table public.activity_logs  enable row level security;
alter table public.customers    enable row level security;
alter table public.mechanics    enable row level security;
alter table public.spareparts   enable row level security;
alter table public.services     enable row level security;
alter table public.profiles     enable row level security;

-- Helper: hapus policy lama supaya file ini bisa dijalankan ulang
do $$
declare
  t text;
  p text;
begin
  foreach t in array array[
    'workshop_info', 'customers', 'mechanics', 'spareparts', 'services', 'profiles',
    'activity_logs'
  ] loop
    for p in
      select policyname from pg_policies
      where schemaname = 'public' and tablename = t
    loop
      execute format('drop policy if exists %I on public.%I', p, t);
    end loop;
  end loop;
end $$;

-- CUSTOMERS
create policy "customers select" on public.customers for select
  using (public.is_admin() or id = public.my_customer_id());
create policy "customers insert admin" on public.customers for insert
  with check (public.is_admin());
create policy "customers update" on public.customers for update
  using (public.is_admin() or id = public.my_customer_id())
  with check (public.is_admin() or id = public.my_customer_id());
create policy "customers delete admin" on public.customers for delete
  using (public.is_admin());

-- SERVICES
create policy "services select" on public.services for select
  using (public.is_admin() or customer_id = public.my_customer_id());
create policy "services insert" on public.services for insert
  with check (public.is_admin() or customer_id = public.my_customer_id());
create policy "services update" on public.services for update
  using (public.is_admin() or customer_id = public.my_customer_id())
  with check (public.is_admin() or customer_id = public.my_customer_id());
create policy "services delete admin" on public.services for delete
  using (public.is_admin());

-- MECHANICS (semua user terbaca, hanya admin yang mengubah)
create policy "mechanics select" on public.mechanics for select to authenticated
  using (true);
create policy "mechanics insert" on public.mechanics for insert
  with check (public.is_admin());
create policy "mechanics update" on public.mechanics for update
  using (public.is_admin()) with check (public.is_admin());
create policy "mechanics delete" on public.mechanics for delete
  using (public.is_admin());

-- SPAREPARTS
create policy "spareparts select" on public.spareparts for select to authenticated
  using (true);
create policy "spareparts insert" on public.spareparts for insert
  with check (public.is_admin());
create policy "spareparts update" on public.spareparts for update
  using (public.is_admin()) with check (public.is_admin());
create policy "spareparts delete" on public.spareparts for delete
  using (public.is_admin());

-- WORKSHOP INFO
create policy "info select" on public.workshop_info for select to authenticated
  using (true);
create policy "info insert" on public.workshop_info for insert
  with check (public.is_admin());
create policy "info update" on public.workshop_info for update
  using (public.is_admin()) with check (public.is_admin());
create policy "info delete" on public.workshop_info for delete
  using (public.is_admin());

-- ACTIVITY LOGS (hanya admin yang boleh membaca)
create policy "activity_logs select admin" on public.activity_logs for select
  using (public.is_admin());
create policy "activity_logs insert admin" on public.activity_logs for insert
  with check (public.is_admin());
create policy "activity_logs update admin" on public.activity_logs for update
  using (public.is_admin()) with check (public.is_admin());
create policy "activity_logs delete admin" on public.activity_logs for delete
  using (public.is_admin());

-- PROFILES
create policy "profiles select" on public.profiles for select
  using (public.is_admin() or id = auth.uid());
create policy "profiles update" on public.profiles for update
  using (public.is_admin() or id = auth.uid())
  with check (public.is_admin() or id = auth.uid());
create policy "profiles insert admin" on public.profiles for insert
  with check (public.is_admin());
create policy "profiles delete admin" on public.profiles for delete
  using (public.is_admin());

-- ---------------------------------------------------------------------
--  DATA CONTOH (opsional)
--  Jalankan blok ini kalau ingin data demo langsung di Supabase.
-- ---------------------------------------------------------------------
insert into public.workshop_info (id, nama, alamat, kontak, email, jam_buka, hari_buka)
values (1, 'Pytagotech Bengkel', 'Jl. Merdeka No. 10, Bandung', '0812-3456-7890',
        'halo@pytagotech.co.id', '08.00 - 17.00 WIB', 'Senin - Sabtu')
on conflict (id) do nothing;

insert into public.customers (id, kode, nama, telepon, email, alamat, catatan, registered_via)
values
  (6, 'cst-001', 'Budi Setiawan', '08239389048', 'budisetiawan@gmail.com', 'Jl. Karlos No. 12, Bandung', 'Mobilitas tinggi, rutin servis tiap 5.000 km.', 'admin'),
  (7, 'cst-002', 'Rina Puspita', '081312345678', 'rina.puspita@email.com', 'Jl. Merdeka No. 45, Bekasi', 'Data contoh customer.', 'admin'),
  (8, 'cst-003', 'Dimas Pratama', '081398765432', 'dimas.pratama@email.com', 'Jl. Sudirman No. 8, Jakarta', 'Perusahaan, butuh faktur.', 'admin')
on conflict (id) do nothing;

insert into public.mechanics (id, kode, nama, spesialisasi, telepon, status)
values
  (1, 'mek-001', 'Andi Saputra', 'Mesin', '081234567890', 'Aktif'),
  (2, 'mek-002', 'Siti Nurhaliza', 'Kelistrikan', '081298765432', 'Aktif'),
  (3, 'mek-003', 'Agus Salim', 'Suspensi & Ban', '081377778888', 'Izin')
on conflict (id) do nothing;

insert into public.spareparts (id, kode, nama, kategori, harga, stok)
values
  (1, 'spp-001', 'Oli Engine 5W-30', 'Oli & Cairan', 45000, 24),
  (2, 'spp-002', 'Kampas Rem Depan', 'Rem', 120000, 12),
  (3, 'spp-003', 'Busi Spark Plug', 'Mesin', 35000, 40),
  (4, 'spp-004', 'Ban 185/55 R14', 'Ban', 650000, 8)
on conflict (id) do nothing;

insert into public.services (
  id, kode, polisi, jenis, merk, customer_id, pelanggan, keluhan, status,
  mechanic_id, mekanik, tanggal_service, biaya_jasa, spareparts, pembayaran, requested_by
)
values
  (1, 'knd-001', 'B 1234 KZ', 'Mobil', 'Toyota Avanza', 6, 'Budi Setiawan', 'Ganti oli + rem depan', 'Dikerjakan',
   1, 'Andi Saputra', current_date, 150000,
   '[{"sparepartId":1,"nama":"Oli Engine 5W-30","harga":45000,"jumlah":4},{"sparepartId":2,"nama":"Kampas Rem Depan","harga":120000,"jumlah":1}]'::jsonb,
   'Belum Lunas', 'admin'),
  (2, 'knd-002', 'B 5678 XYZ', 'Motor', 'Honda Beat', 6, 'Budi Setiawan', 'Ganti ban depan + servis rutin', 'Selesai',
   2, 'Siti Nurhaliza', current_date - 12, 75000,
   '[{"sparepartId":4,"nama":"Ban 185/55 R14","harga":650000,"jumlah":2}]'::jsonb,
   'Lunas', 'admin'),
  (3, 'knd-003', 'B 9012 ULT', 'Mobil', 'Honda Brio', 7, 'Rina Puspita', 'Kering AC + belt timing', 'Menunggu',
   null, '', current_date, 200000, '[]'::jsonb, 'Belum Lunas', 'admin'),
  (4, 'knd-004', 'B 3456 JKT', 'Mobil', 'Mitsubishi Xpander', 8, 'Dimas Pratama', 'Gantioli + tune up', 'Quality Check',
   1, 'Andi Saputra', current_date, 120000,
   '[{"sparepartId":1,"nama":"Oli Engine 5W-30","harga":45000,"jumlah":3}]'::jsonb,
   'Belum Lunas', 'admin')
on conflict (id) do nothing;

-- =====================================================================
--  CARA MENJADIKAN SEBUAH AKUN MENJADI ADMIN
--  Jalankan perintah ini di SQL Editor setelah akunnya dibuat:
--
--    update public.profiles
--    set role = 'admin'
--    where email = 'admin@workshop.com';
--
--  (akun dengan email admin@workshop.com otomatis jadi admin)
-- =====================================================================

-- ---------------------------------------------------------------------
--  KOLOM TAMBAHAN UNTUK TABEL YANG SUDAH ADA
--  Jalankan sekali kalau tabel dibuat sebelum versi ini.
-- ---------------------------------------------------------------------
alter table public.customers  add column if not exists kode text not null default '';
alter table public.mechanics  add column if not exists kode text not null default '';
alter table public.spareparts add column if not exists kode text not null default '';
alter table public.services   add column if not exists kode text not null default '';
alter table public.workshop_info add column if not exists email     text not null default '';
alter table public.workshop_info add column if not exists jam_buka  text not null default '';
alter table public.workshop_info add column if not exists hari_buka text not null default '';
