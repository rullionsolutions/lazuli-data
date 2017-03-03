"use strict";

var Data = require("lazuli-data/index.js");
var Core = require("lapis-core/index.js");

/**
* To represent a field containing binary data - not expected to appear in UI
*/
module.exports = Data.Text.clone({
    id: "Event",
    css_type: "Event",
    sql_function: "NULL",   // never store in the database
    editable: false,    // never editable through the front-end
    data_length: -1,       // Ignore in Text.validate()
    decoration_icon: "<img src='/cdn/icons/paperclip.png' alt=''/>",
    url_target: "_blank",
    url_pattern: "jsp/main.jsp?mode=openVCal&field={control}",
    url_link_text: "click",
});

module.exports.define("outputVCal", function (writer) {
    writer.print(Core.Format.getVCalString(JSON.parse(this.get())));
});
