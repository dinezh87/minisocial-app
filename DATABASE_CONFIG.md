# Minisocial - Database Connection Configuration

## Overview
All microservices now use environment variables from their respective `.env` and `secrets.env` files for database connections.

## Service Configurations

### 1. Auth Service (Node.js + PostgreSQL)
**File**: `auth-service/index.js`

**Environment Variables Used**:
```
DB_HOST=postgres
DB_PORT=5432
DB_NAME=authdb
DB_USER=postgres
DB_PASSWORD=postgrespassword  (from secrets.env)
JWT_SECRET=devsecret
```

**Connection**: Uses `pg` Pool with environment variables

---

### 2. Post Service (Python + MongoDB)
**File**: `post-service/app/main.py`

**Environment Variables Used**:
```
MONGO_HOST=mongo
MONGO_PORT=27017
MONGO_DB=posts
```

**Connection String**: `mongodb://{MONGO_HOST}:{MONGO_PORT}`

---

### 3. User Service (Go + MySQL)
**File**: `user-service/main.go`

**Environment Variables Used**:
```
MYSQL_HOST=mysql
MYSQL_PORT=3306
MYSQL_DB=users
MYSQL_USER=root
MYSQL_PASSWORD=rootpassword  (from secrets.env)
PORT=8080
```

**Connection String**: `{USER}:{PASSWORD}@tcp({HOST}:{PORT})/{DB}`

---

### 4. Media Service (Java + Local Storage)
**File**: `media-service/.env`

**Environment Variables**:
```
PORT=8080
STORAGE_TYPE=local  (overridden in docker-compose)
STORAGE_PATH=/app/media
```

**Note**: For local testing, docker-compose overrides `STORAGE_TYPE=local` and mounts `./media_storage` to `/app/media`

---

### 5. Feed Service (Rust + Redis)
**File**: `feed-service/.env`

**Environment Variables**:
```
PORT=8080
REDIS_HOST=redis
REDIS_PORT=6379
```

---

## Frontend Configuration

### React Environment Variables
**File**: `frontend/.env`

```
REACT_APP_AUTH_URL=http://localhost:3000
REACT_APP_POST_URL=http://localhost:8000
REACT_APP_MEDIA_URL=http://localhost:8081
REACT_APP_USER_URL=http://localhost:8082
REACT_APP_FEED_URL=http://localhost:8083
```

**Usage in React**:
```javascript
const AUTH_API = process.env.REACT_APP_AUTH_URL;
const POST_API = process.env.REACT_APP_POST_URL;
const MEDIA_API = process.env.REACT_APP_MEDIA_URL;
const USER_API = process.env.REACT_APP_USER_URL;
const FEED_API = process.env.REACT_APP_FEED_URL;

// Example
fetch(`${POST_API}/posts`)
fetch(`${MEDIA_API}/upload`)
```

---

## Docker Networking

### Internal Service Communication (Container to Container)
Services communicate using service names defined in docker-compose:
- `postgres:5432`
- `mongo:27017`
- `mysql:3306`
- `redis:6379`

### External Access (Browser to Container)
Frontend (running in browser) accesses services via localhost:
- Auth: `http://localhost:3000`
- Post: `http://localhost:8000`
- Media: `http://localhost:8081`
- User: `http://localhost:8082`
- Feed: `http://localhost:8083`

---

## Port Mappings

| Service | Internal Port | External Port |
|---------|--------------|---------------|
| auth-service | 3000 | 3000 |
| post-service | 8000 | 8000 |
| media-service | 8080 | 8081 |
| user-service | 8080 | 8082 |
| feed-service | 8080 | 8083 |
| frontend | 80 | 80 |
| postgres | 5432 | 5432 |
| mongo | 27017 | 27017 |
| mysql | 3306 | 3306 |
| redis | 6379 | 6379 |

---

## Running the Application

### Start all services:
```bash
docker-compose up --build
```

### Start in detached mode:
```bash
docker-compose up -d --build
```

### View logs:
```bash
docker-compose logs -f [service-name]
```

### Stop all services:
```bash
docker-compose down
```

### Stop and remove volumes:
```bash
docker-compose down -v
```

---

## Database Initialization

### PostgreSQL (Auth Service)
You may need to create the users table:
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### MySQL (User Service)
You may need to create the users table:
```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255),
  bio TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### MongoDB (Post Service)
No schema required - MongoDB will create collections automatically.

---

## Security Notes

1. **Never commit** `secrets.env` files to git (already in .gitignore)
2. **Change default passwords** in production
3. **Use strong JWT secrets** in production
4. **Enable authentication** on MongoDB in production
5. **Use SSL/TLS** for database connections in production

---

## Troubleshooting

### Service can't connect to database
- Check if database service is healthy: `docker-compose ps`
- Check logs: `docker-compose logs [database-service]`
- Verify environment variables: `docker-compose exec [service] env`

### Frontend can't reach backend
- Ensure all services are running: `docker-compose ps`
- Check browser console for CORS errors
- Verify URLs in frontend/.env match exposed ports

### Database data persists after restart
- Named volumes are used for persistence
- To reset: `docker-compose down -v`
