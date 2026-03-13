const { MongoClient } = require('mongodb');
const { Pool } = require('pg');

async function migratePostAuthors() {
  // Connect to PostgreSQL (auth service)
  const pgPool = new Pool({
    host: 'authservice-postgres',
    port: 5432,
    user: 'postgres',
    password: 'postgrespassword',
    database: 'authdb'
  });

  // Connect to MongoDB (post service)
  const mongoClient = new MongoClient('mongodb://postservice-mongodb:27017');
  await mongoClient.connect();
  const db = mongoClient.db('minisocial');
  const postsCollection = db.collection('posts');

  try {
    // Get all users from PostgreSQL
    const usersResult = await pgPool.query('SELECT email, username FROM users WHERE username IS NOT NULL');
    const emailToUsername = {};
    
    usersResult.rows.forEach(user => {
      emailToUsername[user.email] = user.username;
    });

    console.log('Email to Username mapping:', emailToUsername);

    // Get all posts
    const posts = await postsCollection.find({}).toArray();
    console.log(`Found ${posts.length} posts to check`);

    let updatedCount = 0;
    
    // Update posts with email authors to username
    for (const post of posts) {
      if (post.author && post.author.includes('@')) {
        const username = emailToUsername[post.author];
        if (username) {
          await postsCollection.updateOne(
            { _id: post._id },
            { $set: { author: username } }
          );
          console.log(`Updated post: ${post.author} -> ${username}`);
          updatedCount++;
        }
      }

      // Update comments with email authors to username
      if (post.comments && post.comments.length > 0) {
        let commentsUpdated = false;
        const updatedComments = post.comments.map(comment => {
          if (comment.author && comment.author.includes('@')) {
            const username = emailToUsername[comment.author];
            if (username) {
              console.log(`Updated comment: ${comment.author} -> ${username}`);
              commentsUpdated = true;
              return { ...comment, author: username };
            }
          }
          return comment;
        });

        if (commentsUpdated) {
          await postsCollection.updateOne(
            { _id: post._id },
            { $set: { comments: updatedComments } }
          );
        }
      }
    }

    console.log(`Migration complete! Updated ${updatedCount} posts.`);
  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    await pgPool.end();
    await mongoClient.close();
  }
}

migratePostAuthors();
