const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Order Service API",
      version: "1.0.0",
      description:
        "REST API for managing orders (in-memory). Swagger UI at /api-docs",
    },
    servers: [
      {
        url: "http://localhost:5001",
        description: "Local development server",
      },
    ],
    components: {
      schemas: {
        Order: {
          type: "object",
          properties: {
            id: { type: "integer", example: 1 },
            customerName: { type: "string", example: "John" },
            productName: { type: "string", example: "Laptop" },
            quantity: { type: "integer", example: 2 },
            status: { type: "string", example: "Pending" },
          },
        },
        CreateOrderRequest: {
          type: "object",
          required: ["customerName", "productName", "quantity"],
          properties: {
            customerName: { type: "string" },
            productName: { type: "string" },
            quantity: { type: "integer", minimum: 1 },
          },
        },
        UpdateOrderStatusRequest: {
          type: "object",
          required: ["status"],
          properties: {
            status: { type: "string", example: "Shipped" },
          },
        },
        Error: {
          type: "object",
          properties: {
            message: { type: "string" },
          },
        },
        DeleteSuccess: {
          type: "object",
          properties: {
            message: { type: "string", example: "Order deleted successfully" },
          },
        },
      },
    },
  },
  apis: [__dirname + "/server.js"],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
