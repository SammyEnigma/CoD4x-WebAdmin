const express = require('express');
const path = require('path');
const favicon = require('serve-favicon');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const BluebirdPromise  = require('bluebird');
mongoose.Promise = require('bluebird');
const passport = require('passport');
const passportSocketIo = require("passport.socketio");
const flash    = require('connect-flash');
const validator = require('express-validator');
const morgan       = require('morgan');
const session      = require('express-session');
const moment = require('moment');
const formatNum = require('format-num');
const mongoosePaginate = require('mongoose-paginate');
const async = require("async");
const cors = require('cors');
const app = express();

app.use(cors());

const MongoStore = require('connect-mongo')(session);
const config = require('./app/config/config');
var dbURI = "mongodb://" + 
			encodeURIComponent(config.db.username) + ":" + 
			encodeURIComponent(config.db.password) + "@" + 
			config.db.host + ":" + 
			config.db.port + "/" + 
			config.db.name;
mongoose.connect(dbURI, {useNewUrlParser:true});
// Throw an error if the connection fails
mongoose.connection.on('error', function(err) {
	if(err) throw err;
});
require('./app/config/passport')(passport);
app.use('/flags', express.static(__dirname + '/public/vendors/bower_components/flag-icon-css/flags')); // redirect CSS
app.use('/js', express.static(__dirname + '/node_modules/socket.io-client/dist')); // redirect JS
app.use('/js', express.static(__dirname + '/node_modules/markdown-it/dist')); // redirect JS
// view engine setup
app.set('views', path.join(__dirname, 'app/views'));
app.set('view engine', 'pug');
app.use(express.static(path.join(__dirname, 'public')));
//Add date and time in croatian language
app.locals.moment = require('moment');
moment.locale('en');
//Add number formatNum
app.locals.formatNum = require('format-num');
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(morgan('dev'));
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(validator());
app.use(session({secret: config.sessionSecret,resave: false,cookie: { maxAge: (24 * 3600 * 1000 * 14)},saveUninitialized: false,store: new MongoStore({ mongooseConnection: mongoose.connection,ttl: 2 * 24 * 60 * 60 })}));
app.use(passport.initialize());
app.use(passport.session());
app.use(passport.authenticate('remember-me'));
app.use(flash());
const variables = require('./app/config/configuration')(app);
app.use(function(req, res, next){
	res.locals.success_messages = req.flash('success_messages');
	res.locals.error_messages = req.flash('error_messages');
	res.locals.info_messages = req.flash('info_messages');
	res.locals.rconconsole_messages = req.flash('rconconsole_messages');
	res.locals.notify_messages = req.flash('notify_messages');
	res.locals.notify_socketio_messages = req.flash('notify_socketio_messages');
	res.locals.login = req.isAuthenticated();
	res.locals.user = req.user;
	res.locals.websitename = config.website_name;
	next();
});
const io = require('./app/socket/io');


// Routes ======================================================================
const rconcmd = express.Router();
require('./app/routes/rconcmd')(rconcmd, passport);
app.use('/rconcmd', rconcmd);
const chatrooms = express.Router();
require('./app/routes/chatrooms')(chatrooms, passport);
app.use('/messages', chatrooms);
const admin = express.Router();
require('./app/routes/admin')(admin, passport);
app.use('/admin', admin);
const user = express.Router();
require('./app/routes/user')(user, passport);
app.use('/user', user);
const cod4x_plugins = express.Router();
require('./app/routes/cod4x_plugins')(cod4x_plugins, passport);
app.use('/cod4x_plugins', cod4x_plugins);
const admin_conversations = express.Router();
require('./app/routes/admin_conversations')(admin_conversations, passport);
app.use('/admin-conversations', admin_conversations);
require('./app/routes/index')(app, passport);
// catch 404 and forward to error handler
app.use(function(req, res, next) {
  const err = new Error('Not Found');
  err.status = 404;
  res.render('404.pug', {title: '404: File Not Found'});
  next(err);
});
// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  // render the error page
  res.render('error');
  res.status(err.status || 500);
});
module.exports = app;
