const { model } = require('mongoose')
const User = require('../models/user')

module.exports = (req, res, next) => {
    User.findById(req.session.userId).then((user) =>{
        if (!user) {
            return res.redirect('/')
        }
        console.log('User logged in successfully')
        next()
    }).catch(error => {
        console.error(error)
    })
}