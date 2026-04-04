const swaggerJsdoc = require("swagger-jsdoc");

const PORT = process.env.PORT || 3001;

const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "News Al-Muhtada API",
      version: "1.0.0",
      description: "REST API untuk sistem berita Al-Muhtada",
      contact: {
        name: "Backend Team",
        email: "backend@almuhtada.com",
      },
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: "Development server",
      },
      {
        url: "https://api.almuhtada.com",
        description: "Production server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        User: {
          type: "object",
          properties: {
            id: {
              type: "integer",
              description: "User ID",
            },
            wp_user_id: {
              type: "integer",
              description: "WordPress user ID (for migration)",
            },
            username: {
              type: "string",
              description: "Unique username",
            },
            email: {
              type: "string",
              format: "email",
              description: "User email address",
            },
            display_name: {
              type: "string",
              description: "Display name",
            },
            first_name: {
              type: "string",
              description: "First name",
            },
            last_name: {
              type: "string",
              description: "Last name",
            },
            role: {
              type: "string",
              enum: [
                "administrator",
                "editor",
                "author",
                "contributor",
                "subscriber",
                "user",
              ],
              description: "User role",
            },
            user_url: {
              type: "string",
              description: "User website URL",
            },
            user_registered: {
              type: "string",
              format: "date-time",
              description: "Registration date",
            },
            createdAt: {
              type: "string",
              format: "date-time",
              description: "Creation timestamp",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
              description: "Last update timestamp",
            },
          },
        },
        UserFormData: {
          type: "object",
          properties: {
            username: {
              type: "string",
              description: "Unique username",
            },
            email: {
              type: "string",
              format: "email",
              description: "User email address",
            },
            password: {
              type: "string",
              format: "password",
              description: "User password (required for creation)",
            },
            display_name: {
              type: "string",
              description: "Display name",
            },
            first_name: {
              type: "string",
              description: "First name",
            },
            last_name: {
              type: "string",
              description: "Last name",
            },
            role: {
              type: "string",
              enum: [
                "administrator",
                "editor",
                "author",
                "contributor",
                "subscriber",
                "user",
              ],
              description: "User role",
            },
          },
        },
        Post: {
          type: "object",
          properties: {
            id: {
              type: "integer",
              description: "Post ID",
            },
            title: {
              type: "string",
              description: "Post title",
            },
            content: {
              type: "string",
              description: "Post content (HTML)",
            },
            excerpt: {
              type: "string",
              description: "Post excerpt",
            },
            slug: {
              type: "string",
              description: "Post slug (URL friendly)",
            },
            status: {
              type: "string",
              enum: ["publish", "draft", "pending"],
              description: "Post status",
            },
            featured_image: {
              type: "string",
              description: "Featured image URL",
            },
            author_id: {
              type: "integer",
              description: "Author ID",
            },
            author: {
              type: "object",
              description: "Author information",
            },
            categories: {
              type: "array",
              items: {
                type: "object",
              },
              description: "Post categories",
            },
            tags: {
              type: "array",
              items: {
                type: "object",
              },
              description: "Post tags",
            },
            views: {
              type: "integer",
              description: "View count",
            },
            createdAt: {
              type: "string",
              format: "date-time",
              description: "Creation timestamp",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
              description: "Last update timestamp",
            },
          },
        },
        Category: {
          type: "object",
          properties: {
            id: {
              type: "integer",
              description: "Category ID",
            },
            name: {
              type: "string",
              description: "Category name",
            },
            slug: {
              type: "string",
              description: "Category slug",
            },
            description: {
              type: "string",
              description: "Category description",
            },
            parent_id: {
              type: "integer",
              description: "Parent category ID",
            },
          },
        },
        Tag: {
          type: "object",
          properties: {
            id: {
              type: "integer",
              description: "Tag ID",
            },
            name: {
              type: "string",
              description: "Tag name",
            },
            slug: {
              type: "string",
              description: "Tag slug",
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ["./routes/*.js"],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

module.exports = swaggerSpec;
