"use strict";

var Core = require("lapis-core/index.js");
var Data = require("lazuli-data/index.js");


module.exports = Data.Text.clone({
    id: "NINumber",
    data_length: 9,
    css_reload: true,           // field must reload
    gender_list: "rm.gender",
    ni_regex_pattern: "^[A-CEGHJ-PR-TW-Z]{1}[A-CEGHJ-NPR-TW-Z]{1}[0-9]{6}[A-DFM]{0,1}$",
    regex_label: "must be a valid UK NI number",
});


module.exports.defbind("setupGenderLov", "cloneInstance", function () {
    var undisclosed_item;
    this.gender_lov = Data.LoV.getListLoV(this.gender_list);
    undisclosed_item = this.gender_lov.getItem("ZZ");
    if (undisclosed_item) {
        undisclosed_item.active = false;
    }
    this.real_ni_number = true;            // to begin with
});


module.exports.defbind("setWhetherRealNI", "setInitial", function () {
    var val = this.get();
    var date;
    if (val.indexOf("TN") === 0) {
        this.real_ni_number = false;            // first 2 letters TN indicate temp number
        date = Date.parseString(val.substr(2, 6), "ddMMyy");
        if (date) {
            this.unknown_ni_date = date.format("dd/MM/yy");
        }
        this.unknown_ni_gender = val.substr(8, 1);
    }
});


module.exports.defbind("validateTempNI", "validate", function () {
    var val = this.get();
    if (val.indexOf("TN") === 0) {
        if (val.length === 2) {
            this.messages.add({
                type: "E",
                text: "date and gender both required",
            });
        } else if (val.length === 3) {
            this.messages.add({
                type: "E",
                text: "date also required",
            });
        } else if (val.length === 8) {
            this.messages.add({
                type: "E",
                text: "gender also required",
            });
        }
    }
});


module.exports.override("setFromParamValue", function (str) {
    var parts = str.split("|");
    var new_val;
    var orig_use_real_ni_number = this.real_ni_number;
    this.real_ni_number = !(parts[parts.length - 1] === "Y");
    if (this.real_ni_number !== orig_use_real_ni_number) {
        new_val = "";
    } else if (this.real_ni_number) {
        new_val = parts[0];
    } else {
        new_val = "TN";
        if (parts.length > 1) {
            this.unknown_ni_date = parts[0];
            new_val += parts[0].replace(/\//g, "");
        }
        if (parts.length > 2) {
            this.unknown_ni_gender = parts[1];
            new_val += parts[1];
        }
    }
    this.set(new_val);
});


module.exports.override("appendClientSideProperties", function (obj) {
    if (this.real_ni_number) {         // only use the regex if attempting NI number input
        this.regex_pattern = this.ni_regex_pattern;
    } else {
        this.regex_pattern = null;
    }
    Data.Text.appendClientSideProperties.call(this, obj);
    if (this.real_ni_number) {
        obj.min_parts_expected = 2;
        obj.max_parts_expected = 2;
    } else {
        obj.min_parts_expected = 4;
        obj.max_parts_expected = 4;
        obj.data_length = 12;       // accommodate 8-char date, plus the other two fields
    }
});


module.exports.override("renderUpdateControls", function (div, render_opts, form_type) {
    if (this.real_ni_number) {
        div.makeInput("text", null, this.getUpdateText(),
            this.getInputSizeCSSClass(form_type),
            this.placeholder || this.helper_text);
    } else {
        div.makeInput("text", null, this.unknown_ni_date, "form-control", "dd/MM/yy")
            .attr("style", "display: inline; width: 100px;");
        this.gender_lov.renderRadio(div, render_opts, this.unknown_ni_gender, "form-control",
            true, true);
    }
    div.makeElement("span").text("use Temporary NI Number:");
    div.makeCheckbox("is_unknown", "Y", !this.real_ni_number);
});


module.exports.override("generateTestValue", function (session) {
    return "AB" + Core.Format.getRandomString(6, "0123456789") + "C";
});
