require("dotenv").config();

const path = require("path");
const express = require("express");
const cors = require("cors");
const db = require("./src/config/db");

const app = express();
const port = Number(process.env.PORT) || 5000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads"), {
  maxAge: "7d",
  immutable: true,
}));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", require("./src/routes/authRoutes"));
app.use("/api/categories", require("./src/routes/categoryRoutes"));
app.use("/api/dashboard", require("./src/routes/dashboardRoutes"));
app.use("/api/incomes", require("./src/routes/incomeRoutes"));
app.use("/api/transfers", require("./src/routes/transferRoutes"));
app.use("/api/expenses", require("./src/routes/expenseRoutes"));
app.use("/api/diary", require("./src/routes/diaryRoutes"));

app.use((error, req, res, next) => {
  console.error(error);
  res.status(error.status || 500).json({ message: error.message || "Internal server error." });
});

const startServer = async () => {
  try {
    await db.initializeDatabase();
    app.listen(port, () => {
      console.log(`Backend server listening on port ${port}`);
    });
  } catch (error) {
    console.error("Failed to start backend server:", error.message);
    process.exit(1);
  }
};

startServer();

module.exports = app;
