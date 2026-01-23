const { spawn } = require("child_process");
const path = require("path");

const PYTHON_BIN = process.env.PYTHON_BIN || "python";
const AI_DIR = path.resolve("ai-news");
const SCRIPT_PATH = path.join(AI_DIR, "infer.py");

exports.generateSummary = (content) => {
  return new Promise((resolve, reject) => {
    const py = spawn(PYTHON_BIN, [SCRIPT_PATH], {
      cwd: AI_DIR,
      stdio: ["pipe", "pipe", "pipe"],
    });

    let output = "";
    let error = "";

    py.stdout.on("data", (data) => {
      output += data.toString();
    });

    py.stderr.on("data", (data) => {
      error += data.toString();
    });

    py.on("close", (code) => {
      if (code !== 0 || error) {
        return reject(error || "Summarizer error");
      }
      resolve(output.trim());
    });

    py.stdin.write(content);
    py.stdin.end();
  });
};
