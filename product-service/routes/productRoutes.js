const express = require("express");
const router = express.Router();
const INVENTORY_SERVICE_URL =
  process.env.INVENTORY_SERVICE_URL || "http://localhost:3003";

let products = [];

/**
 * @swagger
 * /products:
 *   post:
 *     summary: Create a new product
 *     description: Add a new product
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Laptop
 *               price:
 *                 type: number
 *                 example: 250000
 *               category:
 *                 type: string
 *                 example: Electronics
 *               stock:
 *                 type: integer
 *                 example: 10
 *     responses:
 *       201:
 *         description: Product created successfully
 */
const increaseInventory = async (productName, quantity) => {
  const response = await fetch(`${INVENTORY_SERVICE_URL}/inventory/increase`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productName, quantity }),
  });

  const payload = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, payload };
};

router.post("/", async (req, res) => {
  const { name, price, category, stock } = req.body;
  const parsedStock = Number(stock);

  if (
    name === undefined ||
    price === undefined ||
    category === undefined ||
    stock === undefined
  ) {
    return res.status(400).json({
      message: "name, price, category, and stock are required",
    });
  }

  if (!Number.isInteger(parsedStock) || parsedStock < 0) {
    return res
      .status(400)
      .json({ message: "stock must be an integer >= 0" });
  }

  const newProduct = {
    id: products.length + 1,
    name,
    price,
    category,
    stock: parsedStock,
  };

  products.push(newProduct);

  const inventoryUpdate = await increaseInventory(newProduct.name, parsedStock);
  if (!inventoryUpdate.ok) {
    // Keep services consistent when inventory write fails.
    products = products.filter((p) => p.id !== newProduct.id);
    return res.status(503).json({
      message: "Product could not be created because inventory update failed",
    });
  }

  res.status(201).json(newProduct);
});

/**
 * @swagger
 * /products:
 *   get:
 *     summary: Get all products
 *     responses:
 *       200:
 *         description: List of products
 */
router.get("/", (req, res) => {
  res.json(products);
});

/**
 * @swagger
 * /products/{id}:
 *   get:
 *     summary: Get product by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Product ID
 *         schema:
 *           type: integer
 *           example: 1
 *     responses:
 *       200:
 *         description: Product found
 *       404:
 *         description: Product not found
 */
router.get("/:id", (req, res) => {
  const product = products.find(p => p.id == req.params.id);
  if (!product) return res.status(404).json({ message: "Product not found" });
  res.json(product);
});

/**
 * @swagger
 * /products/{id}:
 *   put:
 *     summary: Update product
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
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               price:
 *                 type: number
 *               category:
 *                 type: string
 *               stock:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Product updated
 */
router.put("/:id", (req, res) => {
  const product = products.find(p => p.id == req.params.id);
  if (!product) return res.status(404).json({ message: "Product not found" });

  const { name, price, category, stock } = req.body;
  if (stock !== undefined) {
    const parsedStock = Number(stock);
    if (!Number.isInteger(parsedStock) || parsedStock < 0) {
      return res
        .status(400)
        .json({ message: "stock must be an integer >= 0" });
    }
    product.stock = parsedStock;
  }

  product.name = name || product.name;
  product.price = price || product.price;
  product.category = category || product.category;

  res.json(product);
});

/**
 * @swagger
 * /products/{id}:
 *   delete:
 *     summary: Delete product
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Product deleted
 */
router.delete("/:id", (req, res) => {
  products = products.filter(p => p.id != req.params.id);
  res.json({ message: "Product deleted" });
});

module.exports = router;