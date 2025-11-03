# Satyavak Backend Server

Express + TypeScript backend server with MongoDB, JWT authentication, sessions, and validation.

## Features

- ✅ MongoDB database with Mongoose
- ✅ JWT authentication (access + refresh tokens)
- ✅ HTTP-only cookies for secure token storage
- ✅ Express sessions with MongoDB store
- ✅ Input validation with Zod
- ✅ Rate limiting
- ✅ CORS, Helmet security
- ✅ Role-based access control (RBAC)

## Setup

### Prerequisites

- Node.js 18+ and npm
- MongoDB running locally or connection string

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file in the server directory:
```env
PORT=8080
MONGODB_URI=mongodb://127.0.0.1:27017/satyavak
JWT_SECRET=replace_with_strong_secret_min_32_chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
SESSION_SECRET=replace_with_strong_session_secret_min_32_chars
CORS_ORIGIN=http://localhost:5173
SECURE_COOKIES=false
```

3. Start MongoDB (if running locally):
```bash
# Windows (if installed as service, it should start automatically)
# Or use MongoDB Compass or MongoDB Atlas for cloud instance
```

### Running

**Development mode:**
```bash
npm run dev
```

**Production build:**
```bash
npm run build
npm start
```

The server will start on `http://localhost:8080` (or the PORT specified in `.env`).

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register a new user
  - Body: `{ email, name, password }`
  - Returns: `{ id, email, name, role }`
  - Sets httpOnly cookies for access and refresh tokens

- `POST /api/auth/login` - Login with email/password
  - Body: `{ email, password }`
  - Returns: `{ id, email, name, role }`
  - Sets httpOnly cookies for access and refresh tokens

- `POST /api/auth/refresh` - Refresh access token
  - Uses refresh token from cookie
  - Returns: `{ ok: true }`

- `POST /api/auth/logout` - Logout
  - Clears auth cookies

### Users

- `GET /api/users/me` - Get current user profile (requires auth)
  - Returns: `{ email, name, role, createdAt }`

- `GET /api/users` - List all users (admin only)
  - Returns: Array of user objects

### Health

- `GET /health` - Health check endpoint

## Database Schema

### User Model

```typescript
{
  email: string (unique, required)
  name: string (required)
  passwordHash: string (required, bcrypt hashed)
  role: 'user' | 'admin' (default: 'user')
  createdAt: Date
  updatedAt: Date
}
```

## Security Features

- Passwords are hashed with bcrypt (12 rounds)
- JWT tokens stored in httpOnly cookies (not accessible via JavaScript)
- Rate limiting on auth endpoints (100 requests per 15 minutes)
- Global rate limiting (500 requests per minute)
- CORS configured for specified origins
- Helmet security headers
- Input validation with Zod schemas

## Notes

- Cookies are set with `sameSite: 'lax'` for CSRF protection
- In production, set `SECURE_COOKIES=true` to only send cookies over HTTPS
- Make sure MongoDB is running before starting the server
- The server will automatically create the database if it doesn't exist

