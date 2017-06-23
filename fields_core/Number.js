/* global java */

"use strict";

var Core = require("lapis-core/index.js");
var Data = require("lazuli-data/index.js");
var SQL = require("lazuli-sql/index.js");

/**
* To represent a decimal number field
*/
module.exports = Data.Text.clone({
    id: "Number",
    css_type: "number",
    css_align: "right",
    search_oper_list: "sy.search_oper_list_scalar",
    auto_search_oper: "EQ",
    search_filter: "ScalarFilter",
    decimal_digits: 0,
    data_length: 20,    // Has to be to pass Text.validate(),
                        // which must be called to set validated to true
//    tb_span: 2,
    tb_input: "input-mini",
    db_type: "I",
    db_int_type: "INT",
    min: 0,           // prevent negatives by default
    min_message: "{{val}} is lower than minimum value: {{min}}",
    soft_min_message: "{{val}} is lower than minimum value: {{min}}",
    max_message: "{{val}} is higher than minimum value: {{max}}",
    soft_max_message: "{{val}} is higher than minimum value: {{max}}",
    flexbox_size: 2,
//    update_length: 10
});


module.exports.define("obfuscateNumber", function () {
    return "FLOOR(RAND() * " + ((this.max || 100000) * Math.pow(10, this.decimal_digits)) + ")";
});


module.exports.override("set", function (new_val) {
    if (typeof new_val === "number") {
        new_val = String(new_val);
    }
    new_val = new_val.replace(/,/g, "");
    return Data.Text.set.call(this, new_val);
});


module.exports.define("setRounded", function (new_val) {
    return this.set(this.round(new_val));
});

module.exports.define("getBoundMessage", function () {
    var type;
    var message;
    var number_val = Core.Format.parseStrictNumber(this.val);

    if (typeof this.max === "number" && !isNaN(this.max) && number_val > this.max) {
        type = "E";
        message = this.max_message
            .replace("{{max}}", this.max);
    } else if (typeof this.soft_max === "number" && !isNaN(this.soft_max) && number_val > this.soft_max) {
        type = "W";
        message = this.soft_max_message
            .replace("{{max}}", this.soft_max);
    } else if (typeof this.min === "number" && !isNaN(this.min) && number_val < this.min) {
        type = "E";
        message = this.min_message
            .replace("{{min}}", this.min);
    } else if (typeof this.soft_min === "number" && !isNaN(this.soft_min) && number_val < this.soft_min) {
        type = "W";
        message = this.soft_min_message
            .replace("{{min}}", this.soft_min);
    } else {
        return undefined;
    }
    message = message.replace("{{val}}", this.val)

    return {
        type: type,
        text: message,
        cli_side_revalidate: true,
    };
});


module.exports.defbind("validateNumber", "validate", function () {
    var number_val;
    var decimals = 0;
    var message;

    if (this.val) {
        try {
            number_val = Core.Format.parseStrictNumber(this.val);
            this.val = String(number_val);
            decimals = (this.val.indexOf(".") === -1) ? 0 : this.val.length - this.val.indexOf(".") - 1;
            if (decimals > this.decimal_digits) {
                this.messages.add({
                    type: "E",
                    text: this.val + " is more decimal places than the " + this.decimal_digits + " allowed for this field",
                });
//            } else {
//                this.val = this.val + Lib.repeat("0", this.decimal_digits - decimals);
            }
        } catch (e) {
            this.messages.add({
                type: "E",
                text: e.toString(),
                cli_side_revalidate: true,
            });
        }

        this.trace("Validating " + this.toString() + ", val: " + this.val + ", decimal_digits: " + this.decimal_digits +
            ", number_val: " + number_val);
        if (this.isValid()) {
            message = this.getBoundMessage();
            if (this.message) {
                this.messages.add(message);
            }
        }
    }
});


module.exports.override("getTextFromVal", function () {
    var val = this.get();
    var number_val;

    try {
        number_val = Core.Format.parseStrictNumber(val);
        val = this.format(number_val);
    } catch (ignore) {
        this.trace(ignore);
    }
    return val;
});


module.exports.override("appendClientSideProperties", function (obj) {
    Data.Text.appendClientSideProperties.call(this, obj);
    obj.min = this.min;
    obj.min_message = this.min_message;
    obj.max = this.max;
    obj.max_message = this.max_message;
    obj.soft_min = this.soft_min;
    obj.soft_min_message = this.soft_min_message;
    obj.soft_max = this.soft_max;
    obj.soft_max_message = this.soft_max_message;
    obj.decimal_digits = this.decimal_digits;
    obj.extd_filter_oper = "BT";
});


module.exports.define("format", function (number_val) {
    if (this.display_format) {
        return String((new java.text.DecimalFormat(this.display_format)).format(number_val));
    }
    return number_val.toFixed(this.decimal_digits);
});


module.exports.define("round", function (number) {
    if (typeof number !== "number") {
        number = this.getNumber(0);
    }
    return parseFloat(number.toFixed(this.decimal_digits), 10);
});


module.exports.override("getConditionValue", function () {
    var val_text = this.val;
    if (this.val && !isNaN(this.val)) {
        val_text = (this.getNumber() * Math.pow(10, this.decimal_digits)).toFixed(0);
    }
    return val_text;
});


module.exports.override("copyFromQuery", function (query, column_id) {
    var val;
    var column = query.getColumn(column_id || this.query_column);
    if (!column) {
        this.throwError("no column found");
    }
    val = column.getNumber("");

    this.debug("copyFromQuery(): " + (column_id || this.query_column) + " val: " + val);
    if (typeof val === "number" && !isNaN(val)) {
        this.setInitial(String(val / Math.pow(10, this.decimal_digits || 0)));
    }
});


module.exports.override("getSQL", function () {
    return SQL.Connection.escape(this.getConditionValue(), this.getDataLength());
});


module.exports.override("setFromResultSet", function (resultset) {
    var value;
    if (!this.query_column) {
        return;
    }
    try {
        value = String(resultset.getString(this.query_column || this.getId()));
    } catch (e) {
        this.throwError("sql get failed");
    }
    if (value === "null") {
        value = "";
    } else if (!isNaN(value)) {
        value = String(parseInt(value, 10) / Math.pow(10, this.decimal_digits));
    }

    this.trace("setFromResultSet[" + this.query_column + "] setting to " + value);
    this.setInitial(value);
});


module.exports.override("generateTestValue", function (session, max, min) {
    var temp;
    if (typeof min !== "number") {
        min = this.min || 0;
    }
    if (typeof max !== "number") {
        max = this.max || 999999;
    }
    if (max < min) {
        this.throwError("max less than min");
    }
    temp = Math.random() * (max - min) * Math.pow(10, this.decimal_digits);
    temp = (Math.floor(temp) / Math.pow(10, this.decimal_digits)) + min;
    return parseFloat(temp.toFixed(this.decimal_digits), 10);
});

