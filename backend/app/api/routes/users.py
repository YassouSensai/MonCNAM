from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import func, select

from app import crud
from app.api.deps import CurrentUser, SessionDep, get_current_active_superuser
from app.core.config import settings
from app.core.security import get_password_hash, verify_password
from app.models import (
    Message,
    UpdatePassword,
    Utilisateur,
    UtilisateurCreate,
    UtilisateurPublic,
    UtilisateurRegister,
    UtilisateursPublic,
    UtilisateurUpdate,
    UtilisateurUpdateMe,
)

router = APIRouter()


@router.get(
    "/",
    dependencies=[Depends(get_current_active_superuser)],
    response_model=UtilisateursPublic,
)
def read_users(session: SessionDep, skip: int = 0, limit: int = 100) -> Any:
    """Retrieve users (superuser only)."""
    count_statement = select(func.count()).select_from(Utilisateur)
    count = session.exec(count_statement).one()
    statement = select(Utilisateur).offset(skip).limit(limit)
    users = session.exec(statement).all()
    return UtilisateursPublic(data=users, count=count)


@router.post(
    "/",
    dependencies=[Depends(get_current_active_superuser)],
    response_model=UtilisateurPublic,
)
def create_user(*, session: SessionDep, user_in: UtilisateurCreate) -> Any:
    """Create a new user (superuser only)."""
    user = crud.get_utilisateur_by_email(session=session, email=user_in.email)
    if user:
        raise HTTPException(
            status_code=400,
            detail="A user with this email already exists.",
        )
    user = crud.create_utilisateur(session=session, utilisateur_create=user_in)
    return user


@router.post("/signup", response_model=UtilisateurPublic)
def register_user(session: SessionDep, user_in: UtilisateurRegister) -> Any:
    """Register a new user (open registration)."""
    if not settings.ENVIRONMENT == "local":
        raise HTTPException(status_code=403, detail="Open registration is disabled.")
    user = crud.get_utilisateur_by_email(session=session, email=user_in.email)
    if user:
        raise HTTPException(
            status_code=400,
            detail="A user with this email already exists.",
        )
    user_create = UtilisateurCreate(
        email=user_in.email,
        password=user_in.password,
        nom=user_in.nom,
        prenom=user_in.prenom,
    )
    user = crud.create_utilisateur(session=session, utilisateur_create=user_create)
    return user


@router.get("/me", response_model=UtilisateurPublic)
def read_user_me(current_user: CurrentUser) -> Any:
    """Get current user."""
    return current_user


@router.patch("/me", response_model=UtilisateurPublic)
def update_user_me(
    *, session: SessionDep, user_in: UtilisateurUpdateMe, current_user: CurrentUser
) -> Any:
    """Update current user's own profile (nom, prenom, email)."""
    if user_in.email:
        existing = crud.get_utilisateur_by_email(session=session, email=user_in.email)
        if existing and existing.id_utilisateur != current_user.id_utilisateur:
            raise HTTPException(
                status_code=400, detail="A user with this email already exists."
            )
    user_update = UtilisateurUpdate(**user_in.model_dump(exclude_unset=True))
    updated_user = crud.update_utilisateur(
        session=session, db_utilisateur=current_user, utilisateur_in=user_update
    )
    return updated_user


@router.patch("/me/password", response_model=Message)
def update_password_me(
    *, session: SessionDep, body: UpdatePassword, current_user: CurrentUser
) -> Any:
    """Update current user's password."""
    verified, _ = verify_password(body.current_password, current_user.password_hash)
    if not verified:
        raise HTTPException(status_code=400, detail="Incorrect password.")
    if body.current_password == body.new_password:
        raise HTTPException(
            status_code=400,
            detail="New password must be different from the current one.",
        )
    user_update = UtilisateurUpdate(password=body.new_password)
    crud.update_utilisateur(
        session=session, db_utilisateur=current_user, utilisateur_in=user_update
    )
    return Message(message="Password updated successfully")


@router.delete("/me", response_model=Message)
def delete_user_me(session: SessionDep, current_user: CurrentUser) -> Any:
    """Delete current user's own account."""
    if current_user.is_superuser:
        raise HTTPException(
            status_code=403,
            detail="Superusers cannot delete their own account via this endpoint.",
        )
    session.delete(current_user)
    session.commit()
    return Message(message="Account deleted successfully")


@router.get("/{user_id}", response_model=UtilisateurPublic)
def read_user_by_id(
    user_id: int, session: SessionDep, current_user: CurrentUser
) -> Any:
    """Get a user by ID. Regular users can only access their own profile."""
    user = session.get(Utilisateur, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not current_user.is_superuser and user.id_utilisateur != current_user.id_utilisateur:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return user


@router.patch(
    "/{user_id}",
    dependencies=[Depends(get_current_active_superuser)],
    response_model=UtilisateurPublic,
)
def update_user(
    *, session: SessionDep, user_id: int, user_in: UtilisateurUpdate
) -> Any:
    """Update a user (superuser only)."""
    db_user = session.get(Utilisateur, user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    if user_in.email:
        existing = crud.get_utilisateur_by_email(session=session, email=user_in.email)
        if existing and existing.id_utilisateur != user_id:
            raise HTTPException(
                status_code=400, detail="A user with this email already exists."
            )
    updated_user = crud.update_utilisateur(
        session=session, db_utilisateur=db_user, utilisateur_in=user_in
    )
    return updated_user


@router.delete(
    "/{user_id}",
    dependencies=[Depends(get_current_active_superuser)],
    response_model=Message,
)
def delete_user(session: SessionDep, current_user: CurrentUser, user_id: int) -> Any:
    """Delete a user (superuser only)."""
    db_user = session.get(Utilisateur, user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    if db_user.id_utilisateur == current_user.id_utilisateur:
        raise HTTPException(
            status_code=403,
            detail="Superusers cannot delete their own account via this endpoint.",
        )
    session.delete(db_user)
    session.commit()
    return Message(message="User deleted successfully")
