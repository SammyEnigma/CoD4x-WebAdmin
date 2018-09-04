const home = require('../controllers/index/home');
const csrf = require('csurf');

module.exports = function(app, passport, io){

	const csrfProtection = csrf();
	app.get('/sitemap.xml', home.SiteMapCreate);
	
	app.use(csrfProtection);
	app.get('/', home.getHome);
	app.get('/notifications', isLoggedIn, home.getGlobalNotifications);
	app.get('/clean-notifications', isLoggedIn, home.GlobalNotificationsRemove);
	app.get('/cheater-reports', isLoggedIn, home.getCheaterReports);
	app.get('/cheater-report/delete/:id', isLoggedIn, home.CheaterReportRemove);
	app.get('/unban-request/delete/:id', isLoggedIn, home.UnbanRequestRemove);
	app.post('/unban-request/new/save', isLoggedIn, home.InsertNewunbanRequest);
	app.get('/report-cheater/:screenshot_img', isLoggedIn, home.InsertNewCheaterReport);
	app.post('/banlist/:id/like/new/save', isLoggedIn, home.InsertNewBanLike);
	app.post('/banlist/:id/new/save', isLoggedIn, home.InsertNewCommentonBan);
	app.get('/remove-screenshots/:id', isLoggedIn, home.ScreenshotsRemove);
	app.get('/admin-notifications', isLoggedIn, home.getMyNotifications);
	app.get('/banlist/:id',isLoggedIn, home.getBanById);
	app.get('/members/:id',isLoggedIn, home.getMemberById);
	app.get('/members',home.getMembers);
	app.get('/banlist',home.getBanned);
	app.get('/admin-applications', isLoggedIn, home.getAdminApp);
	app.post('/admin-applications', isLoggedIn, home.InsertNewAdminApp);
	app.post('/admin-application/new/conversation', isLoggedIn, home.AdminAppConversationStart);
	app.post('/admin-application/delete/admin-app', isLoggedIn, home.AdminAppRemove);
	app.post('/admin-application/accept/admin-app', isLoggedIn, home.AdminAppAccept);
	app.get('/admin-conversations', isLoggedIn ,home.getConversations);
	app.get('/banlist/search/player?:sq', home.searchBanned);
	app.get('/support',home.getFAQ);
	app.get('/:name_alias',home.getServer);
	app.get('/kgb-plugin/:id/:task', isLoggedIn, home.getKGBplugin);
	
};

function isLoggedIn(req, res, next) {
  if(req.isAuthenticated()) {
    return next();
  }
  res.redirect('/user/login');
}
