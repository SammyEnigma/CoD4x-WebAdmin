const csrf = require('csurf');
const csrfProtection = csrf();
const chatrooms = require('../controllers/chatrooms/index');

module.exports = function(app, passport){
	
	app.use(csrfProtection);

	app.get('/:id', isLoggedIn, chatrooms.getMessage);
	app.get('/:id/new/save', isLoggedIn, chatrooms.InsertNewChatroom);
	app.post('/:id', isLoggedIn, chatrooms.InsertNewMessage);



};

function isLoggedIn(req, res, next) {
  if(req.isAuthenticated()) {
    return next();
  }
  res.redirect('/user/login');
}
