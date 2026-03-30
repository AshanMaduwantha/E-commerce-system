const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Payment Service API",
      version: "1.0.0",
      description: "REST API for payment management (in-memory storage)",
    },
    servers: [
      {
        url: "http://localhost:5002",
        description: "Local development server",
      },
    ],
  },
  apis: [__dirname + "/server.js"],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
