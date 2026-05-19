from typing import Any
from sqlmodel import Session, select
from app.core.security import get_password_hash, verify_password
from app.models import Utilisateur, UtilisateurCreate, UtilisateurUpdate

def create_utilisateur(*, session: Session, utilisateur_create: UtilisateurCreate) -> Utilisateur:
    db_obj = Utilisateur.model_validate(
        utilisateur_create, update={"password_hash": get_password_hash(utilisateur_create.password)}
    )
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj

def update_utilisateur(*, session: Session, db_utilisateur: Utilisateur, utilisateur_in: UtilisateurUpdate) -> Any:
    user_data = utilisateur_in.model_dump(exclude_unset=True)
    extra_data = {}
    if "password" in user_data:
        password = user_data["password"]
        hashed_password = get_password_hash(password)
        extra_data["password_hash"] = hashed_password
        
    db_utilisateur.sqlmodel_update(user_data, update=extra_data)
    session.add(db_utilisateur)
    session.commit()
    session.refresh(db_utilisateur)
    return db_utilisateur

def get_utilisateur_by_email(*, session: Session, email: str) -> Utilisateur | None:
    statement = select(Utilisateur).where(Utilisateur.email == email)
    session_user = session.exec(statement).first()
    return session_user

DUMMY_HASH = "$argon2id$v=19$m=65536,t=3,p=4$MjQyZWE1MzBjYjJlZTI0Yw$YTU4NGM5ZTZmYjE2NzZlZjY0ZWY3ZGRkY2U2OWFjNjk"

def authenticate(*, session: Session, email: str, password: str) -> Utilisateur | None:
    db_utilisateur = get_utilisateur_by_email(session=session, email=email)
    if not db_utilisateur:
        verify_password(password, DUMMY_HASH)
        return None
        
    verified, updated_password_hash = verify_password(password, db_utilisateur.password_hash)
    if not verified:
        return None
        
    if updated_password_hash:
        db_utilisateur.password_hash = updated_password_hash
        session.add(db_utilisateur)
        session.commit()
        session.refresh(db_utilisateur)
        
    return db_utilisateur