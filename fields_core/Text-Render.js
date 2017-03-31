"use strict";

var Data = require("lazuli-data/index.js");


module.exports = Data.Text;

/**
* To render a <td> element and its content, by calling render(), to be a list cell
* @param the XmlStream object representing the parent tr element to which this td should be
* rendered, and render_opts
* @return the XmlStream object representing the td element
*/
module.exports.define("renderCell", function (row_elem, render_opts) {
    var cell_elem = row_elem.makeElement("td", this.getCellCSSClass());
    return this.renderFormGroup(cell_elem, render_opts, "table-cell");
});


/**
* To get the string of CSS classes to use in HTML class attribute for the table cell
* @return css class string
*/
module.exports.define("getCellCSSClass", function () {
    var css_class = "";
    if (this.css_align) {
        css_class += " css_align_" + this.css_align;
    }
    return css_class;
});


/**
* To render this field as a Twitter-Bootstrap Control Group
* <div class='form-group [css_type_... css_edit css_mand has-error]'
*                                               !! control-group in TB2, form-group in TB3
*   <label for=...>Label Text -- if label should be rendered, i.e.
*   <div class='col..' -- if form-horizontal
*                                               !! .controls in TB2, col-... in TB3
*   <input type=... id=... class='form-control'
*   <p class='help-block'>...
*   </div -- if form-horizontal
* @param the XmlStream object representing the parent element to which this field should be
* rendered, render_opts
* @param form_type, string, one of: "basic", form-horizontal", "form-inline",
* "form-inline-labelless", "table-cell"
* @return the XmlStream object representing the 'div' element created by this function
*/
module.exports.define("renderFormGroup", function (element, render_opts, form_type) {
    var editable = (this.isEditable() && !render_opts.uneditable);
    var div = element.makeElement("div", this.getFormGroupCSSClass(form_type, editable), this.getControl());

    if (form_type !== "table-cell") {
        this.renderLabel(div, render_opts, form_type);
    }
    if (form_type === "form-horizontal") {
//        div = div.makeElement("div", this.getAllWidths(editable));                // TB3
        div = div.makeElement("div", "controls");
    }
    this.renderControl(div, render_opts, form_type);
    return div;
});


/**
* To get the string of CSS classes to use in HTML class attribute for the field
* @return css class string
*/
module.exports.define("getFormGroupCSSClass", function (form_type, editable) {
    var css_class = "form-group css_type_" + this.css_type;      // control-group in TB2, -group in TB3
    if (!this.isValid()) {
        css_class += " has-error";                          // has-error in TB3
    }
    if (this.isEditable()) {
        css_class += " css_edit";
        if (this.mandatory) {
            css_class += " css_mand";
        }
    } else {
        css_class += " css_disp";
    }
    if (!this.visible) {
        css_class += " css_hide";
    }
    if (this.css_reload) {
        css_class += " css_reload";
    }
    if (this.css_richtext) {
        css_class += " css_richtext";
    }
    if (form_type === "basic") {
        css_class += " " + this.getAllWidths(editable);
    }
    // if (form_type === "flexbox") {
    //     css_class += " fb-item-" + this.getFlexboxSize();
    // }
    return css_class;
});


module.exports.define("getAllWidths", function (editable) {
    return this.getWidth("lg", editable) + " " + this.getWidth("md", editable) + " " +
           this.getWidth("sm", editable) + " " + this.getWidth("xs", editable);
});


module.exports.define("getWidth", function (size, editable) {
    return "col-" + size + "-" + this[(editable ? "edit_col_" : "disp_col_") + size];
});


module.exports.define("getFlexboxSize", function () {
    if (this.flexbox_size) {
        return this.flexbox_size;
    }
    if (typeof this.data_length !== "number" || this.data_length >= 255) {
        return 12;
    }
    if (this.data_length >= 124) {
        return 8;
    }
    if (this.data_length >= 80) {
        return 6;
    }
    if (this.data_length >= 20) {
        return 4;
    }
    return 2;
});


/**
* To render the label of this field, with a 'for' attribute to the control, and a tooltip if
* 'description' is given
* @param the XmlStream object representing the parent element to which this field should be
* rendered, and render_opts
* @return the XmlStream object representing the 'label' element created by this function
*/
module.exports.define("renderLabel", function (div, render_opts, form_type) {
    var elmt = div.makeElement("label", this.getLabelCSSClass(form_type));
    elmt.attr("for", this.getControl());
    if (this.description && render_opts.dynamic_page !== false) {
        elmt.makeTooltip(this.hover_text_icon, this.description);
        elmt.text("&nbsp;", true);
    }
    elmt.text(this.label);
    if (render_opts.dynamic_page === false) {
        elmt.text(": ");
    }
    return elmt;
});


module.exports.define("getLabelCSSClass", function (form_type) {
    var css_class = "control-label";
    if (form_type === "form-inline-labelless") {
        css_class += " sr-only";
    }
    if (form_type === "form-horizontal") {                           // TB3
        css_class += " col-lg-2 col-md-2 col-sm-2 col-xs-2";
    }
    return css_class;
});


module.exports.define("renderControl", function (div, render_opts, form_type) {
    if (this.isEditable() && !render_opts.uneditable) {
        this.renderEditable(div, render_opts, form_type);
        this.addClientSideProperties(div, render_opts);
        this.renderErrors(div, render_opts);
    } else {
        this.renderUneditable(div, render_opts);
    }
});


/**
* To render an editable control for this field
* @param the XmlStream object representing the parent div element to which this control should be
* rendered, and render_opts
* @return the XmlStream object representing the control (e.g. input)
*/
module.exports.define("renderEditable", function (div, render_opts, form_type) {
    if (this.input_group_addon_before || this.input_group_addon_after) {
        div = div.makeElement("div", "input-group");              // TB3
        // div = div.makeElement("div", (this.input_group_addon_before ? "input-prepend " : "") +
        // (this.input_group_addon_after ? "input-append " : ""));
    }
    if (this.input_group_addon_before) {
        div.makeElement("div", "input-group-addon").text(this.input_group_addon_before);    // TB3
        // div.makeElement("span", "add-on").text(this.input_group_addon_before);
    }
    this.renderUpdateControls(div, render_opts, form_type);
    if (this.input_group_addon_after) {
        div.makeElement("div", "input-group-addon").text(this.input_group_addon_after);     // TB3
        // div.makeElement("span", "add-on").text(this.input_group_addon_after);
    }
});


module.exports.define("renderUpdateControls", function (div, render_opts, form_type) {
                                                                            // form-control for TB3
    div.makeInput(this.input_type, null, this.getUpdateText(), this.getInputSizeCSSClass(form_type),
        this.placeholder || this.helper_text);
});


module.exports.define("getInputSizeCSSClass", function (form_type) {
    if (form_type === "form-horizontal") {
        return "input-block-level";
    }
    return this.tb_input;
});


/**
 * Possibilities to support:
 * - simple text
 * - text + single link (internal, external, email address)
 * - text + multiple links as drop-down
 * - text with decoration icon (with or without link)
 * - decoration icon instead of text (with or without link) */

/**
* To render an uneditable representation of this field into a parent div element, setting val and
* style attributes first, optionally an anchor link, and text
* @param the XmlStream object representing the parent div element to which this control should be
* rendered, and render_opts
*/
module.exports.define("renderUneditable", function (elem, render_opts) {
    var span_elem = elem.makeElement("span", "form-control-static");
    var url;
    var style;
    var text;
    var nav_options = 0;

    if (!this.validated) {
        this.validate();
    }
    if (this.getText() !== this.val) {
        span_elem.attribute("val", this.val);
    }
    style = this.getUneditableCSSStyle();
    if (style) {
        span_elem.attribute("style", style);
    }
    url = this.getURL();
    text = this.getText();
    if (render_opts.dynamic_page !== false) {
        nav_options = this.renderNavOptions(span_elem, render_opts);
    }
    if (url && !nav_options && render_opts.show_links !== false) {
        span_elem = span_elem.addChild("a");
        span_elem.attribute("href", url);
        if (this.url_target) {
            span_elem.attribute("target", this.url_target);
        }
        if (this.unicode_icon) {
            span_elem.addChild("span", null, this.unicode_icon_class).addText(this.unicode_icon, true);
        } else if (this.button_class) {            // Render URL Field as button
            span_elem.attribute("class", this.button_class);
        }
        if (this.url_link_text && !this.isBlank()) {
            text = this.url_link_text;
        }
    }
    if (text) {
        if (!render_opts.hide_images) {     // CL - Image don't tend to render in excel exports
            if (this.decoration_icon) {     // CL - I think HttpServer.escape renders this useless
                span_elem.addText(this.decoration_icon, true);
            }
//            if (this.icon) {
//                elem.addChild("img")
//                    .attribute("alt", this.icon_alt_text || text)
//                    .attribute("src", this.icon);
//            }
        }
        span_elem.addText(text);
    }
});


/**
* To get the string of a CSS style attribute for this field when uneditable
* @return string CSS style, or null
*/
module.exports.define("getUneditableCSSStyle", function () {
    return null;
});


/**
* Does nothing for most fields; for a Reference field, renders a drop-down set of context
* menu options
* @param the XmlStream object representing the parent div element to which this control should
* be rendered, and render_opts
*/
module.exports.define("renderNavOptions", function (parent_elem, render_opts) {
    return undefined;
});


/**
* To render message text as a span element with a 'help-inline' CSS class
* @param the XmlStream object representing the parent element to which this span should be
* rendered, and render_opts
* @return text
*/
module.exports.define("renderErrors", function (parent_elem, render_opts) {
    // var text,
    //     help_elem;

    if (!this.isValid()) {
        this.messages.renderErrors(parent_elem, render_opts);
        // text = this.messages.getString();
        // help_elem = div.makeElement("span", "help-block").text(text);
        // Log.debug("Error text for field " + this.toString() + " = " + text);
    }
    // return text;
});


// Used in Reference and File
module.exports.define("renderDropdownDiv", function (parent_elem, control, tooltip) {
    var div_elem = parent_elem.makeElement("div", (this.dropdown_button ? "btn-group" : "dropdown"));
//    div_elem = parent_elem.addChild("div", null,
//          (this.nav_dropdown_a_class.indexOf("btn") === -1 ? "dropdown" : "btn-group"));
    if (this.dropdown_button) {
        div_elem.makeDropdownButton(control, this.dropdown_label, this.dropdown_url, tooltip,
            this.dropdown_css_class, this.dropdown_right_align);
    } else {
        div_elem.makeDropdownIcon(control, this.dropdown_label, this.dropdown_url, tooltip,
            this.dropdown_css_class, this.dropdown_right_align);
    }
    return div_elem.makeDropdownUL(control, this.dropdown_right_align);
});
