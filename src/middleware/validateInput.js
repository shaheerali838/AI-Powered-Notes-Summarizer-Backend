export const validateInput = (req, res, next) => {
  if (!req.body.text) {
    return res
      .status(400)
      .json({ error: "Missing 'text' field in request body" });
  }
  next();
};
