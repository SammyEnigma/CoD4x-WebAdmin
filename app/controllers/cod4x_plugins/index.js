const fs = require('fs');
const mongoose = require('mongoose');
const uniqueString = require('unique-string');
const busboyBodyParser = require('busboy-body-parser');
const S = require('string');
const parse = require('urlencoded-body-parser');
const BluebirdPromise = require('bluebird');
const escapeStringRegexp = require('escape-string-regexp');
const sanitize = require('mongo-sanitize');
const anglicize = require('anglicize');
const Servers = require("../../models/servers");
const ServerScreenshots = require("../../models/server_new_screenshots");

module.exports = {

	//Screenshotsender plugin, reciving the screenshot from the game server

	getServerScreenshots:  function(req, res, next) {
		Servers.findOne({'screenshot_identkey': req.params.screenshot_identkey},function(error, serverfoundresult){	
			if (!error){
				if (serverfoundresult){
				//Create the screenshots directory if it dont exist
				if (!fs.existsSync('./public/img/screenshots')){
					fs.mkdirSync('./public/img/screenshots');
				}
				//Parse the post data		
					if (!req.body.identkey){	
						return res.status(400).send('status=invalid_inputparamters');
					}
					if (req.body.identkey !== serverfoundresult.screenshot_identkey){
						return res.status(400).send('status=invalid_identkey');
					}
					if (req.body.identkey == "ChangeMe"){
						return res.status(400).send('status=change_default_identkey');
					}
					if (!req.body.command){
						return res.status(400).send('status=invalid_inputparamters');
					}
					else{
						if (req.body.command.toString() == "HELO"){
							if (!req.body.gamename && !req.body.gamedir){
								return res.status(400).send('Error: Empty gamename or gamedir value');
							} else if (!req.body.serverport){
								return res.status(400).send('Error: Empty serverip or serverport value');
							} else if (!req.body.rcon){
								return res.status(400).send('Error: Empty rcon value');
							} else {
								return res.status(200).send('status=okay');
							}	
						} else if (req.body.command.toString() == "submitshot") {
							if (!req.body.serverport && !results.data){
								return res.status(400).send('Error: Empty serverport or data value');
							} else {
								if (req.body.data){
									imgdata = req.body.data.toString();
									//create some unique name for db store
									var img_name = uniqueString();
									//Parse the buf for data
									var buf = Buffer.from(imgdata, 'base64');
									var getstartpoint = buf.lastIndexOf("CoD4X")+6;//find
									var startfromhere = buf.toString().substring(getstartpoint); //start from here
									var data = S(startfromhere).splitRight('\0');
									//var hostname = data[0];
									var map = data[1];
									var playername2 = sanitize(data[2]);
									var playername3 = anglicize(playername2);
									var playername = playername3.replace(/\uFFFD/g, '');
									var guid = data[3];
									var shotnum = data[4];
									var time = data[5];

									//Saving data to db
									var newServerScreenshot = new ServerScreenshots ({
										player_name:playername,
										player_guid:guid,
										map_name:map,
										screenshot_img: '/img/screenshots/'+img_name+'.jpg',
										get_server: serverfoundresult._id
									});

									newServerScreenshot.saveAsync()

									//Moving the screenshot to desired path
									fs.writeFile('./public/img/screenshots/'+img_name+'.jpg', buf, function (err) {
										if (err){
											console.log(err);
										}
									});
									return res.status(200).send('status=success');
							

								}else{
									return res.status(400).send('status=failure');
								}
							}	
						} else {
							return res.status(400).send('status=invalid_command');
						}
					}
				} else {
					console.log('Server not found, no server with that screenshot identkey, check the link in your server.cfg file, nehoscreenshot_url should be in a form: https://mywebsite.com/screenshot_identkey/screenshots');
				}
			} else {
				console.log('Error is here: '+error);
			}
		});	
	}

};
