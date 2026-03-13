# Minisocial - Local Development Setup

## ✅ Successfully Running Services

### Databases
- **PostgreSQL** (Auth DB): `localhost:5433`
  - Database: `authdb`
  - User: `postgres`
  - Password: `postgrespassword`

- **MongoDB** (Post DB): `localhost:27018`
  - Database: `posts`
  - No authentication

- **MySQL** (User DB): `localhost:3307`
  - Database: `users`
  - User: `root`
  - Password: `rootpassword`

- **Redis** (Feed Cache): `localhost:6380`

### Microservices

| Service | Port | Status | Endpoint |
|---------|------|--------|----------|
| Frontend | 80 | ✅ Running | http://localhost |
| Auth Service | 3000 | ✅ Running | http://localhost:3000 |
| Post Service | 8000 | ✅ Running | http://localhost:8000 |
| Media Service | 8081 | ✅ Running | http://localhost:8081 |
| User Service | 8082 | ✅ Running | http://localhost:8082 |
| Feed Service | 8083 | ✅ Running | http://localhost:8083/feed |

## 🚀 Quick Start

### Start All Services
```bash
cd /Users/dineshkumar/Desktop/Devops/Minisocial
docker-compose up -d
```

### Check Status
```bash
docker-compose ps
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f auth-service
docker-compose logs -f post-service
```

### Stop All Services
```bash
docker-compose down
```

### Stop and Remove Volumes (Reset Data)
```bash
docker-compose down -v
```

## 🧪 Testing the Services

### Test Auth Service
```bash
# Health check
curl http://localhost:3000

# Signup
curl -X POST http://localhost:3000/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","username":"testuser","sex":"other","dob":"1995-01-01","birthplace":"Chennai","currentCity":"London"}'

# Login
curl -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### Test Post Service
```bash
# Get posts
curl http://localhost:8000/posts

# Create post
curl -X POST http://localhost:8000/posts \
  -H "Content-Type: application/json" \
  -d '{"title":"My Post","content":"Hello World"}'
```

### Test User Service
```bash
# Get users
curl http://localhost:8082/users
```

### Test Media Service
```bash
# Upload file
curl -X POST http://localhost:8081/media/upload \
  -F "file=@/path/to/your/file.jpg"
```

## 📊 Database Initialization

### PostgreSQL (Auth Service)
```bash
docker-compose exec postgres psql -U postgres -d authdb -c "
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(255) UNIQUE,
  password VARCHAR(255) NOT NULL,
  sex VARCHAR(50),
  dob DATE,
  birthplace VARCHAR(255),
  current_city VARCHAR(255),
  profile_pic TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);"
```

### MySQL (User Service)
```bash
docker-compose exec mysql mysql -uroot -prootpassword users -e "
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255),
  bio TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);"
```

### MongoDB (Post Service)
No initialization needed - collections are created automatically.

## 🌐 Access Your Application

Open your browser and go to:
- **Frontend**: http://localhost
- **Auth API**: http://localhost:3000
- **Post API**: http://localhost:8000
- **Media API**: http://localhost:8081
- **User API**: http://localhost:8082
- **Feed API**: http://localhost:8083/feed

## 📁 Local Media Storage

Media files are stored in:
```
/Users/dineshkumar/Desktop/Devops/Minisocial/media_storage/
```

## 🔧 Troubleshooting

### Service Won't Start
```bash
# Check logs
docker-compose logs [service-name]

# Restart specific service
docker-compose restart [service-name]

# Rebuild and restart
docker-compose up -d --build [service-name]
```

### Port Already in Use
If you get port conflicts, the docker-compose.yml already uses alternate ports:
- PostgreSQL: 5433 (instead of 5432)
- MongoDB: 27018 (instead of 27017)
- MySQL: 3307 (instead of 3306)
- Redis: 6380 (instead of 6379)

### Database Connection Issues
Make sure services use the correct hostnames:
- Inside containers: `postgres`, `mongo`, `mysql`, `redis`
- From your laptop: `localhost` with mapped ports

### Clear Everything and Start Fresh
```bash
docker-compose down -v
docker system prune -a
docker-compose up -d --build
```

## 📝 Notes

1. **Feed Service**: Rewritten in Node.js to match the JavaScript parts of the app and reduce container startup issues.

2. **Environment Variables**: All services load their configuration from `.env` and `secrets.env` files in their respective directories.

3. **Data Persistence**: Database data is stored in Docker volumes and persists between restarts.

4. **Frontend URLs**: The React app is configured to call microservices at:
   - Auth: http://localhost:3000
   - Post: http://localhost:8000
 - Media: http://localhost:8081
 - User: http://localhost:8082
  - Feed: http://localhost:8083

5. **Production**: This setup is for LOCAL TESTING ONLY. For production, you'll need:
   - Proper secrets management
   - SSL/TLS certificates
   - API Gateway
   - Load balancing
   - Monitoring and logging

## 🎉 Success!

Your Minisocial application is now running locally on your laptop!

You can access the frontend at **http://localhost** and start testing your microservices architecture.
