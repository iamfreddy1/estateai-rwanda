"""
Cross-dialect schema migration: works for both SQLite (dev) and PostgreSQL (prod).
Idempotent - every ALTER is guarded by an inspector check, safe to run repeatedly.

How it's used:
  * Render runs this automatically on every deploy (see render.yaml startCommand).
  * Locally, run manually:  python migrate.py
"""
import os
import sys
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.exc import OperationalError, ProgrammingError


def get_db_url() -> str:
    url = os.environ.get("DATABASE_URL")
    if not url:
        here = os.path.dirname(os.path.abspath(__file__))
        return f"sqlite:///{os.path.join(here, 'estate.db')}"
    # Render's URL starts with 'postgres://', SQLAlchemy 2.x needs 'postgresql://'
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    return url


def ensure_column(engine, table, col, type_ddl,
                  default_sql=None, not_null=False) -> bool:
    """ALTER TABLE ... ADD COLUMN, only if the column is missing."""
    insp = inspect(engine)
    if table not in insp.get_table_names():
        print(f"  - table {table!r} doesn't exist yet (will be created by db.create_all)")
        return False
    existing = {c["name"] for c in insp.get_columns(table)}
    if col in existing:
        return False
    ddl = f"ALTER TABLE {table} ADD COLUMN {col} {type_ddl}"
    if default_sql is not None:
        ddl += f" DEFAULT {default_sql}"
    if not_null:
        ddl += " NOT NULL"
    with engine.begin() as conn:
        conn.execute(text(ddl))
    print(f"  + added {table}.{col}")
    return True


def main():
    url = get_db_url()
    try:
        engine = create_engine(url)
    except Exception as e:
        print(f"Could not connect: {e}"); sys.exit(1)

    dialect = engine.dialect.name
    safe_url = url.split("@")[-1] if "@" in url else url    # hide creds
    print(f"Migrating ({dialect}): {safe_url}")

    bool_false = "FALSE" if dialect == "postgresql" else "0"

    n = 0
    try:
        # ---- users (rentals + suspension + email verification) ----
        n += ensure_column(engine, "users", "suspended",          "BOOLEAN", bool_false, not_null=True)
        n += ensure_column(engine, "users", "suspension_reason",  "VARCHAR(300)")
        n += ensure_column(engine, "users", "email_verified",     "BOOLEAN", bool_false, not_null=True)

        # ---- properties (rental lifecycle + amenities + featured) ----
        n += ensure_column(engine, "properties", "availability",  "VARCHAR(20)", "'available'", not_null=True)
        n += ensure_column(engine, "properties", "rented_at",     "TIMESTAMP")
        n += ensure_column(engine, "properties", "internet",      "BOOLEAN")
        n += ensure_column(engine, "properties", "water",         "BOOLEAN")
        n += ensure_column(engine, "properties", "electricity",   "BOOLEAN")
        n += ensure_column(engine, "properties", "security",      "BOOLEAN")
        n += ensure_column(engine, "properties", "featured",      "BOOLEAN", bool_false, not_null=True)
    except (OperationalError, ProgrammingError) as e:
        print(f"DDL error: {e}")
        sys.exit(1)

    print(f"Done - {n} column(s) added.")


if __name__ == "__main__":
    main()
