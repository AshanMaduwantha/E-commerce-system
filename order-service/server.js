const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./swagger");

const app = express();
const PORT = 5001;
const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || "http://localhost:3002";
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || "http://localhost:3001";
const INVENTORY_SERVICE_URL =
  process.env.INVENTORY_SERVICE_URL || "http://localhost:3003";

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// --- In-memory storage ---
/** @type {Array<{id: number, customerId: number, customerName: string, productName: string, quantity: number, status: string}>} */
const orders = [];
let nextOrderId = 1;

// -----------------------------------------------------------------------------
// Future microservice integration (placeholder)
// -----------------------------------------------------------------------------
// Example: verify stock with Inventory Service before creating an order:
// const axios = require('axios');
// await axios.get(`http://inventory-service:5002/products/${productName}/stock`);
// -----------------------------------------------------------------------------

const findProductByName = async (productName) => {
  const response = await fetch(`${PRODUCT_SERVICE_URL}/products`);
  if (!response.ok) {
    throw new Error("Failed to load products");
  }

  const products = await response.json();
  return products.find(
    (p) =>
      typeof p.name === "string" &&
      p.name.trim().toLowerCase() === productName.trim().toLowerCase()
  );
};

const findCustomerById = async (customerId) => {
  const response = await fetch(`${USER_SERVICE_URL}/users/${customerId}`);
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error("Failed to load user");
  }
  return response.json();
};

const decreaseInventory = async (productName, quantity) => {
  const response = await fetch(`${INVENTORY_SERVICE_URL}/inventory/decrease`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productName, quantity }),
  });

  const payload = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, payload };
};

/**
 * @openapi
 * /orders:
 *   post:
 *     summary: Create a new order
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateOrderRequest'
 *     responses:
 *       201:
 *         description: Order created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
 *       400:
 *         description: Missing or invalid fields
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// POST /orders — Create new order
app.post("/orders", async (req, res) => {
  const { customerId, customerName, productName, quantity } = req.body;

  const missing =
    customerId === undefined ||
    customerId === null ||
    productName === undefined ||
    productName === null ||
    String(productName).trim() === "" ||
    quantity === undefined ||
    quantity === null;

  if (missing) {
    return res.status(400).json({
      message:
        "Bad request: customerId, productName, and quantity are required",
    });
  }

  const parsedCustomerId = Number(customerId);
  if (!Number.isInteger(parsedCustomerId) || parsedCustomerId < 1) {
    return res.status(400).json({
      message: "Bad request: customerId must be a positive integer",
    });
  }

  const qty = Number(quantity);
  if (Number.isNaN(qty) || !Number.isInteger(qty) || qty < 1) {
    return res.status(400).json({
      message: "Bad request: quantity must be a positive integer",
    });
  }

  let customer;
  try {
    customer = await findCustomerById(parsedCustomerId);
  } catch (error) {
    return res
      .status(503)
      .json({ message: "User service unavailable. Try again later." });
  }

  if (!customer) {
    return res.status(404).json({ message: "Customer not found" });
  }

  if (
    customerName !== undefined &&
    customerName !== null &&
    String(customerName).trim() !== "" &&
    String(customer.name).trim().toLowerCase() !==
      String(customerName).trim().toLowerCase()
  ) {
    return res.status(400).json({
      message: "Bad request: customerName does not match customerId",
    });
  }

  let product;
  try {
    product = await findProductByName(String(productName));
  } catch (error) {
    return res
      .status(503)
      .json({ message: "Product service unavailable. Try again later." });
  }

  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  const inventoryUpdate = await decreaseInventory(String(productName), qty);
  if (!inventoryUpdate.ok) {
    if (inventoryUpdate.status === 400) {
      return res.status(400).json({
        message: inventoryUpdate.payload.message || "Insufficient inventory",
      });
    }
    if (inventoryUpdate.status === 404) {
      return res.status(404).json({ message: "Inventory item not found" });
    }
    return res
      .status(503)
      .json({ message: "Inventory service unavailable. Try again later." });
  }

  const order = {
    id: nextOrderId++,
    customerId: parsedCustomerId,
    customerName: String(customer.name).trim(),
    productName: String(productName).trim(),
    quantity: qty,
    status: "Pending",
  };

  orders.push(order);
  return res.status(201).json(order);
});

/**
 * @openapi
 * /orders:
 *   get:
 *     summary: Get all orders
 *     responses:
 *       200:
 *         description: List of all orders
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Order'
 */
// GET /orders — Return all orders
app.get("/orders", (req, res) => {
  res.status(200).json(orders);
});

/**
 * @openapi
 * /orders/{id}:
 *   get:
 *     summary: Get order by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
 *       404:
 *         description: Order not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// GET /orders/:id — Return order by ID
app.get("/orders/:id", (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    return res.status(404).json({ message: "Order not found" });
  }

  const order = orders.find((o) => o.id === id);
  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }

  return res.status(200).json(order);
});

/**
 * @openapi
 * /orders/{id}:
 *   put:
 *     summary: Update order status
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateOrderStatusRequest'
 *     responses:
 *       200:
 *         description: Order updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
 *       400:
 *         description: Missing status in body
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Order not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// PUT /orders/:id — Update order status only
app.put("/orders/:id", (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    return res.status(404).json({ message: "Order not found" });
  }

  const { status } = req.body;
  if (status === undefined || status === null || String(status).trim() === "") {
    return res.status(400).json({ message: "Bad request: status is required" });
  }

  const order = orders.find((o) => o.id === id);
  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }

  order.status = String(status).trim();
  return res.status(200).json(order);
});

/**
 * @openapi
 * /orders/{id}:
 *   delete:
 *     summary: Delete an order
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DeleteSuccess'
 *       404:
 *         description: Order not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// DELETE /orders/:id — Delete order
app.delete("/orders/:id", (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    return res.status(404).json({ message: "Order not found" });
  }

  const index = orders.findIndex((o) => o.id === id);
  if (index === -1) {
    return res.status(404).json({ message: "Order not found" });
  }

  orders.splice(index, 1);
  return res.status(200).json({ message: "Order deleted successfully" });
});

// Swagger UI — http://localhost:5001/api-docs
// Hide/collapse the "Schemas" (components models) panel for a cleaner UI.
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    swaggerOptions: {
      // swagger-ui setting: -1 means models are collapsed/hidden by default
      defaultModelsExpandDepth: -1,
    },
  })
);

const server = app.listen(PORT, () => {
  console.log(`Order Service running on port ${PORT}`);
  console.log(`Swagger UI: http://localhost:${PORT}/api-docs`);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `Port ${PORT} is already in use (another Order Service or app is running).`
    );
    console.error(
      `Stop it first, e.g. macOS: lsof -i :${PORT}   then   kill <PID>`
    );
  } else {
    console.error(err);
  }
  process.exit(1);
});
