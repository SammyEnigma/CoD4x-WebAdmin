// Require needed modules
const mongoose = require('mongoose');
const moment = require('moment');
const path = require('path');
const formatNum = require('format-num');
const NodeGeocoder = require('node-geocoder');
const Rcon = require('srcds-rcon');
const splitArray = require('split-array');
const arrify = require('arrify');
const fs = require('fs');
const S = require('string');
const User = require("../../models/user");
const Rconcommand = require("../../models/rconcommands");
const ExtraRcon = require("../../models/extra_rcon_commands");
const Servers = require("../../models/servers");
const Maps = require("../../models/maps");
const TempbanDurations = require("../../models/tempban_duration");
const Adminactions = require("../../models/admin_actions");
const UserScreenshots = require("../../models/user_screenshots");
const ServerScreenshots= require("../../models/server_new_screenshots");
const Bans = require("../../models/bans");
const Unbans = require("../../models/unbans");
const Cheaterreports = require("../../models/cheater_reports");
const Notifications = require("../../models/notifications");
const Globalnotifications = require("../../models/global_notifications");
const BluebirdPromise = require('bluebird');

//Set dates for testing
var start = new Date();
start.setHours(0,0,0,0);

var end = new Date();
end.setHours(23,59,59,999);

var deleteFolderRecursive = function(path) {
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
};
module.exports = {
	
	RconConsoleCommand: function(req, res, next) {
		BluebirdPromise.props({
			requiredpower: ExtraRcon.findOne({'name': 'extra_rcon'}).execAsync(),
			getserver: Servers.findOne({'admins_on_server':req.user._id, '_id':req.params.id, rcon_password: { $gt: [] }}).execAsync(),
		}).then(function(results) {
			if (results.getserver){
				if (req.user.local.user_role >= 99){
					var cmd = req.body.rcon_cmd;
					var	rcon = require('srcds-rcon')({address:results.getserver.ip+':'+results.getserver.port,password: results.getserver.rcon_password});
						rcon.connect()
						.then(function(connected){
							return rcon.command(cmd);
						}).then(function(getresult){
							req.flash('rconconsole_messages', getresult);
						}).then(function(disconnect){
							rcon.disconnect();
							res.redirect('back');
						}).catch(function(err) {
							console.log("There was an error: " +err);
							console.log(err.stack);
							res.redirect('back');
						});
				}else{
					req.flash('error_messages', 'You have not enough power to use the Rcon Console on this server. Minimum power is: 99');
					res.redirect('back');
				}
			}else{
				req.flash('error_messages', 'You have no Admin rigths on this Server');
				res.redirect('back');
			}
		}).catch(function(err) {
			console.log("There was an error: " +err);
			res.redirect('back');
		});
	},

	RconMaprotate: function(req, res, next) {
		BluebirdPromise.props({
			requiredpower: ExtraRcon.findOne({'name': 'extra_rcon'}).execAsync(),
			getserver: Servers.findOne({'admins_on_server':req.user._id, '_id':req.params.id, rcon_password: { $gt: [] }}).execAsync(),
		}).then(function(results) {			
			if (results.getserver){
				if ( results.requiredpower.enable_maprotate !== 'undefined' && results.requiredpower.enable_maprotate){
					if (req.user.local.user_role >= results.requiredpower.minimum_power_for_maprotate){
						var	rcon = require('srcds-rcon')({address:results.getserver.ip+':'+results.getserver.port,password: results.getserver.rcon_password});
							rcon.connect()
							.then(function(connected){
								return rcon.command(req.body.rcon_cmd);
							}).then(function(getresult){
								req.flash('rconconsole_messages', 'Map successfully rotated');
							}).then(function(disconnect){
								rcon.disconnect();
								res.redirect('back');
							}).catch(function(err) {
								console.log('We hve an error: '+err.stack);
								req.flash('rconconsole_messages', err.stack);
								res.redirect('back');
							});
					}else{
						req.flash('error_messages', 'You have not enough power to use the Rcon Console on this server. Minimum power is: '+results.requiredpower.minimum_power_for_maprotate);
						res.redirect('back');
					}
				}else{
						req.flash('error_messages', 'This command is disabled by server Admin, dont play with my Heart');
						res.redirect('back');
				}
			}else{
				req.flash('error_messages', 'You have no Admin rigths on this Server');
				res.redirect('back');
			}
		}).catch(function(err) {
			console.log("There was an error: " +err);
			res.redirect('back');
		});
	},

	RconGetssAll: function(req, res, next) {
		BluebirdPromise.props({
			requiredpower: ExtraRcon.findOne({'name': 'extra_rcon'}).execAsync(),
			getserver: Servers.findOne({'admins_on_server':req.user._id, '_id':req.params.id, rcon_password: { $gt: [] }}).execAsync(),
		}).then(function(results) {			
			if (results.getserver){
				if ( results.requiredpower.enable_screenshot_all !== 'undefined' && results.requiredpower.enable_screenshot_all){
					if (req.user.local.user_role >= results.requiredpower.minimum_admin_power_for_screenshots){
						var	rcon = require('srcds-rcon')({address:results.getserver.ip+':'+results.getserver.port,password: results.getserver.rcon_password});
							rcon.connect()
							.then(function(connected){
								return rcon.command(req.body.rcon_cmd);
							}).then(function(getresult){
								req.flash('rconconsole_messages', 'Screenshot all Players command successfully executed');
							}).then(function(disconnect){
								rcon.disconnect();
								res.redirect('back');
							}).catch(function(err) {
								console.log('We hve an error: '+err.stack);
								req.flash('rconconsole_messages', err.stack);
								res.redirect('back');
							});	
					}else{
						req.flash('error_messages', 'You have not enough power to use the Rcon Console on this server. Minimum power is: '+results.requiredpower.minimum_admin_power_for_screenshots);
						res.redirect('back');
					}
				}else{
						req.flash('error_messages', 'This command is disabled by server Admin, dont play with my Heart');
						res.redirect('back');
				}
			}else{
				req.flash('error_messages', 'You have no Admin rigths on this Server');
				res.redirect('back');
			}
		}).catch(function(err) {
			console.log("There was an error: " +err);
			res.redirect('back');
		});
	},

	RconChangeMap: function(req, res, next) {
		BluebirdPromise.props({
			requiredpower: ExtraRcon.findOne({'name': 'extra_rcon'}).execAsync(),
			maps: Maps.findOne({'map_name': req.body.map_name}).execAsync(),
			getserver: Servers.findOne({'admins_on_server':req.user._id, '_id':req.params.id, rcon_password: { $gt: [] }}).execAsync(),
		}).then(function(results) {	
			if (results.getserver){
				if ( results.requiredpower.enable_map_change !== 'undefined' && results.requiredpower.enable_map_change){
					if (req.user.local.user_role >= results.requiredpower.minimum_power_for_map_change){
						var cmd = req.body.rcon_cmd+' '+req.body.map_name;
						var	rcon = require('srcds-rcon')({address:results.getserver.ip+':'+results.getserver.port,password: results.getserver.rcon_password});
							rcon.connect()
							.then(function(connected){
								return rcon.command(cmd);
							}).then(function(getresult){
								req.flash('rconconsole_messages', 'Map successfully changed to '+results.maps.display_map_name);
							}).then(function(disconnect){
								rcon.disconnect();
								res.redirect('back');
							}).catch(function(err) {
								req.flash('rconconsole_messages', err.stack);
								res.redirect('back');
							});
					}else{
						req.flash('error_messages', 'You have not enough power to use the Rcon Console on this server. Minimum power is: '+results.requiredpower.minimum_power_for_map_change);
						res.redirect('back');
					}
				}else{
						req.flash('error_messages', 'This command is disabled by server Admin, dont play with my Heart');
						res.redirect('back');
				}
			}else{
				req.flash('error_messages', 'You have no Admin rigths on this Server');
				res.redirect('back');
			}
		}).catch(function(err) {
			console.log("There was an error: " +err);
			res.redirect('back');
		});
	},

	RconTempban: function(req, res, next) {
		BluebirdPromise.props({
			tempbanselect_enabled: ExtraRcon.findOne({'name': 'extra_rcon'}).execAsync(),
			getcommand: Rconcommand.findOne({'rcon_command': 'tempban'}).execAsync(),
			getselectedtime: TempbanDurations.findOne({'short_label': req.body.tempbanduration}).execAsync(),
			getserver: Servers.findOne({'admins_on_server':req.user._id, '_id':req.params.id, rcon_password: { $gt: [] }}).execAsync(),
		}).then(function(results) {
			if (results.getserver){
				if (results.getcommand){
					if (req.user.local.user_role >= results.getcommand.min_power){
						if ( typeof results.tempbanselect_enabled.enable_tempban_duration !== 'undefined' && results.tempbanselect_enabled.enable_tempban_duration){
							setdefault_duration = req.body.tempbanduration;
							setdefault_duration_inform = '^7 for ^1'+results.getselectedtime.time_number+' '+results.getselectedtime.category_alias+'^7 with reason';
						}else{
							setdefault_duration = results.tempbanselect_enabled.default_tempban_time+'m';
							setdefault_duration_inform = '^7 for ^1'+results.tempbanselect_enabled.default_tempban_time+'^7 with reason';
						}
						if ( typeof req.body.message !== 'undefined' && req.body.message){
							setdefault_reason = req.body.message;
						}else{
							setdefault_reason = 'no reason given';
						}
						var cmd = req.body.rcon_cmd+' '+req.body.player_slot+' '+setdefault_duration+' '+setdefault_reason;
						var	rcon = require('srcds-rcon')({address:results.getserver.ip+':'+results.getserver.port,password: results.getserver.rcon_password});
							rcon.connect()
							.then(function(connected){
								return rcon.command(cmd);
							}).then(function(getresult){
								if ( typeof results.getcommand.send_back_message_to_server !== 'undefined' && results.getcommand.send_back_message_to_server){
									req.flash('notify_messages', 'Information Message sent to the Server');
								}
								var newAdminaction = new Adminactions ({
		  							player_name: req.body.rcon_player,
									admin_message: setdefault_reason,
									rcon_command: results.getcommand._id,
									rcon_server: req.params.id,
									rcon_admin: req.user._id,
									show_action: 1
			  					});
			  					newAdminaction.saveAsync();
								req.flash('rconconsole_messages', req.body.rcon_player+' successfully '+req.body.rcon_cmd+'ed'+setdefault_duration_inform+' '+setdefault_reason);
							}).then(function(returninfo){
								if ( typeof results.getcommand.send_back_message_to_server !== 'undefined' && results.getcommand.send_back_message_to_server){
									var cmdinform = 'say ^5'+req.body.rcon_player+'^7 was ^1'+req.body.rcon_cmd+'ed ^7by^5 '+req.user.local.user_name+setdefault_duration_inform+' ^7'+setdefault_reason;
									return rcon.command(cmdinform);
								}
							}).then(function(disconnect){
								rcon.disconnect();
								res.redirect('back');
							}).catch(function(err) {
								req.flash('rconconsole_messages', err.stack);
								res.redirect('back');
							});				
					}else{
						req.flash('error_messages', 'You have not enough power to use this command on this server. Minimum power is: '+results.getcommand.min_power);
						res.redirect('back');
					}
				}else{
					req.flash('error_messages', 'This command doesnt exist, dont play with my heart');
					res.redirect('back');
				}
			}else{
				req.flash('error_messages', 'You have no Admin rigths on this Server');
				res.redirect('back');
			}
		}).catch(function(err) {
			console.log("There was an error: " +err);
			res.redirect('back');
		});
	},

	RconAdminAction: function(req, res, next) {
		BluebirdPromise.props({
			getcommand: Rconcommand.findOne({'rcon_command': req.body.rcon_cmd}).execAsync(),
			getserver: Servers.findOne({'admins_on_server':req.user._id, '_id':req.params.id, rcon_password: { $gt: [] }}).execAsync(),
		}).then(function(results) {
			if (results.getserver){
				if (results.getcommand){
					if (req.user.local.user_role >= results.getcommand.min_power){
						if ( typeof req.body.message !== 'undefined' && req.body.message){
							setdefault_reason = req.body.message;
						}else{
							setdefault_reason = 'no reason given';
						}
						var cmd = req.body.rcon_cmd+' '+req.body.player_slot+' '+setdefault_reason;
						var	rcon = require('srcds-rcon')({address:results.getserver.ip+':'+results.getserver.port,password: results.getserver.rcon_password});
							rcon.connect()
							.then(function(connected){
								return rcon.command(cmd);
							}).then(function(getresult){
								if ( typeof results.getcommand.send_back_message_to_server !== 'undefined' && results.getcommand.send_back_message_to_server){
									req.flash('notify_messages', 'Information Message sent to the Server');
								}
								if (req.body.rcon_cmd !== 'kick'){
									set_show_action = 0;
								}else{
									set_show_action = 1;
								}
								var newAdminaction = new Adminactions ({
		  							player_name: req.body.rcon_player,
									//player_guid: req.body.playerguid,
									admin_message: setdefault_reason,
									rcon_command: results.getcommand._id,
									rcon_server: req.params.id,
									rcon_admin: req.user._id,
									show_action: set_show_action
			  					});
			  					newAdminaction.saveAsync();
								req.flash('rconconsole_messages', req.body.rcon_player+' successfully '+req.body.rcon_cmd+'ed '+setdefault_reason);
							}).then(function(returninfo){										
								if ( typeof results.getcommand.send_back_message_to_server !== 'undefined' && results.getcommand.send_back_message_to_server){
									var cmdinform = 'say '+req.body.rcon_player+' was '+req.body.rcon_cmd+'ed by '+req.user.local.user_name+' '+setdefault_reason;
									return rcon.command(cmdinform);
								}
							}).then(function(disconnect){
								rcon.disconnect();
								res.redirect('back');
							}).catch(function(err) {
								req.flash('rconconsole_messages', err.stack);
								res.redirect('back');
							});
					}else{
						req.flash('error_messages', 'You have not enough power to use this command on this server. Minimum power is: '+results.getcommand.min_power);
						res.redirect('back');
					}
				}else{
					req.flash('error_messages', 'This command doesnt exist, dont play with my heart');
					res.redirect('back');
				}
			}else{
				req.flash('error_messages', 'You have no Admin rigths on this Server');
				res.redirect('back');
			}
		}).catch(function(err) {
			console.log("There was an error: " +err);
			res.redirect('back');
		});
	},

	Rcongetss: function(req, res, next) {
		var start = moment().toDate();
		BluebirdPromise.props({
			requiredpower: ExtraRcon.findOne({'name': 'extra_rcon'}).execAsync(),
			getserver: Servers.findOne({'admins_on_server':req.user._id, '_id':req.params.id, rcon_password: { $gt: [] }}).execAsync(),
			screenshotserver: Servers.findOne({'_id':req.params.id, rcon_password: { $gt: [] }}).execAsync(),
			countscreenshots: UserScreenshots.count({'get_user':req.user._id, updatedAt: {$gt: (start -59*60000)}}).execAsync()
		}).then(function(results) {
			if(results.requiredpower.screenshots_for_users_enabled !== 'undefined' && results.requiredpower.screenshots_for_users_enabled){
				if (results.screenshotserver){
					if (results.requiredpower.maximum_screenshots_for_users > results.countscreenshots){
						var cmd = req.body.rcon_cmd+' '+req.body.player_slot;
						var	rcon = require('srcds-rcon')({address:results.screenshotserver.ip+':'+results.screenshotserver.port,password: results.screenshotserver.rcon_password});
							rcon.connect()
							.then(function(connected){
								return rcon.command(cmd);
							}).then(function(getresult){
								if (req.user.local.user_role <= results.requiredpower.maximum_screenshots_for_users){
									var newUserScreenshot = new UserScreenshots ({
			  						get_user: req.user._id,
									get_server: results.screenshotserver._id
					  				});
					  				newUserScreenshot.saveAsync()
								}								
				  				req.flash('rconconsole_messages', getresult);
							}).then(function(disconnect){
								rcon.disconnect();
								res.redirect('back');
							}).catch(function(err) {
								req.flash('rconconsole_messages', err.stack);
								res.redirect('back');
							});
					}else{
						req.flash('error_messages', 'Maximum screenshots per/hour for regular users: '+results.requiredpower.maximum_screenshots_for_users);
						res.redirect('back');
					}
				}else{
						req.flash('error_messages', 'Server not found');
						res.redirect('back');
				}
			} else {
				if (results.getserver){
					if ( results.requiredpower.screenshots_enabled !== 'undefined' && results.requiredpower.screenshots_enabled){
						if (req.user.local.user_role >= results.requiredpower.minimum_admin_power_for_screenshots){
							if ( typeof req.body.message !== 'undefined' && req.body.message){
								setdefault_reason = req.body.message;
							}else{
								setdefault_reason = 'no reason given';
							}
							var cmd = req.body.rcon_cmd+' '+req.body.player_slot;
							var	rcon = require('srcds-rcon')({address:results.getserver.ip+':'+results.getserver.port,password: results.getserver.rcon_password});
								rcon.connect()
								.then(function(connected){
									return rcon.command(cmd);
								}).then(function(getresult){
				  					req.flash('rconconsole_messages', getresult);
								}).then(function(disconnect){
									rcon.disconnect();
									res.redirect('back');
								}).catch(function(err) {
									req.flash('rconconsole_messages', err.stack);
									res.redirect('back');
								});	
						}else{
							req.flash('error_messages', 'You have not enough power to use this command on this server. Minimum power is: '+results.requiredpower.minimum_admin_power_for_screenshots);
							res.redirect('back');
						}
					}else{
						req.flash('error_messages', 'This command is disabled by server Admin, dont play with my Heart');
						res.redirect('back');
					}
				}else{
					req.flash('error_messages', 'You have no Admin rigths on this Server');
					res.redirect('back');
				}
			}	
		}).catch(function(err) {
			console.log("There was an error: " +err);
			res.redirect('back');
		});
	},

	RconPermban: function(req, res, next) {
		var create_img_variable = "/img/screenshots/"+req.params.screenshot_img+".jpg";
		BluebirdPromise.props({
			getscreenshot: ServerScreenshots.findOne({'screenshot_img': create_img_variable}).execAsync(),
			requiredpower: ExtraRcon.findOne({'name': 'extra_rcon'}).execAsync()
		}).then(function(results) {
			if (results.getscreenshot){
				console.log('Screenshot found based on id: '+results.getscreenshot._id);
				Servers.findOne({'_id':results.getscreenshot.get_server, 'admins_on_server':req.user._id, rcon_password: { $gt: [] }})
					.then(function(server_admins) {
						if (server_admins){
							console.log('Server admin found server_admins function');
							if (req.user.local.user_role >= results.requiredpower.minimum_admin_power_for_screenshots){
								setdefault_reason = 'cheat detected on screenshot, for more information visit our website';
								var cmd = 'permban'+' '+results.getscreenshot.player_guid+' '+setdefault_reason;
								var	rcon = require('srcds-rcon')({address:server_admins.ip+':'+server_admins.port,password: server_admins.rcon_password});
									rcon.connect()
									.then(function(connected){
										return rcon.command(cmd);
									}).then(function(getresult){		

					  					var newBan = new Bans ({
				  							player_name: results.getscreenshot.player_name,
				  							player_guid: results.getscreenshot.player_guid,
				  							player_screenshot:'/img/banned/'+req.params.screenshot_img+'.jpg',
											admin_message: 'cheat detected on screenshot',
											rcon_server: server_admins._id,
											rcon_admin: req.user._id
					  					});

										if (!fs.existsSync('./public/img/banned')){
											fs.mkdirSync('./public/img/banned');
										}
					  					fs.rename('./public'+create_img_variable, './public/img/banned/'+req.params.screenshot_img+'.jpg', function(err){
											if (err) console.log(err);
										});
										req.flash('rconconsole_messages', results.getscreenshot.player_name+' successfully banned with reason '+setdefault_reason);
										req.flash('notify_messages', 'Information Message sent to the Server');
										newBan.saveAsync();
										
										ServerScreenshots.remove({'screenshot_img': create_img_variable}, function(error) {
											if (error) {
												console.log(error);
											}
										});
									}).then(function(returninfo){
										var cmdinform = 'say ^5'+results.getscreenshot.player_name+'^7 was ^1permanently banned ^7by ^5'+req.user.local.user_name+' ^7'+setdefault_reason;
										return rcon.command(cmdinform);
									}).then(function(disconnect){
										rcon.disconnect();
										res.redirect('back');
									}).catch(function(err) {
										req.flash('rconconsole_messages', err.stack);
										res.redirect('/'+server_admins.name_alias);
									});
							}else{
								req.flash('error_messages', 'You have not enough power to use this command on this server. Minimum power is: '+results.requiredpower.minimum_admin_power_for_screenshots);
								res.redirect('back');
							}
						}else{
							req.flash('error_messages', 'You have no Admin rights on this server');
							res.redirect('back');
						}
					}).catch(function(err) {
						console.log("There was an error: " +err);
						res.redirect('back');
					});					
			}else{
				req.flash('error_messages', 'This screenshot doesnt exist, it may be removed in the mean time');
				res.redirect('back');
			}
		}).catch(function(err) {
			console.log("There was an error: " +err);
			res.redirect('back');
		});
	},

	RconUnban: function(req, res, next) {
		BluebirdPromise.props({
			getban: Bans.findOne({'_id': req.params.id}).execAsync(),
			checkunbanrequest: Notifications.findOne({'bann_id': req.params.id}).execAsync(),
			requiredpower: ExtraRcon.findOne({'name': 'extra_rcon'}).execAsync()
		}).then(function(results) {
			if (results.getban){
				Servers.findOne({'_id':results.getban.rcon_server, 'admins_on_server':req.user._id, rcon_password: { $gt: [] }})
					.then(function(server_admins) {
						if (server_admins){
							if (req.user.local.user_role >= results.requiredpower.minimum_power_for_player_unban){
								var cmd = 'unban'+' '+results.getban.player_guid;
								var	rcon = require('srcds-rcon')({address:server_admins.ip+':'+server_admins.port,password: server_admins.rcon_password});
									rcon.connect()
									.then(function(connected){
										return rcon.command(cmd);
										console.log(cmd);
									}).then(function(getresult){
											req.flash('notify_messages', 'Information Message sent to the Server');
					  					
					  					var newUnban = new Unbans ({
				  							player_name: results.getban.player_name,
				  							player_guid: results.getban.player_guid,
											rcon_server: server_admins._id,
											rcon_admin: req.user._id
					  					});
					  					newUnban.saveAsync();

					  					if (results.checkunbanrequest){
											var newGlobalnotifications = new Globalnotifications ({
												sender_id: req.user._id,
												recipient_id: results.checkunbanrequest.sender_id,
												link_title:results.getban.player_name+' Unbanned',
												link_text: 'Admin response on Your Unban request',
												link_url: '/notifications',
												message:'We decided to accept your Unban Request! You can now join our Server(s)!'
											});
											newGlobalnotifications.saveAsync()
										}
					  					//Delete screenshot and user from banned persons
					  					var filePath = './public/'+results.getban.player_screenshot;
					  					fs.unlink(filePath, function(err) {
											if (err) {
												console.log("failed to delete local image:"+err);
											} else {
												Notifications.remove({'bann_id' : req.params.id}).exec();
											}
										});										
										req.flash('success_messages', 'Player Successfully unbanned');
										Bans.remove({'_id': req.params.id}).exec();
									}).then(function(returninfo){										
										var cmdinform = 'say ^5'+results.getban.player_name+'^7 was ^1ubanned ^7by ^5'+req.user.local.user_name;
										return rcon.command(cmdinform);
									}).then(function(disconnect){
										
										rcon.disconnect();
										
										res.redirect('/banlist');
									}).catch(function(err) {
										req.flash('rconconsole_messages', err.stack);
										res.redirect('/'+server_admins.name_alias);
									});
							}else{
								req.flash('error_messages', 'You have not enough power to use this command on this server. Minimum power is: '+results.requiredpower.minimum_power_for_player_unban);
								res.redirect('back');
							}
						}else{
							req.flash('error_messages', 'You have no Admin rights on this server');
							res.redirect('back');
						}
					}).catch(function(err) {
						console.log("There was an error: " +err);
						res.redirect('back');
					});					
			}else{
				req.flash('error_messages', 'This permban doesnt exist, it may be removed in the mean time');
				res.redirect('back');
			}
		}).catch(function(err) {
			console.log("There was an error: " +err);
			res.redirect('back');
		});
	},

	RconPermbanOnReport: function(req, res, next) {
		BluebirdPromise.props({
			getreport: Cheaterreports.findOne({'_id': req.params.id}).populate('sender_id').execAsync(),
			requiredpower: ExtraRcon.findOne({'name': 'extra_rcon'}).execAsync()
		}).then(function(results) {
			if (results.getreport){
				Servers.findOne({'_id':results.getreport.rcon_server, 'admins_on_server':req.user._id, rcon_password: { $gt: [] }})
					.then(function(server_admins) {
						if (server_admins){
							if (req.user.local.user_role >= results.requiredpower.minimum_admin_power_for_screenshots){
								setdefault_reason = 'cheat detected on screenshot, for more information visit our website';
								var cmd = 'permban'+' '+results.getreport.player_guid+' '+setdefault_reason;
								var	rcon = require('srcds-rcon')({address:server_admins.ip+':'+server_admins.port,password: server_admins.rcon_password});
									rcon.connect()
									.then(function(connected){
										return rcon.command(cmd);
									}).then(function(getresult){
											
										var changeimgpath = S(results.getreport.player_screenshot).chompLeft('/img/cheater-reports/').s;
										var newpath = '/img/banned/'+changeimgpath;

											req.flash('notify_messages', 'Information Message sent to the Server');
					  					var newBan = new Bans ({
				  							player_name: results.getreport.player_name,
				  							player_guid: results.getreport.player_guid,
				  							player_screenshot:newpath,
											admin_message: 'cheat detected on screenshot',
											cheater_reporter_id: results.getreport.sender_id._id,
											cheater_reporter:results.getreport.player_name+' is permanently banned thanks to <a href="/members/'+results.getreport.sender_id._id+'">@'+results.getreport.sender_id.local.user_name+'s</a> cheater report. Thank you for all your assistance! We really appreciate your help! God Job!',
											rcon_server: server_admins._id,
											rcon_admin: req.user._id
					  					});

					  					//Create the notification what we send to user since we need the next ID
										var newGlobalnotifications = new Globalnotifications ({
											sender_id: req.user._id,
											recipient_id: results.getreport.sender_id,
											link_title:results.getreport.player_name+' Permbanned',
											link_text: 'Admin response on Your Cheater Report',
											link_url: '/notifications',
											plus_message: '<strong>'+results.getreport.player_name+'</strong> is permanently banned, you can see the ban here <a href="/banlist/'+newBan.id+'">Permban Report</a>',
											message:'Based on the screenshot what you have sent to us we permanently banned <strong>'+results.getreport.player_name+'</strong>. Thank you for all your assistance! We really appreciate your help! God Job!'
										});
										newGlobalnotifications.saveAsync()

					  					newBan.saveAsync();

										if (!fs.existsSync('./public/img/banned')){
											fs.mkdirSync('./public/img/banned');
										}

					  					fs.rename('./public'+results.getreport.player_screenshot, './public'+newpath, function(err){
											if (err) console.log(err);
										});
										req.flash('rconconsole_messages', results.getreport.player_name+' successfully banned with reason '+setdefault_reason);
										Cheaterreports.remove({'_id': req.params.id}).exec();
										Notifications.remove({'cheater_report_id':results.getreport._id}).exec();
									}).then(function(returninfo){										
										var cmdinform = 'say ^5'+results.getreport.player_name+'^7 was ^1permanently banned ^7by ^5'+req.user.local.user_name+' ^7'+setdefault_reason;
										return rcon.command(cmdinform);
									}).then(function(disconnect){
										rcon.disconnect();
										res.redirect('back');
									}).catch(function(err) {
										req.flash('rconconsole_messages', err.stack);
										res.redirect('back');
									});
							}else{
								req.flash('error_messages', 'You have not enough power to use this command on this server. Minimum power is: '+results.requiredpower.minimum_admin_power_for_screenshots);
								res.redirect('back');
							}
						}else{
							req.flash('error_messages', 'You have no Admin rights on this server');
							res.redirect('back');
						}
					}).catch(function(err) {
						console.log("There was an error: " +err);
						res.redirect('back');
					});					
			}else{
				req.flash('error_messages', 'This screenshot doesnt exist, it may be removed in the mean time');
				res.redirect('back');
			}
		}).catch(function(err) {
			console.log("There was an error: " +err);
			res.redirect('back');
		});
	},
};
