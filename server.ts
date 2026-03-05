import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Proxy to bypass CORS
  app.all("/api/proxy", async (req, res) => {
    try {
      const method = req.method;
      const params = method === "POST" ? req.body : req.query;
      
      console.log(`Proxying ${method} request for action:`, params.action);
      
      if (!params.key) {
        return res.status(400).json({ error: "API Key is missing" });
      }

      // Try POST first as it's standard for SMM APIs
      const response = await fetch("https://yoxok.com/api/v2", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
        body: new URLSearchParams(params as any).toString(),
      });

      const text = await response.text();
      console.log("Upstream Status:", response.status);

      if (response.status === 405) {
        console.log("Received 405, trying GET instead...");
        const getResponse = await fetch(`https://yoxok.com/api/v2?${new URLSearchParams(params as any).toString()}`, {
          method: "GET",
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          }
        });
        const getText = await getResponse.text();
        try {
          return res.json(JSON.parse(getText));
        } catch (e) {
          return res.status(getResponse.status).json({ error: "Failed to parse GET response", details: getText });
        }
      }

      try {
        const data = JSON.parse(text);
        res.json(data);
      } catch (e) {
        res.status(500).json({ error: "Invalid JSON from API", details: text });
      }
    } catch (error) {
      console.error("Proxy Error:", error);
      res.status(500).json({ error: "Proxy connection failed", message: error.message });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Wemoo Server running on http://localhost:${PORT}`);
  });
}

startServer();
