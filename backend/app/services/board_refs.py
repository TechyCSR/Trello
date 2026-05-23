import random
import string

from sqlalchemy.orm import Session

from app.models import Board

_ALPHANUM = string.ascii_uppercase + string.digits


def generate_board_code(length: int = 6) -> str:
    return "".join(random.choice(_ALPHANUM) for _ in range(length))


def generate_share_token(length: int = 24) -> str:
    return "".join(random.choice(_ALPHANUM) for _ in range(length))


def assign_unique_board_code(db: Session) -> str:
    for _ in range(40):
        code = generate_board_code()
        exists = db.query(Board.id).filter(Board.board_code == code).first()
        if not exists:
            return code
    raise RuntimeError("Could not generate a unique board code")


def assign_unique_share_token(db: Session) -> str:
    for _ in range(40):
        token = generate_share_token()
        exists = db.query(Board.id).filter(Board.share_token == token).first()
        if not exists:
            return token
    raise RuntimeError("Could not generate a unique share token")
