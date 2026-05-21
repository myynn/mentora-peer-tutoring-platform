import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";

// Swagger
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";

// Routes
import usersRoutes from "./routes/users.js";
import authRoutes from "./routes/auth.js";
import reviewsRouter from "./routes/reviews.js";
import availabilitySlotsRouter from "./routes/availabilitySlots.js";
import statsRoutes from "./routes/stats.js";
import sessionsRouter from "./routes/sessions.js";
import achievementsRouter from "./routes/achievements.js";
import badgesRouter from "./routes/badges.js";

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Test route
app.get("/", (req, res) => {
  res.send("<h1>Mentora API is running successfully.</h1>");
});

// Swagger config
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Mentora API",
      version: "1.0.0",
      description: "API documentation for Mentora backend",
    },
  },
  apis: ["./routes/*.js"],
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Routes
app.use("/users", usersRoutes);
app.use("/auth", authRoutes);
app.use("/reviews", reviewsRouter);
app.use("/availabilitySlots", availabilitySlotsRouter);
app.use("/stats", statsRoutes);
app.use("/sessions", sessionsRouter);
app.use("/achievements", achievementsRouter);
app.use("/badges", badgesRouter);

const PORT = process.env.PORT || 5050;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected");
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`Swagger UI on http://localhost:${PORT}/api-docs`);
    });
  })
  .catch((err) => console.log(err));