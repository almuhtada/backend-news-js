const request = require("supertest");
const app = require("../app");

describe("Security Middleware & Authorization", () => {
  describe("Helmet Security Headers", () => {
    it("should include security headers from Helmet", async () => {
      const res = await request(app).get("/health");
      
      // Verify standard Helmet headers are present
      expect(res.headers["x-frame-options"]).toBe("SAMEORIGIN");
      expect(res.headers["x-content-type-options"]).toBe("nosniff");
      expect(res.headers["x-dns-prefetch-control"]).toBe("off");
    });
  });

  describe("Authentication Rate Limiting", () => {
    it("should limit rapid login requests", async () => {
      // Send 20 requests to hit the rate limiter threshold
      for (let i = 0; i < 20; i++) {
        await request(app)
          .post("/api/auth/login")
          .send({ identifier: "invalid_user", password: "wrong_password" });
      }

      // The 21st request should be blocked by rate limiter (HTTP 429)
      const res = await request(app)
        .post("/api/auth/login")
        .send({ identifier: "invalid_user", password: "wrong_password" });

      expect(res.statusCode).toBe(429);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("Terlalu banyak permintaan");
    });
  });
});
