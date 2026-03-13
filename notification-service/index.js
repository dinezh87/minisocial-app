const http = require("http");
const { URL } = require("url");
const net = require("net");
const crypto = require("crypto");

const port = Number(process.env.PORT || 8090);
const redisHost = process.env.REDIS_HOST || "redis";
const redisPort = Number(process.env.REDIS_PORT || 6379);
const MAX_NOTIFICATIONS = 100;
const notificationSubscribers = [];

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  });
  res.end(JSON.stringify(payload));
}

function buildRedisCommand(parts) {
  return `*${parts.length}\r\n${parts
    .map((part) => `$${Buffer.byteLength(String(part))}\r\n${part}\r\n`)
    .join("")}`;
}

function parseRedisReply(reply) {
  if (!reply) {
    throw new Error("Empty Redis reply");
  }

  const type = reply[0];

  if (type === "+") {
    return reply.slice(1).split("\r\n")[0];
  }

  if (type === ":") {
    return Number(reply.slice(1).split("\r\n")[0]);
  }

  if (type === "$") {
    const firstBreak = reply.indexOf("\r\n");
    const length = Number(reply.slice(1, firstBreak));

    if (length === -1) {
      return null;
    }

    return reply.slice(firstBreak + 2, firstBreak + 2 + length);
  }

  if (type === "-") {
    throw new Error(reply.slice(1).split("\r\n")[0]);
  }

  throw new Error(`Unsupported Redis reply type: ${type}`);
}

function sendRedisCommand(parts) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: redisHost, port: redisPort });
    let response = "";

    socket.setTimeout(1000);

    socket.on("connect", () => {
      socket.write(buildRedisCommand(parts));
    });

    socket.on("data", (chunk) => {
      response += chunk.toString("utf8");
      if (response.endsWith("\r\n")) {
        socket.end();
      }
    });

    socket.on("end", () => {
      try {
        resolve(parseRedisReply(response));
      } catch (error) {
        reject(error);
      }
    });

    socket.on("timeout", () => {
      socket.destroy();
      reject(new Error("Redis command timed out"));
    });

    socket.on("error", reject);
  });
}

function normalizeIdentifier(value) {
  return (value || "").trim().toLowerCase();
}

function getRedisKey(identifier) {
  return `notifications:${normalizeIdentifier(identifier)}`;
}

async function getNotificationList(identifier) {
  const raw = await sendRedisCommand(["GET", getRedisKey(identifier)]);
  if (!raw) {
    return [];
  }

  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function setNotificationList(identifier, notifications) {
  await sendRedisCommand([
    "SET",
    getRedisKey(identifier),
    JSON.stringify(notifications.slice(0, MAX_NOTIFICATIONS)),
  ]);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk.toString("utf8");
    });

    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });

    req.on("error", reject);
  });
}

function buildMessage(notification) {
  if (notification.type === "post_like") {
    return `${notification.actor} liked your post`;
  }
  if (notification.type === "post_comment") {
    return `${notification.actor} commented on your post`;
  }
  if (notification.type === "comment_like") {
    return `${notification.actor} liked your comment`;
  }
  if (notification.type === "comment_reply") {
    return `${notification.actor} replied to your comment`;
  }
  if (notification.type === "post_share") {
    return `${notification.actor} shared your post`;
  }
  return `${notification.actor} interacted with your feed`;
}

async function createNotification(payload) {
  const recipient = normalizeIdentifier(payload.recipient);
  const actor = (payload.actor || "").trim();

  if (!recipient || !actor || !payload.type) {
    throw new Error("recipient, actor and type are required");
  }

  if (normalizeIdentifier(actor) === recipient) {
    return null;
  }

  const existing = await getNotificationList(recipient);
  const notification = {
    id: crypto.randomUUID(),
    recipient,
    actor,
    actorProfile: payload.actorProfile || actor,
    type: payload.type,
    postContent: payload.postContent || "",
    commentText: payload.commentText || "",
    message: buildMessage(payload),
    read: false,
    createdAt: new Date().toISOString(),
  };

  await setNotificationList(recipient, [notification, ...existing]);
  broadcastNotification(recipient, notification);
  return notification;
}

function broadcastNotification(recipient, notification) {
  const message = `event: notification\ndata: ${JSON.stringify(notification)}\n\n`;

  for (let index = notificationSubscribers.length - 1; index >= 0; index -= 1) {
    const subscriber = notificationSubscribers[index];
    if (!subscriber.identifiers.has(recipient)) {
      continue;
    }

    try {
      subscriber.res.write(message);
    } catch (error) {
      notificationSubscribers.splice(index, 1);
    }
  }
}

async function listNotifications(identifiers) {
  const values = await Promise.all(
    identifiers.map(async (identifier) => getNotificationList(identifier))
  );

  const merged = values.flat();
  const uniqueById = new Map();

  for (const notification of merged) {
    uniqueById.set(notification.id, notification);
  }

  const notifications = Array.from(uniqueById.values()).sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );

  return {
    notifications,
    unreadCount: notifications.filter((item) => !item.read).length,
  };
}

async function markNotificationsRead(identifiers) {
  await Promise.all(
    identifiers.map(async (identifier) => {
      const notifications = await getNotificationList(identifier);
      const updated = notifications.map((item) => ({ ...item, read: true }));
      await setNotificationList(identifier, updated);
    })
  );
}

const server = http.createServer(async (req, res) => {
  if (!req.url) {
    return sendJson(res, 400, { message: "Bad request" });
  }

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    });
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  try {
    if (req.method === "GET" && url.pathname === "/health") {
      return sendJson(res, 200, { status: "ok", service: "notification-service" });
    }

    if (req.method === "GET" && url.pathname === "/notifications") {
      const identifiers = (url.searchParams.get("identifiers") || "")
        .split(",")
        .map((item) => normalizeIdentifier(item))
        .filter(Boolean);

      if (identifiers.length === 0) {
        return sendJson(res, 400, { message: "At least one identifier is required" });
      }

      const result = await listNotifications(identifiers);
      return sendJson(res, 200, result);
    }

    if (req.method === "GET" && url.pathname === "/notifications/stream") {
      const identifiers = (url.searchParams.get("identifiers") || "")
        .split(",")
        .map((item) => normalizeIdentifier(item))
        .filter(Boolean);

      if (identifiers.length === 0) {
        return sendJson(res, 400, { message: "At least one identifier is required" });
      }

      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
      });

      const subscriber = {
        identifiers: new Set(identifiers),
        res,
      };

      notificationSubscribers.push(subscriber);
      res.write(": connected\n\n");

      const keepAlive = setInterval(() => {
        try {
          res.write(": keep-alive\n\n");
        } catch (error) {
          clearInterval(keepAlive);
        }
      }, 25000);

      req.on("close", () => {
        clearInterval(keepAlive);
        const index = notificationSubscribers.indexOf(subscriber);
        if (index >= 0) {
          notificationSubscribers.splice(index, 1);
        }
      });

      return;
    }

    if (req.method === "POST" && url.pathname === "/notifications") {
      const body = await readBody(req);
      const notification = await createNotification(body);
      return sendJson(res, 201, { notification });
    }

    if (req.method === "POST" && url.pathname === "/notifications/read") {
      const body = await readBody(req);
      const identifiers = Array.isArray(body.identifiers)
        ? body.identifiers.map((item) => normalizeIdentifier(item)).filter(Boolean)
        : [];

      if (identifiers.length === 0) {
        return sendJson(res, 400, { message: "identifiers must be provided" });
      }

      await markNotificationsRead(identifiers);
      return sendJson(res, 200, { status: "ok" });
    }

    return sendJson(res, 404, { message: "Not found" });
  } catch (error) {
    console.error("Notification service error:", error);
    return sendJson(res, 500, { message: "Notification service error" });
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Notification service running on port ${port}`);
});
