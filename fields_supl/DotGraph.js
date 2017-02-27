"use strict";

var Data = require("lazuli-data/index.js");

/**
* To represent a graph using DOT notation
*/
module.exports = Data.Text.clone({
    id: "DotGraph",
    css_type: "dotgraph",
    separate_row_in_form: true,
    rows: 5,
    tb_span: 12,
    data_length: -1,        // Ignore in Text.validate()
    db_type: "B",
});


module.exports.override("renderEditable", function (elem, render_opts) {
    elem.makeElement("div", "css_diagram")
        .text(this.getText(), true);
});


module.exports.override("renderUneditable", function (elem, render_opts) {
    var style = this.getUneditableCSSStyle();
    if (style) {
        elem.attribute("style", style);
    }
    elem.makeElement("div", "css_diagram")
        .text(this.getText(), true);
});


module.exports.override("generateTestValue", function (session) {
    var val = "graph test { a  -- b -- c }";
    return val;
});
