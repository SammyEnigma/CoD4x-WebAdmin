const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate');
const BluebirdPromise = require("bluebird");
BluebirdPromise.promisifyAll(require("mongoose"));
const Schema = mongoose.Schema;
const slug = require('mongoose-slug-generator');

mongoose.plugin(slug);

const UnbansSchema = new Schema({    
    player_name:  { type: String},
    player_guid:  { type: String},
    rcon_command: { type: String, default:'Unban'},
    rcon_server: {type: Schema.Types.ObjectId, ref: 'Servers'},
    rcon_admin: {type: Schema.Types.ObjectId, ref: 'User'},
    seen: [{type: Schema.Types.ObjectId, ref: 'User'}]
}, { timestamps: true });
UnbansSchema.plugin(mongoosePaginate);
module.exports = mongoose.model('Unbans', UnbansSchema);
