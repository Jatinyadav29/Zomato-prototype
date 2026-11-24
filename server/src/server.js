const env = require("./config/env");
const app = require("./app");
const connectDB = require("./config/db");

const PORT = env.PORT;

async function startServer() {
  const secretProblems = env.checkAuthSecrets();
  for (const { message, fatal } of secretProblems) {
    console[fatal ? "error" : "warn"](`${fatal ? "Error" : "Warning"}: ${message}`);
  }
  if (secretProblems.some((p) => p.fatal)) {
    process.exit(1);
  }

  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err.message);
    process.exit(1);
  }
}

startServer();
