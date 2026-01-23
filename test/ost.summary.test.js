// 🔥 MOCK PYTHON SUMMARIZER
jest.mock("../services/summarizer.service", () => ({
  generateSummary: jest.fn(async () => {
    return "Ini adalah ringkasan otomatis hasil AI.";
  }),
}));

const request = require("supertest");
const app = require("../app");

describe("AUTO SUMMARY GENERATION", () => {
  it("should auto-generate summary when creating post", async () => {
    const res = await request(app).post("/api/posts").send({
      title: "Banjir Kulon Progo",
      content:
        "Banjir merendam sejumlah wilayah akibat hujan deras sejak malam hari. Air sungai meluap dan menggenangi permukiman warga. Aktivitas masyarakat terganggu. Warga diminta waspada.",
      status: "publish",
    });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);

    const post = res.body.data;
    expect(post.summary).toBeDefined();
    expect(post.summary).toContain("ringkasan");
  });
});
