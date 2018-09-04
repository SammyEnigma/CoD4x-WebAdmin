const mongoose = require('mongoose');
const BluebirdPromise = require("bluebird");
BluebirdPromise.promisifyAll(require("mongoose"));
const Schema = mongoose.Schema;
const slug = require('mongoose-slug-generator');

mongoose.plugin(slug);

const SupportSchema = new Schema({
    category:  { type: String},
    category_alias:   { type: String, slug: "category" },
    question:  { type: String, unique: true},
    answer: { type: String},
}, { timestamps: true });

module.exports = mongoose.model('Support', SupportSchema);
