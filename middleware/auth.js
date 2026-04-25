// middleware/auth.js
function isAdmin(req, res, next) {
  if (req.session?.user?.user_type === "admin") {
    return next(); // allow access
  }
  res.status(403).send("Access denied. Admins only.");
}

function isStudent(req, res, next) {
  if (req.session?.user?.user_type === "student") {
    return next();
  }
  res.status(403).send("Access denied. Students only.");
}

function isBusiness(req, res, next) {
  if (req.session?.user?.user_type === "business") {
    return next();
  }
  res.status(403).send("Access denied. Businesses only.");
}

module.exports = { isAdmin, isStudent, isBusiness };
