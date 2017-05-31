"use strict";

var Data = require("lazuli-data/index.js");


/**
* To represent a button
*/
module.exports = Data.Text.clone({
    id: "ContextButton",
    css_type: "url",
    editable: false,            // no reason to be editable...
    label: "",                  // Mainly just the column heading
    tb_size: "xs",
    // default_val: "#",
    btn_css_class: null,
    url_pattern: "{val}",       // set url_pattern to "mailto:{val}" for email address fields
    text_pattern: "",           // show icon only, not the text of the URL
    sql_function: "NULL",       // not stored in db!
});


module.exports.override("isVisible", function (field_group, hide_blank_uneditable) {
    return this.visible && (this.accessible !== false)
            && (!field_group || field_group === this.field_group)
            && (!this.hide_if_no_link || this.getURL());
});


module.exports.override("renderControl", function (div_elmt, render_opts, form_type) {
    var style;
    var anchor_elmt;
    if (!this.validated) {
        this.validate();
    }
    if (this.getText() !== this.val && this.val) {
        div_elmt.attr("val", this.val);
    }
    style = this.getUneditableCSSStyle();
    if (style) {
        div_elmt.attr("style", style);
    }
    if (!this.url) {
        this.getURL();
    }
    if (render_opts.show_links === false) {
        return;
    }
    if (this.css_cmd || this.url) {
        anchor_elmt = div_elmt.makeElement("a")
            .attr("class", this.getButtonCSSClass());
        if (this.url) {
            anchor_elmt.attr("href", this.url);
        }
        if (this.css_cmd) {
            anchor_elmt.attr("id", this.getControl());
        }
        if (this.label) {
            anchor_elmt.attr("title", this.label);
        }
        anchor_elmt.text(this.btn_label, true);
    }
});


module.exports.define("getButtonCSSClass", function () {
    var css_class = "btn btn-default btn-" + this.tb_size;
    if (this.btn_css_class) {
        css_class += " " + this.btn_css_class;
    }
    if (this.css_cmd) {
        css_class += " css_cmd";
    }
    return css_class;
});
