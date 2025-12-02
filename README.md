# Oneo Website

A modern full-stack web application built with Django, React, and PostgreSQL, following an API-first design pattern.

## Tech Stack

- **Backend**: Django 5.2.9 with Django REST Framework
- **Frontend**: React 18 with Vite
- **Database**: PostgreSQL 14
- **API**: RESTful API with CORS support

## Project Structure

```
OneoWebsite/
├── backend/              # Django API backend
│   ├── api/             # API app with views and endpoints
│   ├── config/          # Django project configuration
│   ├── venv/            # Python virtual environment
│   ├── manage.py        # Django management script
│   ├── requirements.txt
│   ├── .env             # Environment variables (not in git)
│   └── .env.example     # Environment variables template
├── frontend/            # React frontend
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── services/    # API service layer
│   │   ├── types/       # TypeScript type definitions
│   │   ├── constants/   # App constants (routes, colors, config)
│   │   ├── App.jsx      # Main React component
│   │   └── ...
│   ├── .env             # Frontend environment variables (not in git)
│   └── .env.example     # Frontend environment variables template
├── scripts/             # Development scripts
│   ├── start-backend.sh  # Start Django server
│   ├── start-frontend.sh # Start React server
│   └── start-dev.sh      # Start both servers
├── Docs/                # Project documentation
│   ├── V1 Plan          # Phased development roadmap
│   ├── ARCHITECTURE.md  # System architecture
│   └── CODING_STANDARDS.md  # Code style guide
├── .claude/             # Claude Code configuration
│   ├── instructions.md  # Project context for AI
│   └── commands/        # Custom slash commands
└── README.md
```

## Prerequisites

- Python 3.11+
- Node.js 24+
- PostgreSQL 14+
- npm 11+

## Setup Instructions

### 1. Clone the Repository

```bash
cd OneoWebsite
```

### 2. Backend Setup

#### a. Create and activate Python virtual environment

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

#### b. Install Python dependencies

```bash
pip install -r requirements.txt
```

#### c. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and update the following variables:
- `SECRET_KEY`: Django secret key
- `DATABASE_NAME`: PostgreSQL database name
- `DATABASE_USER`: PostgreSQL username
- `DATABASE_PASSWORD`: PostgreSQL password

#### d. Create PostgreSQL database

```bash
psql postgres
CREATE DATABASE oneo_db;
CREATE USER oneo_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE oneo_db TO oneo_user;
\q
```

#### e. Run migrations

```bash
python manage.py migrate
```

#### f. Create superuser (optional)

```bash
python manage.py createsuperuser
```

### 3. Frontend Setup

#### a. Install Node dependencies

```bash
cd ../frontend
npm install
```

#### b. Configure environment variables

```bash
cp .env.example .env
```

The default API URL is set to `http://localhost:8000/api`

## Running the Application

### Quick Start (Recommended)

We provide convenient scripts to start the development servers:

**Start Backend Only:**
```bash
./scripts/start-backend.sh
```

**Start Frontend Only:**
```bash
./scripts/start-frontend.sh
```

**Start Both (Concurrent):**
```bash
./scripts/start-dev.sh
```

The scripts will:
- ✅ Check for dependencies
- ✅ Verify environment files
- ✅ Run migrations if needed
- ✅ Start the development servers

**URLs:**
- 🔹 Backend API: `http://localhost:8000`
- 🔹 Frontend App: `http://localhost:5173`
- 🔹 Admin Panel: `http://localhost:8000/admin/`

### Manual Start (Alternative)

**Start Backend (Django):**
```bash
cd backend
source venv/bin/activate
python manage.py runserver
```

**Start Frontend (React):**
```bash
cd frontend
npm run dev
```

## API Endpoints

### Health Check
- **GET** `/api/health/`
  - Returns API status and version information

### Hello World
- **GET** `/api/hello/`
  - Returns a simple greeting message

- **POST** `/api/hello/`
  - Body: `{ "name": "Your Name" }`
  - Returns a personalized greeting

### Admin Panel
- **URL**: `http://localhost:8000/admin/`
- Login with superuser credentials

## Development

### Backend Development

- Django admin: `http://localhost:8000/admin/`
- API documentation: Add DRF browsable API or Swagger
- Run tests: `python manage.py test`
- Make migrations: `python manage.py makemigrations`

### Frontend Development

- Vite provides hot module replacement (HMR)
- API service layer located in `src/services/api.js`
- Configure API interceptors for authentication

## API-First Design

This application follows an API-first approach:

1. **Backend (Django REST Framework)**
   - Provides RESTful API endpoints
   - Handles business logic and data persistence
   - Returns JSON responses

2. **Frontend (React)**
   - Consumes API endpoints
   - Handles UI/UX and user interactions
   - Makes HTTP requests via Axios

3. **Decoupled Architecture**
   - Frontend and backend are independent
   - Easy to scale and maintain
   - Can deploy separately

## CORS Configuration

CORS is configured to allow requests from:
- `http://localhost:5173` (Vite dev server)
- `http://localhost:3000` (Alternative React port)

Update `CORS_ALLOWED_ORIGINS` in `backend/.env` for production.

## Environment Variables

### Backend (.env)
```
SECRET_KEY=your-secret-key
DEBUG=True
DATABASE_NAME=oneo_db
DATABASE_USER=oneo_user
DATABASE_PASSWORD=your-password
DATABASE_HOST=localhost
DATABASE_PORT=5432
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:8000/api
```

## Common Issues

### CORS Errors
- Ensure Django server is running
- Check `CORS_ALLOWED_ORIGINS` in backend settings
- Verify frontend is using correct API URL

### Database Connection Errors
- Verify PostgreSQL is running
- Check database credentials in `.env`
- Ensure database and user exist

### Module Not Found
- Backend: Activate virtual environment and run `pip install -r requirements.txt`
- Frontend: Run `npm install`

## Next Steps

- [ ] Add authentication (JWT or session-based)
- [ ] Implement user registration and login
- [ ] Add more API endpoints
- [ ] Create additional React components
- [ ] Add unit and integration tests
- [ ] Set up CI/CD pipeline
- [ ] Configure for production deployment

## License

MIT
