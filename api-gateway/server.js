const express = require("express");
const cors = require("cors");
const { createProxyMiddleware } = require("http-proxy-middleware");

const app = express();
app.use(cors());

app.use(
  "/users",
  createProxyMiddleware({
    // Proxy to the User Service (port 3001)
    target: "http://localhost:3001",
    changeOrigin: true,
    pathRewrite: {
      // Express strips the mount path (`/users`) before proxy middleware runs,
      // so we add it back to reach the user-service routes (`/users/...`).
      "^/": "/users/",
    },
  })
);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
});