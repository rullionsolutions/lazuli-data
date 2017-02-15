"use strict";

var Data = require("lazuli-data/index.js");


module.exports = Data.Number.clone({
    id: "Money",
    decimal_digits: 2,
    display_format: "£#,##0.00",
    input_group_addon_before: "£",
    obfuscate_funct: "obfuscateNumber",
});
