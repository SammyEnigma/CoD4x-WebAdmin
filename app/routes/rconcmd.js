const rconcmd = require('../controllers/rconcmd/index');

module.exports = function(app, passport){

	const csrf = require('csurf');
	const csrfProtection = csrf();
	app.use(csrfProtection);

	/* GET home page. */
	//

	app.get('/unban/:id', isLoggedIn, rconcmd.RconUnban);
	app.get('/cheater-report/permban/:id', isLoggedIn, rconcmd.RconPermbanOnReport);
	app.get('/permban/:screenshot_img', isLoggedIn, rconcmd.RconPermban);
	app.post('/:id/cmd', isLoggedIn, rconcmd.RconAdminAction);
	app.post('/:id/tempban', isLoggedIn, rconcmd.RconTempban);
	app.post('/:id/changemap', isLoggedIn, rconcmd.RconChangeMap);
	app.post('/:id/getssall', isLoggedIn, rconcmd.RconGetssAll);
	app.post('/:id/getss', isLoggedIn, rconcmd.Rcongetss);
	app.post('/:id/maprotate', isLoggedIn, rconcmd.RconMaprotate);
};

function isLoggedIn(req, res, next) {
  if(req.isAuthenticated()) {
    return next();
  }
  req.session.oldUrl = req.url;
  res.redirect('/user/login');

}
