const mongoose = require('mongoose');
const BluebirdPromise = require("bluebird");
BluebirdPromise.promisifyAll(require("mongoose"));
const Schema = mongoose.Schema;

const ChatRoomsSchema = new Schema({
	sender : {type: Schema.Types.ObjectId, ref: 'User'},
    messages : [
        {
            message : String,
            user :  {type: Schema.Types.ObjectId, ref: 'User'},
            seen : Boolean,
            created_at: { type : Date, default : Date.now}
        }
    ],
    participiants: [{type: Schema.Types.ObjectId, ref: 'User'}],
}, { timestamps: true });

module.exports = mongoose.model('ChatRooms', ChatRoomsSchema);