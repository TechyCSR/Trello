from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine


def _to_base36(value: int) -> str:
    alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    if value <= 0:
        return "0"
    chars: list[str] = []
    while value:
        value, remainder = divmod(value, 36)
        chars.append(alphabet[remainder])
    return "".join(reversed(chars))


def _board_code_from_id(board_id: int) -> str:
    modulus = 36**6
    mixed = (board_id * 1299709 + 104729) % modulus
    if mixed == 0:
        mixed = board_id % modulus or board_id
    return _to_base36(mixed).zfill(6)[-6:]


def _share_token_from_id(board_id: int) -> str:
    seed = (board_id * 32452843 + 49979687) % (36**12)
    part_a = _to_base36(seed).zfill(12)[-12:]
    part_b = _to_base36(seed * 7 + board_id).zfill(12)[-12:]
    return f"{part_a}{part_b}"[:24]


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
            "board_code": "VARCHAR(6)",
            "title": "VARCHAR(120)",
            "inbox_title": "VARCHAR(120) NOT NULL DEFAULT 'Inbox'",
            "board_section_title": "VARCHAR(120) NOT NULL DEFAULT 'Board'",
            "description": "TEXT",
            "color": "VARCHAR(32) NOT NULL DEFAULT 'sky'",
            "is_public": "BOOLEAN NOT NULL DEFAULT FALSE",
            "visibility": "VARCHAR(16) NOT NULL DEFAULT 'private'",
            "share_enabled": "BOOLEAN NOT NULL DEFAULT FALSE",
            "share_token": "VARCHAR(32)",
            "email_ingest_token": "VARCHAR(16)",
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
            "is_inbox": "BOOLEAN NOT NULL DEFAULT FALSE",
            "is_collapsed": "BOOLEAN NOT NULL DEFAULT FALSE",
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
            "cover_color": "VARCHAR(32)",
            "cover_image_url": "TEXT",
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
    _queue_missing_columns(
        "card_activities",
        {
            "board_id": "INTEGER",
            "card_id": "INTEGER",
            "user_id": "INTEGER",
            "action": "VARCHAR(40)",
            "detail": "TEXT",
            "created_at": f"{timestamp_type} NOT NULL DEFAULT CURRENT_TIMESTAMP",
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
                "CREATE INDEX IF NOT EXISTS ix_lists_board_inbox ON lists (board_id, is_inbox)",
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
    if "card_activities" in existing_tables:
        index_statements.extend(
            [
                "CREATE INDEX IF NOT EXISTS ix_card_activities_board_id ON card_activities (board_id)",
                "CREATE INDEX IF NOT EXISTS ix_card_activities_card_id ON card_activities (card_id)",
                "CREATE INDEX IF NOT EXISTS ix_card_activities_user_id ON card_activities (user_id)",
                "CREATE INDEX IF NOT EXISTS ix_card_activities_created_at ON card_activities (created_at)",
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

        # Relax NOT NULL on legacy checklist_items columns (`text`, `completed`)
        # so new ORM inserts (which only populate `title`/`is_done`) don't fail.
        if dialect == "postgresql" and "checklist_items" in post_tables:
            if "text" in checklist_item_columns:
                connection.execute(text("ALTER TABLE checklist_items ALTER COLUMN text DROP NOT NULL"))
                connection.execute(text("ALTER TABLE checklist_items ALTER COLUMN text SET DEFAULT ''"))
            if "completed" in checklist_item_columns:
                connection.execute(text("ALTER TABLE checklist_items ALTER COLUMN completed DROP NOT NULL"))
                connection.execute(text("ALTER TABLE checklist_items ALTER COLUMN completed SET DEFAULT FALSE"))

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
            board_columns = {column["name"] for column in post_inspector.get_columns("boards")}
            connection.execute(text("UPDATE boards SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL"))
            connection.execute(text("UPDATE boards SET updated_at = COALESCE(updated_at, created_at, CURRENT_TIMESTAMP) WHERE updated_at IS NULL"))
            if "visibility" in board_columns:
                connection.execute(text("UPDATE boards SET visibility = CASE WHEN is_public THEN 'public' ELSE 'private' END WHERE visibility IS NULL OR visibility = ''"))
            if "inbox_title" in board_columns:
                connection.execute(text("UPDATE boards SET inbox_title = 'Inbox' WHERE inbox_title IS NULL OR inbox_title = ''"))
            if "board_section_title" in board_columns:
                connection.execute(
                    text("UPDATE boards SET board_section_title = 'Board' WHERE board_section_title IS NULL OR board_section_title = ''")
                )
            if "share_enabled" in board_columns:
                connection.execute(text("UPDATE boards SET share_enabled = FALSE WHERE share_enabled IS NULL"))
            if "board_code" in board_columns:
                rows = connection.execute(text("SELECT id, board_code FROM boards ORDER BY id")).mappings().all()
                used_codes: set[str] = set()
                for row in rows:
                    existing = (row["board_code"] or "").strip().upper()
                    is_valid = len(existing) == 6 and existing.isalnum() and existing not in used_codes
                    if is_valid:
                        used_codes.add(existing)
                        continue
                    candidate = _board_code_from_id(int(row["id"]))
                    while candidate in used_codes:
                        candidate = _to_base36((int(candidate, 36) + 1) % (36**6)).zfill(6)[-6:]
                    connection.execute(
                        text("UPDATE boards SET board_code = :code WHERE id = :board_id"),
                        {"code": candidate, "board_id": int(row["id"])},
                    )
                    used_codes.add(candidate)
                connection.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_boards_board_code ON boards (board_code)"))
            if "share_token" in board_columns:
                rows = connection.execute(text("SELECT id, share_token FROM boards ORDER BY id")).mappings().all()
                used_tokens: set[str] = set()
                for row in rows:
                    existing = (row["share_token"] or "").strip().upper()
                    is_valid = len(existing) >= 12 and existing not in used_tokens
                    if is_valid:
                        used_tokens.add(existing)
                        continue
                    token = _share_token_from_id(int(row["id"]))
                    while token in used_tokens:
                        token = _to_base36((int(token[:12], 36) + 1) % (36**12)).zfill(12)[-12:] + token[12:]
                    connection.execute(
                        text("UPDATE boards SET share_token = :token WHERE id = :board_id"),
                        {"token": token, "board_id": int(row["id"])},
                    )
                    used_tokens.add(token)
                connection.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_boards_share_token ON boards (share_token)"))
        if "boards" in post_tables and "email_ingest_token" in board_columns:
            rows_needing_email = connection.execute(
                text("SELECT id FROM boards WHERE email_ingest_token IS NULL OR email_ingest_token = '' ORDER BY id")
            ).mappings().all()
            used_email_tokens: set[str] = set()
            existing_email = connection.execute(
                text("SELECT email_ingest_token FROM boards WHERE email_ingest_token IS NOT NULL AND email_ingest_token != ''")
            ).scalars().all()
            used_email_tokens.update(existing_email)
            import random, string
            _lower_alphanum = string.ascii_lowercase + string.digits
            for row in rows_needing_email:
                for _ in range(40):
                    etoken = "".join(random.choice(_lower_alphanum) for _ in range(10))
                    if etoken not in used_email_tokens:
                        break
                connection.execute(
                    text("UPDATE boards SET email_ingest_token = :token WHERE id = :board_id"),
                    {"token": etoken, "board_id": int(row["id"])},
                )
                used_email_tokens.add(etoken)
            connection.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_boards_email_ingest_token ON boards (email_ingest_token)"))

        if "lists" in post_tables:
            connection.execute(text("UPDATE lists SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL"))
            connection.execute(text("UPDATE lists SET updated_at = COALESCE(updated_at, created_at, CURRENT_TIMESTAMP) WHERE updated_at IS NULL"))
            list_columns = {column["name"] for column in post_inspector.get_columns("lists")}
            if "is_inbox" in list_columns:
                connection.execute(text("UPDATE lists SET is_inbox = FALSE WHERE is_inbox IS NULL"))
                connection.execute(
                    text(
                        """
                        INSERT INTO lists (board_id, title, is_inbox, position)
                        SELECT b.id, 'Inbox', TRUE, 0
                        FROM boards AS b
                        WHERE NOT EXISTS (
                            SELECT 1 FROM lists AS l WHERE l.board_id = b.id
                        )
                        """
                    )
                )
            if "is_collapsed" in list_columns:
                connection.execute(text("UPDATE lists SET is_collapsed = FALSE WHERE is_collapsed IS NULL"))
                connection.execute(
                    text(
                        """
                        UPDATE lists
                        SET is_inbox = TRUE
                        WHERE id IN (
                            SELECT chosen.id
                            FROM (
                                SELECT l1.id
                                FROM lists AS l1
                                WHERE l1.id = (
                                    SELECT l2.id
                                    FROM lists AS l2
                                    WHERE l2.board_id = l1.board_id
                                    ORDER BY l2.position, l2.id
                                    LIMIT 1
                                )
                                AND NOT EXISTS (
                                    SELECT 1
                                    FROM lists AS lx
                                    WHERE lx.board_id = l1.board_id AND lx.is_inbox = TRUE
                                )
                            ) AS chosen
                        )
                        """
                    )
                )
        if "cards" in post_tables:
            connection.execute(text("UPDATE cards SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL"))
            connection.execute(text("UPDATE cards SET updated_at = COALESCE(updated_at, created_at, CURRENT_TIMESTAMP) WHERE updated_at IS NULL"))
        if "card_activities" in post_tables:
            connection.execute(text("UPDATE card_activities SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL"))
