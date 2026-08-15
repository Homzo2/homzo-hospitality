# Homzo Hospitality Platform

Homzo is an enterprise-level hotel booking and property aggregation platform designed for high scale, security, and modularity.

## Project Architecture

The project is organized into three independent modules:

```text
homzo/
│
├── public-website/        ← Public facing website (Home, About, Careers, Support, etc.)
│   ├── index.html
│   ├── about.html
│   └── Login/
│
├── admin-panel/           ← Super Admin Panel (React.js + Tailwind CSS + Recharts)
│   ├── src/
│   └── dist/              ← Compiled production build
│
├── backend/               ← Express.js MVC Backend & Database Services
│   ├── src/
│   │   ├── config/        ← Database & environment configuration
│   │   ├── controllers/   ← Business logic controllers
│   │   ├── middlewares/   ← JWT, RBAC, and Audit Logging middlewares
│   │   ├── models/        ← Sequelize models (PostgreSQL / MySQL / SQLite)
│   │   └── routes/        ← API route endpoints
│   └── database.sqlite    ← Local development database (SQLite)
│
├── uploads/               ← Candidate resumes & uploaded property media
│
├── docs/                  ← Legacy reference files & documentation
│   └── old-admin/         ← Old HTML/JS admin panel for reference
│
└── README.md
```

## Tech Stack

*   **Frontend**: React.js, Vite, Tailwind CSS, Lucide Icons, Recharts
*   **Backend**: Node.js, Express.js, Sequelize ORM, Multer
*   **Database**: PostgreSQL or MySQL (defaults to local file-based **SQLite** for development)
*   **Authentication**: JSON Web Tokens (JWT) + Bcrypt passcode hashing + Two-Factor Authentication (2FA)

---

## Setup & Running Locally

Follow these simple steps to run the complete system on your machine:

### 1. Install Dependencies
Install dependencies for all modules in one go:
```bash
npm run install-all
```

### 2. Build the Admin Panel
Compile the React admin panel into static assets:
```bash
npm run build-admin
```

### 3. Start the Server
Start the Express server:
```bash
npm start
```

Once started, the server automatically:
1.  Creates and synchronizes the SQL database tables.
2.  **Migrates and seeds all your existing CSV database records** (partners, bookings, reviews, jobs, applications) into the database.
3.  Exposes the platform at the following URLs:
    *   **Public Website**: [http://localhost:3000/](http://localhost:3000/)
    *   **Super Admin Panel**: [http://localhost:3000/admin](http://localhost:3000/admin)
    *   **REST APIs**: `http://localhost:3000/api/v1/`

---

## Authorized Credentials (Seeded)

*   **Super Admin Account**:
    *   **Email**: `admin@homzo.in`
    *   **Password**: `admin123`
    *   *Note: Two-Factor Authentication (2FA) can be enabled inside the panel.*
*   **Default Partner Account**:
    *   **Email**: `partner@homzo.in`
    *   **Password**: `partner123`
*   **Default Customer Account**:
    *   **Email**: `customer@homzo.in`
    *   **Password**: `customer123`
