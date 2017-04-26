"use strict";

var Core = require("lapis-core/index.js");


module.exports = Core.MessageManager.clone({
    id: "MessageManagerRow",
});


module.exports.override("getPrefix", function () {
    var out = "";
    if (this.record.trans && this.record.trans.getRecordCount().total > 1) {
        out = this.record.title + ": " + this.record.getLabel();
    }
    return out;
});


module.exports.override("chain", function (funct) {
    var that = this;
    if (this.record.trans && this.record.trans.messages.include_field_messages === false) {
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
