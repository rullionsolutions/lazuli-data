"use strict";

var Data = require("lazuli-data/index.js");


/**
* To represent a reference or free-text field
*/
module.exports = Data.Reference.clone({
    id: "Combo",
    data_length: 255,
});


// TODO - Search Operators...
//     search_oper_list        : "sy.search_oper_list_text"
// Currently, using a Combo field as a search filter will work because only the equals and not
// equal to operators are given - so it comparing e.g. "R50" in the search field with "R50" in
// the database column, or "FBlah" in the search field with "FBlah" in the database. However, it
// would be nice to support the additional operators in sy.search_oper_list_text - but this will
// require extra logic in here...

// NOTE:
// isReference() === !isFreeText() is NOT always true, as if isBlank() then both with return false

/**
* To identify whether or not this field is currently set to a reference value
* @return true if this field's value is a reference to a record of ref_entity, otherwise false
*/


module.exports.override("setCSSType", function () {
    this.css_type = "combo";
});


module.exports.define("isReference", function () {
    return (this.val && this.val.substr(0, 1) === "R");
});


module.exports.override("isAutocompleter", function () {
    return true;
});


/**
* To identify whether or not this field is currently set to a free-text value
* @return true if this field's value is non-blank free-text, otherwise false
*/
module.exports.define("isFreeText", function () {
    return (this.val && this.val.substr(0, 1) === "F");
});


module.exports.override("getRefVal", function () {
    return this.isReference() ? this.val.substr(1) : "";
});


module.exports.override("getTextFromVal", function () {
    // ifReference() then this.text is set in Reference.validate()
    if (this.isFreeText()) {
        this.text = this.val.substr(1);
    } else {
        this.text = "";
        this.validate();
    }
    return this.text;
});

/*
module.exports.override("getFormGroupCSSClass", function (form_type, editable) {
    this.css_type = "autocompleter";
    return Parent.getFormGroupCSSClass.call(this, form_type, editable);
});


module.exports.override("renderUpdateControls", function (div, render_opts, form_type) {
    return this.renderAutocompleter(div, render_opts);
});
*/
