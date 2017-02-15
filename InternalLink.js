"use strict";

var Data = require("lazuli-data/index.js");

/**
* To represent an internal link field, to appear same as a Reference field without drop-down nav options
*/
module.exports = Data.Text.clone({
    id              : "InternalLink",
    css_type        : "url",
    url_pattern     : "{val}",          // set url_pattern to "mailto:{val}" for email address fields
    url_expected    : "internal",       // prefix with http:// if not already
    text_pattern    : ""                // show icon only, not the text of the URL
});
