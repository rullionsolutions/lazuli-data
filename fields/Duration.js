"use strict";

var Core = require("lapis-core/index.js");
var Data = require("lazuli-data/index.js");


/**
* To represent a field for a calendar period - a number of days, weeks or months
*/
module.exports = Data.Text.clone({
    id: "Duration",
    css_type: "duration",
    data_length: 20,
    list: "sy.duration",
    default_period: "weeks",
});


module.exports.define("getParts", function (val) {
    var parts;
    var out = {};

    if (!val) {
        val = this.get();
    }
    parts = val.match(/^([0-9]*)(.*)/);
    if (parts && parts.length >= 2) {
        out.number = parseInt(parts[1], 10);
        if (isNaN(out.number)) {
            delete out.number;
        }
    }
    if (parts && parts.length >= 3) {
        out.period = Core.Format.trim(parts[2]);
    }
    return out;
});


module.exports.define("getWorkingDays", function (val) {
    var parts = this.getParts(val);
    if (typeof parts.number !== "number") {
        return 0;
    }
    if (parts.period === "days") {        // days means 'working days'
        return parts.number;
    }
    if (parts.period === "weeks") {
        return parts.number * 5;
    }
    if (parts.period === "months") {
        return parts.number * 20;
    }
    return 0;
});


module.exports.define("dateAdd", function (date, val) {
    var parts = this.getParts(val);
    if (typeof parts.number === "number" && typeof parts.period === "string") {
        if (parts.period === "days") {
            date.add("w", parts.number);            // days means 'week days'
        } else if (parts.period === "weeks") {
            date.add("d", parts.number * 7);
        } else if (parts.period === "months") {
            date.add("M", parts.number);
        }
    }
    return date;
});


module.exports.override("set", function (new_val) {
    new_val = new_val.replace(/\|/, "");                // remove '|' char, the field delimiter
    return Data.Text.set.call(this, new_val);
});


module.exports.define("getPeriodBetween", function (date1, date2, form, inclusivity) {
    var out = "";
    if (date1) {
        out = date1.periodBetween(date2, form, inclusivity);
    }
    this.debug("getPeriodBetween(" + date1 + ", " + date2 + " = " + out);
    return out;
});


module.exports.define("setPeriodBetween", function (date1, date2, form, inclusivity) {
    return this.set(this.getPeriodBetween(date1, date2, form, inclusivity));
});


module.exports.defbind("validateDuration", "validate", function () {
    var val = this.get();
    var parts;

    if (val) {
        parts = this.getParts(val);
        if (typeof parts.number !== "number") {
            this.messages.add({
                type: "E",
                text: "number part is required",
            });
        }
        if (!this.lov) {
            this.lov = Data.LoV.getListLoV(this.list);
        }
        if (parts.period) {
            if (this.lov.getItem(parts.period)) {
                this.text = parts.number + " " + this.lov.getItem(parts.period).label;
            } else {
                this.messages.add({
                    type: "E",
                    text: parts.period + " is not a valid word for a period",
                });
            }
        } else {
            parts.period = this.default_period;
            this.val += this.default_period;
//            this.raiseError("period part is required");
        }
        if (typeof this["max_" + parts.period] === "number" && parts.number > this["max_" + parts.period]) {
            this.messages.add({
                type: "E",
                text: "maximum period for " + parts.period + " is " + this["max_" + parts.period],
            });
        }
        if (typeof this["min_" + parts.period] === "number" && parts.number < this["min_" + parts.period]) {
            this.messages.add({
                type: "E",
                text: "minimum period for " + parts.period + " is " + this["min_" + parts.period],
            });
        }
    }
});


module.exports.override("getTextFromVal", function () {
    this.text = "";
    this.validate();
    return this.text;
});


module.exports.override("renderUpdateControls", function (div, render_opts, form_type) {
    var parts = this.getParts();
    div.makeInput("text", null, (typeof parts.number === "number" ? String(parts.number) : ""));
    if (!this.lov) {
        this.lov = Data.LoV.getListLoV(this.list);
    }
    this.lov.renderRadio(div, render_opts, parts.period, this.getControl(), this.css_class,
        this.mandatory);
});
