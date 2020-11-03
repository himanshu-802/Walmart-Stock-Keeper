const express = require('express');
const router = express.Router();
const passport = require('passport');
const crypto = require('crypto');
const async = require('async');
const nodemailer = require('nodemailer');
let cnt=0;
const User = require('../models/usermodel');

// *******  Checks if user is authenticated or not **********

function isAuthenticatedUser(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    req.flash('error_msg', 'Please login first to access the page');
    res.redirect('/login');
}

// GET routes
router.get('/login', (req, res) => {
    // if(cnt==1){
    //     req.flash('error_msg','ERROR: Logout first');
    //     res.redirect('/dashboard');
    // }
    // else{
    // cnt=1;
    res.render('./users/login');
    
});

router.get('/signup', (req, res) => {
    res.render('./users/signup');
});


router.get('/logout', isAuthenticatedUser,(req, res) => {
    cnt=0;
    req.logOut();
    req.flash('success_msg', 'You have been logged out');
    res.redirect('/login');
    
});

router.get('/forgot', (req, res) => {
    res.render('./users/forgot');
})


router.get('/reset/:token', (req, res) => {
    User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } })
        .then(function (user) {
            if (!user) {
                req.flash('error_msg', 'Password reset token is invalid or has been expired');
                res.redirect('/forgot');
            }
            res.render('./users/newpassword', { token: req.params.token });
        })
        .catch(function (err) {
            req.flash('error_msg', 'ERROR: ' + err);
            res.redirect('/forgot');
        })
});


router.get('/password/change',isAuthenticatedUser, (req, res) => {
    res.render('./users/changepassword');
})


router.get('/users/all',isAuthenticatedUser,(req,res)=>{
    User.find({})
       .then(function (users){
           res.render('./users/alluser',{users:users});
       })
       .catch( function (err){
            req.flash('error_msg', 'ERROR: '+err);
            res.redirect('/user/all');
       })
})

router.get('/edit/:id',(req,res)=>{
    let searchQuery ={_id :req.params.id };
    User.findOne(searchQuery)
    .then(function(user){
        res.render('./users/edituser',{user:user});
    })
    .catch(function (err){
        
        req.flash('error_msg', 'ERROR: '+err);
        res.redirect('/user/edituser',{user:''});
        
        //console.log(err);
    })

})



// *****************POST ROUTES ****************
router.post('/login', passport.authenticate('local', {
    successRedirect: '/dashboard',
    failureRedirect: '/login',
    failureFlash: 'Invalid email0 or password. Try Again!!!'
}));

router.post('/signup',(req, res) => {
    let { name, email, password } = req.body;
    console.log(name + ' ' + email + ' ' + password);
    let userData = {
        name: name,
        email: email,
    };
    User.register(userData, password, (err, user) => {
        if (err) {
    //        console.log(err.name);
      //      console.log(err.message);
            req.flash('error_msg', 'ERROR: ' + err);
            res.redirect('/signup');
        }
        
        req.flash('success_msg', 'Account created successfully');
        res.redirect('/signup');

    });

});



//ROutes to handle forgot password

router.post('/password/change', (req, res) => {
    if (req.body.password !== req.body.confirmpassword) {
        req.flash('error_msg', "Password don't match. Try again ");
        return res.redirect('/password/change');
    }
    User.findOne({ email: req.user.email })
        .then(function (user) {
            user.setPassword(req.body.password, function (err) {
                user.save()
                    .then(function (user) {
                        req.flash('success_msg', 'Password changed successfully');
                        res.redirect('/dashboard');
                    })
                    .catch(function (err) {
                        req.flash('error_msg', 'ERROR: ' + err);
                        res.redirect('/password/change');
                    });
            });

        });

});

router.post('/forgot', (req, res, next) => {
    let recoveryPassword = '';
    async.waterfall([
        (done) => {
            crypto.randomBytes(20, (err, buf) => {
                let token = buf.toString('hex');
                done(err, token);
            });
        },

        (token, done) => {
            User.findOne({ email: req.body.email })
                .then(user => {
                    if (!user) {
                        req.flash('error_msg', 'User does not exist with this email');
                        return res.redirect('/forgot');
                    }
                    user.resetPasswordToken = token;
                    user.resetPasswordExpires = Date.now() + 1800000 // .5 hours
                    user.save((err) => {
                        done(err, token, user);
                    });
                })
                .catch(err => {
                    req.flash('error_msg', 'ERROR: ' + err);
                    res.redirect('/forgot');
                })
        },
        function (token, user) {
            let smtpTransport = nodemailer.createTransport({
                service: 'Gmail',
                auth: {
                    user: process.env.GMAIL_EMAIL,
                    pass: process.env.GMAIL_PASSWORD
                }
            });
            let mailOptions = {
                to: user.email,
                from: ' Himanshu Rathore himanshu.rathore8022@gmail.com',
                subject: 'Recovery Email from Auth Project',
                text: 'Please click the following link to recover your password : \n\n' +
                    'http://' + req.headers.host + '/reset/' + token + '\n\n' +
                    'If you did not request this, Please ignore this email.'
            };

            smtpTransport.sendMail(mailOptions, err => {
                // console.log( 'user mail is ' + user.email);

                req.flash('success_msg', 'Email send with further instructions. Please check that ');
                res.redirect('/forgot');
            });
        }

    ], err => {
        if (err) res.redirect('/forgot');
    });
});

router.post('/reset/:token', (req, res, next) => {
    async.waterfall([
        function (done) {
            User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } })
                .then(function (user) {
                    if (!user) {
                        req.flash('error_msg', 'Password reset token is invalid or has been expired');
                        res.redirect('/forgot');
                    }
                    if (req.body.password != req.body.confirmpassword) {
                        req.flash('error_msg', "Password don't match");
                        return res.redirect('/forgot');
                    }
                    user.setPassword(req.body.password, function (err) {
                        user.resetPasswordToken = undefined;
                        user.resetPasswordExpires = undefined;

                        user.save(function (err) {
                            req.logIn(user, function (err) {
                                done(err, user);
                            });
                        });

                    });
                })
                .catch(function (err) {
                    req.flash('error_msg', 'ERROR: ' + err);
                    res.redirect('/forgot');
                })
        },
        function (user) {
            let smtpTransport = nodemailer.createTransport({
                service: 'Gmail',
                auth: {
                    user: process.env.GMAIL_EMAIL,
                    pass: process.env.GMAIL_PASSWORD
                }
            });
            let mailOptions = {
                to: user.email,
                from: 'Himanshu Rathore himanshu.rathore8022@gmail.com',
                subject: ' Your Password is changed.',
                text: ' Hello ' + user.name + '\n\n' +
                    ' This is the confirmation that the password for your account' + user.email + 'has been changed.'
            };
            smtpTransport.sendMail(mailOptions, function (err) {
                req.flash('success_msg', 'Your password has been chnaged');
                res.redirect('/login');
            });
        }

    ], function (err) {
        res.redirect('/login');
    });

});

// ***************PUT Routes************

router.put('/edit/:id',(req,res)=>{
    let searchQuery  = {_id : req.params.id};
    User.updateOne(searchQuery,{$set:{
        name : req.body.name,
        email : req.body.email
    }})
    .then(function(user){
        req.flash('success_msg','User updated sucessfully');
        res.redirect('/users/all');
    })
    .catch(function (err){
        req.flash('error_msg','ERROR: '+err);
        res.redirect('/users/all');
    });
});

// **********DELETE Routes ***********

router.delete('/delete/user/:id',(req,res)=>{
    let searchQuery = {_id:req.params.id};
    User.deleteOne(searchQuery)
    .then(function(user){
        req.flash('success_msg','User deleted successfully');
        res.redirect('/users/all');
    })
    .catch(function(err){
        req.flash('error_msg','ERROR: '+err);
        res.redirect('/users/all');
    });
});
module.exports = router;