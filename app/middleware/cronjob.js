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
const fs = require('fs');
const S = require('string');
const moment = require('moment');
const DiscordWebhook = require("discord-webhooks");
const SSH = require('simple-ssh');
const config = require('../config/config');
const Plugins = require("../models/plugins");
const Bans = require("../models/bans");
const Servers = require("../models/servers");
const OnlinePlayers = require("../models/online_players");
const Systemlogs = require("../models/system_logs");
const Adminactions = require("../models/admin_actions");

	var now = new Date();
	var current_time = new moment().format("H");

	// ################################ Check CoD4xWebadmin version on Github page ################################ //
	var job = schedule.scheduleJob('0 0 1 * * *', function(){
		check_cod4_xwebadmin_version();
	});

	// ################################ Check CoD4x Server version on Github page ################################ //
	var job1 = schedule.scheduleJob('0 0 1 * * *', function(){
		get_cod4x_latest_version();
	});

	// ################################ Plugin Refresh Server Status ################################ //
	BluebirdPromise.props({
		refresh_server_status: Plugins.findOne({'name_alias' : 'refresh-server-status', 'status': true}, 'status cron_job_time_intervals').execAsync()
	}).then (function(results){
		if (results.refresh_server_status){
			var job2 = schedule.scheduleJob('*/'+results.refresh_server_status.cron_job_time_intervals+' * * * *', function(){
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
			var job3 = schedule.scheduleJob('*/'+results.server_status.cron_job_time_intervals+' * * * *', function(){
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
			var job4 = schedule.scheduleJob('0 35 1 * * *', function(){
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


	// ################################ Plugin remove Old Admin Actions from the website ################################ //
	BluebirdPromise.props({
		remove_old_admin_actions: Plugins.findOne({'name_alias' : 'remove-old-admin-actions', 'status': true}, 'status cron_job_time_intervals').execAsync()
	}).then (function(results){
		if (results.remove_old_admin_actions){
			var rmadminactions = schedule.scheduleJob('0 1 1 * * *', function(){
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
			var job5 = schedule.scheduleJob('*/'+results.check_server_online.cron_job_time_intervals+' * * * *', function(){
				check_if_server_is_online();
			});
		}
	}).catch(function(err) {
		console.log("There was an error Plugin check server Online: " +err);
	});

	// ################################ Stop server every day at X hours ################################ //
	BluebirdPromise.props({
		servers: Servers.find({'auto_restart_server' : true, 'time_to_restart_server': current_time, 'external_ip':false, 'is_stoped': false}).execAsync()
	}).then (function(results){
		if (results.servers.length > 0){
			var ssh = new SSH({
				host: config.ssh_access.host,
				user: config.ssh_access.user,
				pass: config.ssh_access.password,
				baseDir: config.cod4_server_plugin.servers_root
			});
			results.servers.forEach(function (server){
				if (server){
					var stopserver_job = schedule.scheduleJob('0 0 '+server.time_to_restart_server+' * * *', function(){
						ssh.exec('cd '+config.cod4_server_plugin.servers_root+'/cod4-'+server.port+' && screen -X -S cod4-'+server.port+' quit && kill $(lsof -t -i:'+server.port+')', {
							out: console.log.bind(console)
						}).start();
					});
					Servers.findOneAndUpdate({ "_id": server._id }, { "$set": {
						'count_connection_fail': 0,
						'is_stoped': true,
						'is_online': false
					}}).exec(function(err, done){
						if(err) {
							console.log(err);
						}
					});
					var newSystemlogs = new Systemlogs ({
						logline: server.name+' stopped (Auto Restart Server)',
						successed: true
					});
					newSystemlogs.saveAsync()
				}
			})
		}
	}).catch(function(err) {
		console.log("There was an error in plugin auto restart servers: " +err);
	});

	// Start server every day at X hours + 2min (Part of stop server every day at X hours)
	BluebirdPromise.props({
		servers: Servers.find({'auto_restart_server' : true, 'time_to_restart_server': current_time, 'external_ip':false, 'is_stoped': true}).execAsync(),
		plugin: Plugins.findOne({'name_alias': 'cod4x-authtoken', 'status':true}).execAsync()
	}).then (function(results){
		if (results.servers.length > 0){
			var ssh = new SSH({
				host: config.ssh_access.host,
				user: config.ssh_access.user,
				pass: config.ssh_access.password,
				baseDir: config.cod4_server_plugin.servers_root
			});
			results.servers.forEach(function (server){
				if (server){
					//Check if we use cod4x authtoken
					if (results.plugin){
						var startline = includecod4authtoken(server.script_starter, 'set sv_authtoken "'+results.plugin.extra_field+'" +exec server.cfg');
					}else {
						var startline = server.script_starter;
					}
					var startserver_job = schedule.scheduleJob('0 2 '+server.time_to_restart_server+' * * *', function(){
						ssh.exec('cd '+config.cod4_server_plugin.servers_root+'/cod4-'+server.port+' && /usr/bin/screen -dmS cod4-' +server.port+ ' ' +startline, {
							out: function(stdout) {
			        			console.log(stdout);
			    			}
						}).start();
					});
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
						logline: server.name+' started (Auto Restart Server)',
						successed: true
					});
					newSystemlogs.saveAsync()
				}
			})
		}
	}).catch(function(err) {
		console.log("There was an error in plugin auto restart servers: " +err);
	});

	// ################################ Stop server/remove screen session on server crash ################################ //
	BluebirdPromise.props({
		servers: Servers.find({'auto_restart_server_on_crash' : true, 'is_stoped': false, 'external_ip':false, 'count_connection_fail': {$gte: 3}}).execAsync()
	}).then (function(results){
		if (results.servers.length > 0){
			var ssh = new SSH({
				host: config.ssh_access.host,
				user: config.ssh_access.user,
				pass: config.ssh_access.password,
				baseDir: config.cod4_server_plugin.servers_root
			});
			var sq = new SourceQuery(1000);
			results.servers.forEach(function (server){
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
							var stopserveroncrash_job = schedule.scheduleJob('*/3 * * * *', function(){
								ssh.exec('cd '+config.cod4_server_plugin.servers_root+'/cod4-'+server.port+' && screen -X -S cod4-'+server.port+' quit && kill $(lsof -t -i:'+server.port+')', {
									out: console.log.bind(console)
								}).start();
							});
							Servers.findOneAndUpdate({ "_id": server._id }, { "$set": {
								'count_connection_fail': 3,
								'is_stoped': true,
								'is_online': false
							}}).exec(function(err, done){
								if(err) {
									console.log(err);
								}
							});
							var newSystemlogs = new Systemlogs ({
								logline: server.name+' stopped (Auto Restart on Server Crash)',
								successed: true
							});
							newSystemlogs.saveAsync()
						}
					});
				}
			})
		}
	}).catch(function(err) {
		console.log("There was an error in plugin auto restart servers: " +err);
	});

	// Start server after it crashed + 2min (Part of server crashed and stopped)
	BluebirdPromise.props({
		servers: Servers.find({'auto_restart_server_on_crash' : true, 'external_ip':false, 'count_connection_fail': {$gte: 3}, 'is_stoped':true}).execAsync(),
		plugin: Plugins.findOne({'name_alias': 'cod4x-authtoken', 'status':true}).execAsync()
	}).then (function(results){
		if (results.servers.length > 0){
			var ssh = new SSH({
				host: config.ssh_access.host,
				user: config.ssh_access.user,
				pass: config.ssh_access.password,
				baseDir: config.cod4_server_plugin.servers_root
			});
			results.servers.forEach(function (server){
				if (server){
					//Check if we use cod4x authtoken
					if (results.plugin){
						var startline = includecod4authtoken(server.script_starter, 'set sv_authtoken "'+results.plugin.extra_field+'" +exec server.cfg');
					}else {
						var startline = server.script_starter;
					}
					var startserver_job = schedule.scheduleJob('*/5 * * * *', function(){
						ssh.exec('cd '+config.cod4_server_plugin.servers_root+'/cod4-'+server.port+' && /usr/bin/screen -dmS cod4-' +server.port+ ' ' +startline, {
							out: function(stdout) {
			        			console.log(stdout);
			    			}
						}).start();
					});

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
						logline: server.name+' started (Auto Restart on Server Crash)',
						successed: true
					});
					newSystemlogs.saveAsync()
				}
			})
		}
	}).catch(function(err) {
		console.log("There was an error in plugin auto restart servers: " +err);
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
						//console.log(github_results.version);
						var myversion = 'v'+obj.version;
						Appversion.findOneAsync({name:'CoD4x-WebAdmin'})
						.then (function(result){
							result.local_version = myversion,
							result.github_version = github_results.tag_name,
							result.saveAsync()
						}).catch(function(err) {
							console.log("There was an error in GitHub version check plugin: " +err);
						});
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
					if ( typeof github_results !== 'undefined' && github_results){
						//console.log(github_results);
						Cod4xversion.findOneAsync({name:'CoD4x-Server'})
						.then (function(result){
							result.prerelease = github_results.prerelease,
							result.github_version = github_results.tag_name,
							result.saveAsync()
						}).catch(function(err) {
							console.log("There was an error in GitHub version check plugin: " +err);
						});
					}else{
						console.log('Could not get the latest version from github');
					}
				}
		})
	}
	function check_if_server_is_online(req, res, next) {
		BluebirdPromise.props({
			checkdiscord: Plugins.findOne({'category': 'discord'}, 'status').execAsync(),
			servers: Servers.find({'count_connection_fail': { $gte: 3}, 'is_online':false, 'is_stoped':false}).execAsync()
		}).then (function(results){
			if (results.servers.length > 0){
				results.servers.forEach(function (game_server, done){
				if (results.checkdiscord.status === true){
					discordmessages(game_server.name+" may be Offline","16007990",' After several attempts we could not connect to the server  '+game_server.name+' , make sure it is online! If the auto restart plugin is enabled server will be stopped and started soon! For more details visit '+config.website_name+'!');
				}
			}, function allDone (err) {
				if (err){
					console.log('There was an error in plugin Check if Server is Online: '+err);
				} else {
					console.log('job done');
				}		    
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
							players.forEach(function (player){
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
							})
						}
					}
				});
			} else {
				console.log('There was an error - Plugin refresh players list '+err);
			}
		});
	};
	function update_servers_individual(myserver) {
		var server_id = myserver.name_alias;
		var server_ip = myserver.ip;
		var geo = geoip.lookup(server_ip);
		var short_county = geo.country.toLowerCase();
		var sq = new SourceQuery(3000);
		sq.open(myserver.ip, myserver.port);
		sq.getInfo(function(err, info){
			if (err){
				console.log(err);
			}else{
				//Remove Host(Rounds: 0/0) from alias if it exist on Promod Servers
				if (S(info.name).contains('Round') == true){
					var new_name = info.name.split("Round")[0];
				}else{
					var new_name= info.name
				}

				Servers.findOneAndUpdate({ "_id": myserver._id }, { "$set": {
					'name':info.name,
					'online_players': info.players+'/'+info.maxplayers,
					'map_playing': finalMapName(info.map),
					'map_img': info.map,
					'slug_name': new_name}}).exec(function(err, done){
					if(err) {
						console.log(err);
					}
				});
			}			    
		})			
		sq.getRules(function(error, rules){
			if(!error){
				var private_clients = search("sv_privateClients", rules);
				var max_clients = search("sv_maxclients", rules);
				var location = search("_Location", rules);
				var game_name = search("gamename", rules);
				var gametype = search("g_gametype", rules);
				var mapStartTime = search("g_mapStartTime", rules);
				var shortversion = search("shortversion", rules);

				Servers.findOneAndUpdate({ "_id": myserver._id }, { "$set": {
					'max_players':max_clients.value,
					'private_clients': private_clients.value,
					'gametype': gametype.value,
					'map_started': mapStartTime.value,
					'shortversion': shortversion.value,
					'country': location.value,
					'country_shortcode': short_county,
					'game_name': game_name.value,
					'count_connection_fail': 0,
					'is_online': true
				}}).exec(function(err, done){
					if(err) {
						console.log(err);
					}
				});
			} else {
				console.log('Something went wrong '+error)
				Servers.findOneAndUpdate({ "_id": myserver._id }, { "$set": {
					'is_online': false,
					'count_connection_fail': myserver.count_connection_fail+1
				}}).exec(function(err, done){
					if(err) {
						console.log(err);
					}
				});
			}
		})
	};
	function updateServersFromArray(serverArray){
		return BluebirdPromise.all(serverArray.map(function(singleServer){
			return update_servers_individual(singleServer);
		}));
	}
	function updatePlayersFromArray(serverArray){
		return BluebirdPromise.all(serverArray.map(function(singleServer){
			return update_playerlist_individual(singleServer);
		}));
	}
	function update_server_status(req, res, next) {
		BluebirdPromise.props({
			servers: Servers.find({}).sort({'updatedAt': 1}).execAsync()
		}).then (function(results){
			if (results.servers){				
				updateServersFromArray(results.servers);
			}	
		}).then(function onComplete() {
			//console.log("Servers status update Completed successfully");
		}).catch(function onError(err) {
			console.log("Um...it's not working "+err);
		});
	}
	function refreshplayerlist(req, res, next) {
		BluebirdPromise.props({
			servers: Servers.find({}).sort({}).execAsync()
		}).then (function(results){
			if (results.servers){				
				updatePlayersFromArray(results.servers);
			}	
		}).then(function onComplete() {
			//console.log("Players refresh List plugin Completed successfully");
		}).catch(function onError(err) {
			console.log("Um...it's not working "+err);
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

module.exports = CronJob;