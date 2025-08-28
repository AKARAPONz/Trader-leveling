const User = require('../models/User');

module.exports = (req, res, next) => {
    // Check if user is logged in
    if (!req.session.userId) {
        return res.redirect('/');
    }

    // Get user from database
    User.findById(req.session.userId).then((user) => {
        if (!user) {
            return res.redirect('/');
        }

        // Allow access to profile page for all users (including guests)
        if (req.path === '/profile' || req.path.startsWith('/profile/')) {
            req.user = user;
            return next();
        }

        // Check if user role is guest for other pages
        if (user.role === 'guest') {
            return res.redirect('/');
        }

        // Add user to request object for use in controllers
        req.user = user;
        next();
    }).catch(error => {
        console.error('Guest middleware error:', error);
        return res.redirect('/');
    });
}; 