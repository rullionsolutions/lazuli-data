"use strict";

var Data = require("lazuli-data/index.js");
var UI = require("lazuli-ui/index.js");


/**
* To represent a binary file attachment field
*/
module.exports = Data.Reference.clone({
    id: "File",
    css_type: "file",
    ref_entity: "ac_file",
//    icon: icons/paperclip.png",
    decoration_icon: "<img src='/cdn/icons/paperclip.png' alt=''/>",
//    nav_dropdown_icon: "&#xf4ce;",
    allowed_extensions: "doc,docx,pdf,rtf,txt,xls,xlsx,csv,jpg,png,tif",
    size_limit: "1048576",  // maximum file upload size in Bytes
});


module.exports.define("getDownloadURL", function () {
    return "dyn/" + encodeURIComponent(this.getText()) + "?mode=filedown&id=" + this.get();
});


module.exports.define("makeAccessible", function () {
    var session;
    if (this.isBlank()) {
        return;
    }
    session = this.getSession();
    if (!session.allowed_files) {
        session.allowed_files = {};
    }
    session.allowed_files[this.get()] = true;
});


module.exports.override("appendClientSideProperties", function (obj) {
    obj.allowed_extensions = this.allowed_extensions;
    obj.size_limit = this.size_limit;
    obj.curr_id = this.get();
    obj.curr_file_title = this.getText();
});


module.exports.override("renderNavOptions", function (parent_elem, render_opts) {
    var ul_elem;
    if (this.isBlank()) {
        return 0;
    }
    ul_elem = this.renderDropdownDiv(parent_elem, "nav_" + this.getControl(), "Navigation options for this item");
    ul_elem.makeElement("li").makeElement("a")
//        .attribute("class", "css_open_in_modal")
        .attr("href", UI.pages.get("ac_file_context").getSimpleURL(this.get()))
        .text("Preview");
    ul_elem.makeElement("li").makeElement("a")
        .attr("href", this.getDownloadURL())
        .attr("target", "_blank")
        .text("Download");

    this.makeAccessible();
    return 2;
});


module.exports.override("renderUpdateControls", function (div, render_opts, form_type) {
    this.makeAccessible();
//    div.makeHidden(this.getControl(), this.get());
    div.makeElement("div", "css_file_replace_target").makeInput("file");
});

