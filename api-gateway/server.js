const express = require("express");
const cors = require("cors");
const { createProxyMiddleware } = require("http-proxy-middleware");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./swagger");

const app = express();
app.use(cors());

//user service
app.use(
  "/users",
  createProxyMiddleware({
    target: "http://localhost:3001",
    changeOrigin: true,
    pathRewrite: {
      // Express strips the mount path (`/users`) before proxy middleware runs,
      // so we add it back to reach the user-service routes (`/users/...`).
      "^/": "/users/",
    },
  })
);

//product service
app.use(
  "/products",
  createProxyMiddleware({
    target: "http://localhost:3002",
    changeOrigin: true,
    pathRewrite: {
      "^/": "/products/",
    },
  })
);

//order service
app.use(
  "/orders",
  createProxyMiddleware({
    target: "http://localhost:5001",
    changeOrigin: true,
    pathRewrite: {
      "^/": "/orders/",
    },
  })
);

//inventory service
app.use(
  "/inventory",
  createProxyMiddleware({
    target: "http://localhost:3003",
    changeOrigin: true,
    pathRewrite: {
      "^/": "/inventory/",
    },
  })
);

//payment service
app.use(
  "/payments",
  createProxyMiddleware({
    target: "http://localhost:5002",
    changeOrigin: true,
    pathRewrite: {
      "^/": "/payments/",
    },
  })
);

// gateway swagger (users + products + orders + inventory + payments)
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
});