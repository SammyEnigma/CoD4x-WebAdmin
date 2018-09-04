// load the things we need
const mongoose = require('mongoose');
const BluebirdPromise = require("bluebird");
BluebirdPromise.promisifyAll(require("mongoose"));
const bcrypt   = require('bcrypt-nodejs');
const Schema = mongoose.Schema;

// define the schema for our user model
const userSchema = new Schema({
    local : {
        email : { type: String, unique: true, sparse: true},
        user_name : String,
        password : String,
        avatar_60 : {type: String, default: '/img/avatars/default-60.jpg'},
        avatar_512 : {type: String, default: '/img/avatars/default-512.jpg'},
        user_role : {type: Number, default: 1},
        admin_on_servers: [{type: Schema.Types.ObjectId, ref: 'Servers'}],
        block_user : { type: Boolean, default: false },
        is_online : { type: Boolean, default: false }
    },
    facebook : {
        id : String,
        token : String,
        email : String,
        name : String
    },
    twitter : {
        id : String,
        token : String,
        displayName  : String,
        username : String
    },
    steam : {
        id : String,
        displayName  : String,
        username : String,
        profileurl : String
    },
    google : {
        id : String,
        token : String,
        email : String,
        name : String
    },
    socketio : {
        socket_id : String,
        is_online : { type: Boolean, default: false }
    }
}, { timestamps: true });

// generating a hash
userSchema.methods.generateHash = function(password) {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(10), null);
};

// checking if password is valid
userSchema.methods.validPassword = function(password) {
    return bcrypt.compareSync(password, this.local.password);
};

// create the model for users and expose it to our app
module.exports = mongoose.model('User', userSchema);
