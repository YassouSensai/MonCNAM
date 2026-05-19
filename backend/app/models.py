import enum
from datetime import date, datetime, timezone
from decimal import Decimal

from pydantic import EmailStr
from sqlalchemy import DateTime, UniqueConstraint
from sqlmodel import Field, Relationship, SQLModel


def get_datetime_utc() -> datetime:
    return datetime.now(timezone.utc)

# ==========================================
# 1. TYPES ET ENUMS
# ==========================================
class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    INTERVENANT = "INTERVENANT"
    ELEVE = "ELEVE"

class AttendanceStatus(str, enum.Enum):
    PRESENT = "PRESENT"
    ABSENT = "ABSENT"
    RETARD = "RETARD"
    JUSTIFIE = "JUSTIFIE"

class SessionType(str, enum.Enum):
    COURS = "COURS"
    EXAMEN = "EXAMEN"
    REUNION = "REUNION"
    RATTRAPAGE = "RATTRAPAGE"

# ==========================================
# 2. SCHEMAS DE BASE DE DONNEES (TABLES)
# ==========================================
class Promotion(SQLModel, table=True):
    __tablename__ = "promotions"
    
    id_promotion: int | None = Field(default=None, primary_key=True)
    code_promo: str = Field(max_length=20, unique=True)
    annee_scolaire: str = Field(max_length=10)
    charte_version: str = Field(default="1.0", max_length=10)

    # Relations
    cours: list["Cours"] = Relationship(back_populates="promotion")


class Utilisateur(SQLModel, table=True):
    __tablename__ = "utilisateurs"
    
    id_utilisateur: int | None = Field(default=None, primary_key=True)
    nom: str = Field(max_length=50)
    prenom: str = Field(max_length=50)
    email: EmailStr = Field(max_length=100, unique=True, index=True)
    password_hash: str
    role: UserRole
    derniere_connexion: datetime | None = None
    charte_acceptee: bool = False
    date_rgpd_anonymisation: date | None = None
    
    # Champs requis par la logique interne du template FastAPI (Auth)
    is_active: bool = True
    is_superuser: bool = False

    # Relations
    cours_animes: list["Cours"] = Relationship(back_populates="intervenant")
    notes: list["Note"] = Relationship(back_populates="etudiant", sa_relationship_kwargs={"foreign_keys": "[Note.id_etudiant]"})
    emargements: list["Emargement"] = Relationship(back_populates="etudiant")
    notifications: list["Notification"] = Relationship(back_populates="destinataire")
    logs: list["LogActivite"] = Relationship(back_populates="utilisateur")


class UniteEnseignement(SQLModel, table=True):
    __tablename__ = "unites_enseignement"
    
    id_ue: int | None = Field(default=None, primary_key=True)
    code_ue: str = Field(max_length=10, unique=True)
    libelle: str = Field(max_length=150)
    semestre: int | None = Field(default=None, ge=1, le=6)
    credits_ects: int = 6

    # Relations
    matieres: list["Matiere"] = Relationship(back_populates="ue", cascade_delete=True)


class Matiere(SQLModel, table=True):
    __tablename__ = "matieres"
    
    id_matiere: int | None = Field(default=None, primary_key=True)
    id_ue: int | None = Field(default=None, foreign_key="unites_enseignement.id_ue", ondelete="CASCADE")
    libelle: str = Field(max_length=100)
    coefficient: Decimal = Field(default=Decimal("1.0"), max_digits=3, decimal_places=2)

    # Relations
    ue: UniteEnseignement | None = Relationship(back_populates="matieres")
    cours: list["Cours"] = Relationship(back_populates="matiere")
    notes: list["Note"] = Relationship(back_populates="matiere")


class Cours(SQLModel, table=True):
    __tablename__ = "cours"
    
    id_cours: int | None = Field(default=None, primary_key=True)
    id_matiere: int | None = Field(default=None, foreign_key="matieres.id_matiere")
    id_intervenant: int | None = Field(default=None, foreign_key="utilisateurs.id_utilisateur")
    id_promotion: int | None = Field(default=None, foreign_key="promotions.id_promotion")
    
    type_session: SessionType = SessionType.COURS
    date_debut: datetime
    date_fin: datetime
    salle: str | None = Field(default=None, max_length=50)
    code_couleur: str | None = Field(default=None, max_length=7)
    code_qr_ephemere: str | None = Field(default=None, max_length=50)
    support_url: str | None = None
    modalites_evaluation: str | None = None
    is_public: bool = False

    # Relations
    matiere: Matiere | None = Relationship(back_populates="cours")
    intervenant: Utilisateur | None = Relationship(back_populates="cours_animes")
    promotion: Promotion | None = Relationship(back_populates="cours")
    emargements: list["Emargement"] = Relationship(back_populates="cours", cascade_delete=True)


class Note(SQLModel, table=True):
    __tablename__ = "notes"
    
    id_note: int | None = Field(default=None, primary_key=True)
    id_etudiant: int | None = Field(default=None, foreign_key="utilisateurs.id_utilisateur")
    id_matiere: int | None = Field(default=None, foreign_key="matieres.id_matiere")
    
    valeur: Decimal | None = Field(default=None, max_digits=4, decimal_places=2, ge=0, le=20)
    is_rattrapage: bool = False
    date_saisie: datetime | None = Field(default_factory=get_datetime_utc, sa_type=DateTime(timezone=True))
    saisi_par: int | None = Field(default=None, foreign_key="utilisateurs.id_utilisateur")

    # Relations
    etudiant: Utilisateur | None = Relationship(back_populates="notes", sa_relationship_kwargs={"foreign_keys": "[Note.id_etudiant]"})
    matiere: Matiere | None = Relationship(back_populates="notes")


class Emargement(SQLModel, table=True):
    __tablename__ = "emargements"
    __table_args__ = (UniqueConstraint("id_cours", "id_etudiant", name="unique_appel"),)
    
    id_emargement: int | None = Field(default=None, primary_key=True)
    id_cours: int | None = Field(default=None, foreign_key="cours.id_cours", ondelete="CASCADE")
    id_etudiant: int | None = Field(default=None, foreign_key="utilisateurs.id_utilisateur")
    
    statut: AttendanceStatus = AttendanceStatus.ABSENT
    heure_pointage: datetime | None = None
    valide_par_enseignant: bool = False

    # Relations
    cours: Cours | None = Relationship(back_populates="emargements")
    etudiant: Utilisateur | None = Relationship(back_populates="emargements")


class Notification(SQLModel, table=True):
    __tablename__ = "notifications"
    
    id_notif: int | None = Field(default=None, primary_key=True)
    id_destinataire: int | None = Field(default=None, foreign_key="utilisateurs.id_utilisateur")
    titre: str | None = Field(default=None, max_length=100)
    message: str | None = None
    lu: bool = False
    date_envoi: datetime | None = Field(default_factory=get_datetime_utc, sa_type=DateTime(timezone=True))

    # Relations
    destinataire: Utilisateur | None = Relationship(back_populates="notifications")


class LogActivite(SQLModel, table=True):
    __tablename__ = "logs_activite"
    
    id_log: int | None = Field(default=None, primary_key=True)
    id_utilisateur: int | None = Field(default=None, foreign_key="utilisateurs.id_utilisateur")
    action: str | None = Field(default=None, max_length=100)
    description: str | None = None
    date_action: datetime | None = Field(default_factory=get_datetime_utc, sa_type=DateTime(timezone=True))

    # Relations
    utilisateur: Utilisateur | None = Relationship(back_populates="logs")


# ==========================================
# 3. SCHEMAS API (Pydantic / Validation)
# ==========================================
class UtilisateurPublic(SQLModel):
    id_utilisateur: int
    nom: str
    prenom: str
    email: EmailStr
    role: UserRole
    is_active: bool
    is_superuser: bool

class UtilisateursPublic(SQLModel):
    data: list[UtilisateurPublic]
    count: int

class UtilisateurCreate(SQLModel):
    email: EmailStr = Field(max_length=100)
    password: str = Field(min_length=8, max_length=40)
    nom: str = Field(max_length=50)
    prenom: str = Field(max_length=50)
    role: UserRole = UserRole.ELEVE
    is_superuser: bool = False
    is_active: bool = True

class UtilisateurUpdate(SQLModel):
    email: EmailStr | None = Field(default=None, max_length=100)
    password: str | None = Field(default=None, min_length=8, max_length=40)
    nom: str | None = Field(default=None, max_length=50)
    prenom: str | None = Field(default=None, max_length=50)
    role: UserRole | None = None
    is_active: bool | None = None
    is_superuser: bool | None = None

class UtilisateurUpdateMe(SQLModel):
    nom: str | None = Field(default=None, max_length=50)
    prenom: str | None = Field(default=None, max_length=50)
    email: EmailStr | None = Field(default=None, max_length=100)

class UpdatePassword(SQLModel):
    current_password: str = Field(min_length=8, max_length=40)
    new_password: str = Field(min_length=8, max_length=40)

class UtilisateurRegister(SQLModel):
    email: EmailStr = Field(max_length=100)
    password: str = Field(min_length=8, max_length=40)
    nom: str = Field(max_length=50)
    prenom: str = Field(max_length=50)

# ==========================================
# 4. CLASSES UTILITAIRES DU TEMPLATE (Auth)
# ==========================================
class Message(SQLModel):
    message: str

class Token(SQLModel):
    access_token: str
    token_type: str = "bearer"

class TokenPayload(SQLModel):
    sub: str | None = None

class NewPassword(SQLModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)