"use strict";

var Core = require("lapis-core/index.js");


module.exports = Core.MessageManager.clone({
    id: "MessageManagerRow",
});


module.exports.override("getPrefix", function () {
    return (this.record.row_number === 0) ? "" : this.record.title;
});


module.exports.override("chain", function (funct) {
    var that = this;
    if (this.record.trans.messages.include_field_messages === false) {
        return;
    }
    this.record.each(function (field) {
        that.trace("module.exports", "chain to field level: " + field);
        if (field.messages) {
            funct(field.messages);
        }
        if (field.inner_field && field.inner_field.messages) {
            funct(field.inner_field.messages);
        }
    });
});
