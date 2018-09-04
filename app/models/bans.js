const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate');
const BluebirdPromise = require("bluebird");
BluebirdPromise.promisifyAll(require("mongoose"));
const Schema = mongoose.Schema;
const slug = require('mongoose-slug-generator');

mongoose.plugin(slug);

const BansSchema = new Schema({    
    player_name:  { type: String},
    player_name_alias: { type: String, slug: "player_name" },
    player_guid:  { type: String},
    player_screenshot: { type: String},
    admin_message:  { type: String},
    rcon_command: { type: String, default:'Permban'},
    rcon_server: {type: Schema.Types.ObjectId, ref: 'Servers'},
    rcon_admin: {type: Schema.Types.ObjectId, ref: 'User'},
    cheater_reporter:  { type: String},
    cheater_reporter_id:  {type: Schema.Types.ObjectId, ref: 'User'},
    comments: [{type: Schema.Types.ObjectId, ref: 'Bancomments'}],
    likes: [{type: Schema.Types.ObjectId, ref: 'User'}],
    unban_request_denied: { type: Boolean},
}, { timestamps: true });
BansSchema.plugin(mongoosePaginate);
module.exports = mongoose.model('Bans', BansSchema);
