"use strict";

var Core = require("lapis-core/index.js");


module.exports = Core.MessageManager.clone({
    id: "MessageManagerField",
});


module.exports.override("getString", function (tag, separator, prefix, type) {
    if (!this.field.validated) {
        this.field.validate();
    }
    return Core.MessageManager.getString.call(this, tag, separator, prefix, type);
});


module.exports.override("addJSON", function (container, tag, prefix) {
    if (!this.field.validated) {
        this.field.validate();
    }
    Core.MessageManager.addJSON.call(this, container, tag, prefix);
});


module.exports.override("getPrefix", function () {
    return this.field.label + ": ";
});


module.exports.define("renderMessage", function (msg, parent_elem, render_opts) {
    parent_elem.makeElement("span")
        .attr("data-msg-type", msg.type)
        .text(msg.text);
});


module.exports.define("renderErrors", function (parent_elem, server_messages_elem, render_opts) {
    var messages_elem;
    var i;
    var msg;

    messages_elem = parent_elem.makeElement("span", "help-block css_client_messages css_hide");
    for (i = 0; i < this.messages.length; i += 1) {
        msg = this.messages[i];
        if (msg.cli_side_revalidate) {
            this.renderMessage(msg, messages_elem, render_opts);
        }
    }
    messages_elem = parent_elem.makeElement("span", "help-block css_server_messages css_hide");
    for (i = 0; i < this.messages.length; i += 1) {
        msg = this.messages[i];
        if (!msg.cli_side_revalidate) {
            this.renderMessage(msg, messages_elem, render_opts);
        }
    }
});
