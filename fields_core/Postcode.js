"use strict";

var Core = require("lapis-core/index.js");
var Data = require("lazuli-data/index.js");


/**
* To represent a UK postcode field
*/
module.exports = Data.Text.clone({
    id: "Postcode",
    data_length: 10,
    regex_pattern: "^(GIR ?0AA|[A-PR-UWYZ]([0-9]{1,2}|([A-HK-Y][0-9]([0-9ABEHMNPRV-Y])?)|[0-9][A-HJKPS-UW]) ?[0-9][ABD-HJLNP-UW-Z]{2})$",
    regex_label: "not a valid UK postcode",
    search_oper_list: "sy.search_oper_list_radius",
    auto_search_oper: "LT",
    search_filter: "RadiusFilter",
    url_pattern: "http://google.com/maps?q={val}",
    url_target: "_blank",
    before_validation: "toUpperCase",
});


module.exports.override("appendClientSideProperties", function (obj) {
    Data.Text.appendClientSideProperties.call(this, obj);
    obj.extd_filter_oper = "LT";
});


module.exports.define("getDistrict", function (val) {
    var match;
    if (!val) {
        val = this.get();
    }
    val = Core.Format.trim(val);
    match = val.match(/^[A-Z]{1,2}[0-9]{1,2}/);
    if (match && match.length > 0) {
        return match[0];
    }
    return "";
});


module.exports.override("generateTestValue", function (session) {
    return Core.Format.getRandomString(2, "ABCDEFGHKLMNOPRSTUWY") + Core.Format.getRandomNumber(9) + " " +
        Core.Format.getRandomNumber(9) + Core.Format.getRandomString(2, "ABDEFGHJLNOPQRSTUWXYZ");
});


module.exports.override("getFilterField", function (fieldset, spec, suffix) {
    return fieldset.cloneField(spec.base_field, {
        id: spec.id + "_filt",
        editable: true,
        mandatory: false,
        css_reload: false,
        instance: spec.instance,
        regex_pattern: "^[A-Z]{1,2}[0-9]{1,2}",
    });
});


module.exports.override("set", function (new_val) {
    var old_val = this.get();
    var changed = this.setInternal(new_val.toUpperCase());
    if (changed) {
        this.trace("setting " + this.getId() + " from '" + old_val + "' to '" + new_val + "'");
    }
    return changed;
});
