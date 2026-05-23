from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine


def _queue_missing_columns(
    table_name: str,
    expected_columns: dict[str, str],
    existing_tables: set[str],
    inspector,
    statements: list[str],
) -> None:
    if table_name not in existing_tables:
        return

    existing_columns = {column["name"] for column in inspector.get_columns(table_name)}
    for column_name, definition in expected_columns.items():
        if column_name not in existing_columns:
            statements.append(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {definition}")


def ensure_runtime_schema(engine: Engine) -> None:
    """Patch additive columns for existing assignment databases.

    SQLAlchemy create_all creates missing tables but does not alter tables that
    already exist. This keeps older local/Postgres databases compatible without
    requiring Alembic for the assignment.
    """
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())
    if not existing_tables:
        return

    dialect = engine.dialect.name
    timestamp_type = "TIMESTAMP WITH TIME ZONE" if dialect == "postgresql" else "DATETIME"
    statements: list[str] = []
    index_statements: list[str] = []

    _queue_missing_columns(
        "boards",
        {
            "title": "VARCHAR(120)",
            "description": "TEXT",
            "color": "VARCHAR(32) NOT NULL DEFAULT 'sky'",
            "is_public": "BOOLEAN NOT NULL DEFAULT FALSE",
            "owner_id": "INTEGER",
            "created_at": f"{timestamp_type} NOT NULL DEFAULT CURRENT_TIMESTAMP",
            "updated_at": f"{timestamp_type} NOT NULL DEFAULT CURRENT_TIMESTAMP",
        },
        existing_tables,
        inspector,
        statements,
    )
    _queue_missing_columns(
        "board_members",
        {
            "board_id": "INTEGER",
            "user_id": "INTEGER",
            "role": "VARCHAR(30) NOT NULL DEFAULT 'member'",
            "created_at": f"{timestamp_type} NOT NULL DEFAULT CURRENT_TIMESTAMP",
        },
        existing_tables,
        inspector,
        statements,
    )
    _queue_missing_columns(
        "lists",
        {
            "board_id": "INTEGER",
            "title": "VARCHAR(120)",
            "position": "NUMERIC(12, 4) NOT NULL DEFAULT 0",
            "created_at": f"{timestamp_type} NOT NULL DEFAULT CURRENT_TIMESTAMP",
            "updated_at": f"{timestamp_type} NOT NULL DEFAULT CURRENT_TIMESTAMP",
        },
        existing_tables,
        inspector,
        statements,
    )
    _queue_missing_columns(
        "cards",
        {
            "list_id": "INTEGER",
            "title": "VARCHAR(160)",
            "description": "TEXT",
            "position": "NUMERIC(12, 4) NOT NULL DEFAULT 0",
            "due_date": timestamp_type,
            "archived": "BOOLEAN NOT NULL DEFAULT FALSE",
            "created_by_id": "INTEGER",
            "created_at": f"{timestamp_type} NOT NULL DEFAULT CURRENT_TIMESTAMP",
            "updated_at": f"{timestamp_type} NOT NULL DEFAULT CURRENT_TIMESTAMP",
        },
        existing_tables,
        inspector,
        statements,
    )
    _queue_missing_columns(
        "users",
        {
            "avatar": "VARCHAR(8) NOT NULL DEFAULT 'U'",
            "created_at": f"{timestamp_type} NOT NULL DEFAULT CURRENT_TIMESTAMP",
        },
        existing_tables,
        inspector,
        statements,
    )
    _queue_missing_columns(
        "labels",
        {
            "board_id": "INTEGER",
            "name": "VARCHAR(40)",
            "color": "VARCHAR(24)",
        },
        existing_tables,
        inspector,
        statements,
    )
    _queue_missing_columns(
        "card_labels",
        {"card_id": "INTEGER", "label_id": "INTEGER"},
        existing_tables,
        inspector,
        statements,
    )
    _queue_missing_columns(
        "card_members",
        {"card_id": "INTEGER", "user_id": "INTEGER"},
        existing_tables,
        inspector,
        statements,
    )
    _queue_missing_columns(
        "checklists",
        {"card_id": "INTEGER", "title": "VARCHAR(120) NOT NULL DEFAULT 'Checklist'"},
        existing_tables,
        inspector,
        statements,
    )
    _queue_missing_columns(
        "checklist_items",
        {
            "checklist_id": "INTEGER",
            "title": "VARCHAR(180)",
            "is_done": "BOOLEAN NOT NULL DEFAULT FALSE",
            "position": "NUMERIC(12, 4) NOT NULL DEFAULT 0",
        },
        existing_tables,
        inspector,
        statements,
    )

    if "boards" in existing_tables:
        index_statements.extend(
            [
                "CREATE INDEX IF NOT EXISTS ix_boards_owner_id ON boards (owner_id)",
                "CREATE INDEX IF NOT EXISTS ix_boards_is_public ON boards (is_public)",
                "CREATE INDEX IF NOT EXISTS ix_boards_updated_at ON boards (updated_at)",
            ]
        )
    if "board_members" in existing_tables:
        index_statements.extend(
            [
                "CREATE INDEX IF NOT EXISTS ix_board_members_board_id ON board_members (board_id)",
                "CREATE INDEX IF NOT EXISTS ix_board_members_user_id ON board_members (user_id)",
                "CREATE INDEX IF NOT EXISTS ix_board_members_board_user ON board_members (board_id, user_id)",
            ]
        )
    if "lists" in existing_tables:
        index_statements.extend(
            [
                "CREATE INDEX IF NOT EXISTS ix_lists_board_id ON lists (board_id)",
                "CREATE INDEX IF NOT EXISTS ix_lists_board_position ON lists (board_id, position)",
            ]
        )
    if "cards" in existing_tables:
        index_statements.extend(
            [
                "CREATE INDEX IF NOT EXISTS ix_cards_list_id ON cards (list_id)",
                "CREATE INDEX IF NOT EXISTS ix_cards_list_position ON cards (list_id, position)",
                "CREATE INDEX IF NOT EXISTS ix_cards_archived ON cards (archived)",
            ]
        )
    if "labels" in existing_tables:
        index_statements.append("CREATE INDEX IF NOT EXISTS ix_labels_board_id ON labels (board_id)")
    if "card_labels" in existing_tables:
        index_statements.extend(
            [
                "CREATE INDEX IF NOT EXISTS ix_card_labels_card_id ON card_labels (card_id)",
                "CREATE INDEX IF NOT EXISTS ix_card_labels_label_id ON card_labels (label_id)",
            ]
        )
    if "card_members" in existing_tables:
        index_statements.extend(
            [
                "CREATE INDEX IF NOT EXISTS ix_card_members_card_id ON card_members (card_id)",
                "CREATE INDEX IF NOT EXISTS ix_card_members_user_id ON card_members (user_id)",
            ]
        )
    if "checklists" in existing_tables:
        index_statements.append("CREATE INDEX IF NOT EXISTS ix_checklists_card_id ON checklists (card_id)")
    if "checklist_items" in existing_tables:
        index_statements.extend(
            [
                "CREATE INDEX IF NOT EXISTS ix_checklist_items_checklist_id ON checklist_items (checklist_id)",
                "CREATE INDEX IF NOT EXISTS ix_checklist_items_checklist_position ON checklist_items (checklist_id, position)",
            ]
        )

    def _default_missing(columns: list[dict], column_name: str) -> bool:
        current = next((col for col in columns if col["name"] == column_name), None)
        if not current:
            return True
        default_value = (current.get("default") or "").lower()
        return "current_timestamp" not in default_value and "now()" not in default_value

    with engine.begin() as connection:
        if dialect == "postgresql":
            # Prevent concurrent reloader/app processes from deadlocking each other
            # while applying runtime schema/data patching.
            locked = connection.execute(text("SELECT pg_try_advisory_xact_lock(91346021)")).scalar()
            if not locked:
                return

        for statement in statements:
            connection.execute(text(statement))
        for statement in index_statements:
            connection.execute(text(statement))

        post_inspector = inspect(connection)
        post_tables = set(post_inspector.get_table_names())

        if dialect == "postgresql":
            # Set timestamp defaults once on legacy schemas, but skip if already configured.
            for table_name in ("boards", "lists", "cards", "users", "board_members"):
                if table_name in post_tables:
                    cols = post_inspector.get_columns(table_name)
                    if _default_missing(cols, "created_at"):
                        connection.execute(text(f"ALTER TABLE {table_name} ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP"))
            for table_name in ("boards", "lists", "cards"):
                if table_name in post_tables:
                    cols = post_inspector.get_columns(table_name)
                    if _default_missing(cols, "updated_at"):
                        connection.execute(text(f"ALTER TABLE {table_name} ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP"))

        # Backfill legacy data values so response models stay valid.
        checklist_item_columns = (
            {column["name"] for column in post_inspector.get_columns("checklist_items")}
            if "checklist_items" in post_tables
            else set()
        )
        if {"title", "text"} <= checklist_item_columns:
            connection.execute(
                text(
                    """
                    UPDATE checklist_items
                    SET title = COALESCE(title, text, '')
                    WHERE title IS NULL
                    """
                )
            )
        if {"is_done", "completed"} <= checklist_item_columns:
            connection.execute(
                text(
                    """
                    UPDATE checklist_items
                    SET is_done = COALESCE(is_done, completed, FALSE)
                    WHERE is_done IS NULL
                    """
                )
            )

        if {"labels", "card_labels", "cards", "lists"} <= post_tables:
            label_columns = {column["name"] for column in post_inspector.get_columns("labels")}
            if "board_id" in label_columns:
                connection.execute(
                    text(
                        """
                        UPDATE labels AS l
                        SET board_id = src.board_id
                        FROM (
                            SELECT cl.label_id, MIN(li.board_id) AS board_id
                            FROM card_labels AS cl
                            JOIN cards AS c ON c.id = cl.card_id
                            JOIN lists AS li ON li.id = c.list_id
                            GROUP BY cl.label_id
                        ) AS src
                        WHERE l.id = src.label_id AND l.board_id IS NULL
                        """
                    )
                )

        # Normalize nullable legacy rows so response models never fail validation.
        if "users" in post_tables:
            connection.execute(text("UPDATE users SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL"))
        if "boards" in post_tables:
            connection.execute(text("UPDATE boards SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL"))
            connection.execute(text("UPDATE boards SET updated_at = COALESCE(updated_at, created_at, CURRENT_TIMESTAMP) WHERE updated_at IS NULL"))
        if "lists" in post_tables:
            connection.execute(text("UPDATE lists SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL"))
            connection.execute(text("UPDATE lists SET updated_at = COALESCE(updated_at, created_at, CURRENT_TIMESTAMP) WHERE updated_at IS NULL"))
        if "cards" in post_tables:
            connection.execute(text("UPDATE cards SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL"))
            connection.execute(text("UPDATE cards SET updated_at = COALESCE(updated_at, created_at, CURRENT_TIMESTAMP) WHERE updated_at IS NULL"))
