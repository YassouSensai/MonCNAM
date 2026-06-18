# MonCNAM

Système de gestion des présences pour la filière FIP Informatique du CNAM.  
Permet aux intervenants de générer des codes QR de pointage, aux apprentis de pointer leur présence, et à l'administration de suivre les taux d'assiduité en temps réel.

---

## Architecture

```
MonCNAM
├── accueil/              Page d'accueil (HTML statique — nginx)
├── backend/              API REST (Python / FastAPI)
├── frontend_admin/       Portail Scolarité / Administration (Next.js)
├── frontend_profs/       Portail Intervenant (Next.js)
└── frontend_apprenti/    Portail Apprenti / Étudiant (Next.js)
```

| Service        | URL locale             | Description                          |
|----------------|------------------------|--------------------------------------|
| Accueil        | http://localhost:8080  | Page d'accueil avec liens vers les portails |
| API backend    | http://localhost:8000  | API FastAPI + docs Swagger           |
| Admin          | http://localhost:3000  | Scolarité — gestion comptes, modules, emplois du temps |
| Intervenant    | http://localhost:3001  | Portail professeur — séances, QR, justificatifs |
| Apprenti       | http://localhost:3002  | Portail étudiant — emploi du temps, pointage, relevés |

---

## Démarrage rapide (Docker Compose)

### Prérequis

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installé et démarré
- Ports 3000, 3001, 3002, 8000, 8080 et 5445 disponibles

### Lancer tous les services

```bash
docker compose up
```

Le premier démarrage télécharge les images et installe les dépendances — compter 3 à 5 minutes.  
Le backend initialise automatiquement la base de données au premier lancement (`INIT_DB_ON_STARTUP=1`).

### Arrêter

```bash
docker compose down
```

Pour supprimer également les données de la base :

```bash
docker compose down -v
```

---

## Développement local (sans Docker)

### Backend

```bash
cd backend

# Créer un environnement virtuel
python -m venv .venv
source .venv/bin/activate  # Windows : .venv\Scripts\activate

# Installer les dépendances
pip install -r requirements.txt

# Configurer les variables d'environnement
cp .env.local.example .env
# Éditer .env : renseigner DATABASE_URL et SECRET_KEY

# Lancer le serveur (rechargement automatique)
python runserver.py
```

Documentation interactive disponible sur http://localhost:8000/docs

### Frontends

```bash
# Portail Admin
cd frontend_admin
npm install
npm run dev          # http://localhost:3000

# Portail Intervenant
cd frontend_profs
npm install
npm run dev -- -p 3001   # http://localhost:3001

# Portail Apprenti
cd frontend_apprenti
npm install
npm run dev -- -p 3002   # http://localhost:3002
```

---

## Variables d'environnement

### Backend (`backend/.env`)

| Variable             | Exemple                                        | Description                        |
|----------------------|------------------------------------------------|------------------------------------|
| `DATABASE_URL`       | `postgresql://user:pass@localhost:5432/db`     | Connexion PostgreSQL               |
| `SECRET_KEY`         | `une-cle-secrete-longue`                       | Clé de signature JWT               |
| `INIT_DB_ON_STARTUP` | `1`                                            | Initialise la BDD au démarrage     |
| `RELOAD`             | `1`                                            | Rechargement automatique (dev)     |

### Frontends

| Variable                | Exemple                        | Description                                |
|-------------------------|--------------------------------|--------------------------------------------|
| `NEXT_PUBLIC_API_URL`   | `http://localhost:8000/api`    | URL de l'API côté navigateur               |
| `BACKEND_INTERNAL_URL`  | `http://backend:8000/api`      | URL de l'API côté serveur (Docker network) |

---

## Stack technique

### Backend
- **Python 3.11** · FastAPI · Uvicorn
- **SQLModel** (SQLAlchemy + Pydantic) · PostgreSQL 15
- **JWT** (python-jose / PyJWT) · Passlib (bcrypt)
- Génération QR code : `qrcode[pil]`

### Frontends
- **Next.js 14** (App Router) · TypeScript
- **Tailwind CSS v4** · shadcn/ui · Radix UI
- **TanStack Query** (React Query) · Sonner (toasts)
- Icônes : Tabler Icons

---

## Fonctionnalités principales

### Portail Administration
- Gestion des comptes étudiants et intervenants
- Gestion des modules et affectation en masse (import CSV)
- Création et édition des emplois du temps par niveau
- Tableau de bord de suivi : taux de présence, tendances, modules critiques
- Surveillance des séances actives et des étudiants exclus

### Portail Intervenant
- Création de séances avec génération d'un code QR de pointage
- Mode projection (grand écran) pour afficher le QR en salle
- Suivi des présences en temps réel pendant la séance
- Historique et relevés de présence par module
- Gestion des justificatifs d'absence (approbation / rejet)

### Portail Apprenti
- Emploi du temps hebdomadaire avec navigation semaine par semaine
- Pointage de présence par scan QR ou saisie manuelle du code
- Relevés de présence avec calendrier mensuel
- Soumission de justificatifs d'absence (PDF, JPG, PNG — max 5 Mo)
- Notifications

---

## Modèle de données (résumé)

```
User ──┬── Student ── Level ── Schedule ── SDay (emploi du temps)
       │                └── Enrollment ── AttendanceRecord ── Justification
       └── Teacher ── TeacherModules ── Module
                           └── Session (séance active)
```

**Statuts de présence :** `present` · `absent` · `excluded`  
**Statuts de justificatif :** `pending` · `approved` · `rejected`

---

## API — principaux endpoints

| Méthode | Route                          | Description                             |
|---------|--------------------------------|-----------------------------------------|
| POST    | `/api/auth/login`              | Authentification (retourne un JWT)      |
| GET     | `/api/student/profile`         | Profil complet + emploi du temps        |
| GET     | `/api/student/attendance`      | Relevés de présence                     |
| POST    | `/api/student/attendance/mark` | Pointer une présence (code séance)      |
| POST    | `/api/student/justifications`  | Soumettre un justificatif               |
| GET     | `/api/teacher/modules`         | Modules affectés à l'intervenant        |
| POST    | `/api/teacher/sessions`        | Créer une séance                        |
| GET     | `/api/admin/students`          | Liste des étudiants                     |
| GET     | `/api/admin/schedules`         | Emplois du temps                        |

Documentation complète : http://localhost:8000/docs

---

## Structure du projet

```
backend/
├── src/
│   ├── auth/           Authentification JWT
│   ├── controllers/    Logique métier
│   ├── models/         Modèles SQLModel (ORM)
│   ├── routers/        Routeurs FastAPI (admin, teacher, student)
│   └── schema/         Schémas Pydantic
├── requirements.txt
└── runserver.py

frontend_admin/          frontend_profs/          frontend_apprenti/
└── src/                 └── src/                 └── src/
    ├── app/                 ├── app/                 ├── app/
    │   ├── auth/            │   ├── auth/            │   ├── auth/
    │   └── dashboard/       │   └── dashboard/       │   └── dashboard/
    ├── components/          ├── components/          ├── features/
    ├── features/            ├── features/            └── lib/
    └── lib/                 └── lib/
```

---

## Comptes de démonstration

Créés automatiquement à l'initialisation (`INIT_DB_ON_STARTUP=1`) — voir le script `backend/scripts/setup_local_db.sh` pour les identifiants par défaut.
