const http = require("http");
const { URL } = require("url");
const net = require("net");

const port = Number(process.env.PORT || 8080);
const redisHost = process.env.REDIS_HOST || "redis";
const redisPort = Number(process.env.REDIS_PORT || 6379);
const WEATHER_CACHE_TTL_SECONDS = 5 * 60;

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  });
  res.end(JSON.stringify(payload));
}

function checkRedisConnection() {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: redisHost, port: redisPort });

    socket.setTimeout(1000);

    socket.on("connect", () => {
      socket.end();
      resolve(true);
    });

    const fail = () => {
      socket.destroy();
      resolve(false);
    };

    socket.on("timeout", fail);
    socket.on("error", fail);
  });
}

async function fetchJson(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Upstream request failed with status ${response.status}`);
  }

  return response.json();
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

function getWeatherCacheKey(city) {
  return `weather:${city.trim().toLowerCase()}`;
}

async function getCachedWeather(city) {
  const cached = await sendRedisCommand(["GET", getWeatherCacheKey(city)]);

  if (!cached) {
    return null;
  }

  return JSON.parse(cached);
}

async function setCachedWeather(city, payload) {
  await sendRedisCommand([
    "SET",
    getWeatherCacheKey(city),
    JSON.stringify(payload),
    "EX",
    WEATHER_CACHE_TTL_SECONDS,
  ]);
}

async function getWeatherForCity(city) {
  let cached = null;

  try {
    cached = await getCachedWeather(city);
  } catch (error) {
    console.error("Redis weather cache read error:", error);
  }

  if (cached) {
    return { ...cached, cached: true };
  }

  const cityData = await fetchJson(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`
  );
  const cityMatch = cityData?.results?.[0];

  if (!cityMatch) {
    throw new Error("City not found");
  }

  const weatherData = await fetchJson(
    `https://api.open-meteo.com/v1/forecast?latitude=${cityMatch.latitude}&longitude=${cityMatch.longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,wind_gusts_10m,is_day&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=1`
  );

  const fetchedAt = new Date().toISOString();

  const payload = {
    city: cityMatch.name,
    region: cityMatch.country || cityMatch.admin1 || city,
    temperature: weatherData?.current?.temperature_2m ?? null,
    feelsLike: weatherData?.current?.apparent_temperature ?? null,
    humidity: weatherData?.current?.relative_humidity_2m ?? null,
    precipitation: weatherData?.current?.precipitation ?? null,
    windSpeed: weatherData?.current?.wind_speed_10m ?? null,
    windGust: weatherData?.current?.wind_gusts_10m ?? null,
    weatherCode: weatherData?.current?.weather_code ?? null,
    isDay: weatherData?.current?.is_day ?? null,
    maxTemp: weatherData?.daily?.temperature_2m_max?.[0] ?? null,
    minTemp: weatherData?.daily?.temperature_2m_min?.[0] ?? null,
    precipitationChance: weatherData?.daily?.precipitation_probability_max?.[0] ?? null,
    fetchedAt,
    cached: false,
    cacheTtlSeconds: WEATHER_CACHE_TTL_SECONDS,
  };

  try {
    await setCachedWeather(city, payload);
  } catch (error) {
    console.error("Redis weather cache write error:", error);
  }

  return payload;
}

const server = http.createServer(async (req, res) => {
  if (!req.url) {
    return sendJson(res, 400, { message: "Bad request" });
  }

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    });
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  if (req.method === "GET" && url.pathname === "/feed") {
    const redisAvailable = await checkRedisConnection();

    return sendJson(res, 200, {
      message: "User feed service running",
      service: "feed-service",
      cache: {
        provider: "redis",
        host: redisHost,
        port: redisPort,
        available: redisAvailable,
      },
    });
  }

  if (req.method === "GET" && url.pathname === "/weather") {
    const city = url.searchParams.get("city");

    if (!city || !city.trim()) {
      return sendJson(res, 400, { message: "City is required" });
    }

    try {
      const weather = await getWeatherForCity(city);
      return sendJson(res, 200, weather);
    } catch (error) {
      console.error("Weather lookup error:", error);
      return sendJson(res, 502, { message: "Unable to fetch weather" });
    }
  }

  if (req.method === "GET" && url.pathname === "/health") {
    const redisAvailable = await checkRedisConnection();

    return sendJson(res, redisAvailable ? 200 : 503, {
      status: redisAvailable ? "ok" : "degraded",
      service: "feed-service",
      redis: redisAvailable ? "reachable" : "unreachable",
    });
  }

  return sendJson(res, 404, { message: "Not found" });
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Feed service running on port ${port}`);
});
