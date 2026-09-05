// utils/cache.js
const NodeCache = require("node-cache");

// stdTTL in secondi, checkperiod = ogni quanto pulisce le entry scadute
const apiCache = new NodeCache({ stdTTL: 60, checkperiod: 90, useClones: false });

// Middleware: se la risposta per questo esatto URL (query string inclusa) è in cache, la serve subito
function cacheMiddleware(ttlSeconds = 60) {
  return (req, res, next) => {
    const key = req.originalUrl;
    const cached = apiCache.get(key);

    if (cached) {
      res.set("Cache-Control", `public, max-age=${ttlSeconds}`);
      return res.json(cached);
    }

    // Intercetta res.json per salvare il risultato PRIMA di inviarlo al client
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode === 200) {
        apiCache.set(key, body, ttlSeconds);
      }
      return originalJson(body);
    };

    next();
  };
}

// Invalida tutte le chiavi che contengono uno dei prefissi passati
// (es. invalidateCache(["/museums"]) pulisce /museums, /museums/123, /museums/123/works, ecc.)
function invalidateCache(prefixes = []) {
  const keys = apiCache.keys();
  keys.forEach((key) => {
    if (prefixes.length === 0 || prefixes.some((p) => key.includes(p))) {
      apiCache.del(key);
    }
  });
}

module.exports = { cacheMiddleware, invalidateCache };