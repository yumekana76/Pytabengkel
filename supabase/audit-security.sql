-- Audit keamanan bagian A (satu result set supaya CLI menampilkan semua)
select '1_tanpa_rls' as bagian,
       tablename::text as item,
       rowsecurity::text as nilai
from pg_tables
where schemaname = 'public' and rowsecurity = false

union all
select '2_kebijakan', tablename, count(*)::text
from pg_policies where schemaname = 'public'
group by tablename

union all
select '3_fungsi_definer', p.proname, p.provolatile::text
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.prosecdef

union all
select '4_grant_tabel', table_name || '.' || privilege_type, grantee
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('profiles', 'reviews', 'services')

union all
select '5_grant_kolom_profiles', column_name || '.' || privilege_type, grantee
from information_schema.column_privileges
where table_schema = 'public' and table_name = 'profiles'

order by 1, 2, 3;
