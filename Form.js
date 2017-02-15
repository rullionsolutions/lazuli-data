"use strict";

var Core = require("lapis-core/index.js");


module.exports = Core.Base.clone({
    id: "Form",
});


module.exports.forms = Core.Collection.clone({
    id: "forms",
    item_type: module.exports,
});
