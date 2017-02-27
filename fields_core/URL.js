"use strict";

var Data = require("lazuli-data/index.js");

/**
* To represent a web link field
*/
module.exports = Data.Text.clone({
    id: "URL",
    css_type: "url",
    url_pattern: "{val}",           // set url_pattern to "mailto:{val}" for email address fields
    url_expected: "external",       // prefix with http:// if not already
    url_target: "_blank",           // open in new browser window
//    text_pattern    : "",         // show icon only, not the text of the URL
});
