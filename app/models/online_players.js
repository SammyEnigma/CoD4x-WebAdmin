const mongoose = require('mongoose');
const BluebirdPromise = require("bluebird");
BluebirdPromise.promisifyAll(require("mongoose"));
const Schema = mongoose.Schema;

const OnlinePlayersSchema = new Schema({
    server: {type: Schema.Types.ObjectId, ref: 'Servers'},
    server_alias : {type: String},
    player_slot:  { type: String},
    player_name: { type: String},
    player_score:  { type: String},
    player_timeplayed:  { type: String},
    player_ip:  { type: String},
    player_country:  { type: String},
    player_steam_id:  { type: String},
    player_kills:  { type: String},
    player_deaths:  { type: String},
    player_assists:  { type: String},
    player_ping:  { type: String},
    player_team:  { type: String},
    player_team_name:  { type: String}
}, { timestamps: true });

module.exports = mongoose.model('OnlinePlayers', OnlinePlayersSchema);
