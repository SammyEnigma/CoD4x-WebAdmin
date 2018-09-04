// Require needed modules
const mongoose = require('mongoose');
const moment = require('moment');
const BluebirdPromise = require('bluebird');

const User = require("../../models/user");
const Servers = require("../../models/servers");
const AdminGroups = require("../../models/admingroups");

const Adminactions = require("../../models/admin_actions");
const AdminConversationComment = require("../../models/admin_conversation");
const Bancomments = require("../../models/ban-comments");
const Bans = require("../../models/bans");
const Cheaterreports = require("../../models/cheater_reports");
const Globalnotifications = require("../../models/global_notifications");
const Notifications = require("../../models/notifications");
const NotificationsSender = require("../../models/notificationssender");
const Shoutbox = require("../../models/shoutbox");
const Unbans = require("../../models/unbans");
const UserScreenshots = require("../../models/user_screenshots");


//Set dates for testing
var start = new Date();
start.setHours(0,0,0,0);

var end = new Date();
end.setHours(23,59,59,999);

module.exports = {

	getManageUsers: function(req, res, next) {
	BluebirdPromise.props({
		user: User.find({}).sort({'local.user_role': 'desc', 'local.user_name': 'asc'}).populate('local.admin_on_servers', 'name _id name_alias').execAsync(),
		admingroups: AdminGroups.find({}).sort({'power': 'asc'}).execAsync(),
		servers: Servers.find({}).sort({'name_alias': 'asc'}).execAsync()
	}).then (function(results){
    		res.render('admin/manage-users/index.pug', {title: 'Manage Users', results: results, csrfToken: req.csrfToken()});
  		}).catch(function(err) {
  			console.log(err);
  			res.redirect('/user/profile');
  		});
	},

	ManageUsersByID: function(req, res, next) {
		BluebirdPromise.props({
			user: User.findOne({'_id': req.params.id}).populate('local.admin_on_servers', 'name _id name_alias').execAsync(),
			admingroups: AdminGroups.find({}).sort({'power': 'asc'}).execAsync(),
			servers: Servers.find({}).sort({'name_alias': 'asc'}).execAsync()
		}).then (function(results){
			
		    
	    	res.render('admin/manage-users/edit.pug', {title: 'Edit User', csrfToken: req.csrfToken(),results: results});
	  	}).catch(function(err) {
	  		console.log(err);
	  		req.flash('error_messages', 'There was an error, please try again or Contact the script Owner');
	  		res.redirect('/admin/manage-users');
	  	});
	},

	ManageUsersUpdate: function(req, res, next) {
		User.findOneAsync({'_id' : req.params.id})
		.then (function(result){
			result.local.user_role = req.body.user_role,
			result.local.block_user = req.body.block_user,
			result.saveAsync()
		}).then(function(success) {
			req.flash('success_messages', 'User successfully edited');
			res.redirect('/admin/manage-users');
		}).catch(function(err) {
			console.log("There was an error: " +err);
			req.flash('error_messages', 'There was an error, please try again or Contact the script Owner');
			res.redirect('/admin/manage-users');
		});
	},

	ManageUsersUpdateServers: function(req, res, next) {
		User.findOneAsync({'_id' : req.params.id})
		.then (function(result){
			result.local.admin_on_servers = req.body.admin_on_servers,
			result.saveAsync()
			var userID = req.params.id;
			var selected_servers = req.body.admin_on_servers;
			Servers.update({},{$pull:{'admins_on_server':req.params.id}}, {multi: true},function(error){	
				if (!error){
					if (typeof req.body.admin_on_servers !== 'undefined' && req.body.admin_on_servers){
						//loop trough array req.body.admin_on_servers and add the user to the newly selected servers
						for (var i =0; i < selected_servers.length; i++) {
						    var currentServer = selected_servers[i];
						    console.log('Selected servers: '+currentServer);
						    Servers.update({'_id':currentServer},{$push:{'admins_on_server':req.params.id}},function(err){
								if (err){
									console.log(err);
								}
							});
						}
					}
				}
			});
		}).then(function(success) {
			req.flash('success_messages', 'User successfully edited');
			res.redirect('/admin/manage-users');
		}).catch(function(err) {
			console.log("There was an error: " +err);
			req.flash('error_messages', 'There was an error, please try again or Contact the script Owner');
			res.redirect('/admin/manage-users');
		});
	},

	UserRemove: function(req, res, next) {
		BluebirdPromise.props({
			users: User.findOne({'_id': req.params.id}).execAsync()
		}).then (function(results){
			//Remove from DB everything related to this user
			Adminactions.find({ 'rcon_admin': req.params.id }).remove().exec();
			AdminConversationComment.find({ 'sender_id': req.params.id }).remove().exec();
			Bancomments.find({ 'user_id': req.params.id }).remove().exec();
			Bans.find({ 'cheater_reporter_id': req.params.id }).remove().exec();
			Bans.find({ 'rcon_admin': req.params.id }).remove().exec();
			Cheaterreports.find({ 'sender_id': req.params.id }).remove().exec();
			Globalnotifications.find({ 'sender_id': req.params.id }).remove().exec();
			Globalnotifications.find({ 'recipient_id': req.params.id }).remove().exec();
			Notifications.find({ 'sender_id': req.params.id }).remove().exec();
			Notifications.find({ 'recipient_id': req.params.id }).remove().exec();
			NotificationsSender.find({ 'sender_id': req.params.id }).remove().exec();
			NotificationsSender.find({ 'reciver_id': req.params.id }).remove().exec();
			Shoutbox.find({ 'shout_user_id': req.params.id }).remove().exec();
			Unbans.find({ 'rcon_admin': req.params.id }).remove().exec();
			UserScreenshots.find({ 'get_user': req.params.id }).remove().exec();
			//Remove user from arrays
			Servers.update({'admins_on_server':req.params.id},{$pull:{'admins_on_server':req.params.id}},function(err){
				if (err)
					console.log(err);
			});
			Unbans.update({'seen':req.params.id},{$pull:{'seen':req.params.id}},function(err){
				if (err)
					console.log(err);
			});
			Bans.update({'likes':req.params.id},{$pull:{'likes':req.params.id}},function(err){
				if (err)
					console.log(err);
			});
		}).then(function(laststep){
	  		User.findOne({ '_id': req.params.id }).remove().exec();
	  		req.flash('success_messages', 'User successfully deleted');
			res.redirect('/admin/manage-users');
	  	}).catch(function(err) {
	  		console.log(err);
	  		res.redirect('/admin/manage-users');
	  	});
	},
};
