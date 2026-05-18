from typing import Any

from fastapi import APIRouter, Depends
from sqlmodel import Session

from app import crud
from app.api.deps import get_current_active_superuser, SessionDep
from app.models import UtilisateurCreate, UtilisateurPublic

router = APIRouter()

@router.post("/users", dependencies=[Depends(get_current_active_superuser)], response_model=UtilisateurPublic)
def create_user(session: SessionDep, user_in: UtilisateurCreate) -> Any:
    """
    Create a user (Private).
    """
    user = crud.get_utilisateur_by_email(session=session, email=user_in.email)
    if user:
        return user
    
    user = crud.create_utilisateur(session=session, utilisateur_create=user_in)
    return user