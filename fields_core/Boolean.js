"use strict";

var Data = require("lazuli-data/index.js");

/**
* To represent a yes/no field
*/
module.exports = Data.Text.clone({
    id: "Boolean",
    css_type: "boolean",
    search_oper_list: "sy.search_oper_list_boolean",
    auto_search_oper: "",
    data_length: 1,
    // default_val: "N"
});


module.exports.override("resetVal", function () {
    Data.Text.resetVal.call(this);
    this.val = "N";
    this.orig_val = "N";
    this.prev_val = "N";
});


module.exports.define("beforeSet", function (val) {
    if (typeof val !== "string") {
        this.throwError("argument not string: " + this.owner.id + ":" + this.id);
    }
    if (val.length > 1) {
        val = val.substr(0, 1);
    }
    if (val === "") {
        val = "N";
    }
    return val;
});


module.exports.override("setInitial", function (new_val) {
    Data.Text.setInitial.call(this, this.beforeSet(new_val));
});


module.exports.override("set", function (new_val) {
    return Data.Text.set.call(this, this.beforeSet(new_val));
});


/**
* To indicate whether or not this field's value is set 'Y'
* @return True if this field's value is 'Y', false if it is 'N'
*/
module.exports.define("is", function () {
    return (this.get() === "Y");
});


module.exports.defbind("validateBoolean", "validate", function () {
    var val = this.get();
    if (val !== "Y" && val !== "N") {
        this.messages.add({
            type: "E",
            text: "must be Y or N",
        });
    }
});


module.exports.override("getTextFromVal", function () {
    var val = this.get();
    if (val === "Y") {
        val = "yes";
    } else if (val === "N") {
        val = "no";
    }
    return val;
});


module.exports.override("renderUpdateControls", function (div, render_opts, form_type) {
    div.makeCheckbox(this.getControl(), "Y", (this.get() === "Y"));
});


module.exports.override("getFilterField", function (fieldset, spec, suffix) {
    return fieldset.addField({
        id: spec.id + "_filt",
        type: "Option",
        label: spec.base_field.label,
        list: "sy.yesno",
        instance: spec.instance,
    });
});


module.exports.override("generateTestValue", function (session) {
    return (Math.floor(Math.random() * 2) > 1 ? "Y" : "N");
});

