const mongoose = require('mongoose');
const moment = require('moment');
const csrf = require('csurf');
const formatNum = require('format-num');
const sm = require('sitemap');
const BluebirdPromise = require('bluebird');
const User = require("../../models/user");
const Notifications = require("../../models/notifications");
const Globalnotifications = require("../../models/global_notifications");
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

	getMessage: function(req, res, next) {
		var userslist = [{path:'participiants', select:'local.avatar_60 local.user_name id'}, {path:'messages', select:'message meta'}];
		BluebirdPromise.props({
			chatroom: ChatRooms.findOne({'_id': req.params.id}).populate(userslist).execAsync(),
			chatslist: ChatRooms.find({'participiants': req.user.id}).populate(userslist).execAsync()
		}).then (function(results){
			//console.log(results);
			res.render('frontpage/messages/index.pug', {title: 'Messages', results:results, csrfToken: req.csrfToken()});
		}).catch (function(err){
			console.log(err);
			res.redirect('back');
		});
	},


	InsertNewChatroom: function(req, res, next) {
		ChatRooms.findOne({'participiants.user': req.user.id, 'participiants.user': req.params.id}).execAsync()
		.then (function(results){
			if (results > 0){
				console.log('Chat Room already exist we just redirect to that chatroom');
				res.redirect('/messages/'+results._id);
			}else{
				console.log('Chat Room do not exist we create 1 and after that we redirect to it the user');
				var korisnici = [req.user._id, req.params.id];
				var newChatRooms = new ChatRooms ({
					sender: req.user._id,
					participiants: korisnici
				});

				newChatRooms.saveAsync()

				if (newChatRooms){

					console.log('Chat Room created redirect to the new chat room the user');
					res.redirect('/messages/'+newChatRooms.id);

				}else{

					console.log('There was an error, chat room not saved');
					res.redirect('back');
				}
			}
  		}).catch(function(err) {
			console.log("There was an error" +err);
			req.flash('error_messages', 'There was an error, please try again or Contact the script Owner');
			res.redirect('/user/profile');
		});
	},

	InsertNewMessage: function(req, res, next) {
		var newMsg = { 'message': req.body.message, 'user': req.user.id, 'seen':false, "$position": 0 };
		ChatRooms.update({'_id':req.params.id},{$push:{'messages':newMsg}},function(err){
			if (err){
				console.log(err);
				res.redirect('back');
			}else{
				res.redirect('back');
			}
		});
	},
};
