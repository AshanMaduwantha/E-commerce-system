const userSwaggerSpec = require("../user-service/swagger");
const productSwaggerSpec = require("../product-service/swagger");
const orderSwaggerSpec = require("../order-service/swagger");
const inventorySwaggerSpec = require("../inventory-service/swagger");
const paymentSwaggerSpec = require("../payment-service/swagger");

const mergedPaths = {
  ...(userSwaggerSpec.paths || {}),
  ...(productSwaggerSpec.paths || {}),
  ...(orderSwaggerSpec.paths || {}),
  ...(inventorySwaggerSpec.paths || {}),
  ...(paymentSwaggerSpec.paths || {}),
};

const mergedComponents = {
  ...(userSwaggerSpec.components || {}),
  ...(productSwaggerSpec.components || {}),
  ...(orderSwaggerSpec.components || {}),
  ...(inventorySwaggerSpec.components || {}),
  ...(paymentSwaggerSpec.components || {}),
  schemas: {
    ...((userSwaggerSpec.components && userSwaggerSpec.components.schemas) || {}),
    ...((productSwaggerSpec.components && productSwaggerSpec.components.schemas) || {}),
    ...((orderSwaggerSpec.components && orderSwaggerSpec.components.schemas) || {}),
    ...((inventorySwaggerSpec.components && inventorySwaggerSpec.components.schemas) || {}),
    ...((paymentSwaggerSpec.components && paymentSwaggerSpec.components.schemas) || {}),
  },
};

const swaggerSpec = {
  openapi: "3.0.0",
  info: {
    title: "E-commerce API",
    version: "1.0.0",
  },
  paths: mergedPaths,
  components: mergedComponents,
};

module.exports = swaggerSpec;
