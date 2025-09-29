// backend/middleware/errorHandler.js
function errorHandler(err, req, res, next) {
  console.error("Error:", err.message || err);
  res.status(500).json({ error: "Something went wrong" });
}

module.exports = errorHandler;
