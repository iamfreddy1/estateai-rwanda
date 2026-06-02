"""
One-shot SQLite migration.

Adds columns that were introduced AFTER initial DB creation but that
db.create_all() does not retrofit onto existing tables.

Safe to run multiple times — every ALTER is guarded by a PRAGMA check.

Usage (with venv activated):
    python migrate.py
"""
import os
import sqlite3

DB = os.path.join(os.path.dirname(os.path.abspath(__file__)), "estate.db")


def cols(conn, table):
    return {row[1] for row in conn.execute(f"PRAGMA table_info({table})")}


def has_table(conn, table):
    r = conn.execute(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name=?",
        (table,),
    ).fetchone()
    return r is not None


def ensure(conn, table, col, ddl):
    if not has_table(conn, table):
        print(f"  - {table} table doesn't exist yet (Flask will create it on next run)")
        return False
    if col in cols(conn, table):
        return False
    conn.execute(f"ALTER TABLE {table} ADD COLUMN {ddl}")
    print(f"  + added {table}.{col}")
    return True


def main():
    if not os.path.exists(DB):
        print(f"No DB at {DB} — Flask will create a fresh one on next start.")
        return
    print(f"Migrating {DB}")
    n = 0
    with sqlite3.connect(DB) as conn:
        # ---- users: suspended + suspension_reason ----
        n += ensure(conn, "users", "suspended",
                    "suspended BOOLEAN NOT NULL DEFAULT 0")
        n += ensure(conn, "users", "suspension_reason",
                    "suspension_reason VARCHAR(300)")
        # ---- email verification (Phase 2) ----
        n += ensure(conn, "users", "email_verified",
                    "email_verified BOOLEAN NOT NULL DEFAULT 0")


        # ---- properties: rental lifecycle + amenities + featured ----
        n += ensure(conn, "properties", "availability",
                    "availability VARCHAR(20) NOT NULL DEFAULT 'available'")
        n += ensure(conn, "properties", "rented_at",
                    "rented_at DATETIME")
        n += ensure(conn, "properties", "internet",   "internet BOOLEAN")
        n += ensure(conn, "properties", "water",      "water BOOLEAN")
        n += ensure(conn, "properties", "electricity","electricity BOOLEAN")
        n += ensure(conn, "properties", "security",   "security BOOLEAN")
        n += ensure(conn, "properties", "featured",
                    "featured BOOLEAN NOT NULL DEFAULT 0")
        conn.commit()
    print(f"Done — {n} column(s) added.")


if __name__ == "__main__":
    main()
