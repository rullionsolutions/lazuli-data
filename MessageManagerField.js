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
    return this.field.label;
});


module.exports.define("renderErrors", function (parent_elem, render_opts) {
    var text_client = "";
    var delim_client = "";
    var text_server = "";
    var delim_server = "";

    Object.keys(this.messages).forEach(function (msg) {
        if (msg.cli_side_revalidate) {
            text_client += delim_client + msg.text;
            delim_client = "\n";
        } else {
            text_server += delim_server + msg.text;
            delim_server = "\n";
        }
    });
    if (text_client) {
        parent_elem.makeElement("span", "help-block css_client_messages").text(text_client);
        this.debug("Client-side Error text for field " + this.toString() + " = " + text_client);
    }
    if (text_server) {
        parent_elem.makeElement("span", "help-block css_server_messages").text(text_server);
        this.debug("Server-side Error text for field " + this.toString() + " = " + text_server);
    }
});
