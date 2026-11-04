"""DB engine/session + init."""
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import settings


class Base(DeclarativeBase):
    pass


def _ensure_sqlite_dir(url: str) -> None:
    if url.startswith("sqlite"):
        # sqlite:///./data/rankace.db -> ./data/rankace.db
        path = url.split("///", 1)[-1]
        directory = os.path.dirname(path)
        if directory:
            os.makedirs(directory, exist_ok=True)


_ensure_sqlite_dir(settings.database_url)
connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
engine = create_engine(settings.database_url, connect_args=connect_args, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    from app import models  # noqa: F401  (register tables)

    Base.metadata.create_all(bind=engine)
    _add_missing_columns()


def _add_missing_columns() -> None:
    """Add columns that exist on the models but not yet in an existing table.

    `create_all` only creates MISSING TABLES; it never alters an existing one.
    Without this, adding a column to a model leaves every pre-existing database
    returning "no such column: pages.in_links" at query time -- and the failure
    surfaces on the read path, far from the schema change that caused it.

    This is a deliberately narrow forward-only shim, not a migration system:
    it adds nullable/defaulted columns and nothing else. Alembic stays the tool
    for anything destructive.
    """
    from sqlalchemy import inspect, text

    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())

    with engine.begin() as connection:
        for table in Base.metadata.sorted_tables:
            if table.name not in existing_tables:
                continue
            present = {column["name"] for column in inspector.get_columns(table.name)}
            for column in table.columns:
                if column.name in present:
                    continue
                if not column.nullable and column.default is None and not column.server_default:
                    # Refuse to add a NOT NULL column with no default: the ALTER
                    # would fail on any table with rows and there is no value
                    # to backfill them with.
                    continue
                column_type = column.type.compile(dialect=engine.dialect)
                default = ""
                if column.default is not None and getattr(column.default, "is_scalar", False):
                    value = column.default.arg
                    default = f" DEFAULT {int(value) if isinstance(value, bool) else value!r}"
                    if isinstance(value, (int, float)) and not isinstance(value, bool):
                        default = f" DEFAULT {value}"
                connection.execute(
                    text(
                        f'ALTER TABLE {table.name} ADD COLUMN "{column.name}" '
                        f"{column_type}{default}"
                    )
                )
