// Require needed modules
const mongoose = require('mongoose');
const BluebirdPromise = require('bluebird');
const Appversion = require("../../models/app_version");
const AdminGroups = require("../../models/admingroups");
const Rconposition = require("../../models/rconcommand_position");
const Rconcommand = require("../../models/rconcommands");
const ExtraRcon = require("../../models/extra_rcon_commands");
const Color = require("../../models/colors");
const Servers = require("../../models/servers");
const Cod4xversion = require("../../models/cod4x_version");
const Systemlogs = require("../../models/system_logs");


//Set dates for testing
var start = new Date();
start.setHours(0,0,0,0);

var end = new Date();
end.setHours(23,59,59,999);

module.exports = {

	getAdminHome: function(req, res, next) {
		BluebirdPromise.props({
			appversion: Appversion.findOne({name:'CoD4x-WebAdmin'}).execAsync(),
			cod4xversion: Cod4xversion.findOne({name:'CoD4x-Server'}).execAsync(),
			local_servers: Servers.find({external_ip:false}).execAsync(),
			external_servers: Servers.find({external_ip: true}).execAsync(),
			sysinfo: Systemlogs.find({}).sort({createdAt: -1}).limit(30).execAsync(),
			colors: Color.find({}).execAsync()
		}).then (function(results){
			res.render('admin/home/index.pug', {title: 'Admin Dashboard', results: results, csrfToken: req.csrfToken()});
		}).catch(function(err) {
			console.log(err);
			res.redirect('/user/profile');
		});
	},

	getRconSettings: function(req, res, next) {
		BluebirdPromise.props({
			admingroups: AdminGroups.find({}).execAsync(),
			extrarcon: ExtraRcon.findOne({name:'extra_rcon'}).execAsync(),
			rconcommands: Rconcommand.find({}).sort({name_alias: 'asc'}).execAsync()
		}).then (function(results){
    		res.render('admin/rcon-settings/index.pug', {title: 'Rcon Commands Settings', results: results, csrfToken: req.csrfToken()});
  		}).catch(function(err) {
  			console.log(err);
  			res.redirect('/user/profile');
  		});
	},
};
