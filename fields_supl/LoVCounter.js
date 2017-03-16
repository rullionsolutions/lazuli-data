"use strict";

var Data = require("lazuli-data/index.js");


/**
* To represent a set of counters against the items in an LoV
*/
module.exports = Data.Text.clone({
    id: "LoVCounter",
    data_length: 255,
    include_zeros: false,
    sentence_mode: false,
});


module.exports.define("getCountObject", function () {
    var count_obj;
    try {
        count_obj = JSON.parse(this.get());
    } catch (e) {
        count_obj = {};
    }
    return count_obj;
});


module.exports.define("setCountObject", function (count_obj) {
    return this.set(JSON.stringify(count_obj));
});


module.exports.override("getTextFromVal", function () {
    this.getLoV();
    return this.lov.getCountString(this.getCountObject(), this.include_zeros, this.sentence_mode);
});


module.exports.define("getCount", function (item_id) {
    return this.getCountObject()[item_id] || 0;
});

