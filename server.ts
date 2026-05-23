import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Parse JSON bodies
  app.use(express.json());

  // Helper payment creation logic
  const handlePaymentCreation = async (req: express.Request, res: express.Response) => {
    const { token, body } = req.body;
    if (!token) {
      return res.status(400).json({ error: "O token de acesso do Mercado Pago é obrigatório." });
    }

    try {
      const response = await fetch("https://api.mercadopago.com/v1/payments", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "X-Idempotency-Key": `id-key-${Date.now()}`
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();
      if (!response.ok) {
        return res.status(response.status).json(data);
      }

      return res.json(data);
    } catch (error: any) {
      console.error("Erro ao criar pagamento no servidor proxy:", error);
      return res.status(500).json({ error: error.message || "Erro interno do servidor proxy." });
    }
  };

  // Helper payment status check logic
  const handlePaymentStatusCheck = async (req: express.Request, res: express.Response) => {
    const { paymentId } = req.params;
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: "Cabeçalho de autorização é obrigatório." });
    }

    try {
      const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          "Authorization": authHeader
        }
      });

      const data = await response.json();
      if (!response.ok) {
        return res.status(response.status).json(data);
      }

      return res.json(data);
    } catch (error: any) {
      console.error("Erro ao verificar status do pagamento no proxy:", error);
      return res.status(500).json({ error: error.message || "Erro interno do servidor proxy." });
    }
  };

  // Register Proxy endpoints under both raw API and path-base API to guarantee matching
  app.post("/api/mercadopago/payment", handlePaymentCreation);
  app.post("/Whisky-Premium-Sorteios/api/mercadopago/payment", handlePaymentCreation);

  app.get("/api/mercadopago/payment/:paymentId", handlePaymentStatusCheck);
  app.get("/Whisky-Premium-Sorteios/api/mercadopago/payment/:paymentId", handlePaymentStatusCheck);

  // Vite development middle-tier or static assets in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Proxy server running on port ${PORT}`);
  });
}

startServer();
