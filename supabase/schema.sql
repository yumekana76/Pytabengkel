-- =========================================================
-- MENJADIKAN AKUN SEBAGAI ADMIN
-- Jalankan hanya melalui SQL Editor oleh pemilik database.
-- Pastikan UUID milik akun yang benar.
-- =========================================================

-- Periksa daftar admin yang ada:
-- SELECT id, email, role
-- FROM public.profiles
-- WHERE role = 'admin';

-- Setelah memverifikasi akun, gunakan UUID akun tersebut:
-- UPDATE public.profiles
-- SET role = 'admin'
-- WHERE id = 'UUID-AKUN-TERVERIFIKASI'::uuid;
-- ==========================================================

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
  nama        text not null default 'Pytabengkel',
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

-- Data mekanik. Nomor telepon TIDAK ada di tabel ini — disimpan di
-- mechanics_private (hanya admin) supaya portal customer tidak bisa
-- melihat nomor telepon mekanik.
create table if not exists public.mechanics (
  id           bigint primary key,
  kode         text not null default '',
  nama         text not null,
  spesialisasi text not null default '',
  status       text not null default 'Aktif',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Data privat mekanik: nomor telepon. RLS admin-only (lihat bagian RLS).
create table if not exists public.mechanics_private (
  mechanic_id bigint primary key references public.mechanics (id) on delete cascade,
  telepon     text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
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

-- Ulasan / rating customer untuk service yang sudah selesai.
-- Satu service maksimal satu ulasan (dijaminkan oleh unique pada service_id).
create table if not exists public.reviews (
  id          bigint primary key,
  kode        text not null default '',
  service_id  bigint not null unique references public.services (id) on delete cascade,
  customer_id bigint references public.customers (id) on delete set null,
  rating      integer not null check (rating between 1 and 5),
  komentar    text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Booking janji servis: customer mengajukan tanggal+keluhan,
-- admin mengonfirmasi / menolak. Status: Menunggu, Dikonfirmasi,
-- Ditolak, Dibatalkan (customer hanya boleh membatalkan yang Menunggu).
create table if not exists public.bookings (
  id          bigint primary key,
  customer_id bigint not null references public.customers (id) on delete cascade,
  polisi      text not null default '',
  kendaraan   text not null default '',
  keluhan     text not null default '',
  tanggal     date not null,
  jam         text not null default '',
  status      text not null default 'Menunggu',
  catatan     text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Foto service (diunggah admin lewat Supabase Storage, bucket
-- "service-photos"). path = object di storage, url = URL publik.
create table if not exists public.service_photos (
  id         bigint generated always as identity primary key,
  service_id bigint not null references public.services (id) on delete cascade,
  path       text not null,
  url        text not null,
  keterangan text not null default '',
  created_at timestamptz not null default now()
);

-- Log error JavaScript dari sisi client (js/error-logger.js).
-- Insert terbuka (siapa pun boleh melaporkan), baca & hapus hanya admin.
create table if not exists public.client_errors (
  id         bigint generated always as identity primary key,
  pesan      text not null,
  stack      text not null default '',
  halaman    text not null default '',
  user_agent text not null default '',
  user_id    uuid default auth.uid(),
  created_at timestamptz not null default now()
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
create index if not exists idx_reviews_customer on public.reviews (customer_id);
create index if not exists idx_profiles_customer on public.profiles (customer_id);
create index if not exists idx_activity_waktu on public.activity_logs (waktu desc);
create index if not exists idx_bookings_customer on public.bookings (customer_id);
create index if not exists idx_bookings_status on public.bookings (status);
create index if not exists idx_bookings_tanggal on public.bookings (tanggal desc);
create index if not exists idx_photos_service on public.service_photos (service_id);
create index if not exists idx_client_errors_waktu on public.client_errors (created_at desc);

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

-- Bolehkah user yang sedang login menilai service ini?
-- Syarat: service miliknya sendiri DAN sudah selesai.
-- Dipakai policy INSERT/UPDATE reviews supaya ulasan tidak bisa
-- dilekatkan ke service orang lain atau service yang belum selesai.
create or replace function public.can_review(p_service_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.services s
    where s.id = p_service_id
      and s.customer_id = public.my_customer_id()
      and s.status = 'Selesai'
  );
$$;

-- ---------------------------------------------------------------------
--  PENJAGA KOLOM SENSITIF (trigger)
--  RLS mengatur BARIS, bukan KOLOM — tanpa trigger ini customer bisa
--  mengubah kolom paling sensitif di baris miliknya sendiri:
--    * profiles.role      -> eskalasi diri jadi admin
--    * profiles.customer_id -> membajak data customer lain
--    * services.pembayaran/status/biaya -> memalsukan pembayaran
-- ---------------------------------------------------------------------

create or replace function public.guard_profile_write()
returns trigger
language plpgsql
as $$
begin
  /* Admin & operasi SQL langsung (tanpa JWT) lewat. */
  if auth.uid() is not null and not public.is_admin() then
    if new.id is distinct from old.id
       or new.customer_id is distinct from old.customer_id
       or new.role is distinct from old.role then
      raise exception 'Anda tidak boleh mengubah role atau tautan data customer';
    end if;
  end if;
  return new;
end $$;

create or replace function public.guard_service_write()
returns trigger
language plpgsql
as $$
begin
  /* Admin (JWT admin) dan operasi SQL langsung (tanpa JWT) bebas. */
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    /* Request dari customer SELALU dimulai sebagai antrean baru. */
    new.status       := 'Menunggu';
    new.pembayaran   := 'Belum Lunas';
    new.biaya_jasa   := 0;
    new.spareparts   := '[]'::jsonb;
    new.mechanic_id  := null;
    new.mekanik      := '';
    new.requested_by := 'customer';
    return new;
  end if;

  /* UPDATE: kolom sensitif dikembalikan ke nilai lama (bukan error)
     supaya simpanan cache usang di portal customer tetap berhasil —
     nilai server yang menang, upaya pemalsuan diabaikan diam-diam. */
  new.status      := old.status;
  new.pembayaran  := old.pembayaran;
  new.biaya_jasa  := old.biaya_jasa;
  new.spareparts  := old.spareparts;
  new.mechanic_id := old.mechanic_id;
  new.mekanik     := old.mekanik;
  new.customer_id := old.customer_id;
  return new;
end $$;

-- Penjaga booking: customer hanya bisa membuat booking berstatus
-- "Menunggu" dan (setelah itu) membatalkannya selama masih Menunggu.
-- Status lain + seluruh kolom hanya diubah admin.
create or replace function public.guard_booking_write()
returns trigger
language plpgsql
as $$
begin
  /* Admin (JWT admin) dan operasi SQL langsung (tanpa JWT) bebas. */
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.status  := 'Menunggu';
    new.catatan := '';
    return new;
  end if;

  /* UPDATE oleh customer: hanya boleh membatalkan booking miliknya
     yang masih Menunggu, tanpa mengubah data lain sama sekali. */
  if old.status <> 'Menunggu'
     or new.status <> 'Dibatalkan'
     or new.polisi    is distinct from old.polisi
     or new.kendaraan is distinct from old.kendaraan
     or new.keluhan   is distinct from old.keluhan
     or new.tanggal   is distinct from old.tanggal
     or new.jam       is distinct from old.jam
     or new.catatan   is distinct from old.catatan
     or new.customer_id is distinct from old.customer_id then
    raise exception 'Booking hanya bisa dibatalkan selama masih menunggu';
  end if;

  return new;
end $$;

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
    'workshop_info', 'customers', 'mechanics', 'mechanics_private', 'spareparts',
    'services', 'profiles', 'activity_logs', 'reviews', 'bookings'
  ] loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format(
      'create trigger set_updated_at before update on public.%I
       for each row execute function public.set_updated_at()', t
    );
  end loop;
end $$;

-- Pasang penjaga kolom sensitif (lihat komentar di guard_* di atas)
drop trigger if exists guard_profile_write on public.profiles;
create trigger guard_profile_write
  before update on public.profiles
  for each row execute function public.guard_profile_write();

drop trigger if exists guard_service_write on public.services;
create trigger guard_service_write
  before insert or update on public.services
  for each row execute function public.guard_service_write();

drop trigger if exists guard_booking_write on public.bookings;
create trigger guard_booking_write
  before insert or update on public.bookings
  for each row execute function public.guard_booking_write();

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

-- Semua pendaftaran baru dimulai sebagai customer.
-- Admin harus ditetapkan secara manual oleh pemilik database.
v_role := 'customer'::public.user_role;

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
alter table public.mechanics_private enable row level security;
alter table public.spareparts   enable row level security;
alter table public.services     enable row level security;
alter table public.reviews      enable row level security;
alter table public.profiles     enable row level security;
alter table public.bookings     enable row level security;
alter table public.service_photos enable row level security;
alter table public.client_errors enable row level security;

-- Helper: hapus policy lama supaya file ini bisa dijalankan ulang
do $$
declare
  t text;
  p text;
begin
  foreach t in array array[
    'workshop_info', 'customers', 'mechanics', 'mechanics_private', 'spareparts',
    'services', 'profiles', 'activity_logs', 'reviews', 'bookings',
    'service_photos', 'client_errors'
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

-- REVIEWS — customer hanya boleh menilai service miliknya yang sudah
-- selesai (can_review), hanya membaca ulasannya sendiri; admin bebas.
create policy "reviews select" on public.reviews for select to authenticated
  using (
    public.is_admin()
    or customer_id = public.my_customer_id()
    or exists (
      select 1 from public.services s
      where s.id = service_id
        and s.customer_id = public.my_customer_id()
    )
  );
create policy "reviews insert" on public.reviews for insert
  with check (
    public.is_admin()
    or (customer_id = public.my_customer_id() and public.can_review(service_id))
  );
create policy "reviews update" on public.reviews for update
  using (public.is_admin() or customer_id = public.my_customer_id())
  with check (
    public.is_admin()
    or (customer_id = public.my_customer_id() and public.can_review(service_id))
  );
create policy "reviews delete" on public.reviews for delete
  using (public.is_admin() or customer_id = public.my_customer_id());

-- MECHANICS (semua user terbaca, hanya admin yang mengubah)
create policy "mechanics select" on public.mechanics for select to authenticated
  using (true);
create policy "mechanics insert" on public.mechanics for insert
  with check (public.is_admin());
create policy "mechanics update" on public.mechanics for update
  using (public.is_admin()) with check (public.is_admin());
create policy "mechanics delete" on public.mechanics for delete
  using (public.is_admin());

-- MECHANICS_PRIVATE (nomor telepon mekanik) — HANYA admin yang boleh
-- membaca/mengubah; portal customer tidak pernah melihat nomor telepon.
create policy "mech_private select admin" on public.mechanics_private for select
  using (public.is_admin());
create policy "mech_private insert admin" on public.mechanics_private for insert
  with check (public.is_admin());
create policy "mech_private update admin" on public.mechanics_private for update
  using (public.is_admin()) with check (public.is_admin());
create policy "mech_private delete admin" on public.mechanics_private for delete
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

-- BOOKINGS — customer melihat/mengajukan miliknya sendiri; admin semua.
-- (Ditambah guard trigger guard_booking_write untuk status & kolom.)
create policy "bookings select" on public.bookings for select
  using (public.is_admin() or customer_id = public.my_customer_id());
create policy "bookings insert" on public.bookings for insert
  with check (
    public.is_admin()
    or (customer_id = public.my_customer_id() and status = 'Menunggu')
  );
create policy "bookings update" on public.bookings for update
  using (public.is_admin() or customer_id = public.my_customer_id())
  with check (public.is_admin() or customer_id = public.my_customer_id());
create policy "bookings delete admin" on public.bookings for delete
  using (public.is_admin());

-- SERVICE_PHOTOS — customer hanya melihat foto service miliknya;
-- unggah/hapus hanya admin.
create policy "photos select" on public.service_photos for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.services s
      where s.id = service_id
        and s.customer_id = public.my_customer_id()
    )
  );
create policy "photos insert admin" on public.service_photos for insert
  with check (public.is_admin());
create policy "photos delete admin" on public.service_photos for delete
  using (public.is_admin());

-- CLIENT_ERRORS — siapa pun (termasuk anon di halaman login) boleh
-- MELAPORKAN error; hanya admin yang boleh membaca/membersihkan.
create policy "client_errors insert" on public.client_errors for insert
  with check (true);
create policy "client_errors select admin" on public.client_errors for select
  to authenticated
  using (public.is_admin());
create policy "client_errors delete admin" on public.client_errors for delete
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------
--  INFO BENGKEL DEFAULT
--  Hanya info toko (bisa diubah admin di halaman Pengaturan).
--  Data customer / service / mekanik / sparepart TIDAK disertakan —
--  masukkan lewat portal admin.
-- ---------------------------------------------------------------------
insert into public.workshop_info (id, nama, alamat, kontak, email, jam_buka, hari_buka)
values (1, 'Pytabengkel', 'Jl. Merdeka No. 10, Bandung', '0812-3456-7890',
        'halo@pytabengkel.co.id', '08.00 - 17.00 WIB', 'Senin - Sabtu')
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
--  TESTIMONI PUBLIK
--  Satu-satunya pintu data reviews untuk pengunjung yang BELUM login
--  (halaman index). security definer + hanya mengembalikan nama depan,
--  rating, komentar, dan tanggal — nomor/email/alamat/alat tidak pernah
--  keluar. Pendekatan ini membuat tabel reviews tetap tertutup rapat
--  oleh RLS.
-- ---------------------------------------------------------------------
--  (drop dulu supaya signature boleh berubah dari versi sebelumnya;
--   aman — fungsi tidak menyimpan state dan langsung dibuat ulang di bawah)
drop function if exists public.public_reviews();

create or replace function public.public_reviews()
returns table (
  nama       text,
  rating     integer,
  komentar   text,
  created_at timestamptz,
  total      integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    nullif(split_part(coalesce(nullif(c.nama, ''), 'Pelanggan'), ' ', 1), '') as nama,
    r.rating::integer,
    r.komentar,
    r.created_at,
    /* Total SELURUH ulasan (dihitung sebelum limit) — dipakai halaman
       login supaya angka "N ulasan" tetap benar walau datanya ratusan. */
    (count(*) over ())::integer as total
  from public.reviews r
  left join public.services s on s.id = r.service_id
  left join public.customers c on c.id = coalesce(r.customer_id, s.customer_id)
  order by r.created_at desc
  limit 60;
$$;

grant execute on function public.public_reviews() to anon, authenticated;

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

-- ---------------------------------------------------------------------
--  MIGRASI: telepon mekanik pindah ke mechanics_private (admin-only)
--  Dijalankan otomatis saat kolom lama masih ada; kalau sudah tidak
--  ada (install baru / sudah pernah migrasi) langsung dilewati.
-- ---------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'mechanics'
      and column_name  = 'telepon'
  ) then
    insert into public.mechanics_private (mechanic_id, telepon)
    select id, coalesce(telepon, '') from public.mechanics
    on conflict (mechanic_id) do nothing;

    alter table public.mechanics drop column telepon;
  end if;
end $$;

-- ---------------------------------------------------------------------
--  BUCKET FOTO SERVICE (Supabase Storage)
--  Bucket publik supaya <img> bisa memuatnya langsung; unggah & hapus
--  object tetap dijaga policy admin-only di bawah.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('service-photos', 'service-photos', true)
on conflict (id) do nothing;

drop policy if exists "service photos upload" on storage.objects;
create policy "service photos upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'service-photos' and public.is_admin());

drop policy if exists "service photos delete" on storage.objects;
create policy "service photos delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'service-photos' and public.is_admin());

drop policy if exists "service photos select" on storage.objects;
create policy "service photos select" on storage.objects
  for select to authenticated
  using (bucket_id = 'service-photos');

-- ---------------------------------------------------------------------
--  SUPABASE REALTIME
--  Aktifkan perubahan baris pada tabel yang dipakai notifikasi live
--  (js/db.js -> dbSubscribeRealtime). Idempoten: hanya ditambahkan
--  kalau belum ada di publication.
-- ---------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['services', 'bookings', 'reviews'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname    = 'supabase_realtime'
        and schemaname = 'public'
        and tablename  = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
