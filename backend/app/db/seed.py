from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.models import Board, BoardList, BoardMember, Card, CardLabel, CardMember, Checklist, ChecklistItem, Label, User


USER_NAMES = ["TechyCSR", "Alex", "Sarah", "John", "Emma", "Liam", "Sophia", "Noah", "Olivia", "Ethan"]
AVATARS = ["TC", "AX", "SR", "JN", "EM", "LM", "SO", "NH", "OL", "ET"]


def seed_database(db: Session) -> None:
    if db.query(User).first():
        return

    users = [User(name=name, avatar=avatar) for name, avatar in zip(USER_NAMES, AVATARS)]
    db.add_all(users)
    db.flush()
    by_name = {user.name: user for user in users}

    product = Board(
        title="Product Launch Sprint",
        description="Coordinate launch tasks, content, QA, and release readiness.",
        color="teal",
        is_public=True,
        owner_id=by_name["TechyCSR"].id,
    )
    hiring = Board(
        title="Intern Assignment Tracker",
        description="A private board for reviews, implementation tasks, and polish.",
        color="indigo",
        is_public=False,
        owner_id=by_name["Sarah"].id,
    )
    db.add_all([product, hiring])
    db.flush()

    for board, names in [(product, USER_NAMES[:8]), (hiring, ["Sarah", "TechyCSR", "Alex", "Emma", "Noah"])]:
        for name in names:
            db.add(BoardMember(board_id=board.id, user_id=by_name[name].id, role="owner" if board.owner_id == by_name[name].id else "member"))

    labels = [
        Label(board_id=product.id, name="Frontend", color="#0ea5e9"),
        Label(board_id=product.id, name="Backend", color="#10b981"),
        Label(board_id=product.id, name="Design", color="#f59e0b"),
        Label(board_id=product.id, name="Blocked", color="#ef4444"),
        Label(board_id=hiring.id, name="Review", color="#8b5cf6"),
        Label(board_id=hiring.id, name="Polish", color="#14b8a6"),
    ]
    db.add_all(labels)
    db.flush()

    launch_lists = [
        BoardList(board_id=product.id, title="Inbox", position=1024),
        BoardList(board_id=product.id, title="Design", position=2048),
        BoardList(board_id=product.id, title="In Progress", position=3072),
        BoardList(board_id=product.id, title="Review", position=4096),
        BoardList(board_id=product.id, title="Done", position=5120),
    ]
    hiring_lists = [
        BoardList(board_id=hiring.id, title="Requirements", position=1024),
        BoardList(board_id=hiring.id, title="Implementation", position=2048),
        BoardList(board_id=hiring.id, title="Verification", position=3072),
    ]
    db.add_all(launch_lists + hiring_lists)
    db.flush()

    now = datetime.now(timezone.utc)
    cards = [
        Card(list_id=launch_lists[0].id, title="Collect launch risks from stakeholders", description="Capture risks, owners, and mitigation notes before release sync.", position=1024, due_date=now + timedelta(days=2), created_by_id=by_name["TechyCSR"].id),
        Card(list_id=launch_lists[1].id, title="Finalize board card visual language", description="Tighten shadows, labels, avatars, and hover affordances.", position=1024, due_date=now + timedelta(days=5), created_by_id=by_name["Emma"].id),
        Card(list_id=launch_lists[2].id, title="Wire optimistic card movement API", description="Persist dnd-kit movement after local state updates.", position=1024, due_date=now + timedelta(days=4), created_by_id=by_name["Alex"].id),
        Card(list_id=launch_lists[2].id, title="Add due-date filters", description="Support overdue and this-week filtering in the workspace toolbar.", position=2048, due_date=now + timedelta(days=7), created_by_id=by_name["Sarah"].id),
        Card(list_id=launch_lists[3].id, title="QA mobile workspace scrolling", description="Verify sidebar collapse and horizontal list scroll behavior.", position=1024, due_date=now + timedelta(days=1), created_by_id=by_name["Noah"].id),
        Card(list_id=launch_lists[4].id, title="Seed collaboration users", description="Ship predictable demo data for the user selector.", position=1024, due_date=now - timedelta(days=1), created_by_id=by_name["Liam"].id),
        Card(list_id=hiring_lists[0].id, title="Map assignment requirements", description="Track all required pages, stack choices, and endpoint coverage.", position=1024, due_date=now + timedelta(days=3), created_by_id=by_name["Sarah"].id),
        Card(list_id=hiring_lists[1].id, title="Build Trello-style workspace", description="Prioritize drag quality, compact UI, and clear data flow.", position=1024, due_date=now + timedelta(days=6), created_by_id=by_name["TechyCSR"].id),
    ]
    db.add_all(cards)
    db.flush()

    label_by_name = {label.name: label for label in labels}
    links = [
        (cards[1], "Design"),
        (cards[2], "Backend"),
        (cards[3], "Frontend"),
        (cards[4], "Blocked"),
        (cards[6], "Review"),
        (cards[7], "Polish"),
    ]
    for card, label_name in links:
        db.add(CardLabel(card_id=card.id, label_id=label_by_name[label_name].id))

    assignments = [
        (cards[0], ["TechyCSR", "Olivia"]),
        (cards[1], ["Emma", "Sophia"]),
        (cards[2], ["Alex", "Liam"]),
        (cards[3], ["Sarah"]),
        (cards[4], ["Noah", "John"]),
        (cards[7], ["TechyCSR", "Alex"]),
    ]
    for card, names in assignments:
        for name in names:
            db.add(CardMember(card_id=card.id, user_id=by_name[name].id))

    checklist = Checklist(card_id=cards[2].id, title="Move persistence")
    db.add(checklist)
    db.flush()
    db.add_all(
        [
            ChecklistItem(checklist_id=checklist.id, title="Update local state before API call", is_done=True, position=1024),
            ChecklistItem(checklist_id=checklist.id, title="Persist list id and position", is_done=True, position=2048),
            ChecklistItem(checklist_id=checklist.id, title="Rollback on failure", is_done=False, position=3072),
        ]
    )

    db.commit()
