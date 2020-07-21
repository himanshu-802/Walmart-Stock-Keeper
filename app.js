const express = require('express');
const app = express();

const path = require('path');
const bodyParser= require('body-parser');
const dotenv= require('dotenv');
const mongoose = require('mongoose');
const flash = require('connect-flash');
const sesssion = require('express-session');
const methdoOverride = require('method-override');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

//Requiring user and admin route

const adminRoutes = require('./routes/admin');

const userRoutes = require('./routes/users');

// Requiring user model
const User = require('./models/usermodel');
dotenv.config({path: './config.env'});

mongoose.connect(process.env.DATABASE, {
    useNewUrlParser:true,
    useUnifiedTopology:true,
    useCreateIndex:true,
}).then(function (conn){
    console.log('Database connected successfully');
})
// ******** middleware for session *******
app.use(sesssion({
    secret : 'Just a simple login/signup application',
    resave: true,
    saveUninitialized: true
})); 

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy ( { usernameField:'email'},User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


//middleware for method_override

app.use(methdoOverride('_method'));

// middleware for flash messages
app.use(flash());
// setting middleware globally 
app.use((req,res,next)=>{
    res.locals.success_msg = req.flash(('success_msg'));
    res.locals.error_msg = req.flash(('error_msg'));
    res.locals.error =req.flash('error');
    res.locals.currentUser =req.user;
    next();
});

app.use(bodyParser.urlencoded({extended:true}));
app.set('views',path.join(__dirname,'views'));
app.set('view engine','ejs');
app.use(express.static('public'));
app.use(userRoutes);
app.use(adminRoutes);


app.listen(process.env.PORT, ()=>{
  //  console.log('Server is started');
});