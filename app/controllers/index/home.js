const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate');
const Pagination = require('pagination-object');
const moment = require('moment');
const geoip = require('geoip-lite-country-only');
const replace = require("replace");
const Rcon = require('srcds-rcon');
const SourceQuery = require('sourcequery');
const csrf = require('csurf');
const S = require('string');
const array = require('array');
//const Jimp = require("jimp");
const fs = require('fs');
const multiparty = require('multiparty');
const uniqueString = require('unique-string');
const multer  = require('multer');
const formatNum = require('format-num');
const path = require('path');
const http = require('http');
const sm = require('sitemap');
const BluebirdPromise = require('bluebird');
const DiscordWebhook = require("discord-webhooks");
const requestify = require('requestify');
const Servers = require("../../models/servers");
const OnlinePlayers = require("../../models/online_players");
const Support = require("../../models/support");
const User = require("../../models/user");
const Plugins = require("../../models/plugins");
const Shoutboxes = require("../../models/shoutbox");
const Maps = require("../../models/maps");
const Rconcommand = require("../../models/rconcommands");
const ExtraRcon = require("../../models/extra_rcon_commands");
const Tempbandurations = require("../../models/tempban_duration");
const Adminactions = require("../../models/admin_actions");
const ServerScreenshots = require("../../models/server_new_screenshots");
const Bans = require("../../models/bans");
const Bancomments = require("../../models/ban-comments");
const Cheaterreports = require("../../models/cheater_reports");
const Notifications = require("../../models/notifications");
const Globalnotifications = require("../../models/global_notifications");
const Adminapplications = require("../../models/admin_applications");
const AdminConversation = require("../../models/admin_conversation");
const AdminConversationComment= require("../../models/admin_conversation_comments");
const ChatRooms= require("../../models/chat_rooms");
const config = require('../../config/config');


//Markdown it
const MarkdownIt = require('markdown-it');
const md = require('markdown-it')({
	html: true,
	linkify: true,
	typographer: true
});


//Set dates for testing
var start = new Date();
start.setHours(0,0,0,0);

var end = new Date();
end.setHours(23,59,59,999);

module.exports = {

	getHome: function(req, res, next) {
		var populateAdminActions = [{path:'rcon_command', select:'rcon_command short_name color'}, {path:'rcon_server', select:'name'}, {path:'rcon_admin', select:'local.avatar_60 local.user_name id'}];
		var populateBans = [{path:'rcon_server', select:'name'}, {path:'rcon_admin', select:'local.avatar_60 local.user_name id'}];
		BluebirdPromise.props({
			servers: Servers.find({}).execAsync(),
			adminactions: Adminactions.find({'show_action':1}).sort({ 'createdAt': -1}).limit(3).populate(populateAdminActions).execAsync(),
			serverbans: Bans.find({}).sort({ 'createdAt': -1}).limit(3).populate(populateBans).execAsync(),
			shoutbox: Shoutboxes.find({}).sort({ 'createdAt': -1}).limit(30).execAsync(),
			checkshoutboxdisplay: Plugins.findOne({'status':true, 'name_alias': 'shoutbox'}).execAsync(),
			adminconversations: AdminConversation.count().execAsync()
		}).then (function(results){
			res.render('frontpage/home/index.pug', {title: 'Home', results:results});
		}).catch (function(err){
			console.log(err);
			res.redirect('back');
		});
	},

	getServer: function(req, res, next) {
		BluebirdPromise.props({
			server: Servers.findOne({'name_alias':req.params.name_alias}).populate('admins_on_server').execAsync(),
			online_players: OnlinePlayers.find({'server_alias':req.params.name_alias}).execAsync(),
			tempbans: Tempbandurations.find({}).sort({category_alias: 'desc', time_number: 'asc'}).execAsync(),
			usermaps: Maps.find({}).sort({map_name: 'asc'}).execAsync(),
			rcon_cmd_left: Rconcommand.find({'rcon_position_alias': 'player-list-left'}).execAsync(),
			rcon_cmd_right: Rconcommand.find({'rcon_position_alias': 'player-list-right'}).execAsync(),
			rcon_extra: ExtraRcon.findOne({'name': 'extra_rcon'}).execAsync(),
			plugins: Plugins.findOne({'category' : 'kgb', 'status':true}).execAsync()
		}).then (function(results){
			var server_id = results.server.name_alias;
			var server_ip = results.server.ip;
			var geo = geoip.lookup(server_ip);
			var short_county = geo.country.toLowerCase();
			var sq = new SourceQuery(1000);
			sq.open(results.server.ip, results.server.port);
			
			sq.getInfo(function(err, info){
				if (!err){
					//Remove Host(Rounds: 0/0) from alias if it exist on Promod Servers
					if (S(info.name).contains('Round') == true){
						var new_name = info.name.split("Round")[0];
					}else{
						var new_name= info.name
					}

					sq.getRules(function(error, rules){
						if(!error){
							var private_clients = search("sv_privateClients", rules);
							var max_clients = search("sv_maxclients", rules);
							var location = search("_Location", rules);
							var game_name = search("gamename", rules);
							var gametype = search("g_gametype", rules);
							var mapStartTime = search("g_mapStartTime", rules);
							var shortversion = search("shortversion", rules);
							var players_online_slots = info.players+'/'+info.maxplayers;
							results.server.name = info.name,
							results.server.slug_name = new_name,
							results.server.online_players = players_online_slots,
							results.server.max_players = max_clients.value,
							results.server.private_clients = private_clients.value,
							results.server.map_playing = finalMapName(info.map),
							results.server.gametype = gametype.value,
							results.server.map_started = mapStartTime.value,
							results.server.shortversion = shortversion.value,
							results.server.map_img = info.map,
							results.server.country = location.value,
							results.server.country_shortcode = short_county,
							results.server.game_name = game_name.value,
							results.server.count_connection_fail = 0,
							results.server.is_online = true,
							results.server.saveAsync()
						} else{
							results.server.count_connection_fail = results.server.count_connection_fail+1,
							results.server.is_online = true,
							results.server.saveAsync()
						}
					})


					sq.getPlayers(function(err, players){
						OnlinePlayers.remove({'server_alias': req.params.name_alias}).execAsync();
						if (!err){
							if (info.players > 0){
								players.forEach(function (player){
									var newOnlinePlayers = new OnlinePlayers ({
										server_alias: results.server.name_alias,
										player_slot: player.index,
										player_name: player.name,
										player_score: player.score,
										player_timeplayed: player.online,
									});
									newOnlinePlayers.saveAsync()
								})
							}
						}
						
					});
				}
			})
			
			ServerScreenshots.find({'get_server':results.server._id}, function( err, server_screenshots ) {
				if (err){
					console.log(error);
				}else{
					if (req.user){
						Servers.count({'admins_on_server':req.user._id, 'name_alias':req.params.name_alias, rcon_password: { $gt: []  }}, function( err, check_admin ) {
							if( !err ) {
								res.render('frontpage/server/index.pug', {title: results.server.name, server_screenshots:server_screenshots, results:results, check_admin:check_admin, csrfToken: req.csrfToken()});
							} else {
								console.log( err );
								res.redirect('/');
							}
						});
					}else{
						res.render('frontpage/server/index.pug', {title: results.server.name, results:results, server_screenshots:server_screenshots});
					}
				}
			})
		}).catch (function(err){
			console.log(err);
			res.redirect('back');
		});
	},

	getFAQ: function(req, res, next) {
		BluebirdPromise.props({
			faq: Support.find({'category_alias':'faq'}).execAsync(),
			admin_commands: Support.find({'category_alias':'admin-commands'}).execAsync()
		}).then (function(results){
			res.render('frontpage/support/index.pug', {title: 'FAQ', results:results});
		}).catch (function(err){
			console.log(err);
			res.redirect('back');
		});
	},

	getMembers: function(req, res, next) {
		BluebirdPromise.props({
			users: User.find({}).sort({ 'updatedAt': -1}).execAsync(),
			admin_commands: Support.find({'category_alias':'admin-commands'}).execAsync()
		}).then (function(results){
			res.render('frontpage/members/index.pug', {title: 'Members', results:results});
		}).catch (function(err){
			console.log(err);
			res.redirect('back');
		});
	},

	getBanned: function(req, res, next) {
		var sortObject = {};
		if (typeof req.query.sorttype !== 'undefined' && req.query.sorttype && req.query.sortdirection !== 'undefined' && req.query.sortdirection){
			stype = req.query.sorttype;
			sdir = req.query.sortdirection;
			sortObject[stype] = sdir;
		} else {
			stype = 'createdAt';
			sdir = '-1';
			paginationlink = '';
			sortObject[stype] = sdir;
		}
		var populateBans = [{path:'rcon_server', select:'name name_alias'}, {path:'rcon_admin', select:'local.avatar_60 local.user_name id'}];
		var search = {};
		BluebirdPromise.props({
			serverban: Bans.count({}).execAsync(),
			serverbans: Bans.paginate(search,{ page: req.query.page, limit: 20, sort:sortObject, populate:populateBans})
		}).then (function(results){
			var query=req.query.page;
			if ( typeof query != 'undefined' && query ) {
					curpage=parseInt(req.query.page);
				} else {
					curpage=1;
				}

				if ( typeof results.serverbans.limit != 'undefined' && results.serverbans.limit ) {
					perpage=parseInt(results.serverbans.limit);
				} else {
					perpage=20;
				}

				if(results.serverban > 0){
					var pagination = new Pagination({
						currentPage  : curpage,
						totalItems   : results.serverban,
						itemsPerPage : parseInt(perpage)
					});
				}				

				if (typeof req.query.sorttype !== 'undefined' && req.query.sorttype && req.query.sortdirection !== 'undefined' && req.query.sortdirection){
					stype = req.query.sorttype;
					sdir = req.query.sortdirection;
					paginationlink = '&sorttype='+req.query.sorttype+'&sortdirection='+req.query.sortdirection;
				} else {
					stype = 'createdAt';
					sdir = '-1';
					paginationlink = '';
				}
			if(results.serverban > 0){
				res.render('frontpage/banned/index.pug', {title: 'Banned Players List', results:results, pagination:pagination, paginationlink:paginationlink});
			}else{
				res.render('frontpage/banned/index.pug', {title: 'Banned Players List', results:results});
			}
		}).catch (function(err){
			console.log(err);
			res.redirect('back');
		});
	},

	searchBanned: function(req, res, next) {
		var sw = new RegExp(req.query.sq, 'i');
		var sortObject = {};

		if (typeof req.query.sorttype !== 'undefined' && req.query.sorttype && req.query.sortdirection !== 'undefined' && req.query.sortdirection){
			stype = req.query.sorttype;
			sdir = req.query.sortdirection;
			sortObject[stype] = sdir;
		} else {
			stype = 'createdAt';
			sdir = '-1';
			paginationlink = '';
			sortObject[stype] = sdir;
		}
		var populateBans = [{path:'rcon_server', select:'name name_alias'}, {path:'rcon_admin', select:'local.avatar_60 local.user_name id'}];
		var search = {$or:[ {'player_name':sw}, {'player_guid':sw}]};

		BluebirdPromise.props({
			serverban: Bans.count({}).execAsync(),
			serverbans: Bans.paginate(search,{ page: req.query.page, limit: 20, sort:sortObject, populate:populateBans})
		}).then (function(results){
			var query=req.query.page;
			if ( typeof query != 'undefined' && query ) {
					curpage=parseInt(req.query.page);
				} else {
					curpage=1;
				}

				if ( typeof results.serverbans.limit != 'undefined' && results.serverbans.limit ) {
					perpage=parseInt(results.serverbans.limit);
				} else {
					perpage=20;
				}

				if(results.serverban > 0){
					var pagination = new Pagination({
						currentPage  : curpage,
						totalItems   : results.serverban,
						itemsPerPage : parseInt(perpage)
					});
				}				

				if (typeof req.query.sorttype !== 'undefined' && req.query.sorttype && req.query.sortdirection !== 'undefined' && req.query.sortdirection){
					stype = req.query.sorttype;
					sdir = req.query.sortdirection;
					paginationlink = '&sorttype='+req.query.sorttype+'&sortdirection='+req.query.sortdirection;
				} else {
					stype = 'createdAt';
					sdir = '-1';
					paginationlink = '';
				}
			if(results.serverban > 0){
				res.render('frontpage/banned/search-banned.pug', {title: 'Search Banned Players List', results:results, pagination:pagination, paginationlink:paginationlink});
			}else{
				res.render('frontpage/banned/search-banned.pug', {title: 'Search Banned Players List', results:results});
			}
		}).catch (function(err){
			console.log(err);
			res.redirect('back');
		});
	},


	getBanById: function(req, res, next) {
		var populateBan = [{path:'rcon_server', select:'name name_alias'}, {path:'rcon_admin', select:'local.avatar_60 local.user_name local.user_role id createdAt updatedAt'},{path:'likes', select:'local.avatar_60 local.user_name _id'},{path:'comments'}];
		var populatecomments = [{path:'ban_id', select:'_id'}, {path:'user_id', select:'local.avatar_60 local.user_name id'}];
		BluebirdPromise.props({
			getbanned: Bans.findOne({'_id':req.params.id}).populate(populateBan).execAsync(),
			getbanncomments: Bancomments.find({'bann_id':req.params.id}).populate(populatecomments).sort({ 'createdAt': 1}).execAsync(),
			getbanlikes: Bans.count({'_id':req.params.id, 'likes':req.user._id}).execAsync(),
			requiredpower: ExtraRcon.findOne({'name': 'extra_rcon'}).execAsync(),
			removenotification: Globalnotifications.count({'identify_id': req.params.id, 'recipient_id': req.user._id}).execAsync()
		}).then (function(results){
			if (results.getbanned){
				res.render('frontpage/banned/banned-details.pug', {title: 'Banned Player '+results.getbanned.player_name, results:results, csrfToken: req.csrfToken()});
			} else {
				req.flash('error_messages', 'Sorry, that page does not exist, it may be removed in the mean time');
				res.redirect('back');
			}				
		}).catch (function(err){
			console.log(err);
			res.redirect('back');
		});
	},

	InsertNewCommentonBan: function(req, res, next) {
		Bans.findOne({'_id':req.params.id }).execAsync()
		.then (function(results){
			if(results){
				var newBancomment = new Bancomments ({
					user_id: req.user._id,
					bann_id: results.id,
					user_msg: md.render(req.body.comment)
				});
				newBancomment.saveAsync()
				Bans.update({'_id':results.id},{$pull:{'comments':req.user._id}},function(error){	
					if (!error){
						Bans.update({'_id':results._id},{$push:{'comments':req.user._id}},function(err){
							console.log(err);
						});	
					}
				});				
				res.redirect('back');
			}else{
				req.flash('error_messages', 'There was an error, Comment not sent');
				res.redirect('back');
			}
		}).catch(function(err) {
			console.log("There was an error" +err);
			req.flash('error_messages', 'There was an error, please try again or Contact the script Owner');
			res.redirect('back');
		});
	},

	InsertNewBanLike: function(req, res, next) {
		Bans.findOne({'_id':req.params.id }).execAsync()
		.then (function(results){
			if(results){
				Bans.update({'_id':results.id},{$pull:{'likes':req.user._id}},function(error){	
					if (!error){
						Bans.update({'_id':results._id},{$push:{'likes':req.user._id}},function(err){
							console.log(err);
						});	
					}
				});				
				res.redirect('back');
			}else{
				res.redirect('back');
			}
		}).catch(function(err) {
			console.log("There was an error" +err);
			req.flash('error_messages', 'There was an error, please try again or Contact the script Owner');
			res.redirect('back');
		});
	},

	getMemberById: function(req, res, next) {
		var populateAdminActions = [{path:'rcon_command', select:'rcon_command admin_message short_name color'}, {path:'rcon_server', select:'name name_alias'}, {path:'rcon_admin', select:'_id local.avatar_60 local.user_name id'}];
		BluebirdPromise.props({
			adminactions: Adminactions.find({'show_action':1, 'rcon_admin': req.params.id}).sort({ 'createdAt': -1}).limit(30).populate(populateAdminActions).execAsync(),
			user: User.findOne({'_id': req.params.id}).populate('local.admin_on_servers', 'name _id name_alias').execAsync(),
			checkrooms: ChatRooms.findOne({'participiants':{ $all: [req.params.id,req.user.id]}}).execAsync()
		}).then (function(results){
			console.log(results.checkrooms);
			res.render('frontpage/members/member-details.pug', {title: results.user.local.user_name, results:results,csrfToken: req.csrfToken()});
		}).catch (function(err){
			console.log(err);
			res.redirect('back');
		});
	},

	ScreenshotsRemove: function(req, res, next) {
		BluebirdPromise.props({
			server: Servers.findOneAsync({'_id' : req.params.id}),
			requiredpower: ExtraRcon.findOne({'name': 'extra_rcon'}).execAsync()
		}).then (function(results){
			if (req.user.local.user_role >= results.requiredpower.minimum_admin_power_for_screenshots){

				var path = './public/img/screenshots';
				deleteallimages(path);

				ServerScreenshots.remove({'get_server' : results.server._id}).exec();

				req.flash('success_messages', 'Screenshots successfully deleted!');
				res.redirect('back');
			}else{
				req.flash('error_messages', 'Screenshots not deleted! Minimum power for screenshots delete is: '+results.requiredpower.minimum_admin_power_for_screenshots);
				res.redirect('back');
			}
		}).catch (function(err){
			console.log(err);
			res.redirect('back');
		});
	},

	InsertNewCheaterReport: function(req, res, next) {
		var create_img_variable = "/img/screenshots/"+req.params.screenshot_img+".jpg";
		BluebirdPromise.props({
			getscreenshot: ServerScreenshots.findOne({'screenshot_img': create_img_variable}).execAsync(),
			checkdiscord: Plugins.findOne({'category': 'discord'}, 'status').execAsync()
		}).then (function(results){

			if (results){
				var newimgpath = "/img/cheater-reports/"+req.params.screenshot_img+".jpg";

				if (!fs.existsSync('./public/img/cheater-reports')){
					fs.mkdirSync('./public/img/cheater-reports');
				}
				var newCheaterreports = new Cheaterreports ({
					player_name: results.getscreenshot.player_name,
					player_guid: results.getscreenshot.player_guid,
					player_screenshot: newimgpath,
					default_message: 'New cheater Report',
					sender_id: req.user._id,
					rcon_server: results.getscreenshot.get_server
				});

				if(newCheaterreports){
					var newNotifications = new Notifications ({
						notification_type: 'cheater-reports',
						sender_id: req.user._id,
						cheater_report_id: newCheaterreports._id,
						notification_msg: 'New cheater Report'
					});
					newNotifications.saveAsync()
				}else{
					req.flash('error_messages', 'There was an error, please try again or Contact the script Owner');
					res.redirect('back');
				}				

				newCheaterreports.saveAsync()

				req.flash('success_messages', 'Cheater Report for '+results.getscreenshot.player_name+' successfully sent to our Server Admins!');

				fs.rename('./public'+create_img_variable, './public/img/cheater-reports/'+req.params.screenshot_img+'.jpg', function(err){
					if (err){
						console.log(err);
					}else{
						ServerScreenshots.remove({'screenshot_img' : create_img_variable}).exec();

						//Send message to discord if the plugin is enabled
						if (results.checkdiscord.status === true){
							discordmessages("New Cheater Report","16007990",''+req.user.local.user_name+' reported '+results.getscreenshot.player_name+' as Cheater! For more details visit '+config.website_name+'!');
						}
					} 
				});

				res.redirect('back');
			}else{
				req.flash('error_messages', 'This Screenshots doesnt exist, it may be removed in the mean time or the player is already banned.');
				res.redirect('back');
			}
		}).catch(function(err) {
			console.log("There was an error" +err);
			req.flash('error_messages', 'There was an error, please try again or Contact the script Owner');
			res.redirect('back');
		});
	},

	InsertNewunbanRequest: function(req, res, next) {
		BluebirdPromise.props({
			getban: Bans.findOne({'_id': req.body.banid}).execAsync(),
			checkunbansent: Notifications.count({'bann_id': req.body.banid}).execAsync(),
			checkdiscord: Plugins.findOne({'category': 'discord'}, 'status').execAsync()
		}).then (function(results){
			if (results.checkunbansent == 0){
				if (results){
						var newNotifications = new Notifications ({
							notification_type: 'unban-request',
							sender_id: req.user._id,
							bann_id: req.body.banid,
							notification_msg: 'New Unban Request',
							unban_msg:req.body.message
						});
						newNotifications.saveAsync()

					req.flash('success_messages', 'Unban Request for '+results.getban.player_name+' successfully sent to our Server Admins!');

					//Send message to discord if the plugin is enabled
					if (results.checkdiscord.status === true){
						discordmessages("New Unban Request","16733986",'New Unban Request sent by '+req.user.local.user_name+'! For more details visit '+config.website_name+'!');
					}
					res.redirect('back');
				}else{
					req.flash('error_messages', 'This Ban doesnt exist, it may be removed in the mean time or the player is already unbanned.');
					res.redirect('back');
				}
			}else{
					req.flash('error_messages', 'Unban Request already sent, wait until Server Admins make a decision, you will be informed');
					res.redirect('back');
			}
		}).catch(function(err) {
			console.log("There was an error" +err);
			req.flash('error_messages', 'There was an error, please try again or Contact the script Owner');
			res.redirect('back');
		});
	},

	getMyNotifications: function(req, res, next) {
		var populateunban = [{path:'sender_id', select:'local.avatar_60 local.user_name id'}, {path:'bann_id', select:'createdAt player_name player_name_alias player_guid player_screenshot'}];
		var populatesender = [{path:'sender_id', select:'local.avatar_60 local.user_name id socketio.socket_id'}, {path:'admin_app_id', select:'adminappmessage id age status'}];
		BluebirdPromise.props({
			adminunbanrequests: Notifications.find({'seen':0, 'notification_type':'unban-request'}).sort({ 'createdAt': -1}).populate(populateunban).execAsync(),
			adminadminapps: Notifications.find({'seen':0, 'notification_type':'admin-app'}).sort({ 'createdAt': -1}).populate(populatesender).execAsync(),
			requiredpower: ExtraRcon.findOne({'name': 'extra_rcon'}).execAsync()
		}).then (function(results){
			if (results.requiredpower.minimum_power_for_player_unban > req.user.local.user_role){
				req.flash('error_messages', 'You have not enough Admin Power to visit this page. Minimum power is: '+results.requiredpower.minimum_power_for_player_unban);
				res.redirect('back');
			}else{
				res.render('frontpage/notifications/index.pug', {title: 'Server Admins Notifications', results:results, csrfToken: req.csrfToken()});	
			}			
		}).catch (function(err){
			console.log(err);
			res.redirect('back');
		});
	},

	getCheaterReports: function(req, res, next) {
		var populatereport = [{path:'rcon_server', select:'name'}, {path:'sender_id', select:'local.avatar_60 local.user_name id'}, {path:'cheater_report_id', select:'createdAt player_name player_guid player_screenshot'}];
		BluebirdPromise.props({
			admincheaterreports: Notifications.find({'seen':0, 'notification_type':'cheater-reports'}).sort({ 'createdAt': -1}).populate(populatereport).execAsync(),
			requiredpower: ExtraRcon.findOne({'name': 'extra_rcon'}).execAsync()
		}).then (function(results){
			if (results.requiredpower.minimum_power_for_cheater_reports > req.user.local.user_role){
				req.flash('error_messages', 'You have not enough Admin Power to visit this page. Minimum power is: '+results.requiredpower.minimum_power_for_cheater_reports);
				res.redirect('back');
			}else{
				res.render('frontpage/cheater-reports/index.pug', {title: 'Cheater Reports', results:results, csrfToken: req.csrfToken()});	
			}			
		}).catch (function(err){
			console.log(err);
			res.redirect('back');
		});
	},



	getGlobalNotifications: function(req, res, next) {
		var populateinfos = [{path:'sender_id', select:'local.avatar_60 local.user_name id socketio.socket_id'}, {path:'recipient_id', select:'local.avatar_60 local.user_name id'}];

		BluebirdPromise.props({
			globalnotifications: Globalnotifications.find({recipient_id:req.user._id}).sort({ seen: 'asc', 'createdAt': -1}).populate(populateinfos).execAsync(),
		}).then (function(results){
			Globalnotifications.update({'recipient_id':req.user._id},{'seen':1},{multi: true}, function(err){
				if(err){
					console.log(err);
				}else{
					res.render('frontpage/globalnotifications/index.pug', {title: 'My Notifications', results:results, csrfToken: req.csrfToken()});
				}
			});
						
		}).catch (function(err){
			console.log(err);
			res.redirect('back');
		});
	},

	CheaterReportRemove: function(req, res, next) {
		BluebirdPromise.props({
			getreport: Cheaterreports.findOne({'_id': req.params.id}).execAsync(),
			requiredpower: ExtraRcon.findOne({'name': 'extra_rcon'}).execAsync()
		}).then (function(results){
			if (results.requiredpower.minimum_power_for_cheater_reports <= req.user.local.user_role){
				if (results.getreport){
						var newGlobalnotifications = new Globalnotifications ({
							sender_id: req.user._id,
							recipient_id: results.getreport.sender_id,
							link_title:results.getreport.player_name+' not Permbanned',
							link_text: 'Admin response on Your Cheater Report',
							link_url: '/notifications',
							message:'Thank you for contacting us! Based on the screenshot what you have sent to us '+results.getreport.player_name+' seems to be clean.'
						});
						newGlobalnotifications.saveAsync()

						fs.unlink('./public'+results.getreport.player_screenshot, function(err) {
							if (err) {
								console.error("Error occurred while trying to remove file");
							}
						});

						Cheaterreports.remove({'_id' : req.params.id}).exec();
						Notifications.remove({'cheater_report_id' : req.params.id}).exec();

					req.flash('success_messages', 'Cheater Report successfully deleted. Player is not banned, cheater reporter has been informed on our decission!');
					res.redirect('back');
				}else{
					req.flash('error_messages', 'This Cheater Report doesnt exist, it may be removed in the mean time');
					res.redirect('back');
				}
			}else{
					req.flash('error_messages', 'You have not enough Admin Power to remove cheater reports. Minimum Power is: '+results.requiredpower.minimum_power_for_cheater_reports);
					res.redirect('back');
			}
		}).catch(function(err) {
			console.log("There was an error" +err);
			req.flash('error_messages', 'There was an error, please try again or Contact the script Owner');
			res.redirect('back');
		});
	},

	UnbanRequestRemove: function(req, res, next) {
		BluebirdPromise.props({
			getunbanrequest: Notifications.findOne({'bann_id': req.params.id}).execAsync(),
			requiredpower: ExtraRcon.findOne({'name': 'extra_rcon'}).execAsync()
		}).then (function(results){
			if (results.requiredpower.minimum_power_for_player_unban <= req.user.local.user_role){
				if (results.getunbanrequest){
						var newGlobalnotifications = new Globalnotifications ({
							sender_id: req.user._id,
							recipient_id: results.getunbanrequest.sender_id,
							link_title:'Unban Request Declined',
							link_text: 'Admin response on Your Cheater Report',
							link_url: '/notifications',
							message:'Thank you for contacting us! Based on the Unban Request what you have sent to us, we decided not to accept it. The permanent ban stays!'
						});
						newGlobalnotifications.saveAsync()

						Bans.update({'_id':req.params.id},{'unban_request_denied':true},{multi: true}, function(err){
							if(err){
								console.log(err);
							}
						});

						Notifications.remove({'bann_id' : req.params.id}).exec();

					req.flash('success_messages', 'Unban Request Declined. Player is not Unbanned, Unban Requester informed on our decission!');
					res.redirect('back');
				}else{
					req.flash('error_messages', 'This unban Request doesnt exist, it may be removed in the mean time');
					res.redirect('back');
				}
			}else{
					req.flash('error_messages', 'You have not enough Admin Power to remove cheater reports. Minimum Power is: '+results.requiredpower.minimum_power_for_player_unban);
					res.redirect('back');
			}
		}).catch(function(err) {
			console.log("There was an error" +err);
			req.flash('error_messages', 'There was an error, please try again or Contact the script Owner');
			res.redirect('back');
		});
	},

	GlobalNotificationsRemove: function(req, res) {
		Globalnotifications.remove({'recipient_id': req.user._id})
		.then (function(){
			req.flash('success_messages', 'Notifications successfully cleaned!');
			res.redirect('back');
		});
	},

	getAdminApp: function(req, res, next) {
		BluebirdPromise.props({
			total_cheater_reports: Bans.count({'cheater_reporter_id': req.user._id}).execAsync(),
			requiredpower: ExtraRcon.findOne({'name': 'extra_rcon'}).execAsync()
		}).then (function(results){
			if (req.user.local.user_role > 1){
				req.flash('error_messages', 'You Are already an Admin!');
				res.redirect('back');
			}else {
				res.render('frontpage/adminapp/index.pug', {title: 'Admin Applications', results:results, csrfToken: req.csrfToken()});
			}
			
		}).catch (function(err){
			console.log(err);
			res.redirect('back');
		});
	},

	InsertNewAdminApp: function(req, res, next) {
		BluebirdPromise.props({
			checkdiscord: Plugins.findOne({'category': 'discord'}, 'status').execAsync(),
			total_cheater_reports: Bans.count({'cheater_reporter_id': req.user._id}).execAsync(),
			requiredpower: ExtraRcon.findOne({'name': 'extra_rcon'}).execAsync()
		}).then (function(results){
			if (req.user.local.user_role > 1){
				req.flash('error_messages', 'You Are already an Admin!');
				res.redirect('back');
			}else {
				if (results.total_cheater_reports >= results.requiredpower.minimum_cheater_reports){
					var newAdminapplications = new Adminapplications ({
					age: req.body.age,
					app_sender: req.user.id,
					adminappmessage: req.body.adminappmessage
					});
					if(newAdminapplications){
						var newNotifications = new Notifications ({
							notification_type: 'admin-app',
							sender_id: req.user._id,
							admin_app_id: newAdminapplications.id,
							notification_msg: 'New Admin Application',
							admin_app_msg: req.body.adminappmessage
						});
						newNotifications.saveAsync()
					}else{
						req.flash('error_messages', 'There was an error, please try again or Contact the script Owner');
						res.redirect('back');
					}
					newAdminapplications.saveAsync()

					//Send message to discord if the plugin is enabled
					if (results.checkdiscord.status === true){
						discordmessages("New Admin Application","9159498",''+req.user.local.user_name+' sent a new Admin Aplication! For more details visit '+config.website_name+'!');
					}
				}else {
					req.flash('error_messages', 'You need at least 5 cheater Reports!');
					res.redirect('back');
				}	
			}
		}).then(function(saved) {
			req.flash('success_messages', 'Admin Application Successfully Sent. You will be informed on our decision within 7 days!');
			res.redirect('back');
		}).catch(function(err) {
			console.log("There was an error" +err);
			req.flash('error_messages', 'There was an error, please try again or Contact the script Owner');
			res.redirect('back');
		});
	},

	AdminAppRemove: function(req, res, next) {
		BluebirdPromise.props({
			getadminapp: Notifications.findOne({'admin_app_id': req.body.appid}).execAsync(),
			requiredpower: ExtraRcon.findOne({'name': 'extra_rcon'}).execAsync()
		}).then (function(results){
			if (req.user.local.user_role===100){
				if (results.getadminapp){
					var newGlobalnotifications = new Globalnotifications ({
						sender_id: req.user._id,
						recipient_id: results.getadminapp.sender_id,
						link_title:'Admin Application Declined',
						link_text: 'Admin response on Your Admin Application',
						link_url: '/notifications',
						message:'After a little conversations with existing Admins on our Game Servers, we decided not to accept your Admin Application! This decision is not permanent and may change in future if you submit a new Admin Application!'
					});

					newGlobalnotifications.saveAsync()

					Notifications.remove({'admin_app_id' : req.body.appid}).exec();
					AdminConversationComment.remove({'app_id' : req.body.appid}).exec();
					AdminConversation.remove({'app_id' : req.body.appid}).exec();
					Adminapplications.remove({'_id' : req.body.appid}).exec();

					req.flash('success_messages', 'Admin Application Declined. Player is informed about our Decision!');
					res.redirect('back');
				}else{
					req.flash('error_messages', 'This Admin Application doesnt exist, it may be removed in the mean time');
					res.redirect('back');
				}
			}else{
					req.flash('error_messages', 'You have not enough Admin Power to manage Admin Users. Minimum Power is: 100');
					res.redirect('back');
			}
		}).catch(function(err) {
			console.log("There was an error" +err);
			req.flash('error_messages', 'There was an error, please try again or Contact the script Owner');
			res.redirect('back');
		});
	},

	AdminAppAccept: function(req, res, next) {
		BluebirdPromise.props({
			getadminapp: Notifications.findOne({'admin_app_id': req.body.appid}).execAsync(),
			requiredpower: ExtraRcon.findOne({'name': 'extra_rcon'}).execAsync(),
			checkdiscord: Plugins.findOne({'category': 'discord'}, 'status').execAsync()
		}).then (function(results){
			if (req.user.local.user_role===100){
				if (results.getadminapp){
					var newGlobalnotifications = new Globalnotifications ({
						sender_id: req.user._id,
						recipient_id: results.getadminapp.sender_id,
						link_title:'Admin Application Accepted',
						link_text: 'Admin response on Your Admin Application',
						link_url: '/notifications',
						message:'After a little conversations with existing Admins on our Game Servers, we decided to Accept your Admin Application! Congratulations welcome to '+config.website_name+'! Make sure you read our Support pages for Server Admins!'
					});
					newGlobalnotifications.saveAsync()

					//Send message to discord if the plugin is enabled
					if (results.checkdiscord.status === true){
						discordmessages("We have a New Server Admin","240116",'Congratulations '+req.body.new_admin_name+'!!! Welcome to '+config.website_name+'!');
					}

					Notifications.remove({'admin_app_id' : req.body.appid}).exec();
					AdminConversationComment.remove({'app_id' : req.body.appid}).exec();
					AdminConversation.remove({'app_id' : req.body.appid}).exec();
					Adminapplications.remove({'_id' : req.body.appid}).exec();

					req.flash('success_messages', 'Admin Application Accepted. Player is informed about our Decision!');
				}else{
					req.flash('error_messages', 'This Admin Application doesnt exist, it may be removed in the mean time');
					res.redirect('back');
				}
			}else{
					req.flash('error_messages', 'You have not enough Admin Power to manage Admin Users. Minimum Power is: 100');
					res.redirect('back');
			}
			res.redirect('/admin/manage-users/edit/'+req.body.user_id);
		}).catch(function(err) {
			console.log("There was an error" +err);
			req.flash('error_messages', 'There was an error, please try again or Contact the script Owner');
			res.redirect('back');
		});
	},

	AdminAppConversationStart: function(req, res, next) {
		BluebirdPromise.props({
			getadminapp: Adminapplications.findOne({'_id': req.body.app_id}).execAsync(),
			requiredpower: ExtraRcon.findOne({'name': 'extra_rcon'}).execAsync(),
			checkdiscord: Plugins.findOne({'category': 'discord'}, 'status').execAsync()
		}).then (function(results){
			if (req.user.local.user_role===100){
				if (results.getadminapp){
					var newGlobalnotifications = new Globalnotifications ({
						sender_id: req.user._id,
						recipient_id: results.getadminapp.sender_id,
						link_title:'Admin Application will be Discussed',
						link_text: 'Admin response on Your Admin Application',
						link_url: '/notifications',
						message:'Please do note that it can take some days until we decide your fate. Applications that do not get declined instantly for obvious reasons will be discussed with other Admins.'
					});
					Adminapplications.findOneAndUpdate({'_id': req.body.app_id}, {$set:{'status': true}}, function(err, doc){
					    if(err){
					        console.log(err);
					    }else{
					    	var newAdminConversation = new AdminConversation ({
								sender_id: req.body.sender_id,
								app_id: req.body.app_id
							});
					    	//Send message to discord if the plugin is enabled
							if (results.checkdiscord.status === true){
								discordmessages("New Admin Conversation Started","240116",''+req.user.local.user_name+' started a new Admin Conversation. Help Us to make the right Decision! If you have Admin Rights visit '+config.website_name+'!');
							}

							newAdminConversation.saveAsync()	
					    }
					});
					newGlobalnotifications.saveAsync()
					req.flash('success_messages', 'Admin Application Discusion Started Successfully!');
					res.redirect('back');
				}else{
					req.flash('error_messages', 'This Admin Application doesnt exist, it may be removed in the mean time');
					res.redirect('back');
				}
			}else{
					req.flash('error_messages', 'You have not enough Admin Power to manage Admin Users. Minimum Power is: 100');
					res.redirect('back');
			}
		}).catch(function(err) {
			console.log("There was an error" +err);
			req.flash('error_messages', 'There was an error, please try again or Contact the script Owner');
			res.redirect('back');
		});
	},

	getConversations: function(req, res, next) {
		var populateConversations = [{path:'sender_id', select:'local.user_name local.avatar_60 id'}, {path:'app_id', select:'age adminappmessage'}];
		BluebirdPromise.props({
			adminconversations: AdminConversation.find().sort({ 'createdAt': -1}).populate(populateConversations).execAsync(),
		}).then (function(results){
			if (req.user.local.user_role < 2){
				req.flash('error_messages', 'Only Admins can Visit this page!');
				res.redirect('back');
			}else {
				res.render('frontpage/admin_conversations/index.pug', {title: 'Admin Conversations', results:results});
			}
			
		}).catch (function(err){
			console.log(err);
			res.redirect('back');
		});
	},

	getKGBplugin: function(req, res, next) {
		BluebirdPromise.props({
			plugins: Plugins.findOne({'category' : 'kgb', 'status':true}).execAsync(),
			checkifadmin: Servers.findOne({'admins_on_server':req.user._id, '_id':req.params.id}).execAsync()
		}).then (function(results){
			//check if the plugin is activated
			if (results.plugins){
				//check required power to use this plugin
				if (req.user.local.user_role >= results.plugins.min_power){
					//check if user is admin on this server and if the server exist on the app page
					if(results.checkifadmin){
						//server exist, user is admin on this server now we can execute commands
						var kgb_link = config.kgb_api.kgb_link+'?id='+config.kgb_api.kgb_id+'&task='+req.params.task+'&auth='+config.kgb_api.kgb_auth;
						requestify.get(kgb_link).then(function(response) {
							response.getBody()
							// Get the response body
							req.flash('rconconsole_messages', response.getBody());
							res.redirect('back');
						});

						Servers.findOneAndUpdate({ "_id": results.checkifadmin._id }, { "$set": {
								'count_connection_fail': 0,
								'is_online': true
						}}).exec(function(err, done){
							if(err) {
								console.log(err);
							}
						});

					}else{
						//server and admin check failed
						req.flash('error_messages', 'You have no Admin rights on this Server!');
						res.redirect('back');
					}
				}else{
					req.flash('error_messages', 'Higher Admin Power required to use KGB Host Plugin!');
					res.redirect('back');
				}

			}else {
				console.log('KGB plugin disabled');
				req.flash('error_messages', 'KGB Host Plugin is disabled!');
				res.redirect('back');
			}
			
		}).catch (function(err){
			console.log(err);
			res.redirect('back');
		});
	},

	SiteMapCreate: function(req, res) {
		BluebirdPromise.props({
			sitemap_servers: Servers.find({}).execAsync(),
			sitemap_users: User.find({}).execAsync()
		}).then (function(results){

		sitemap = sm.createSitemap ({
				hostname: config.website_url,
				cacheTime: 600000,        // 600 sec - cache purge period
				urls: [config.website_url,
					{ url: '/members', changefreq: 'daily', priority: 0.3 },
					{ url: '/banlist', changefreq: 'daily',  priority: 0.7 },
					{ url: '/support', changefreq: 'weekly',  priority: 0.5 },
				],
			});
			results.sitemap_servers.forEach(function(server) {
				sitemap.add({url: server.name_alias, changefreq: 'weekly', priority: 0.7});
			});
			results.sitemap_users.forEach(function(member) {
				sitemap.add({url: '/members/'+member._id, changefreq: 'weekly', priority: 0.7});
			});
			res.header('Content-Type', 'application/xml');
			res.send( sitemap.toString() );
		}).catch (function(err){
			console.log(err);
			res.redirect('back');
		});
	},

};

function deleteallimages (directory) {
	fs.readdir(directory, function(err, files) {
		if (err) throw err;
		for (var file of files) {
		  fs.unlinkSync(path.join(directory, file), function(err) {
			if(err)
				console.log(err);
		  });
		}
	});
}

function deleteFolderRecursive (path) {
	if( fs.existsSync(path) ) {
		fs.readdirSync(path).forEach(function(file,index){
			var curPath = path + "/" + file;
			console.log(curPath);
			if(fs.lstatSync(curPath).isDirectory()) { // recurse
				deleteFolderRecursive(curPath);
			} else { // delete file
				fs.unlinkSync(curPath);
			}
		});
		fs.rmdirSync(path);
	}
}

function capitalizeFirstLetter(string) {
	return string.charAt(0).toUpperCase() + string.slice(1);
}

function pretifyMapName(string) {
	return string.replace("mp_", "");
}

function finalMapName(string) {
	var newstring = string.replace("mp_", "");
	return newstring.charAt(0).toUpperCase() + newstring.slice(1);
}

function search(nameKey, myArray){
	for (var i=0; i < myArray.length; i++) {
		if (myArray[i].name === nameKey) {
			return myArray[i];
		}
	}
}

function xmlgamedata(nameKey, myArray){
	for (var i=0; i < myArray.length; i++) {
		if (myArray[i]._attributes.Name === nameKey) {
			return myArray[i]._attributes.Value;
		}
	}
}

function xmlgetplayers(nameKey, myArray){

	for (var i=0; i < myArray.length; i++) {
		if (myArray[i].nameKey === nameKey) {
			return myArray[i];
		}
	}
}


function uncolorize(string) {
	string = S(string).replaceAll('^0', '').s;
	string = S(string).replaceAll("^1", "").s;
	string = S(string).replaceAll("^2", "").s;
	string = S(string).replaceAll("^3", "").s;
	string = S(string).replaceAll("^4", "").s;
	string = S(string).replaceAll("^5", "").s;
	string = S(string).replaceAll("^6", "").s;
	string = S(string).replaceAll("^7", "").s;
	string = S(string).replaceAll("^8", "").s;
	string = S(string).replaceAll("^9", "").s;
	return string;
}

function discordmessages (title, color, description){
	/*
	Colors:
	red 16007990
	green 9159498
	deeporange 16733986
	lightblue 240116
	*/
	var msgdiscord = new DiscordWebhook(config.discord_webhook.webhook_url)
	msgdiscord.on("ready", () => {
		msgdiscord.execute({
			username:config.discord_webhook.webhook_displayname,
			avatar_url:config.discord_webhook.webhook_avatar,
			"embeds": [{
				"title": title,
				"color": color,
				"url": config.website_url,
				"description": description,				
				"timestamp": new Date(),
				"footer": {
					"icon_url": config.discord_webhook.webhook_avatar,
					"text": ' © All rights reserved'
				}
			}] 
		});
	});
	msgdiscord.on("error", (error) => {
	  console.warn(error);
	});
}
