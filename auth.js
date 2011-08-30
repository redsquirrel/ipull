module.exports = {
  protect: function(req, res, next) {
    if (req.loggedIn) {
      next();
    } else {
      res.redirect("/"); // need an alert to login; also store the target for redirect
    }
  }
};