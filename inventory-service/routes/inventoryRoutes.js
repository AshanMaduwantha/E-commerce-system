const express = require("express");
const router = express.Router();

let inventory = [];

/**
 * @swagger
 * /inventory:
 *   post:
 *     summary: Add inventory item
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               productName:
 *                 type: string
 *               quantity:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Item created
 */
router.post("/", (req, res) => {
  const { productName, quantity } = req.body;

  if (!productName || quantity === undefined) {
    return res.status(400).json({ message: "productName and quantity required" });
  }

  const newItem = {
    id: inventory.length + 1,
    productName,
    quantity,
  };

  inventory.push(newItem);
  res.status(201).json(newItem);
});

/**
 * @swagger
 * /inventory:
 *   get:
 *     summary: Get all inventory
 *     responses:
 *       200:
 *         description: Success
 */
router.get("/", (req, res) => {
  res.json(inventory);
});

/**
 * @swagger
 * /inventory/{id}:
 *   get:
 *     summary: Get inventory by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Success
 */
router.get("/:id", (req, res) => {
  const item = inventory.find(i => i.id == req.params.id);

  if (!item) {
    return res.status(404).json({ message: "Item not found" });
  }

  res.json(item);
});

/**
 * @swagger
 * /inventory/{id}:
 *   put:
 *     summary: Update quantity
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               quantity:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Updated
 */
router.put("/:id", (req, res) => {
  const item = inventory.find(i => i.id == req.params.id);

  if (!item) {
    return res.status(404).json({ message: "Item not found" });
  }

  // 🔥 HANDLE EMPTY BODY (THIS FIXES YOUR ERROR)
  if (!req.body || req.body.quantity === undefined) {
    return res.status(400).json({
      message: "Please provide quantity in body",
      example: { "quantity": 50 }
    });
  }

  item.quantity = req.body.quantity;

  res.json({
    message: "Updated successfully",
    item
  });
});

/**
 * @swagger
 * /inventory/increase:
 *   patch:
 *     summary: Increase inventory by product name (create if missing)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               productName:
 *                 type: string
 *               quantity:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Inventory increased
 *       201:
 *         description: Inventory item created
 *       400:
 *         description: Invalid request
 */
router.patch("/increase", (req, res) => {
  const { productName, quantity } = req.body;
  const qty = Number(quantity);

  if (!productName || !Number.isInteger(qty) || qty < 1) {
    return res
      .status(400)
      .json({ message: "productName and positive integer quantity are required" });
  }

  const normalizedName = String(productName).trim().toLowerCase();
  let item = inventory.find(
    (i) =>
      typeof i.productName === "string" &&
      i.productName.trim().toLowerCase() === normalizedName
  );

  if (!item) {
    item = {
      id: inventory.length + 1,
      productName: String(productName).trim(),
      quantity: qty,
    };
    inventory.push(item);
    return res.status(201).json({ message: "Inventory created and increased", item });
  }

  const currentQty = Number(item.quantity) || 0;
  item.quantity = currentQty + qty;
  return res.json({ message: "Inventory increased successfully", item });
});

/**
 * @swagger
 * /inventory/decrease:
 *   patch:
 *     summary: Decrease inventory by product name
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               productName:
 *                 type: string
 *               quantity:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Inventory decreased
 *       400:
 *         description: Invalid request or insufficient quantity
 *       404:
 *         description: Inventory item not found
 */
router.patch("/decrease", (req, res) => {
  const { productName, quantity } = req.body;
  const qty = Number(quantity);

  if (!productName || !Number.isInteger(qty) || qty < 1) {
    return res
      .status(400)
      .json({ message: "productName and positive integer quantity are required" });
  }

  const item = inventory.find(
    (i) =>
      typeof i.productName === "string" &&
      i.productName.trim().toLowerCase() === String(productName).trim().toLowerCase()
  );

  if (!item) {
    return res.status(404).json({ message: "Inventory item not found" });
  }

  const currentQty = Number(item.quantity) || 0;
  if (currentQty < qty) {
    return res.status(400).json({ message: "Insufficient inventory quantity" });
  }

  item.quantity = currentQty - qty;
  return res.json({ message: "Inventory decreased successfully", item });
});

module.exports = router;