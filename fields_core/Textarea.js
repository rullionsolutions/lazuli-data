"use strict";

var Core = require("lapis-core/index.js");
var Data = require("lazuli-data/index.js");
var IO = require("lazuli-io/index.js");

/**
* To represent a multi-line text block field
*/
module.exports = Data.Text.clone({
    id: "Textarea",
    css_type: "textarea",
    detokenize_content: false,
    separate_row_in_form: true,
    rows: 5,
    tb_span: 12,
    tb_input_list: "input-lg",
//    update_length         : 80,
    data_length: -1,        // Ignore in Text.validate()
    db_type: "B",
    image_root_path: "olht/",
    video_root_path: "olht/",
    doc_root_path: "olht/",
    video_width: 848,
    video_height: 551,
    flexbox_size: 12,
});


module.exports.override("set", function (new_val) {
    if (typeof new_val !== "string") {
        this.throwError("argument not string: " + this.owner.id + ":" + this.id);
    }
    if (this.css_richtext) {
        new_val = new_val.replace(/<br class="aloha-cleanme">/g, "");
    }
    new_val = new_val.replace(IO.XmlStream.left_bracket_regex, "").replace(IO.XmlStream.right_bracket_regex, "");
    return Data.Text.set.call(this, new_val);
});


module.exports.override("renderUpdateControls", function (div, render_opts, form_type) {
    if (this.css_richtext && render_opts.enable_aloha !== false) {
        div.makeElement("div", "css_richtext_target").text(this.val, true);        // true = don't escape markup
    } else {
        div.makeElement("textarea", this.getInputSizeCSSClass(form_type))
            .attr("rows", this.rows.toFixed(0))
            .text(this.val);
    }
});


module.exports.override("renderUneditable", function (elem, render_opts, inside_table) {
    var div_elem = elem.makeElement("div", "form-control-static");
    var style = this.getUneditableCSSStyle();

    if (!this.validated) {
        this.validate();
    }
    if (style) {
        div_elem.attribute("style", style);
    }
    if (this.getText()) {
        div_elem.text(this.getText(), this.css_richtext);        // don't escape markup if richtext
    }
});


module.exports.override("getTextFromVal", function () {
    this.trace("detokenizing textarea: " + this.id + "? " + this.detokenize_content);
    if (this.detokenize_content) {
        return this.detokenize(this.val);
    }
    return this.val;
});


module.exports.define("replaceToken_image", function (tokens) {
    return IO.XmlStream.left_bracket_subst + "img src='" + this.image_root_path + this[tokens[1]] + "' /" + IO.XmlStream.right_bracket_subst;
});


module.exports.define("replaceToken_video", function (tokens) {
//    this.allow_video = true;
    return IO.XmlStream.left_bracket_subst + "object width='" + this.video_width + "' height='" + this.video_height + "'" +
        IO.XmlStream.left_bracket_subst + "codebase='https://download.macromedia.com/pub/shockwave/cabs/flash/swflash.cab#version=9,0,0,28;'" + IO.XmlStream.right_bracket_subst +
        IO.XmlStream.left_bracket_subst + "param name='movie' value='" + this.video_root_path + tokens[1] + "'" + IO.XmlStream.right_bracket_subst +
        IO.XmlStream.left_bracket_subst + "param name='quality' value='high'" + IO.XmlStream.right_bracket_subst +
        IO.XmlStream.left_bracket_subst + "param name='bgcolor' value='#FFFFFF'" + IO.XmlStream.right_bracket_subst +
        IO.XmlStream.left_bracket_subst + "embed src='" + this.video_root_path + tokens[1] + "' quality='high' bgcolor='#FFFFFF' " +
            "width='" + this.video_width + "' height='" + this.video_height + "' type='application/x-shockwave-flash' " +
            "pluginspage='https://www.macromedia.com/shockwave/download/index.cgi?P1_Prod_Version=ShockwaveFlash'" + IO.XmlStream.right_bracket_subst +
        IO.XmlStream.left_bracket_subst + "/embed" + IO.XmlStream.right_bracket_subst +
        IO.XmlStream.left_bracket_subst + "/object" + IO.XmlStream.right_bracket_subst;
});


module.exports.override("getFilterField", function (fieldset, spec, suffix) {
    return fieldset.addField({
        id: spec.id + "_filt",
        type: "Text",
        label: spec.base_field.label,
    });
});


module.exports.override("generateTestValue", function (session) {
    var val = Core.Format.getRandomString(1500);
    return val;
});
