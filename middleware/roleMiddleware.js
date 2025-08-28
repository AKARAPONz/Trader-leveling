function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    const user = req.session.user;

    if (!user || !allowedRoles.includes(user.role)) {
      return res.status(403).send('Access denied');
    }

    next();
  };
}

module.exports = authorizeRoles;
