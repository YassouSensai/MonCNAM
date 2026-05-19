from sqlmodel import Session, create_engine, select, SQLModel

from app import crud
from app.core.config import settings
from app.models import Utilisateur, UtilisateurCreate, UserRole

engine = create_engine(str(settings.SQLALCHEMY_DATABASE_URI))

def init_db(session: Session) -> None:
    # ASTUCE MONCNAM : On force la création des tables directement ici 
    # pour éviter les bugs avec l'ancien historique Alembic du template.
    SQLModel.metadata.create_all(engine)

    user = session.exec(
        select(Utilisateur).where(Utilisateur.email == settings.FIRST_SUPERUSER)
    ).first()
    if not user:
        user_in = UtilisateurCreate(
            email=settings.FIRST_SUPERUSER,
            password=settings.FIRST_SUPERUSER_PASSWORD,
            nom="Admin",
            prenom="Super",
            role=UserRole.ADMIN,
            is_superuser=True,
        )
        user = crud.create_utilisateur(session=session, utilisateur_create=user_in)