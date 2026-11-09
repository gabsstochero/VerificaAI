/** Limitador simples em memória: protege o seu saldo de créditos de uso excessivo. */
export function rateLimit({ windowMs = 60_000, max = 10 } = {}) {
  const hits = new Map();

  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip;
    const entry = hits.get(key);

    if (!entry || now > entry.resetAt) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    if (entry.count >= max) {
      return res
        .status(429)
        .json({ error: 'Muitas análises em pouco tempo. Aguarde um instante e tente novamente.' });
    }
    entry.count++;
    next();
  };
}
