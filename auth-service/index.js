const express = require("express")
const jwt = require("jsonwebtoken")
const bcrypt = require("bcrypt")
const {Pool} = require("pg")

const app = express()
app.use(express.json())

function parseBoolean(value, defaultValue = false) {
  if (value === undefined) {
    return defaultValue
  }

  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase())
}

// Enable CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

const db = new Pool({
 host: process.env.DB_HOST || "postgres",
 port: process.env.DB_PORT || 5432,
 user: process.env.DB_USER || "postgres",
 password: process.env.DB_PASSWORD,
 database: process.env.DB_NAME || "authdb",
 ssl: parseBoolean(process.env.DB_SSL, false)
  ? {rejectUnauthorized: parseBoolean(process.env.DB_SSL_REJECT_UNAUTHORIZED, false)}
  : false
})

async function ensureUserProfileColumns() {
  await db.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS birthplace VARCHAR(255),
    ADD COLUMN IF NOT EXISTS current_city VARCHAR(255)
  `)
}

app.post("/signup", async(req,res)=>{
 try {
  const {email,password,username,sex,dob,birthplace,currentCity} = req.body

  if (!email || !password || !username) {
    return res.status(400).json({message: "Email, password and username required"});
  }

  const hash = await bcrypt.hash(password,10)

  await db.query(
    "INSERT INTO users(email,password,username,sex,dob,birthplace,current_city) VALUES($1,$2,$3,$4,$5,$6,$7)",
    [email,hash,username,sex,dob,birthplace,currentCity]
  )

  res.json({message: "User created"})
 } catch(err) {
   console.error("Signup error:", err);
   if (err.code === '23505') {
     return res.status(400).json({message: "Email or username already exists"});
   }
   res.status(500).json({message: "Signup failed"});
 }
})

app.post("/login", async(req,res)=>{
 try {
  const {email,password} = req.body

  if (!email || !password) {
    return res.status(400).json({message: "Email and password required"});
  }

  const user = await db.query(
    "SELECT * FROM users WHERE email=$1",
    [email]
  )

  if (user.rows.length === 0) {
    return res.status(401).json({message: "Invalid credentials"});
  }

  const valid = await bcrypt.compare(password,user.rows[0].password)

  if(!valid) {
    return res.status(401).json({message: "Invalid credentials"});
  }

  const token = jwt.sign({id:user.rows[0].id, email:user.rows[0].email, username:user.rows[0].username}, process.env.JWT_SECRET || "secret")

  res.json({
    token, 
    username: user.rows[0].username,
    email: user.rows[0].email,
    sex: user.rows[0].sex,
    dob: user.rows[0].dob,
    birthplace: user.rows[0].birthplace,
    currentCity: user.rows[0].current_city,
    profilePic: user.rows[0].profile_pic
  })
 } catch(err) {
   console.error("Login error:", err);
   res.status(500).json({message: "Login failed"});
 }
})

app.get("/profile", async(req,res)=>{
 try {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({message: "No token provided"});
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret");
  const user = await db.query(
    "SELECT id, email, username, sex, dob, birthplace, current_city, profile_pic FROM users WHERE id=$1",
    [decoded.id]
  )

  if (user.rows.length === 0) {
    return res.status(404).json({message: "User not found"});
  }

  res.json(user.rows[0]);
 } catch(err) {
   console.error("Profile error:", err);
   res.status(500).json({message: "Failed to fetch profile"});
 }
})

app.put("/profile", async(req,res)=>{
 try {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({message: "No token provided"});
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret");
  const {username, sex, dob, birthplace, currentCity, profilePic} = req.body;

  await db.query(
    "UPDATE users SET username=$1, sex=$2, dob=$3, birthplace=$4, current_city=$5, profile_pic=$6 WHERE id=$7",
    [username, sex, dob, birthplace, currentCity, profilePic, decoded.id]
  )

  res.json({message: "Profile updated"});
 } catch(err) {
   console.error("Update error:", err);
   res.status(500).json({message: "Failed to update profile"});
 }
})

app.get("/user/:identifier", async(req,res)=>{
 try {
  const {identifier} = req.params;
  const user = await db.query(
    "SELECT username, email, sex, dob, birthplace, current_city, profile_pic FROM users WHERE username=$1 OR email=$1",
    [identifier]
  )

  if (user.rows.length === 0) {
    return res.status(404).json({message: "User not found"});
  }

  res.json(user.rows[0]);
 } catch(err) {
   console.error("User fetch error:", err);
   res.status(500).json({message: "Failed to fetch user"});
 }
})

app.get("/search", async(req,res)=>{
 try {
  const {q} = req.query;
  if (!q || q.trim().length === 0) {
    return res.json([]);
  }

  const users = await db.query(
    "SELECT username, profile_pic FROM users WHERE username ILIKE $1 LIMIT 10",
    [`%${q}%`]
  )

  res.json(users.rows);
 } catch(err) {
   console.error("Search error:", err);
   res.status(500).json({message: "Search failed"});
 }
})

app.get("/health", (req,res) => {
  res.json({status: "ok"});
});

ensureUserProfileColumns()
  .then(() => {
    app.listen(3000, () => {
      console.log("Auth service running on port 3000");
    });
  })
  .catch((err) => {
    console.error("Startup migration error:", err);
    process.exit(1);
  });
