"use strict";

var Core = require("lapis-core/index.js");
var Data = require("lazuli-data/index.js");


module.exports = Data.Text.clone({
    id: "NINumber",
    data_length: 9,
    css_reload: true,           // field must reload
    gender_list: "rm.gender",
    regex_pattern: "^[A-CEGHJ-PR-TW-Z]{1}[A-CEGHJ-NPR-TW-Z]{1}[0-9]{6}[A-DFM]{0,1}$",
    regex_label: "must be a valid UK NI number",
});


module.exports.defbind("setupGenderLov", "cloneInstance", function () {
    var undisclosed_item;
    this.gender_lov = Data.LoV.getListLoV(this.gender_list);
    undisclosed_item = this.gender_lov.getItem("ZZ");
    if (undisclosed_item) {
        undisclosed_item.active = false;
    }
    this.attempting_ni_input = true;            // to begin with
});


module.exports.override("appendClientSideProperties", function (obj) {
    Data.Text.appendClientSideProperties.call(this, obj);
    if (this.attempting_ni_input) {
        obj.min_parts_expected = 2;
        obj.max_parts_expected = 2;
    } else {
        obj.min_parts_expected = 4;
        obj.max_parts_expected = 4;
    }
});


module.exports.override("renderUpdateControls", function (div, render_opts, form_type) {
    if (this.attempting_ni_input) {
        div.makeInput("text", null, this.getUpdateText(),
            this.getInputSizeCSSClass(form_type),
            this.placeholder || this.helper_text);
    } else {
        div.makeInput("text", null, this.unknown_ni_date, "form-control", "dd/MM/yy")
            .attr("style", "display: inline; width: 100px;");
        this.gender_lov.renderRadio(div, render_opts, this.unknown_ni_gender, "form-control",
            true, true);
    }
    div.makeElement("span").text("if NI is unknown:");
    div.makeCheckbox("is_unknown", "Y", !this.attempting_ni_input);
});


module.exports.override("setFromParamValue", function (str) {
    var parts = str.split("|");
    var new_val = "";
    if (this.attempting_ni_input) {
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
    this.attempting_ni_input = !(parts[parts.length - 1] === "Y");
    this.set(new_val);
});


module.exports.override("generateTestValue", function (session) {
    return "AB" + Core.Format.getRandomString(6, "0123456789") + "C";
});
