
module.exports = function(router, passport){

	/*CSRF Protection - No session stealing*/
	const csrf = require('csurf');
	const csrfProtection = csrf();

	


	const index = require( '../controllers/admin/index' );
	const servers = require( '../controllers/admin/servers' );
	const support = require( '../controllers/admin/support' );
	const admingroups = require( '../controllers/admin/admingroups' );
	const manageusers = require( '../controllers/admin/manageusers' );
	const plugins = require( '../controllers/admin/plugins' );
	const rconcommands = require( '../controllers/admin/rconcommands' );
	const maps = require( '../controllers/admin/maps' );
	const shoutbox = require( '../controllers/admin/shoutbox' );
	const tempbandurations = require('../controllers/admin/tempbandurations');
	
	

	router.use(csrfProtection);
	/*###################### SHOUTBOX ##################################################*/

	router.get('/shoutbox/delete-all', requireRole(100), isLoggedIn, shoutbox.ShoutboxRemoveAll);


	/*###################### SERVERS ##################################################*/

	router.get('/home', requireRole(100), isLoggedIn, index.getAdminHome);
	router.get('/rcon-settings', requireRole(100), isLoggedIn, index.getRconSettings);
	router.get('/check-github-relase', requireRole(100), isLoggedIn, index.getGithubRelase);
	router.get('/backup-mongodb', requireRole(100), isLoggedIn, index.getMongoDBbackup);
	router.get('/restore-mongodb', requireRole(100), isLoggedIn, index.getMongoDBrestore);

	/*###################### SERVERS ##################################################*/

	router.get('/servers/rconconsole/delete/:id', requireRole(100), isLoggedIn, servers.RconConsoleRemove);
	router.get('/servers/rconconsole/delete-all', requireRole(100), isLoggedIn, servers.RconConsoleRemoveAll);
	router.get('/servers/delete/:id', requireRole(100), isLoggedIn, servers.ServerRemove);
	router.get('/servers/delete-local/:id', requireRole(100), isLoggedIn, servers.ServerRemoveLocal);
	router.post('/servers/edit/rules/update/:id', requireRole(100), isLoggedIn, servers.ServerRulesUpdate);
	router.post('/servers/edit/update/:id', requireRole(100), isLoggedIn, servers.ServerUpdate);
	router.post('/servers/edit/settings/update/:id', requireRole(100), isLoggedIn, servers.ServerSettingsUpdate);
	router.post('/servers/rconconsole/send/:id', requireRole(100), isLoggedIn, servers.RconConsoleAction);
	router.get('/servers/rconconsole/:id', requireRole(100), isLoggedIn, servers.ServerRconByID);
	router.get('/servers/edit/:id', requireRole(100), isLoggedIn, servers.ServerByID);
	router.post('/servers/new/save', requireRole(100), isLoggedIn, servers.InsertNewServer);
	router.post('/servers/newlocal/save', requireRole(100), isLoggedIn, servers.CreateNewLocalServer);
	router.get('/start-local-server/:id', requireRole(100), isLoggedIn, servers.LocalServerStart);
	router.get('/stop-local-server/:id', requireRole(100), isLoggedIn, servers.LocalServerStop);

	/*###################### GAME SERVERS ##################################################*/

	//router.get('/game-servers-instructions', requireRole(100), isLoggedIn, servers.getGameServersInstructions);
	router.get('/download-game-server-files', requireRole(100), isLoggedIn, servers.GetServerFiles);
	router.get('/extract-game-server-files', requireRole(100), isLoggedIn, servers.ExtractServerFiles);


	/*###################### SUPPORT ##################################################*/

	router.get('/support/delete/:id', requireRole(100), isLoggedIn, support.SupportRemove);
	router.post('/support/edit/update/:id', requireRole(100), isLoggedIn, support.SupportUpdate);
	router.get('/support/edit/:id', requireRole(100), isLoggedIn, support.SupportByID);
	router.get('/support/new', requireRole(100), isLoggedIn, support.newSupport);
	router.post('/support/new/save', requireRole(100), isLoggedIn, support.InsertNewSupport);
	router.get('/support', requireRole(100), isLoggedIn, support.getSupport);

	/*###################### ADMIN GROUPS ##################################################*/

	router.get('/admin-groups/delete/:id', requireRole(100), isLoggedIn, admingroups.AdminGroupsRemove);
	router.post('/admin-groups/edit/update/:id', requireRole(100), isLoggedIn, admingroups.AdminGroupsUpdate);
	router.get('/admin-groups/edit/:id', requireRole(100), isLoggedIn, admingroups.AdminGroupsByID);
	router.post('/admin-groups/new/save', requireRole(100), isLoggedIn, admingroups.InsertNewAdminGroups);
	router.get('/admin-groups', requireRole(100), isLoggedIn, admingroups.getAdminGroups);

	/*###################### TEMBAN DURATIONS ##################################################*/

	router.get('/tempban-durations/delete/:id', requireRole(100), isLoggedIn, tempbandurations.TempbanDurationsRemove);
	router.post('/tempban-durations/edit/update/:id', requireRole(100), isLoggedIn, tempbandurations.TempbanDurationsUpdate);
	router.get('/tempban-durations/edit/:id', requireRole(100), isLoggedIn, tempbandurations.TempbanDurationsByID);
	router.post('/tempban-durations/new/save', requireRole(100), isLoggedIn, tempbandurations.InsertNewTempbanDurations);
	router.get('/tempban-durations', requireRole(100), isLoggedIn, tempbandurations.getTempbanDurations);

	/*###################### MANAGE USERS ##################################################*/

	router.post('/manage-users/edit/update/servers/:id', requireRole(100), isLoggedIn, manageusers.ManageUsersUpdateServers);
	router.post('/manage-users/edit/update/:id', requireRole(100), isLoggedIn, manageusers.ManageUsersUpdate);
	router.get('/manage-users/edit/:id', requireRole(100), isLoggedIn, manageusers.ManageUsersByID);
	router.get('/manage-users/delete/:id', requireRole(100), isLoggedIn, manageusers.UserRemove);
	router.get('/manage-users', requireRole(100), isLoggedIn, manageusers.getManageUsers);

	/*###################### MANAGE USERS ##################################################*/

	router.get('/plugins/edit/activate/:id', requireRole(100), isLoggedIn, plugins.PluginsUpdateStatusActivate);
	router.get('/plugins/edit/deactivate/:id', requireRole(100), isLoggedIn, plugins.PluginsUpdateStatusDeActivate);
	router.post('/plugins/edit/update/plugin/:id', requireRole(100), isLoggedIn, plugins.PluginsUpdate);
	router.get('/plugins/edit/:id', requireRole(100), isLoggedIn, plugins.PluginsByID);
	router.post('/plugins/new/save', requireRole(100), isLoggedIn, plugins.InsertNewPlugins);
	router.get('/plugins', requireRole(100), isLoggedIn, plugins.getPlugins);


	/*###################### RCON COMMANDS ##################################################*/
	router.post('/rcon-commands/edit/update/extra/:id', requireRole(100), isLoggedIn, rconcommands.ExtraRconUpdate);
	router.post('/rcon-commands/edit/update/:id', requireRole(100), isLoggedIn, rconcommands.RconCommandUpdate);
	router.get('/rcon-commands/edit/:id', requireRole(100), isLoggedIn, rconcommands.RconCommandByID);
	router.get('/rcon-commands/delete/:id', requireRole(100), isLoggedIn, rconcommands.RconCommandRemove);
	router.get('/rcon-commands/new', requireRole(100), isLoggedIn, rconcommands.newRconCommand);
	router.post('/rcon-commands/new/save', requireRole(100), isLoggedIn, rconcommands.InsertNewRconCommand);
	router.get('/rcon-commands', requireRole(100), isLoggedIn, rconcommands.getHome);

	/*###################### MAPS ##################################################*/
	router.get('/maps/delete/:id', requireRole(100), isLoggedIn, maps.MapsRemove);
	router.post('/maps/upload', requireRole(100), isLoggedIn, maps.uploadMapImages);
	router.post('/maps/new/save', requireRole(100), isLoggedIn, maps.InsertNewMaps);
	router.get('/maps', requireRole(100), isLoggedIn, maps.getMaps);

	
};

/*RESTRICT ACCESS BY USER POWER*/
function requireRole(role) {
	return function(req, res, next) {
		if(req.user && req.user.local.user_role === role)
			next();
		else
			res.redirect('/');
	};
}

// route middleware to ensure user is logged in
function isLoggedIn(req, res, next) {
	if (req.isAuthenticated())
		return next();

	res.redirect('/user/login');
}

// route middleware to ensure user is logged in
function notLoggedIn(req, res, next) {
	if (!req.isAuthenticated())
		return next();

	res.redirect('/user/logout');
}
