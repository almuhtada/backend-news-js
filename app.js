const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const swaggerUi = require("swagger-ui-express");
require("dotenv").config();

const sequelize = require("./config/database");
const swaggerSpec = require("./swagger");

/* ══════════════════════════════════════════════════════════════════════════════
   ROUTE IMPORTS
══════════════════════════════════════════════════════════════════════════════ */
const authRoutes = require("./routes/auth");
const postRoutes = require("./routes/posts");
const categoryRoutes = require("./routes/categories");
const uploadRoutes = require("./routes/upload");
const authorRoutes = require("./routes/authors");
const achievementRoutes = require("./routes/achievements");
const publicationRoutes = require("./routes/publications");
const aboutRoutes = require("./routes/about");
const notificationRoutes = require("./routes/notifications");
const tagRoutes = require("./routes/tags");
const userRoutes = require("./routes/users");
const pageContentRoutes = require("./routes/pageContents");
const telegramRoutes = require("./routes/telegram");
const interactionRoutes = require("./routes/interaction");
const commentRoutes = require("./routes/comments");
const statsRoutes = require("./routes/stats");
const settingRoutes = require("./routes/settings");

/* ══════════════════════════════════════════════════════════════════════════════
   APP CONFIGURATION
══════════════════════════════════════════════════════════════════════════════ */
const app = express();
const START_TIME = Date.now();
const PORT = process.env.PORT || 3001;
const ENV = process.env.NODE_ENV || "development";
const API_VERSION = "1.0.0";
const APP_NAME = "News Al-Muhtada API";

/* ══════════════════════════════════════════════════════════════════════════════
   MIDDLEWARE STACK
══════════════════════════════════════════════════════════════════════════════ */
app.use(morgan(ENV === "production" ? "combined" : "dev"));
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static("uploads"));

/* ══════════════════════════════════════════════════════════════════════════════
   ROUTE REGISTRY
══════════════════════════════════════════════════════════════════════════════ */
const ROUTES = [];

function register(name, basePath, instance, description = "") {
  app.use(basePath, instance);
  ROUTES.push({ name, basePath, description });
}

register("Auth", "/api/auth", authRoutes, "Authentication & Authorization");
register("Posts", "/api/posts", postRoutes, "Blog Posts Management");
register("Categories", "/api/categories", categoryRoutes, "Post Categories");
register("Upload", "/api/upload", uploadRoutes, "File Upload Service");
register("Authors", "/api/authors", authorRoutes, "Author Profiles");
register(
  "Achievements",
  "/api/achievements",
  achievementRoutes,
  "Achievements & Awards",
);
register(
  "Publications",
  "/api/publications",
  publicationRoutes,
  "Digital Publications",
);
register("About", "/api/about", aboutRoutes, "About Page Sections");
register(
  "Notifications",
  "/api/notifications",
  notificationRoutes,
  "System Notifications",
);
register("Tags", "/api/tags", tagRoutes, "Post Tags");
register("Users", "/api/users", userRoutes, "User Management");
register(
  "Page Contents",
  "/api/page-contents",
  pageContentRoutes,
  "Dynamic Page Contents",
);
register(
  "Telegram Notifications",
  "/api/telegram",
  telegramRoutes,
  "Telegram Notification Service",
);
register(
  "Interactions",
  "/api/posts",
  interactionRoutes,
  "Post Likes & Comments",
);
register(
  "Comments",
  "/api/comments",
  commentRoutes,
  "All Comments Management",
);
register(
  "Statistics",
  "/api/stats",
  statsRoutes,
  "Dashboard Statistics & Analytics",
);
register(
  "Settings",
  "/api/settings",
  settingRoutes,
  "Website Settings Management",
);
/* ══════════════════════════════════════════════════════════════════════════════
   SWAGGER DOCUMENTATION
══════════════════════════════════════════════════════════════════════════════ */
const swaggerOptions = {
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info .title { font-size: 2.5em }
  `,
  customSiteTitle: `${APP_NAME} - Documentation`,
  customfavIcon: "/favicon.ico",
};

app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, swaggerOptions),
);

app.get("/swagger.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
});

/* ══════════════════════════════════════════════════════════════════════════════
   ROOT & HEALTH ENDPOINTS
══════════════════════════════════════════════════════════════════════════════ */
app.get("/", (req, res) => {
  const baseUrl = `${req.protocol}://${req.get("host")}`;

  res.json({
    success: true,
    message: `Welcome to ${APP_NAME}`,
    version: API_VERSION,
    environment: ENV,
    timestamp: new Date().toISOString(),
    endpoints: {
      documentation: `${baseUrl}/api-docs`,
      swagger_json: `${baseUrl}/swagger.json`,
      health: `${baseUrl}/health`,
    },
    routes: ROUTES.map((r) => ({
      name: r.name,
      path: `${baseUrl}${r.basePath}`,
      description: r.description,
    })),
  });
});

app.get("/health", (req, res) => {
  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();

  res.json({
    success: true,
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: {
      seconds: Math.floor(uptime),
      formatted: formatUptime(uptime),
    },
    memory: {
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
    },
    environment: ENV,
    nodeVersion: process.version,
  });
});

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);

  return parts.join(" ");
}

/* ══════════════════════════════════════════════════════════════════════════════
   404 HANDLER
══════════════════════════════════════════════════════════════════════════════ */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Not Found",
    message: `Route ${req.method} ${req.originalUrl} not found`,
    suggestion: "Check /api-docs for available endpoints",
  });
});

/* ══════════════════════════════════════════════════════════════════════════════
   ERROR HANDLER
══════════════════════════════════════════════════════════════════════════════ */
app.use((err, req, res, next) => {
  console.error("Error:", err);

  res.status(err.status || 500).json({
    success: false,
    error: err.name || "Internal Server Error",
    message: ENV === "development" ? err.message : "Something went wrong",
    ...(ENV === "development" && { stack: err.stack }),
  });
});

/* ══════════════════════════════════════════════════════════════════════════════
   STARTUP BANNER
══════════════════════════════════════════════════════════════════════════════ */
function printBanner() {
  const banner = `
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│     ███╗   ██╗███████╗██╗    ██╗███████╗     █████╗ ██████╗ ██╗            │
│     ████╗  ██║██╔════╝██║    ██║██╔════╝    ██╔══██╗██╔══██╗██║            │
│     ██╔██╗ ██║█████╗  ██║ █╗ ██║███████╗    ███████║██████╔╝██║            │
│     ██║╚██╗██║██╔══╝  ██║███╗██║╚════██║    ██╔══██║██╔═══╝ ██║            │
│     ██║ ╚████║███████╗╚███╔███╔╝███████║    ██║  ██║██║     ██║            │
│     ╚═╝  ╚═══╝╚══════╝ ╚══╝╚══╝ ╚══════╝    ╚═╝  ╚═╝╚═╝     ╚═╝            │
│                                                                             │
│                        Al-Muhtada News Backend                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘`;

  console.log("\x1b[36m%s\x1b[0m", banner);
}

function printStartupInfo() {
  const baseUrl = `http://localhost:${PORT}`;
  const divider = "─".repeat(75);

  console.log(`\n\x1b[90m${divider}\x1b[0m`);
  console.log(`\x1b[1m\x1b[32m  SERVER INFORMATION\x1b[0m`);
  console.log(`\x1b[90m${divider}\x1b[0m`);

  const info = [
    ["Status", "\x1b[32m● Running\x1b[0m"],
    ["Environment", ENV],
    ["Port", PORT],
    ["Node Version", process.version],
    [
      "Memory Usage",
      `${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB`,
    ],
    ["Start Time", new Date().toLocaleString()],
  ];

  info.forEach(([key, value]) => {
    console.log(`  \x1b[90m${key.padEnd(16)}\x1b[0m ${value}`);
  });

  console.log(`\n\x1b[90m${divider}\x1b[0m`);
  console.log(`\x1b[1m\x1b[33m  ENDPOINTS\x1b[0m`);
  console.log(`\x1b[90m${divider}\x1b[0m`);

  const endpoints = [
    ["API Base", baseUrl],
    ["Documentation", `${baseUrl}/api-docs`],
    ["Swagger JSON", `${baseUrl}/swagger.json`],
    ["Health Check", `${baseUrl}/health`],
  ];

  endpoints.forEach(([name, url]) => {
    console.log(
      `  \x1b[90m${name.padEnd(16)}\x1b[0m \x1b[4m\x1b[36m${url}\x1b[0m`,
    );
  });

  console.log(`\n\x1b[90m${divider}\x1b[0m`);
  console.log(`\x1b[1m\x1b[35m  API ROUTES (${ROUTES.length})\x1b[0m`);
  console.log(`\x1b[90m${divider}\x1b[0m`);

  ROUTES.forEach((route, index) => {
    const isLast = index === ROUTES.length - 1;
    const prefix = isLast ? "└──" : "├──";
    const nameColored = `\x1b[36m${route.name.padEnd(15)}\x1b[0m`;
    const pathColored = `\x1b[33m${route.basePath.padEnd(25)}\x1b[0m`;
    const desc = `\x1b[90m${route.description}\x1b[0m`;
    console.log(`  ${prefix} ${nameColored} ${pathColored} ${desc}`);
  });

  console.log(`\n\x1b[90m${divider}\x1b[0m`);
  console.log(`\x1b[1m\x1b[34m  LOADED MODULES\x1b[0m`);
  console.log(`\x1b[90m${divider}\x1b[0m`);

  const modules = [
    ["express", "Web Framework"],
    ["cors", "Cross-Origin Resource Sharing"],
    ["morgan", "HTTP Request Logger"],
    ["sequelize", "ORM Database"],
    ["swagger-ui-express", "API Documentation"],
  ];

  modules.forEach(([name, desc]) => {
    console.log(
      `  \x1b[90m●\x1b[0m \x1b[36m${name.padEnd(22)}\x1b[0m \x1b[90m${desc}\x1b[0m`,
    );
  });

  console.log(`\n\x1b[90m${divider}\x1b[0m\n`);
}

/* ══════════════════════════════════════════════════════════════════════════════
   DATABASE & SERVER BOOTSTRAP
══════════════════════════════════════════════════════════════════════════════ */
async function bootstrap() {
  try {
    console.clear();
    printBanner();

    console.log("\n\x1b[33m⏳ Initializing backend service...\x1b[0m\n");

    // Database connection
    process.stdout.write("  \x1b[90m●\x1b[0m Connecting to database... ");
    await sequelize.authenticate();
    console.log("\x1b[32m✓\x1b[0m");

    // Model sync
    process.stdout.write("  \x1b[90m●\x1b[0m Syncing database models... ");
    require("./schema");
    await sequelize.sync({ alter: false });
    console.log("\x1b[32m✓\x1b[0m");

    // Start server
    process.stdout.write("  \x1b[90m●\x1b[0m Starting HTTP server...   ");
    const server = app.listen(PORT, () => {
      console.log("\x1b[32m✓\x1b[0m");

      const startupTime = Date.now() - START_TIME;
      printStartupInfo();

      console.log(`\x1b[32m  ⚡ Server ready in ${startupTime}ms\x1b[0m`);
      console.log(`\x1b[90m  Press Ctrl+C to stop the server\x1b[0m\n`);
    });

    server.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        console.error(`\n\x1b[31m  ✗ Port ${PORT} is already in use\x1b[0m`);
        console.log(`\x1b[90m  Try: lsof -ti:${PORT} | xargs kill -9\x1b[0m\n`);
      } else {
        console.error("\n\x1b[31m  ✗ Server error:\x1b[0m", err.message);
      }
      process.exit(1);
    });

    // Graceful shutdown
    const shutdown = (signal) => {
      console.log(
        `\n\x1b[33m  ⚠ ${signal} received, shutting down gracefully...\x1b[0m`,
      );

      server.close(() => {
        console.log("\x1b[90m  ● HTTP server closed\x1b[0m");

        sequelize.close().then(() => {
          console.log("\x1b[90m  ● Database connection closed\x1b[0m");
          console.log("\x1b[32m  ✓ Shutdown complete\x1b[0m\n");
          process.exit(0);
        });
      });

      setTimeout(() => {
        console.error("\x1b[31m  ✗ Forced shutdown\x1b[0m\n");
        process.exit(1);
      }, 10000);
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  } catch (error) {
    console.log("\x1b[31m✗\x1b[0m");
    console.error("\n\x1b[31m  ✗ Fatal startup error:\x1b[0m", error.message);

    if (ENV === "development") {
      console.error("\x1b[90m", error.stack, "\x1b[0m");
    }

    process.exit(1);
  }
}

bootstrap();

/* ══════════════════════════════════════════════════════════════════════════════
   GLOBAL ERROR HANDLERS
══════════════════════════════════════════════════════════════════════════════ */
process.on("unhandledRejection", (reason, promise) => {
  console.error("\n\x1b[31m  ✗ Unhandled Rejection:\x1b[0m", reason);
});

process.on("uncaughtException", (err) => {
  console.error("\n\x1b[31m  ✗ Uncaught Exception:\x1b[0m", err.message);
  process.exit(1);
});
