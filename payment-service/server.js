const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./swagger");

const app = express();
const PORT = 5002;
const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || "http://localhost:5001";

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// In-memory payment storage.
const payments = [];
let nextPaymentId = 1;

// -----------------------------------------------------------------------------
// Future microservice integration (placeholder)
// -----------------------------------------------------------------------------
// Example: verify order existence via Order Service before creating payment:
// axios.get(`http://localhost:5001/orders/${orderId}`);
//
// Example: integrate with external payment gateways in future:
// - Stripe API
// - PayPal API
// -----------------------------------------------------------------------------

const getOrderById = async (orderId) => {
  const response = await fetch(`${ORDER_SERVICE_URL}/orders/${orderId}`);
  if (response.status === 404) {
    return { found: false };
  }
  if (!response.ok) {
    throw new Error("Failed to contact Order Service");
  }

  const order = await response.json();
  return { found: true, order };
};

const updateOrderStatus = async (orderId, status) => {
  const response = await fetch(`${ORDER_SERVICE_URL}/orders/${orderId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });

  const payload = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, payload };
};

/**
 * @openapi
 * components:
 *   schemas:
 *     Payment:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         orderId:
 *           type: integer
 *         amount:
 *           type: number
 *         paymentMethod:
 *           type: string
 *         status:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *     CreatePaymentRequest:
 *       type: object
 *       required:
 *         - orderId
 *         - paymentMethod
 *       properties:
 *         orderId:
 *           type: integer
 *         amount:
 *           type: number
 *           description: Optional. Payment amount is derived from the order.
 *         paymentMethod:
 *           type: string
 *     UpdatePaymentStatusRequest:
 *       type: object
 *       required:
 *         - status
 *       properties:
 *         status:
 *           type: string
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 */

/**
 * @openapi
 * /payments:
 *   post:
 *     summary: Create a new payment
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePaymentRequest'
 *     responses:
 *       201:
 *         description: Payment created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Payment'
 *       400:
 *         description: Missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Order not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Order not eligible for payment (not Pending)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// POST /payments - Create payment
app.post("/payments", async (req, res) => {
  const { orderId, paymentMethod } = req.body;

  const missing =
    orderId === undefined ||
    paymentMethod === undefined ||
    paymentMethod === null ||
    String(paymentMethod).trim() === "";

  if (missing) {
    return res
      .status(400)
      .json({ message: "orderId and paymentMethod are required" });
  }

  const parsedOrderId = Number(orderId);

  if (!Number.isInteger(parsedOrderId) || parsedOrderId < 1) {
    return res
      .status(400)
      .json({ message: "orderId must be a positive integer" });
  }

  let orderLookup;
  try {
    orderLookup = await getOrderById(parsedOrderId);
  } catch (error) {
    return res
      .status(503)
      .json({ message: "Order Service unavailable. Try again later." });
  }

  if (!orderLookup.found) {
    return res.status(404).json({ message: "Order not found" });
  }

  const orderStatus = String(orderLookup.order?.status || "").trim();
  if (orderStatus.toLowerCase() !== "pending") {
    return res.status(409).json({
      message: `Payment rejected: order status must be Pending (current: ${orderStatus || "Unknown"})`,
    });
  }

  // Amount is derived from the order to avoid trusting client input.
  const parsedAmount = Number(orderLookup.order?.amount);
  if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
    return res.status(400).json({
      message: "Payment amount cannot be created because order amount is missing/invalid",
    });
  }

  const newPayment = {
    id: nextPaymentId++,
    orderId: parsedOrderId,
    amount: parsedAmount,
    paymentMethod: String(paymentMethod).trim(),
    status: "Pending",
    createdAt: new Date().toISOString(),
  };

  // Mark the order as Paid immediately to prevent double-payment attempts.
  // (If you later add a real gateway flow, move this to a "payment succeeded" callback.)
  let orderUpdate;
  try {
    orderUpdate = await updateOrderStatus(parsedOrderId, "Paid");
  } catch (error) {
    return res
      .status(503)
      .json({ message: "Order Service unavailable. Try again later." });
  }

  if (!orderUpdate.ok) {
    return res.status(503).json({
      message:
        orderUpdate.payload?.message ||
        "Failed to update order status. Payment was not created.",
    });
  }

  payments.push(newPayment);
  return res.status(201).json(newPayment);
});

/**
 * @openapi
 * /payments:
 *   get:
 *     summary: Get all payments
 *     responses:
 *       200:
 *         description: List of payments
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Payment'
 */
// GET /payments - List all payments
app.get("/payments", (req, res) => {
  return res.status(200).json(payments);
});

/**
 * @openapi
 * /payments/{id}:
 *   get:
 *     summary: Get payment by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Payment found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Payment'
 *       404:
 *         description: Payment not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// GET /payments/:id - Get one payment
app.get("/payments/:id", (req, res) => {
  const paymentId = Number(req.params.id);
  const payment = payments.find((p) => p.id === paymentId);

  if (!payment) {
    return res.status(404).json({ message: "Payment not found" });
  }

  return res.status(200).json(payment);
});

/**
 * @openapi
 * /payments/{id}:
 *   put:
 *     summary: Update payment status
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdatePaymentStatusRequest'
 *     responses:
 *       200:
 *         description: Payment updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Payment'
 *       400:
 *         description: Missing status
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Payment not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// PUT /payments/:id - Update status only
app.put("/payments/:id", (req, res) => {
  const paymentId = Number(req.params.id);
  const payment = payments.find((p) => p.id === paymentId);

  if (!payment) {
    return res.status(404).json({ message: "Payment not found" });
  }

  const { status } = req.body;
  if (status === undefined || status === null || String(status).trim() === "") {
    return res.status(400).json({ message: "status is required" });
  }

  payment.status = String(status).trim();
  return res.status(200).json(payment);
});

/**
 * @openapi
 * /payments/{id}:
 *   delete:
 *     summary: Delete payment
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Payment deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       404:
 *         description: Payment not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// DELETE /payments/:id - Remove payment
app.delete("/payments/:id", (req, res) => {
  const paymentId = Number(req.params.id);
  const paymentIndex = payments.findIndex((p) => p.id === paymentId);

  if (paymentIndex === -1) {
    return res.status(404).json({ message: "Payment not found" });
  }

  payments.splice(paymentIndex, 1);
  return res.status(200).json({ message: "Payment deleted successfully" });
});

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.listen(PORT, () => {
  console.log(`Payment Service running on port ${PORT}`);
  console.log(`Swagger UI: http://localhost:${PORT}/api-docs`);
});
