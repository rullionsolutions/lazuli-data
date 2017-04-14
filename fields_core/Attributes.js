"use strict";

var Data = require("lazuli-data/index.js");

/**
* To represent a multi-valued field with options from an LoV
*/
module.exports = Data.Text.clone({
    id: "Attributes",
    css_type: "attributes",
    search_oper_list: "sy.search_oper_list_attr",
    auto_search_oper: "AN",
    render_items_inline: true,
});


module.exports.override("set", function (new_val) {
    if (new_val && new_val.substr(0, 1) !== "|") {        // if being updated from a form control,
        new_val = "|" + new_val;                          // the value is in the form 'x|y|z'
    }
    if (new_val && new_val.substr(new_val.length - 1) !== "|") {        // it needs to be wrapped in |s at beginning and end
        new_val += "|";
    }
    return this.setInternal(new_val);
});


/**
* To indicate whether or not a given item is set in this multi-value attributes field
* @param item_id (string) which should be an id of one of the records in the LoV for this field
* @return true if the given LoV item is selected, or false otherwise
*/
module.exports.define("isItem", function (item_id) {
    return (("|" + this.val + "|").indexOf("|" + item_id + "|") > -1);
});


/**
* To set/change the given item in this multi-value attributes field
* @param item_id (string) of the item to be changed, and the value (boolean) to set it to
* @return true if the item's value is changed, and false if it remains the same
*/
module.exports.define("setItem", function (item_id, bool) {
    var val = this.get();
    var present = (val.indexOf("|" + item_id + "|") > -1);
    if ((!bool && !present) || (bool && present)) {
        return false;
    }
    if (bool) {    // !present
        val = val ? (val + item_id + "|") : "|" + item_id + "|";
    } else {            // !bool && present
        val = val.replace(new RegExp("\\|" + item_id + "\\|"), "|");
    }
    if (val === "|") {
        val = "";
    }
    this.setInternal(val);
    return true;
});


module.exports.define("itemsTicked", function () {
    return this.get().split(/\|/).length - 2;
});


module.exports.defbind("validateAttributes", "validate", function () {
    var item;
    var val = this.get();
    var pieces;
    var that = this;
    var delim = "";

    this.getLoV();
    if (!this.lov) {
        this.messages.add({
            type: "E",
            text: "no lov found",
        });
    } else if (val) {                // Only do special validation is non-blank
        pieces = val.split(/\|/);
        this.text = "";
        Object.keys(pieces).forEach(function (i) {
            if (pieces[i]) {
                item = that.lov.getItem(pieces[i]);
                that.trace("validate .. " + i + ", " + pieces[i] + ", " + item);
                if (item) {
                    that.text += delim + item.label;
                    if (!item.active) {
                        that.messages.add({
                            type: "E",
                            text: "option is inactive: " + item.label,
                        });
                    }
                } else {
                    that.text += delim + "[unknown: " + pieces[i] + "]";
                    that.messages.add({
                        type: "E",
                        text: "invalid option: " + pieces[i],
                    });
                    that.debug("invalid option: " + pieces[i]);
                }
                delim = ", ";
            }
        });
    }
});


module.exports.override("getTextFromVal", function () {
    this.text = "";
    this.validate();
    return this.text;
});


module.exports.override("renderUpdateControls", function (div, render_opts, form_type) {
    var pieces = this.get().split(/\|/);
    this.getLoV();
    if (!this.lov) {
        this.throwError("no lov found");
    }
    this.lov.renderMulti(div, render_opts, this.getControl(), pieces, null,
        this.render_items_inline);
});


module.exports.override("generateTestValue", function (session) {
    var out = "|";
    var i;
    var lov = Data.LoV.getListLoV(this.list);
    if (!lov) {
        this.throwError("unknown lov");
    }
    for (i = 0; i < lov.length(); i += 1) {
        if (Math.random() > 0.5) {
            out += lov.get(i).id + "|";
        }
    }
    return out;
});

