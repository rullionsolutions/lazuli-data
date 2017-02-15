"use strict";

var Core = require("lapis-core/index.js");
var Data = require("lazuli-data/index.js");


/**
* To represent an email address field
*/
module.exports = Data.Text.clone({
    id: "Email",
    css_type: "email",
    input_type: "email",
    regex_pattern: "^.+\\@.+\\..+$",
    regex_label: "invalid email address",
    url_pattern: "mailto:{val}",
    url_expected: "mail",
    unicode_icon: "&#x2709;",               // envelope
});


module.exports.override("generateTestValue", function (session) {
    var array = Core.Format.getRandomStringArray({
        space: false,
        uppercase: false,
    });
    var val = Core.Format.getRandomString(10, array) + "." +
        Core.Format.getRandomString(10, array) + "@" +
        Core.Format.getRandomString(6, array) + ".com";
    return val;
});
