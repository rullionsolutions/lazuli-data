"use strict";

var Data = require("lazuli-data/index.js");

/**
* To represent a single-valued option field, supported by an LoV
*/
module.exports = Data.Text.clone({
    id: "Option",
    css_type: "dropdown",
    search_oper_list: "sy.search_oper_list_option",
    auto_search_oper: "EQ",
    unknown_label: "[unknown]: ",
//    tb_span: 2,
    tb_input_list: "input-sm",
    data_length: 10,
    flexbox_size: 4,
    render_radio: true,         // set field to be radio buttons by default...
    render_items_inline: true,
    allow_unchanged_inactive_value: true,
});


module.exports.defbind("validateOption", "validate", function () {
    var item;
    var val = this.get();

    try {
        this.getLoV();
    } catch (e) {
        this.report(e);
        this.messages.add({
            type: "E",
            text: "error with lov",
        });
        return;
    }
    if (!this.lov) {
        this.messages.add({
            type: "E",
            text: "no lov found",
        });
    } else if (val) {                // Only do special validation is non-blank
        item = this.lov.getItem(val);
        if (item) {
            this.text = item.label;
        } else {
            this.text = this.unknown_label + val;
            this.messages.add({
                type: "E",
                text: "invalid option: " + val,
            });
            this.debug("invalid option: " + val);
        }
    }
});


module.exports.override("getCSSType", function () {
    return (this.render_radio ? "radio_buttons" : this.css_type);
});


module.exports.override("getTextFromVal", function () {
    this.text = "";
    this.validate();
    return this.text;
});


module.exports.override("appendClientSideProperties", function (obj) {
    Data.Text.appendClientSideProperties.call(this, obj);
    if (this.lov && this.render_radio) {
        obj.min_parts_expected = this.lov.getTotalActiveItems() + (this.mandatory ? 0 : 1);
        obj.max_parts_expected = this.lov.getTotalActiveItems() + (this.mandatory ? 0 : 1);
    }
});


module.exports.override("renderUpdateControls", function (div, render_opts, form_type) {
    var css_class = "";
    try {
        this.getLoV();
    } catch (ignore) {
        return;
    }
    if (this.lov) {
        if (!this.lov.complete) {
            this.lov.reloadComplete();
        }
        if (this.render_radio) {
            this.lov.renderRadio(div, render_opts, this.val, this.getControl(), css_class,
                this.mandatory, this.render_items_inline);
        } else {
            css_class = this.getInputSizeCSSClass(form_type); /* TB£: "form-control" */
            this.lov.renderDropdown(div, render_opts, this.val, this.getControl(), css_class,
                this.mandatory);
        }
    }
});


module.exports.override("getDBTextExpr", function (alias) {
    return "(SELECT ZI.text FROM sy_list_item ZI WHERE ZI.list = '" + this.list + "' AND ZI.id = " +
        (alias ? alias + (this.sql_function ? "_" : ".") : "") + this.id + ")";
});


module.exports.override("addColumnToTable", function (query_table, col_spec) {
    var column = Data.Text.addColumnToTable.call(this, query_table, col_spec);
    if (this.list) {
        column.order_term = "(SELECT ZI.seq_number FROM sy_list_item ZI WHERE ZI.list = '" + this.list + "' AND ZI.id = " +
            query_table.alias + (this.sql_function ? "_" : ".") + this.id + ")";
    }
    return column;
});


module.exports.override("getFilterField", function (fieldset, spec, suffix) {
    return fieldset.cloneField(spec.base_field, {
        id: spec.id + "_filt",
        editable: true,
        mandatory: false,
        css_reload: false,
        instance: spec.instance,
        render_radio: false,            // show filter fields as drop-downs
    });
});


module.exports.override("generateTestValue", function (session) {
    var i;
    var lov = Data.LoV.getListLoV(this.list);
    if (!lov || lov.length() === 0) {
        return "";
    }
    i = Math.floor(Math.random() * lov.length());
    if (!lov.get(i)) {
        this.throwError("Invalid LoV item: " + i + " for field " + this);
    }
    return lov.get(i).id;
});
