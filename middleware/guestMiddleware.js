const User = require('../models/user');

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

        // Allow guests to access any /tournament route
        if (
            req.baseUrl === '/tournament' ||
            req.baseUrl.startsWith('/tournament')
        ) {
            req.user = user;
            return next();
        }
        // Allow access to profile page for all users (including guests)
        if (req.path === '/profile' || req.path.startsWith('/profile/')) {
            req.user = user;
            return next();
        }
        // Allow guests to access tournament dashboard
        if (
            req.baseUrl === '/dashboard' && req.query.tournamentId
        ) {
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