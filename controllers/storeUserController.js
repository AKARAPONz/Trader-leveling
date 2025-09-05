const User = require('../models/User')

module.exports = (req, res) => {
    console.log('storeUserController req.body:', req.body);
    User.create(req.body).then(() =>{
    console.log("user registerd successfully!")
    res.redirect('/login')
    }).catch((error) => {
        console.error('storeUserController error:', error);
        let validationErrors = [];
        if (error && error.errors) {
            validationErrors = Object.keys(error.errors).map(key => error.errors[key].message);
        } else if (error.code === 11000) {
            validationErrors = ['Username already exists.'];
        } else {
            validationErrors = [error.message || 'Unknown error'];
        }
        req.flash('validationErrors', validationErrors);
        req.flash('data', req.body);
        return res.redirect('/register');
    })
}