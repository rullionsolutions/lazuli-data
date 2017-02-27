"use strict";

var Core = require("lapis-core/index.js");
var Data = require("lazuli-data/index.js");

/**
* Represent an amount of time - either a period of time, or a start or end time in a day
* store as a Number (of minutes), display and update as HH:MM
*/
module.exports = Data.Number.clone({
    id: "Time",
    css_type: "time",
    css_align: "center",
    placeholder: "HH:MM",
    input_mask: "99:99",
// isn't working properly on client-side
//    regex_pattern         : "([0-1][0-9]|2[0-3]):([0-5][0-9])",
    regex_label: "Not a valid time",
    tb_input_list: "input-small",
});

/**
* To attempt to parse a given time string
* @param A time string
* @return Number of minutes
*/
module.exports.define("parse", function (str) {
    var hours;
    var minutes;
    var parts;

    if (typeof str !== "string" || str.indexOf(":") === -1) {
        return str;
    }
    parts = str.split(":");
    if (parts.length < 2) {
        return str;
    }
    hours = parseInt(parts[0], 10);
    if (isNaN(hours) || hours < 0 || hours > 23) {
        return str;
    }
    minutes = parseInt(parts[1], 10);
    if (isNaN(minutes) || minutes < 0 || minutes > 59) {
        return str;
    }
    return (hours * 60) + minutes;
});


module.exports.override("set", function (new_val) {
    new_val = String(this.parse(new_val));
    return Data.Number.set.call(this, new_val);
});


module.exports.override("format", function (time) {
    var hours = Math.floor(time / 60);
    var minutes = time - (60 * hours);

    if (typeof time !== "number" || isNaN(time)) {
        return "";
    }
    return (hours < 10 ? "0" : "") + hours + ":" + (minutes < 10 ? "0" : "") + Math.floor(minutes);
});


module.exports.defbind("validateTime", "validate", function () {
    var time = parseInt(this.get(), 10);
    // Only do special validation if non-blank and valid
    if (time.toFixed(0) === this.get()) {
        this.text = this.format(time);
        if (this.min && time < this.parse(this.min)) {
            this.messages.add({
                type: "E",
                text: "below minimum value: " + this.min,
            });
        }
        if (this.max && time > this.parse(this.max)) {
            this.messages.add({
                type: "E",
                text: "above maximum value: " + this.max,
            });
        }
    } else if (!this.isBlank()) {
        this.messages.add({
            type: "E",
            text: this.regex_label,
        });
    }
});


module.exports.override("getTextFromVal", function () {
    this.text = "";
    this.validate();
    return this.text;
});


module.exports.override("getUpdateText", function () {
    return this.getText();
});


module.exports.override("generateTestValue", function (min, max) {
    var i;
    min = this.parse(min || this.min || "2000-01-01");
    max = this.parse(max || this.max || "2019-12-31");
    i = Math.floor(Math.random() * Core.Format.daysBetween(min, max));
//    return Lib.formatDate(Lib.addDays(min, i));
    return Core.Format.addDays(min, i).format(this.internal_format);
});
