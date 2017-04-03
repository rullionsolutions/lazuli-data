"use strict";

var Core = require("lapis-core/index.js");
var Data = require("lazuli-data/index.js");

/**
* To represent a date field
*/
module.exports = Data.Text.clone({
    id: "Date",
    css_type: "date",
    search_oper_list: "sy.search_oper_list_scalar",
    auto_search_oper: "EQ",
    search_filter: "ScalarFilter",
    internal_format: "yyyy-MM-dd",
    update_format: "dd/MM/yy",
    display_format: "dd/MM/yy",
    input_mask: "99/99/99",
    regex_label: "Not a valid date",
    data_length: 10,
//    update_length: 8,
//    tb_span: 2,
    tb_input: "input-sm",
    week_start_day: 0,            // 0 = Sun, 1 = Mon, etc
    error_message: "not a valid date",
});


module.exports.override("getUpdateText", function () {
    return this.getText();
});


module.exports.define("getDBDateFormat", function (format) {
    return format
        .replace("HH", "%H")
        .replace("mm", "%i")
        .replace("ss", "%s")
        .replace("dd", "%z")      // %z - not used by MySQL - holding char
        .replace("MM", "%m")
        .replace("yyyy", "%Y")
        .replace("d", "%e")
        .replace("M", "%c")
        .replace("yy", "%y")
        .replace("%z", "%d");
});


module.exports.override("getDBTextExpr", function (alias) {
    return "DATE_FORMAT(" + (alias ? alias + "." : "") + this.id + ", '" + this.getDBDateFormat(this.display_format) + "')";
});


/**
* To attempt to parse a given date (or date/time) string, using given in/out formats if supplied,
* and applying any 'adjusters'
* @param A date string, with optional 'adjusters', separated by '+' chars, e.g. 'week-start',
* 'month-end', '2months', '-3minutes', numbers interpreted as days; 2nd arg is optional string input
* format, 3rd arg is optional string out format
* @return Converted date string (if conversion could be performed), otherwise returns the input
* string
*/
module.exports.define("parse", function (val, in_format, out_format) {
    in_format = in_format || this.internal_format;
    out_format = out_format || this.internal_format;
    return Core.Format.parseDateExpression(val, in_format, out_format);
});


/**
* Syntactic sugar - equivalent to this.parse(val, this.internal_format, this.display_format)
* @param A date string, with optional 'adjusters', separated by '+' chars, e.g. 'week-start',
*   'month-end', '2months', '-3minutes', numbers interpreted as days; 2nd arg is optional string
*   input format, 3rd arg is optional string out format
* @return Converted date string (if conversion could be performed) in usual display format,
*   otherwise returns the input string
*/
module.exports.define("parseDisplay", function (val) {
    return this.parse(val, this.internal_format, this.display_format);
});


/**
* To obtain a JavaScript date object representing the value of this field
* @return A JavaScript date object corresponding to this field's value - note that changes to it
*   do NOT update the value of the field
*/
module.exports.define("getDate", function () {
    return this.internal_date;
});


/**
* To indicate whether or not the date (or date/time) argument is before this field's value
* @param Date string
* @return True if this field's value represents a point in time before the date argument
*/
module.exports.define("isBefore", function (date) {
    if (typeof date === "string") {
        date = Core.Format.parseDateExpressionToDate(date);
    }
    if (!this.internal_date || !date) {
        return false;
    }
    return this.internal_date.isBefore(date);
});


/**
* To indicate whether or not the date (or date/time) argument is after this field's value
* @param Date string
* @return True if this field's value represents a point in time after the date argument
*/
module.exports.define("isAfter", function (date) {
    if (typeof date === "string") {
        date = Core.Format.parseDateExpressionToDate(date);
    }
    if (!this.internal_date || !date) {
        return false;
    }
    return this.internal_date.isAfter(date);
});


module.exports.define("beforeSet", function (val) {
    this.trace("beforeSet() start: " + val);
    if (!val || val === "|") {
        val = "";
    } else if (typeof val === "object" && typeof val.getFullYear === "function") {
        val = val.format(this.internal_format);
    } else if (typeof val === "string") {
        try {
            val = Core.Format.parseDateExpression(val, this.internal_format,
                this.internal_format);
        } catch (e) {
            this.debug(e);
        }
    }
    this.trace("beforeSet() end: " + val);
    return val;
});


module.exports.override("setFromParamValue", function (str) {
    try {
        str = str.replace(/\|/g, " ");
        str = Core.Format.parseDateExpression(str, this.update_format, this.internal_format);
    } catch (e) {
        this.debug(e);
    }
    this.set(str);
});


module.exports.override("setInitial", function (new_val) {
    Data.Text.setInitial.call(this, this.beforeSet(new_val));
});


module.exports.override("set", function (new_val) {
    return Data.Text.set.call(this, this.beforeSet(new_val));
});


module.exports.defbind("setInternalDate", "afterChange", function () {
    this.internal_date = Date.parseString(this.get(), this.internal_format);
    this.trace("setInternalDate(): " + this.internal_date);
});


module.exports.defbind("setInitialInternalDate", "setInitial", function () {
    this.setInternalDate();
});


module.exports.defbind("validateDate", "validate", function () {
    if (this.val) {                // Only do special validation if non-blank
        if (!this.internal_date) {          // temp fix - I don't know why this isn't already
            this.setInternalDate();         // set whenever required - try again...
        }
        if (this.internal_date) {
            if (this.min && this.val < this.parse(this.min)) {
                this.messages.add({
                    type: "E",
                    text: "earlier than minimum value: " + this.parseDisplay(this.min),
                });
            }
            if (this.max && this.val > this.parse(this.max)) {
                this.messages.add({
                    type: "E",
                    text: "later than maximum value: " + this.parseDisplay(this.max),
                });
            }
        } else {            // not a valid date
            this.messages.add({
                type: "E",
                text: this.error_message,
            });
        }
    }
});


module.exports.override("getTextFromVal", function () {
    if (this.internal_date) {
        return this.internal_date.format(this.display_format);
    }
    return this.get();
});


module.exports.override("appendClientSideProperties", function (obj) {
    Data.Text.appendClientSideProperties.call(this, obj);
    obj.min = this.min ? Date.parse(this.min) : null;
    obj.max = this.max ? Date.parse(this.max) : null;
});


module.exports.override("generateTestValue", function (session, min, max) {
    var i;
    min = Date.parse(min || this.min || "2000-01-01");
    max = Date.parse(max || this.max || "2019-12-31");
    i = Math.floor(Math.random() * min.daysBetween(max));
//    return Lib.formatDate(Lib.addDays(min, i));
    return min.add("d", i).format(this.internal_format);
});

