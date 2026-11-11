#!/usr/bin/env python3
"""Menjalankan supabase/schema.sql ke database Supabase yang sudah di-link.

Cara pakai:
    python3 scripts/apply-schema.py                # eksekusi (satu transaksi)
    python3 scripts/apply-schema.py --dry-run      # cek koneksi & rencana saja
    python3 scripts/apply-schema.py --verify-only  # hanya verifikasi object

Kredensial diambil dari (tidak pernah dari argumen supaya tidak masuk
riwayat shell / log):
    SUPABASE_DB_PASSWORD      -> file .env di root project (atau environment)
    supabase/.temp/pooler-url -> host/port/user (hasil `supabase link`)

Sifat eksekusi:
    - SELURUH schema.sql dijalankan dalam SATU transaksi -> kalau ada satu
      statement gagal, tidak ada yang tersimpan (all-or-nothing).
    - schema.sql bersifat idempoten (create ... if not exists / create or
      replace), jadi aman dijalankan berulang.
    - Setelah commit dikirim `notify pgrst, 'reload schema'` agar cache
      PostgREST segera memuat ulang.
    - Password tidak pernah dicetak ke layar.
"""

from __future__ import annotations

import argparse
import os
import pathlib
import re
import sys
from urllib.parse import quote_plus

ROOT = pathlib.Path(__file__).resolve().parent.parent
ENV_FILE = ROOT / ".env"
POOLER_FILE = ROOT / "supabase" / ".temp" / "pooler-url"
SCHEMA_FILE = ROOT / "supabase" / "schema.sql"

SQL_TABLES = """
    select table_name from information_schema.tables
    where table_schema = 'public' and table_type = 'BASE TABLE'
"""

SQL_FUNCS = """
    select p.proname from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
"""


def load_env(path: pathlib.Path) -> dict[str, str]:
    """Parser .env sederhana (KEY=VALUE, dukung kutip & komentar)."""
    values: dict[str, str] = {}
    if not path.exists():
        return values
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", key):
            continue
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
            value = value[1:-1]
        values[key] = value
    return values


def expected_objects(schema_sql: str) -> tuple[set[str], set[str]]:
    tables = set(
        re.findall(
            r"create table(?: if not exists)?\s+(?:public\.)?([a-z0-9_]+)",
            schema_sql,
            re.I,
        )
    )
    funcs = set(
        re.findall(
            r"create or replace function\s+(?:public\.)?([a-z0-9_]+)",
            schema_sql,
            re.I,
        )
    )
    return tables, funcs


def build_dsn(pooler: str, password: str) -> str | None:
    # Format pooler Supabase: postgresql://<user>@<host>:<port>/<db>
    # User-nya "postgres.<project-ref>", jadi sisipkan password tepat
    # sebelum "@" pertama (bukan cari string "://postgres@").
    match = re.match(r"^(?P<scheme>[^:]+://)(?P<user>[^@]+)@(?P<rest>.+)$", pooler)
    if not match:
        return None
    dsn = (
        f"{match.group('scheme')}{match.group('user')}:{quote_plus(password)}"
        f"@{match.group('rest')}"
    )
    if "sslmode=" not in dsn:
        dsn += ("&" if "?" in dsn else "?") + "sslmode=require"
    return dsn


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="cek koneksi saja, jangan eksekusi")
    parser.add_argument("--verify-only", action="store_true", help="jangan eksekusi, hanya verifikasi")
    args = parser.parse_args()
    skip_execute = args.dry_run or args.verify_only

    try:
        import psycopg
    except ImportError:
        print("psycopg belum terpasang. Jalankan:")
        print('  python3 -m venv .venv && .venv/bin/pip install "psycopg[binary]"')
        return 1

    env = load_env(ENV_FILE)
    password = env.get("SUPABASE_DB_PASSWORD") or os.environ.get(
        "SUPABASE_DB_PASSWORD", ""
    )
    if not password:
        print("SUPABASE_DB_PASSWORD belum diisi.")
        print(f"  Isi di {ENV_FILE} (Project Settings -> Database -> Database password)")
        return 1
    if not POOLER_FILE.exists():
        print(f"File tidak ditemukan: {POOLER_FILE} (jalankan `supabase link` dulu)")
        return 1
    if not SCHEMA_FILE.exists():
        print(f"File tidak ditemukan: {SCHEMA_FILE}")
        return 1

    dsn = build_dsn(POOLER_FILE.read_text(encoding="utf-8").strip(), password)
    if not dsn:
        print("Format pooler-url tidak dikenal.")
        return 1

    schema_sql = SCHEMA_FILE.read_text(encoding="utf-8")
    want_tables, want_funcs = expected_objects(schema_sql)

    try:
        conn = psycopg.connect(dsn, connect_timeout=20)
    except Exception as error:  # noqa: BLE001 - pesan koneksi bervariasi
        print(f"Koneksi gagal: {type(error).__name__}: {error}")
        return 1

    result = 0
    try:
        # Satu blok transaksi: eksekusi + verifikasi + notify ikut commit
        # bersama; kegagalan di tengah -> rollback total.
        with conn:
            with conn.cursor() as cur:
                cur.execute("select version()")
                print("Terhubung:", (cur.fetchone()[0] or "")[:60], "…")

                if skip_execute:
                    mode = "dry-run" if args.dry_run else "verify-only"
                    print(f"Mode {mode}: schema.sql TIDAK dijalankan.")
                else:
                    print(
                        f"Menjalankan {SCHEMA_FILE.name} ({len(schema_sql)} char) "
                        "dalam satu transaksi …"
                    )
                    cur.execute(schema_sql)  # multi-statement, satu transaksi
                    print("✅ schema.sql selesai (di-commit di akhir blok).")

                cur.execute(SQL_TABLES)
                have_tables = {r[0] for r in cur.fetchall()}
                cur.execute(SQL_FUNCS)
                have_funcs = {r[0] for r in cur.fetchall()}

            missing_tables = sorted(want_tables - have_tables)
            missing_funcs = sorted(want_funcs - have_funcs)

            print("\nVerifikasi object vs schema.sql:")
            print(f"  tabel  : {len(want_tables) - len(missing_tables)}/{len(want_tables)} ada")
            print(f"  fungsi : {len(want_funcs) - len(missing_funcs)}/{len(want_funcs)} ada")
            if missing_tables:
                print("  ❌ tabel hilang :", ", ".join(missing_tables))
            if missing_funcs:
                print("  ❌ fungsi hilang:", ", ".join(missing_funcs))
            if not missing_tables and not missing_funcs:
                print("  ✅ semua object sesuai schema.sql")
            else:
                result = 2

            if not skip_execute and result == 0:
                with conn.cursor() as cur:
                    cur.execute("notify pgrst, 'reload schema'")
                print("NOTIFY pgrst 'reload schema' terkirim.")
    except Exception as error:  # noqa: BLE001
        # psycopg: kegagalan di dalam `with conn` -> rollback otomatis.
        print("❌ GAGAL — transaksi di-rollback, tidak ada perubahan tersimpan.")
        print(f"   {type(error).__name__}: {error}")
        return 1
    finally:
        try:
            conn.close()
        except Exception:  # noqa: BLE001
            pass

    return result


if __name__ == "__main__":
    sys.exit(main())
