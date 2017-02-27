"use strict";

var Core = require("lapis-core/index.js");
var Data = require("lazuli-data/index.js");


module.exports = Data.Text.clone({
    id: "NINumber",
    data_length: 9,
    regex_pattern: "^[A-CEGHJ-PR-TW-Z]{1}[A-CEGHJ-NPR-TW-Z]{1}[0-9]{6}[A-DFM]{0,1}$",
    regex_label: "must be a valid UK NI number",
});


module.exports.override("generateTestValue", function (session) {
    return "AB" + Core.Format.getRandomString(6, "0123456789") + "C";
});
