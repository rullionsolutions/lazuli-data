"use strict";

var Core = require("lapis-core/index.js");
var Data = require("lazuli-data/index.js");
var IO = require("lazuli-io/index.js");

/**
* To represent a functional area of the system
*/
module.exports = Core.Base.clone({
    id: "Area",
    title: null,                     // name of this area
    security: null,                     // security object for this area
});


module.exports.defbind("setupTextStrings", "clone", function () {
    this.text_strings = {};
    // areas[this.id] = this;
    Data.areas.add(this);
    this.path = IO.File.getDirectory("../" + module.id);
});


module.exports.define("unpack", function () {
    this.throwError("deprecated");
});


module.exports.define("generateDemoData", function () {
    return undefined;
});
