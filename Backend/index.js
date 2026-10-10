const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const db = require("./src/config/db");
const { requireMediaUnlock } = require("./src/middleware/appLock");
const { requireAuth } = require("./src/middleware/auth");

const app = express();
const port = Number(process.env.PORT) || 5000;
const frontendDistPath = path.join(__dirname, "../Frontend/dist");
const allowedFrontendOrigins = new Set(
  String(process.env.APP_FRONTEND_ORIGIN || "").split(",").map((origin) => origin.trim()).filter(Boolean)
);

app.use(cors({
  origin: (origin, callback) => {
    const isLocalDevelopmentOrigin = process.env.NODE_ENV !== "production"
      && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin || "");
    callback(null, !origin || allowedFrontendOrigins.has(origin) || isLocalDevelopmentOrigin ? origin || false : false);
  },
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(
  "/uploads",
  requireAuth,
  requireMediaUnlock,
  (req, res, next) => {
    res.set("Cache-Control", "private, no-store");
    next();
  },
  express.static(path.join(__dirname, "uploads"))
);

if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));

  app.get(/^(?!\/api\/).+/, (req, res, next) => {
    if (req.path.startsWith("/api/")) {
      return next();
    }
    res.sendFile(path.join(frontendDistPath, "index.html"));
  });
}

app.get("/api/health", async (req, res) => {
  try {
    await db.query("SELECT 1");
    res.json({ status: "ok", database: "connected" });
  } catch (error) {
    console.error("Health check database error:", error.message);
    res.status(503).json({ status: "error", database: "disconnected" });
  }
});

app.use("/api/auth", require("./src/routes/authRoutes"));
app.use("/api/app-lock", require("./src/routes/appLockRoutes"));
app.use("/api/categories", require("./src/routes/categoryRoutes"));
app.use("/api/dashboard", require("./src/routes/dashboardRoutes"));
app.use("/api/calendar", require("./src/routes/calendarRoutes"));
app.use("/api/incomes", require("./src/routes/incomeRoutes"));
app.use("/api/transfers", require("./src/routes/transferRoutes"));
app.use("/api/expenses", require("./src/routes/expenseRoutes"));
app.use("/api/diary", require("./src/routes/diaryRoutes"));
app.use("/api/memories", require("./src/routes/memoryRoutes"));

app.use((error, req, res, next) => {
  console.error(error);
  res.status(error.status || 500).json({ message: error.message || "Internal server error." });
});

const startServer = async () => {
  try {
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET must be configured before starting the backend.");
    }
    await db.initializeDatabase();
    app.listen(port, "0.0.0.0", () => {
      console.log(`Backend server listening on port ${port}`);
    });
  } catch (error) {
    console.error("Failed to start backend server:", error.message);
    fs.writeFileSync(path.join(__dirname, "startup-error.log"), error.stack || error.message);
    process.exit(1);
  }
};

startServer();

module.exports = app;
