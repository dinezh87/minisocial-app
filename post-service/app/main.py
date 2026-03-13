import os
import json
import asyncio
from datetime import datetime
from urllib import error, parse, request
from uuid import uuid4
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pymongo import MongoClient

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

mongo_host = os.getenv("MONGO_HOST")
mongo_port = os.getenv("MONGO_PORT")
mongo_db = os.getenv("MONGO_DB")

mongo_uri = f"mongodb://{mongo_host}:{mongo_port}"
notification_service = os.getenv("NOTIFICATION_SERVICE_URL", "http://notification-service:8090")
auth_service = os.getenv("AUTH_SERVICE_URL", "http://auth-service:3000")

client = MongoClient(mongo_uri)

db = client[mongo_db]
subscribers = []


def normalize_post(post: dict | None):
    if not post:
        return None

    normalized = {key: value for key, value in post.items() if key != "_id"}
    if "likes" not in normalized:
        normalized["likes"] = 0
    if "likedBy" not in normalized:
        normalized["likedBy"] = []
    if "comments" not in normalized:
        normalized["comments"] = []
    if "postId" not in normalized:
        normalized["postId"] = normalized.get("content")
    return normalized


def build_post_lookup(post_id: str):
    return {"$or": [{"postId": post_id}, {"content": post_id}]}


def normalize_identifier(value: str | None):
    return (value or "").strip().lower()


def fetch_user_aliases(identifier: str):
    aliases = {normalize_identifier(identifier)}

    if not identifier:
        return aliases

    try:
        with request.urlopen(
            f"{auth_service}/user/{parse.quote(identifier)}",
            timeout=2,
        ) as response:
            payload = json.loads(response.read().decode("utf-8"))
            aliases.update(
                {
                    normalize_identifier(payload.get("username")),
                    normalize_identifier(payload.get("email")),
                }
            )
    except (error.URLError, error.HTTPError, TimeoutError, json.JSONDecodeError) as err:
        print("User alias lookup error:", err)

    return {alias for alias in aliases if alias}


def is_same_user(recipient: str, actor: str):
    recipient_aliases = fetch_user_aliases(recipient)
    actor_aliases = fetch_user_aliases(actor)

    if not recipient_aliases or not actor_aliases:
        return normalize_identifier(recipient) == normalize_identifier(actor)

    return bool(recipient_aliases.intersection(actor_aliases))


def send_notification(recipient: str, actor: str, notification_type: str, post_content: str, comment_text: str = ""):
    if not recipient or not actor or is_same_user(recipient, actor):
        return

    payload = {
        "recipient": recipient,
        "actor": actor,
        "actorProfile": actor,
        "type": notification_type,
        "postContent": post_content,
        "commentText": comment_text,
    }

    try:
        req = request.Request(
            f"{notification_service}/notifications",
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        request.urlopen(req, timeout=2)
    except (error.URLError, error.HTTPError, TimeoutError) as err:
        print("Notification dispatch error:", err)


async def broadcast_post_event(event_type: str, post: dict):
    stale = []
    message = f"event: {event_type}\ndata: {json.dumps(post)}\n\n"

    for queue in subscribers:
        try:
            queue.put_nowait(message)
        except Exception:
            stale.append(queue)

    for queue in stale:
        if queue in subscribers:
            subscribers.remove(queue)


@app.get("/posts")
def get_posts():
    posts = list(db.posts.find({},{"_id":0}).sort("timestamp", -1))
    return [normalize_post(post) for post in posts]


@app.get("/posts/stream")
async def stream_posts():
    queue = asyncio.Queue()
    subscribers.append(queue)

    async def event_generator():
        try:
            while True:
                try:
                    message = await asyncio.wait_for(queue.get(), timeout=25)
                    yield message
                except asyncio.TimeoutError:
                    yield ": keep-alive\n\n"
        finally:
            if queue in subscribers:
                subscribers.remove(queue)

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@app.post("/posts")
async def create_post(post:dict):
    post["postId"] = str(uuid4())
    post["likes"] = 0
    post["likedBy"] = []
    post["comments"] = []
    post["timestamp"] = datetime.utcnow().isoformat()
    db.posts.insert_one(post)
    live_post = normalize_post(post)
    await broadcast_post_event("post_created", live_post)
    return {"status":"ok"}


@app.post("/posts/{post_id}/share")
async def share_post(post_id: str, payload: dict):
    actor = payload.get("actor")
    if not actor:
        return {"status": "error", "message": "actor is required"}

    original_post = db.posts.find_one(build_post_lookup(post_id))
    if not original_post:
        return {"status": "error", "message": "post not found"}

    shared_post = normalize_post(original_post)
    new_post = {
        "postId": str(uuid4()),
        "author": actor,
        "content": payload.get("content", "").strip(),
        "sharedPost": shared_post,
        "likes": 0,
        "likedBy": [],
        "comments": [],
        "timestamp": datetime.utcnow().isoformat(),
    }

    db.posts.insert_one(new_post)
    live_post = normalize_post(new_post)
    await broadcast_post_event("post_created", live_post)

    original_author = shared_post.get("author")
    original_content = shared_post.get("content", "")
    if original_author:
        send_notification(original_author, actor, "post_share", original_content)

    return {"status": "ok", "post": live_post}

@app.post("/posts/{post_id}/like")
def like_post(post_id:str, payload:dict):
    actor = payload.get("actor")
    if not actor:
        return {"status":"error", "message":"actor is required"}

    post = db.posts.find_one(build_post_lookup(post_id), {"_id": 0, "author": 1, "likedBy": 1})
    if not post:
        return {"status":"error", "message":"post not found"}

    if actor in post.get("likedBy", []):
        return {"status":"ok", "alreadyLiked": True}

    result = db.posts.update_one(
        {"$and": [build_post_lookup(post_id), {"likedBy": {"$ne": actor}}]},
        {"$inc": {"likes": 1}, "$addToSet": {"likedBy": actor}}
    )
    if result.modified_count > 0:
        send_notification(post.get("author"), actor, "post_like", post_id)
        return {"status":"ok", "alreadyLiked": False}

    return {"status":"ok", "alreadyLiked": True}

@app.post("/posts/{post_id}/comment")
def comment_post(post_id:str, comment:dict):
    post = db.posts.find_one(build_post_lookup(post_id), {"_id": 0, "author": 1})
    comment["likes"] = 0
    comment["replies"] = []
    db.posts.update_one(build_post_lookup(post_id),{"$push":{"comments":comment}})
    if post and comment.get("author"):
        send_notification(post.get("author"), comment.get("author"), "post_comment", post_id, comment.get("text", ""))
    return {"status":"ok"}

@app.post("/posts/{post_id}/comment/{comment_index}/like")
def like_comment(post_id:str, comment_index:int, payload:dict):
    actor = payload.get("actor")
    post = db.posts.find_one(build_post_lookup(post_id), {"_id": 0, "comments": 1})
    db.posts.update_one(
        build_post_lookup(post_id),
        {"$inc":{f"comments.{comment_index}.likes":1}}
    )
    if post and actor:
        comments = post.get("comments", [])
        if 0 <= comment_index < len(comments):
            recipient = comments[comment_index].get("author")
            send_notification(recipient, actor, "comment_like", post_id, comments[comment_index].get("text", ""))
    return {"status":"ok"}

@app.post("/posts/{post_id}/comment/{comment_index}/reply")
def reply_to_comment(post_id:str, comment_index:int, reply:dict):
    post = db.posts.find_one(build_post_lookup(post_id), {"_id": 0, "comments": 1})
    db.posts.update_one(
        build_post_lookup(post_id),
        {"$push":{f"comments.{comment_index}.replies":reply}}
    )
    if post and reply.get("author"):
        comments = post.get("comments", [])
        if 0 <= comment_index < len(comments):
            recipient = comments[comment_index].get("author")
            send_notification(recipient, reply.get("author"), "comment_reply", post_id, reply.get("text", ""))
    return {"status":"ok"}

@app.delete("/posts/{post_id}")
def delete_post(post_id:str):
    db.posts.delete_one(build_post_lookup(post_id))
    return {"status":"ok"}
