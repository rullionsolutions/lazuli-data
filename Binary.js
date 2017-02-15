"use strict";

var Data = require("lazuli-data/index.js");

/**
* To represent a field containing binary data - not expected to appear in UI
*/
module.exports = Data.Text.clone({
    id: "Binary",
    css_type: "binary",
    visible: false,
    editable: false,
    accessible: false,
    ignore_in_query: true,
//    update_length: 80,
    data_length: -1,        // Ignore in Text.validate()
    db_type: "B",
});
