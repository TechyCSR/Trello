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

    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))

        # Backfill legacy data values so response models stay valid.
        checklist_item_columns = (
            {column["name"] for column in inspector.get_columns("checklist_items")}
            if "checklist_items" in existing_tables
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

        if {"labels", "card_labels", "cards", "lists"} <= existing_tables:
            label_columns = {column["name"] for column in inspector.get_columns("labels")}
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
