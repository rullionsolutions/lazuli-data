"use strict";

var Core = require("lapis-core/index.js");
var Data = require("lazuli-data/index.js");
var Rhino = require("lazuli-rhino/index.js");

/**
* To represent a functional area of the system
*/
module.exports = Core.Base.clone({
    id: "Area",
    title: null,                     // name of this area
    security: null,                     // security object for this area
});


module.exports.defbind("setupTextStrings", "clone", function () {
    if (this.text_strings) {
        this.throwError("Developer note please declare text_strings in separate file");
    }
    this.text_strings = {};
    // areas[this.id] = this;
    Data.areas.add(this);
    // this won't work!
    // this.path = IO.File.getDirectory("../" + module.id);
});


module.exports.define("getPath", function () {
    if (!this.path) {
        this.path = Rhino.app.sapphire_dir + "/" + this.id;
    }
    return this.path;
});


module.exports.define("unpack", function () {
    this.throwError("deprecated");
});


module.exports.define("generateDemoData", function () {
    return undefined;
});
