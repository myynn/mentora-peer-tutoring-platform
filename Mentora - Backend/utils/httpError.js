
export function sendError(res, err, fallbackMsg = "Server error") {
  //  mongoose bad ObjectId error
  if (err?.name === "CastError") {
    return res.status(400).json({ message: "Invalid id format." });
  }

  // mongoose schema validation
  if (err?.name === "ValidationError") {
    const firstMsg =
      Object.values(err.errors || {})[0]?.message || "Validation failed.";
    return res.status(400).json({ message: firstMsg, errors: err.errors });
  }

  // duplicate key (unique username/email)
  if (err?.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    return res.status(409).json({ message: `${field} already exists.` });
  }

  // mongo bad query style errors
  // If someone passes weird operators or wrong types
  if (err?.name === "MongoServerError") {
    return res.status(500).json({ message: err.message || fallbackMsg });
  }
  
  // mongo connection issue
  if (err?.name === "MongoServerSelectionError") {
    return res.status(503).json({ message: "Database unavailable. Try again later." });
  }

  return res.status(500).json({ message: err?.message || fallbackMsg });
}