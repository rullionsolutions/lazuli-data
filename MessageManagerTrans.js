"use strict";

var Core = require("lapis-core/index.js");


module.exports = Core.MessageManager.clone({
    id: "MessageManagerTrans",
});


module.exports.override("chain", function (funct) {
    var that = this;
    this.trans.doFullKeyRows(function (row) {
        if (/* row.isModified() &&*/ !row.deleting && row.messages) {
            that.trace("chain to row level: " + row);
            funct(row.messages);
        }
    });
    this.trans.doPartialKeyRows(function (row) {
        if (!row.deleting && row.messages) {
            that.trace("module.exports", "chain to row level: " + row);
            funct(row.messages);
        }
    });
});


module.exports.override("clear", function (tag) {
    Core.MessageManager.clear.call(this, tag);
    this.chain(function (msg_mgr) { msg_mgr.clear(tag); });
});
