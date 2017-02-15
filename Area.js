"use strict";

var Core = require("lapis-core/index.js");
var IO = require("lazuli-io/index.js");

// to do
// var areas = {};

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
    // module.exports.areas.add(this);
});


module.exports.areas = Core.Collection.clone({
    id: "areas",
    item_type: module.exports,
});


module.exports.define("getArea", function (area_id) {
    // return areas[area_id];
    return module.exports.areas.getThrowIfUnrecognized(area_id);
});


module.exports.define("eachArea", function (callback) {
    // Object.keys(areas).forEach(function (area_id) {
    //     callback(areas[area_id]);
    // });
    module.exports.areas.forOwn(callback);
});


module.exports.define("setModule", function (module) {
    this.path = IO.File.getDirectory("../" + module.id);
    this.info("Area.setModule(): " + this.path);
});


module.exports.define("unpack", function () {
    this.throwError("deprecated");
});


module.exports.define("generateDemoData", function () {
    return undefined;
});
