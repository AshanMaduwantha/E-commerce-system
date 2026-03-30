const express = require("express");
const cors = require("cors");
const productRoutes = require("./routes/productRoutes");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./swagger");

const app = express();
app.use(cors());
app.use(express.json());

// routes
app.use("/products", productRoutes);

// swagger
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

const PORT = 3002;

app.listen(PORT, () => {
  console.log(`Product Service running on port ${PORT}`);
});