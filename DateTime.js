"use strict";

var Data = require("lazuli-data/index.js");

/**
* To represent a date/time field
*/
module.exports = Data.Date.clone({
    id: "DateTime",
    css_type: "datetime",
    internal_format: "yyyy-MM-dd HH:mm:ss",
    update_format: "dd/MM/yy HH:mm",
    display_format: "dd/MM/yy HH:mm:ss",
    data_length: 20,
    regex_label1: "not a valid date",                                // client side
    regex_label2: "invalid time, please use the 24 hour clock",      // client side
    // regex_pattern1: "[0-3]?[0-9]/[0-1]?[0-9]/[0-9]{2}",                // client side
    // regex_pattern2: "^([01]?[0-9]|2[0-3]):[0-5][0-9]$",                // client side
    error_message: "not a valid date/time",
});


module.exports.defbind("setFormatsMasks", "cloneInstance", function () {
    this.internal_format_parts = this.internal_format.split(" ");
    if (this.internal_format_parts.length !== 2) {
        this.throwError("invalid internal_format for DateTime: " + this.internal_format);
    }
    this.update_format_parts = this.update_format.split(" ");
    if (this.update_format_parts.length !== 2) {
        this.throwError("invalid update_format for DateTime: " + this.update_format);
    }
    // this. display_format_parts = this. display_format.split(" ");
    // if (this. display_format_parts.length !== 2) {
    //     this.throwError("invalid  display_format for DateTime: " + this. display_format);
    // }
    this.input_mask_parts = this.update_format.replace(/\w/g, "9").split(" ");
    this.regex_pattern1 = "^" + this.update_format_parts[0].replace("dd", "[0-3]?[0-9]").replace("MM", "[0-1]?[0-9]").replace("yy", "[0-9]{2}") + "$";
    this.regex_pattern2 = "^" + this.update_format_parts[1].replace("HH", "([01]?[0-9]|2[0-3])").replace("mm", "[0-5][0-9]").replace("ss", "[0-5][0-9]") + "$";
    this.trace("setFormatsMasks(): " + this.internal_format_parts + ", " + this.update_format_parts);
});

module.exports.override("isBefore", function (date) {
    var nThisSecond = Math.floor(Date.parse(this.get()).getTime() / 1000);
    var nOtherSecond = Math.floor(Date.parse(this.parse(date)).getTime() / 1000);
    return (nThisSecond < nOtherSecond);
});


module.exports.override("isAfter", function (date) {
    var nThisSecond = Math.floor(Date.parse(this.get()).getTime() / 1000);
    var nOtherSecond = Math.floor(Date.parse(this.parse(date)).getTime() / 1000);
    return (nThisSecond > nOtherSecond);
});


module.exports.override("set", function (new_val) {
    this.debug("set() new_val: " + new_val);
    if (new_val === "|") {
        new_val = "";            // this is blank value
    } else {
        new_val = new_val.replace("|", " ");
    }
    return Data.Date.set.call(this, new_val);
});


module.exports.override("appendClientSideProperties", function (obj) {
    Data.Date.appendClientSideProperties.call(this, obj);
    obj.min = this.min ? Date.parse(this.min) : null;
    obj.max = this.max ? Date.parse(this.max) : null;
    obj.regex_label1 = this.regex_label1;
    obj.regex_pattern1 = this.regex_pattern1;
    obj.input_mask1 = this.input_mask_parts[0];
    obj.regex_label2 = this.regex_label2;
    obj.regex_pattern2 = this.regex_pattern2;
    obj.input_mask2 = this.input_mask_parts[1];
});

module.exports.define("getDatePart", function () {
    var val_split = [];
    if (!this.isBlank()) {
        val_split = this.get().split(" ");
    }
    return (val_split.length > 0 ? val_split[0] : "");
});

// module.exports.define("getDatePartDisplay", function () {
//     return this.parse(this.getDatePart(), this.internal_format_parts[0],
//      this.display_format_parts[0]);
// });

module.exports.define("getDatePartUpdate", function () {
    return this.parse(this.getDatePart(), this.internal_format_parts[0],
        this.update_format_parts[0]);
});

module.exports.define("getTimePart", function () {
    var val_split = [];
    if (!this.isBlank()) {
        val_split = this.get().split(" ");
    }
    if (val_split.length > 1) {
        return val_split[1];
    } else if (val_split.length > 0 && val_split[0]) {
        return "00:00:00";
    }
    return "";
});

// module.exports.define("getTimePartDisplay", function () {
//     return this.parse(this.getTimePart(), this.internal_format_parts[1],
//      this.display_format_parts[1]);
// });

module.exports.define("getTimePartUpdate", function () {
    return this.parse(this.getTimePart(), this.internal_format_parts[1],
        this.update_format_parts[1]);
});

module.exports.override("renderUpdateControls", function (div) {
    div.makeInput("text", null, this.getDatePartUpdate(), "css_date_part input-mini", this.update_format_parts[0]);
    div.makeInput("text", null, this.getTimePartUpdate(), "css_time_part input-mini", this.update_format_parts[1]);
});
