const mongoose = require('mongoose');
const BluebirdPromise = require('bluebird');
const jsonfile = require('jsonfile');
const githubLatestRelease = require('github-latest-release');
const Appversion = require("../models/app_version");
const Cod4xversion = require("../models/cod4x_version");
const CronJob = require('cron').CronJob;
const schedule = require('node-schedule');
const async = require('async');
const SourceQuery = require('sourcequery');
const geoip = require('geoip-lite-country-only');
const countries = require('country-list')();
const fs = require('fs');
const S = require('string');
const moment = require('moment');
const DiscordWebhook = require("discord-webhooks");
const SSH = require('simple-ssh');
const config = require('../config/config');
const Plugins = require("../models/plugins");
const Bans = require("../models/bans");
const Servers = require("../models/servers");
const Usermaps = require("../models/maps");
const OnlinePlayers = require("../models/online_players");
const Systemlogs = require("../models/system_logs");
const Adminactions = require("../models/admin_actions");

	var now = new Date();
	var current_time = new moment().format("H");
	var current_time_start = new moment().format("H");

	// ################################ Check CoD4xWebadmin version on Github page ################################ //
	var job = schedule.scheduleJob('5 2 * * *', function(){
		check_cod4_xwebadmin_version();
	});

	// ################################ Check CoD4x Server version on Github page ################################ //
	var job1 = schedule.scheduleJob('6 2 * * *', function(){
		get_cod4x_latest_version();
	});

	// ################################ Plugin Refresh Server Status ################################ //
	BluebirdPromise.props({
		refresh_server_status: Plugins.findOne({'name_alias' : 'refresh-server-status', 'status': true}, 'status cron_job_time_intervals').execAsync()
	}).then (function(results){
		if (results.refresh_server_status){
			var job2 = schedule.scheduleJob('5 */'+results.refresh_server_status.cron_job_time_intervals+' * * * *', function(){
				update_server_status();
			});
		}
	}).catch(function(err) {
		console.log("There was an error in plugin refresh player list: " +err);
	});

	// ################################ Plugin Refresh player list ################################ //
	BluebirdPromise.props({
		server_status: Plugins.findOne({'name_alias' : 'refresh-playerlist', 'status': true}, 'status cron_job_time_intervals').execAsync()
	}).then (function(results){
		if (results.server_status){
			var job3 = schedule.scheduleJob('10 */'+results.server_status.cron_job_time_intervals+' * * * *', function(){
				refreshplayerlist();
			});
		}
	}).catch(function(err) {
		console.log("There was an error in plugin refresh player list: " +err);
	});

	// ################################ Plugin remove Old Bans from the website ################################ //
	BluebirdPromise.props({
		remove_old_bans: Plugins.findOne({'name_alias' : 'remove-old-bans', 'status': true}, 'status cron_job_time_intervals').execAsync()
	}).then (function(results){
		if (results.remove_old_bans){
			var job4 = schedule.scheduleJob('30 1 * * *', function(){
				var daysToDeletion = parseInt(results.remove_old_bans.cron_job_time_intervals);
				var deletionDate = new Date(now.setDate(now.getDate() - daysToDeletion));
				Bans.find({createdAt : {$lt : deletionDate}},function(error, counted){	
					if (!error){
						if (counted.length > 0){
							Bans.remove({ createdAt : {$lt : deletionDate} }, function(err) {});
							var newSystemlogs = new Systemlogs ({
								logline: 'Older then '+daysToDeletion+' days Bans removed from page',
								successed: true
							});
							newSystemlogs.saveAsync()
						}
					}
				});	
			});
		}
	}).catch(function(err) {
		console.log("There was an error in plugin Remove old Bans: " +err);
	});


	// ################################ Plugin remove Old Cronjobs from the website ################################ //
	var rmadminactions = schedule.scheduleJob('46 1 * * *', function(){
		var daysToDeletion = parseInt(3);
		var deletionDate = new Date(now.setDate(now.getDate() - daysToDeletion));
		Systemlogs.find({createdAt : {$lt : deletionDate}},function(error, counted){	
			if (!error){
				if (counted.length > 0){
					Systemlogs.remove({ createdAt : {$lt : deletionDate} }, function(err) {
						if (err){
							console.log('Remove old system cronjob logs error: '+err)
						} else {
							console.log('Old system logs removed')
						}
					});
				}
			}
		});	
	});


	// ################################ Plugin remove Old Admin Actions from the website ################################ //
	BluebirdPromise.props({
		remove_old_admin_actions: Plugins.findOne({'name_alias' : 'remove-old-admin-actions', 'status': true}, 'status cron_job_time_intervals').execAsync()
	}).then (function(results){
		if (results.remove_old_admin_actions){
			var rmadminactions = schedule.scheduleJob('45 1 * * *', function(){
				var daysToDeletion = parseInt(results.remove_old_admin_actions.cron_job_time_intervals);
				var deletionDate = new Date(now.setDate(now.getDate() - daysToDeletion));
				Adminactions.find({createdAt : {$lt : deletionDate}},function(error, counted){	
					if (!error){
						if (counted.length > 0){
							Adminactions.remove({ createdAt : {$lt : deletionDate} }, function(err) {});
							var newSystemlogs = new Systemlogs ({
								logline: 'Older then '+daysToDeletion+' days Admin Actions Removed from page',
								successed: true
							});
							newSystemlogs.saveAsync()
						}
					}
				});	
			});
		}
	}).catch(function(err) {
		console.log("There was an error in plugin Remove old Bans: " +err);
	});


	// ################################ Plugin check if server is online ################################ //
	BluebirdPromise.props({
		check_server_online: Plugins.findOne({'name_alias' : 'check-server-online', 'status': true}, 'status cron_job_time_intervals').execAsync()
	}).then (function(results){
		if (results.check_server_online){
			var job5 = schedule.scheduleJob('15 */'+results.check_server_online.cron_job_time_intervals+' * * * *', function(){
				check_if_server_is_online();
			});
		}
	}).catch(function(err) {
		console.log("There was an error Plugin check server Online: " +err);
	});

	// ################################ Restart server every day at X hours ################################ //

	var runstophourly = schedule.scheduleJob('0 * * * *', function(){
		BluebirdPromise.props({
			servers: Servers.find({'auto_restart_server' : true, 'time_to_restart_server': current_time, 'external_ip':false, 'is_stoped': false}, 'name name_alias ip port count_connection_fail, script_starter').execAsync()
		}).then (function(results){
			if (results.servers.length > 0){
				var ssh = new SSH({
					host: config.ssh_access.host,
					user: config.ssh_access.user,
					pass: config.ssh_access.password,
					baseDir: config.cod4_server_plugin.servers_root
				});
				async.eachSeries(results.servers, function (server, next){
					setTimeout(function() {
						if (server){
							console.log('Stoping server: '+server.name)
							ssh.exec('cd '+config.cod4_server_plugin.servers_root+'/cod4-'+server.port+' && screen -X -S cod4-'+server.port+' quit && kill $(lsof -t -i:'+server.port+')', {
								out: console.log.bind(console)
							}).start();
							Servers.findOneAndUpdate({ "_id": server._id }, { "$set": {
								'count_connection_fail': 0,
								'is_stoped': true,
								'is_online': false
							}}).exec(function(err, done){
								if(err) {
									console.log(err);
								}
							});
						}
						next(); // don't forget to execute the callback!
					}, 4000);
				}, function () {
					console.log('Done going through Servers!');
				});
			}
		}).catch(function(err) {
			console.log("There was an error in plugin auto restart servers: " +err);
		});
	})
	var runstarthourly = schedule.scheduleJob('2 * * * *', function(){
		// Start server every day at X hours + 2min (Part of stop server every day at X hours)
		BluebirdPromise.props({
			servers: Servers.find({'auto_restart_server' : true, 'time_to_restart_server': current_time, 'external_ip':false, 'is_stoped': true}, 'name name_alias ip port count_connection_fail, script_starter').execAsync(),
			plugin: Plugins.findOne({'name_alias': 'cod4x-authtoken', 'status':true}, 'extra_field').execAsync()
		}).then (function(results){
			if (results.servers.length > 0){
				var ssh = new SSH({
					host: config.ssh_access.host,
					user: config.ssh_access.user,
					pass: config.ssh_access.password,
					baseDir: config.cod4_server_plugin.servers_root
				});

				async.eachSeries(results.servers, function (server, next){
					setTimeout(function() {
						if (server){
							console.log('Starting server: '+server.name)
							//Check if we use cod4x authtoken
							if (results.plugin){
								var startline = includecod4authtoken(server.script_starter, 'set sv_authtoken "'+results.plugin.extra_field+'" +exec server.cfg');
							}else {
								var startline = server.script_starter;
							}
							ssh.exec('cd '+config.cod4_server_plugin.servers_root+'/cod4-'+server.port+' && /usr/bin/screen -dmS cod4-' +server.port+ ' ' +startline, {
								out: function(stdout) {
					        		console.log(stdout);
					    		}
							}).start();
							Servers.findOneAndUpdate({ "_id": server._id }, { "$set": {
								'count_connection_fail': 0,
								'is_stoped': false,
								'is_online': true
							}}).exec(function(err, done){
								if(err) {
									console.log(err);
								}
							});
							var newSystemlogs = new Systemlogs ({
								logline: server.name+' Restarted (Auto Restart Server)',
								successed: true
							});
							newSystemlogs.saveAsync()
						}
						next(); // don't forget to execute the callback!
					}, 4000);
				}, function () {
					console.log('Done going through Servers!');
				});
			}
		}).catch(function(err) {
			console.log("There was an error in plugin auto restart servers: " +err);
		});
	});

	// ################################ Stop server/remove screen session on server crash ################################ //
	var runstoponservercrashed = schedule.scheduleJob('30 */15 * * *', function(){
		BluebirdPromise.props({
			servers: Servers.find({'auto_restart_server_on_crash' : true, 'is_stoped': false, 'is_online': true, 'external_ip':false, 'count_connection_fail': {$gte: 5}}, 'name name_alias ip port count_connection_fail, script_starter').execAsync()
		}).then (function(results){
			if (results.servers.length > 0){
				var ssh = new SSH({
					host: config.ssh_access.host,
					user: config.ssh_access.user,
					pass: config.ssh_access.password,
					baseDir: config.cod4_server_plugin.servers_root
				});
				var sq = new SourceQuery(1000);

				async.eachSeries(results.servers, function (server, next){
					setTimeout(function() {
						if (server){
							//Lets make sure that our server has crashed
							sq.open(server.ip, server.port);
							sq.getInfo(function(err, info){  	
								if (!err){
									//Our server is working we do not need to restart it, we will just update the DB
									Servers.findOneAndUpdate({ "_id": server._id }, { "$set": {
										'count_connection_fail': 0,
										'is_stoped': false,
										'is_online': true
									}}).exec(function(err, done){
										if(err) {
											console.log(err);
										}
									});
								} else {
									// Server is unavailable we have to stop it, kill all processes on this port and quit the screen session
									ssh.exec('cd '+config.cod4_server_plugin.servers_root+'/cod4-'+server.port+' && screen -X -S cod4-'+server.port+' quit && kill $(lsof -t -i:'+server.port+')', {
										out: console.log.bind(console)
									}).start();

									Servers.findOneAndUpdate({ "_id": server._id }, { "$set": {
										'count_connection_fail': 5,
										'is_stoped': true,
										'is_online': false
									}}).exec(function(err, done){
										if(err) {
											console.log(err);
										}
									});
								}
							});
						}
						next(); // don't forget to execute the callback!
					}, 4000);
				}, function () {
					console.log('Done going through Servers!');
				});
			}
		}).catch(function(err) {
			console.log("There was an error in plugin auto restart servers: " +err);
		});
	});
	var runstartonservercrashed = schedule.scheduleJob('30 */17 * * *', function(){
		// Start server after it crashed + 2min (Part of server crashed and stopped)
		BluebirdPromise.props({
			servers: Servers.find({'auto_restart_server_on_crash' : true, 'external_ip':false, 'count_connection_fail': {$gte: 5}, 'is_stoped':true}, 'name name_alias ip port count_connection_fail, script_starter').execAsync(),
			plugin: Plugins.findOne({'name_alias': 'cod4x-authtoken', 'status':true}).execAsync()
		}).then (function(results){
			if (results.servers.length > 0){
				var ssh = new SSH({
					host: config.ssh_access.host,
					user: config.ssh_access.user,
					pass: config.ssh_access.password,
					baseDir: config.cod4_server_plugin.servers_root
				});
				async.eachSeries(results.servers, function (server, next){
					setTimeout(function() {
						if (server){
							//Check if we use cod4x authtoken
							if (results.plugin){
								var startline = includecod4authtoken(server.script_starter, 'set sv_authtoken "'+results.plugin.extra_field+'" +exec server.cfg');
							}else {
								var startline = server.script_starter;
							}
							ssh.exec('cd '+config.cod4_server_plugin.servers_root+'/cod4-'+server.port+' && /usr/bin/screen -dmS cod4-' +server.port+ ' ' +startline, {
								out: function(stdout) {
					        		console.log(stdout);
					    		}
							}).start();
							Servers.findOneAndUpdate({ "_id": server._id }, { "$set": {
								'count_connection_fail': 0,
								'is_stoped': false,
								'is_online': true
							}}).exec(function(err, done){
								if(err) {
									console.log(err);
								}
							});
							var newSystemlogs = new Systemlogs ({
								logline: server.name+' Auto-Started (Auto Restart on Server Crash)',
								successed: true
							});
							newSystemlogs.saveAsync()
						}
						next(); // don't forget to execute the callback!
					}, 4000);
				}, function () {
					console.log('Done going through Servers!');
				});
			}
		}).catch(function(err) {
			console.log("There was an error in plugin auto restart servers: " +err);
		});
	});
	// ################################ Functions ################################ //
	function check_cod4_xwebadmin_version(req, res, next) {
		var my_packagejsonfile = './package.json';
		githubLatestRelease('byNeHo', 'CoD4x-WebAdmin', function (err, github_results){
			jsonfile.readFile(my_packagejsonfile, function(err, obj) {
				if (err){
					console.log(err)
				} else{
					//If there is a result
					if ( typeof github_results !== 'undefined' && github_results){
						//console.log(github_results);
						var myversion = 'v'+obj.version;
						Appversion.findOneAndUpdate({name:'CoD4x-WebAdmin' }, { "$set": {
							'local_version': myversion,
							'github_version': github_results.tag_name
						}}).exec(function(err, done){
							if(err) {
								console.log(err);
							}
						});
						var newSystemlogs = new Systemlogs ({
							logline:'CoD4x-WebAdmin latest application version checked on Github',
							successed: true
						});
						newSystemlogs.saveAsync()
					}else{
						console.log('Could not get the latest version from github');
					}
				}
			})
		})
	}
	function get_cod4x_latest_version(req, res, next) {
		githubLatestRelease('callofduty4x', 'CoD4x_Server', function (err, github_results){
				if (err){
					console.log(err)
				} else{
					//If there is a result
					//console.log(github_results);
					if ( typeof github_results !== 'undefined' && github_results){
						Cod4xversion.findOneAndUpdate({name:'CoD4x-Server'}, { "$set": {
							'prerelease': github_results.prerelease,
							'github_version': github_results.tag_name
						}}).exec(function(err, done){
							if(err) {
								console.log(err);
							}
						});
						var newSystemlogs = new Systemlogs ({
							logline:'CoD4x-Server latest server version checked on Github',
							successed: true
						});
						newSystemlogs.saveAsync()
					}else{
						console.log('Could not get the latest version from github');
					}
				}
		})
	}
	function check_if_server_is_online(req, res, next) {
		BluebirdPromise.props({
			checkdiscord: Plugins.findOne({'category': 'discord'}, 'status').execAsync(),
			servers: Servers.find({'count_connection_fail': 5, 'is_stoped':false}, 'name').execAsync()
		}).then (function(results){
			if (results.servers.length > 0){
				async.eachSeries(results.servers, function (game_server, next){
					setTimeout(function() {
						if (results.checkdiscord.status === true){
							discordmessages(game_server.name+" may be Offline","16007990",' After several attempts we could not connect to the server  '+game_server.name+' , make sure it is online! If the auto restart plugin is enabled server will be stopped and started soon! For more details visit '+config.website_name+'!');
						}
						next(); // don't forget to execute the callback!
					}, 4000);
				}, function () {
					console.log('Done going through Servers!');
				});
			}			
		}).catch(function(err) {
			console.log("There was an error , plugin check server online: " +err);
		});
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
	function update_playerlist_individual(myserver) {
		var sq = new SourceQuery(1000);
		sq.open(myserver.ip, myserver.port);
		sq.getInfo(function(err, info){  	
			if (!err){
				OnlinePlayers.remove({'server_alias': myserver.name_alias}).execAsync();
				sq.getPlayers(function(err, players){
					if (err){
						console.log(err)
					}else if (players){
						if (players.length > 0){
							async.eachSeries(players, function (player, next){
								setTimeout(function() {
									if (player){
										var newOnlinePlayers = new OnlinePlayers ({
											server_alias: myserver.name_alias,
											player_slot: player.index,
											player_name: player.name,
											player_score: player.score,
											player_timeplayed: player.online,
										});
										newOnlinePlayers.saveAsync()
									}
									next(); // don't forget to execute the callback!
								}, 1000);
							}, function () {
								console.log('Done going through Servers!');
							});
						}
					}
				});
			} else {
				console.log('There was an error - Plugin refresh players list: '+err);
			}
		});
	};

	function updatePlayersFromArray(serverArray){
		return BluebirdPromise.all(serverArray.map(function(singleServer){
			return update_playerlist_individual(singleServer);
		}));
	}
	function update_server_status(req, res, next) {
		BluebirdPromise.props({
			servers: Servers.find({'is_stoped': false}, 'name_alias ip port count_connection_fail').sort({'updatedAt': 1}).execAsync()
		}).then (function(results){
			if (results.servers.length > 0){				
				
				async.eachSeries(results.servers, function (server, next){
					setTimeout(function() {
						var server_id = server.name_alias;
						var server_ip = server.ip;
						var geo = geoip.lookup(server_ip);
						var short_county = geo.country.toLowerCase();
						var country_name = countries.getName(geo.country);
						var sq = new SourceQuery(1000);
						sq.open(server.ip, server.port);
						
						sq.getInfo(function(err, info){
							if (!err){
								//Remove Host(Rounds: 0/0) from alias if it exist on Promod Servers
								if (S(info.name).contains('Round') == true){
									var new_name = info.name.split("Round")[0];
								}else{
									var new_name= info.name
								}

								//Check if we have an image for the current map
								Usermaps.findOne({ 'map_name': info.map }, 'map_name', function (err, mapname) {
									if (err){
										console.log('There was an error in map find on Server Status refresh: '+err);
									} else {
										if (mapname){
											var mapimage = mapname.map_name;
										} else {
											var mapimage = 'no-photo';
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
												server.name = info.name,
												server.slug_name = new_name,
												server.online_players = players_online_slots,
												server.max_players = max_clients.value,
												server.private_clients = private_clients.value,
												server.map_playing = finalMapName(info.map),
												server.gametype = gametype.value,
												server.map_started = mapStartTime.value,
												server.shortversion = shortversion.value,
												server.map_img = mapimage,
												server.country = country_name,
												server.country_shortcode = short_county,
												server.game_name = game_name.value,
												server.count_connection_fail = 0,
												server.is_online = true,
												server.saveAsync()
											} else{
												server.count_connection_fail = server.count_connection_fail+1,
												server.is_online = true,
												server.saveAsync()
											}
										})
									}
								});
							}
						})
						next(); // don't forget to execute the callback!
					}, 4000);
				}, function () {
					console.log('Done going through Servers!');
				});
			}	
		}).catch(function(err) {
			console.log("There was an error , plugin refresh server status: " +err);
		});
	}
	function refreshplayerlist(req, res, next) {
		BluebirdPromise.props({
			servers: Servers.find({'is_stoped': false}, 'name_alias ip port count_connection_fail').sort({}).execAsync()
		}).then (function(results){
			if (results.servers.length > 0){				
				updatePlayersFromArray(results.servers);
			}	
		}).then(function onComplete() {
			//console.log("Players refresh List plugin Completed successfully");
		}).catch(function onError(err) {
			console.log("2. Um...it's not working "+err);
		});
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

module.exports = CronJob;