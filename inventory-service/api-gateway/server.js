const express = require("express");
const cors = require("cors");
const { createProxyMiddleware } = require("http-proxy-middleware");

const app = express();
app.use(cors());

// USER SERVICE
app.use(
  "/users",
  createProxyMiddleware({
    target: "http://localhost:3001",
    changeOrigin: true,
  })
);

// PRODUCT SERVICE
app.use(
  "/products",
  createProxyMiddleware({
    target: "http://localhost:3002",
    changeOrigin: true,
  })
);

// INVENTORY SERVICE (FIXED PROPERLY)
app.use(
  "/inventory",
  createProxyMiddleware({
    target: "http://localhost:3003",
    changeOrigin: true,
    pathRewrite: {
      "^/inventory": "/inventory",
    },
  })
);

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
});