"use strict";

var Data = require("lazuli-data/index.js");


/**
* To represent a button
*/
module.exports = Data.Text.clone({
    id: "ContextButton",
    css_type: "url",
    label: "",                  // Mainly just the column heading
    url_pattern: "{val}",       // set url_pattern to "mailto:{val}" for email address fields
    text_pattern: "",           // show icon only, not the text of the URL
    sql_function: "NULL",       // not stored in db!
});


module.exports.override("renderUneditable", function (elem, render_opts) {
    var style;

    if (!this.validated) {
        this.validate();
    }
    if (this.getText() !== this.val) {
        elem.attribute("val", this.val);
    }
    style = this.getUneditableCSSStyle();
    if (style) {
        elem.attribute("style", style);
    }
    if (!this.url) {
        this.getURL();
    }
    if (this.url && render_opts.show_links !== false) {
        elem.makeElement("a")
            .attr("class", "btn btn-mini")       // removed css_open_in_modal
            .attr("href", this.url)
            .text(this.btn_label, true);
    }
});

/*
module.exports.override("getURLFromVal", function () {
    var page,
        key,
        url;

    if (this.page_id) {
        page = Page.getPage(this.page_id);
        if (this.page_key && this.owner) {
            key = this.owner.detokenize(this.page_key);
        }
        url = page.getSimpleURL(key);
//        url = "modal?page_id=" + this.page_id + (key ? "&page_key=" + key : "");
    } else if (this.url_pattern) {
        url = this.detokenize(this.url_pattern);
    }
    try {
        if (this.allowedURL(url)) {
            return url;
        }
    } catch (ignore) {}        // Assume is page_not_found exception
});
*/
