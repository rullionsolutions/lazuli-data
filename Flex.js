/* global java */

"use strict";

var Data = require("lazuli-data/index.js");
var SQL = require("lazuli-sql/index.js");
var Rhino = require("lazuli-rhino/index.js");


/**
* To represent a flexible field which stores its own properties, and can represent different
* kinds of fields
*/
module.exports = Data.Text.clone({
    id: "Flex",
    css_type: "flex",
    data_length: -1,            // Ignore in Text.validate()
    db_type: "B",
    sortable: false,            // Flex fields cannot be used to sort lists
    search_criterion: false,    // prevent Flex fields from ever being search criteria

});


// needed?
// module.exports.defbind("initialize", "cloneInstance", function () {
//     if (this.parent.inner_field) {
//         this.inner_field = this.parent.inner_field.clone({
//              id: this.parent.inner_field.getId() });
//     }
// });


module.exports.define("reset", function (field_spec) {
    if (!field_spec.id || typeof field_spec.id !== "string") {
        this.throwError("id must be non-blank string");
    }
    if (!field_spec.type) {
        this.throwError("field type must be specified in spec");
    }
    if (!field_spec.type || !this.owner.field_types.get(field_spec.type)) {
        this.throwError("field type does not exist: " + field_spec.type);
    }
    this.inner_field = this.owner.field_types.get(field_spec.type).clone(field_spec);
    // Allows inner_field to know which record it is part of...
    this.inner_field.owner = this.owner;
    this.inner_field.control = this.control;
    if (typeof field_spec.val === "string") {
        this.inner_field.setInitial(field_spec.val);
    }

    this.debug("Flex.reset(): " + this.owner + ", " + (this.owner.action || "no owner"));
    if (this.owner && this.owner.action === "C") {        // If record is being created then...
        this.inner_field.modified = true;    // mark as modified to ensure field is written to db
        this.inner_field.validate();
    }
});


module.exports.override("get", function () {
    if (!this.inner_field) {
//        this.throwError("flex no inner field");
        return null;
    }
    return this.inner_field.get();
});


module.exports.override("setInitial", function (new_val) {
    if (this.inner_field) {
        return this.inner_field.setInitial(new_val);
    }
    return null;
});


module.exports.override("setDefaultVal", function () {
    if (this.inner_field) {
        this.inner_field.default_val = this.default_val || this.inner_field.default_val;
        this.inner_field.setDefaultVal();
    }
});


module.exports.override("set", function (new_val) {
    if (!this.inner_field) {
        this.throwError("flex has no inner field");
    }
    return this.inner_field.set(new_val);
});


module.exports.override("setProperty", function (name, val) {
    if (this.inner_field) {
        return this.inner_field.setProperty(name, val);
    }
    return null;
});


module.exports.override("getDataLength", function () {
    if (this.inner_field) {
        return this.inner_field.getDataLength();
    }
    return null;
});


module.exports.override("getKeyPieces", function () {
    if (this.inner_field) {
        return this.inner_field.getKeyPieces();
    }
    return null;
});


module.exports.defbind("validateFlex", "validate", function () {
    if (this.inner_field) {
        return this.inner_field.validate();
    }
    return null;
});


module.exports.override("isValid", function () {
    if (this.inner_field) {
        return this.inner_field.isValid();
    }
    return false;
});


module.exports.override("isBlank", function () {
    if (this.inner_field) {
        return this.inner_field.isBlank();
    }
    return true;
});


module.exports.override("isModified", function () {
    if (this.inner_field) {
        return this.inner_field.isModified();
    }
    return null;
});


module.exports.override("isChangedSincePreviousUpdate", function () {
    if (this.inner_field) {
        return this.inner_field.isChangedSincePreviousUpdate();
    }
    return null;
});


module.exports.override("getText", function () {
    if (this.inner_field) {
        return this.inner_field.getText();
    }
    return null;
});


module.exports.override("getUpdateText", function () {
    return undefined;
});

//    if (this.inner_field) {
//        return this.inner_field.getUpdateText();
//    }
// };

// module.exports.override("render", function (element, render_opts) {
//     if (this.inner_field) {
//         return this.inner_field.render(element, render_opts);
//     }
// });


module.exports.override("renderEditable", function (div, render_opts, inside_table) {
    if (this.inner_field) {
        return this.inner_field.renderEditable(div, render_opts, inside_table);
    }
    return null;
});


module.exports.override("renderUneditable", function (div, render_opts, inside_table) {
    if (this.inner_field) {
        return this.inner_field.renderUneditable(div, render_opts, inside_table);
    }
    return null;
});


module.exports.override("renderErrors", function (span, render_opts, inside_table) {
    if (this.inner_field) {
        return this.inner_field.renderErrors(span, render_opts, inside_table);
    }
    return null;
});


module.exports.override("getSQL", function () {
    var json_obj = {};
    var that = this;
    var str;

    if (this.inner_field) {
        Object.keys(this.inner_field).forEach(function (prop) {
            if (typeof that.inner_field[prop] !== "object"
                    && typeof that.inner_field[prop] !== "function"
                    && prop !== "prev_val" && prop !== "orig_val"
                    && prop !== "modified" && prop !== "validated") {
                json_obj[prop] = that.inner_field[prop];
            }
        });
    }
    str = SQL.Connection.escape(JSON.stringify(json_obj));
    this.trace(str);
    return str;
});


module.exports.override("setFromResultSet", function (resultset) {
    var json_obj;

    if (!this.query_column) {
        return;
    }
    try {
        json_obj = this.parseBytes(resultset.getBytes(this.query_column));
        this.trace("Flex.setFromResultSet resetting " + this + " to '" + json_obj + "'");
        if (typeof json_obj.id === "string") {
            this.reset(json_obj);
        }
    } catch (e) {
        this.report(e);
        this.getSession().messages.report(e);
//        new Error();
    }
});


module.exports.define("parseBytes", function (bytes) {
    var str;
    if (bytes) {
        str = String(new java.lang.String(bytes, "UTF-8"));
        return JSON.parse(str);
    }
    return "";
});


module.exports.define("checkDataIntegrity", function () {
    var sql;
    var resultset;
    var resultset2;
    var out;
    var key_map = {};
    var key;
    var json_obj;
    var delim = "";

    if (this.sql_function || !this.owner) {
        return null;
    }
    out = "Broken flex references for " + this.id + ": ";
    sql = "SELECT _key, " + this.id + " FROM " + Rhino.app.database + "." + this.owner.table +
        " WHERE " + this.id + " LIKE '%\"type\":\"Reference\"%'";
    resultset = SQL.Connection.shared.executeQuery(sql);
    while (resultset.next()) {
        key = SQL.Connection.getColumnString(resultset, 1);
        json_obj = this.parseBytes(resultset.getBytes(2));
        if (json_obj.val && json_obj.ref_entity) {
            sql = "SELECT COUNT(*) FROM " + Rhino.app.database + "." + json_obj.ref_entity +
                " WHERE _key = " + SQL.Connection.escape(json_obj.val);
            resultset2 = SQL.Connection.shared.executeQuery(sql);
            if (!resultset2.next() || resultset2.getInt(1) < 1) {
                if (key_map[json_obj.val]) {
                    if (key_map[json_obj.val].length > 30) {
                        key_map[json_obj.val] += ".";
                    } else {
                        key_map[json_obj.val] += ", " + key;
                    }
                } else {
                    key_map[json_obj.val] = key;
                }
            }
//            resultset2.close();
            SQL.Connection.finishedWithResultSet(resultset2);
        }
    }
    SQL.Connection.finishedWithResultSet(resultset);
//    resultset.close();
    Object.keys(key_map).forEach(function (key2) {
        out += delim + "[" + key2 + "] " + key_map[key2];
        delim = ", ";
    });
    if (delim) {
        return out;
    }
    return null;
});


module.exports.define("autocompleter", function (match, response, session) {
    if (this.inner_field) {
        return this.inner_field.autocompleter(match, response, session);
    }
    return null;
});


module.exports.override("generateTestValue", function (session) {
    if (this.inner_field) {
        return this.inner_field.generateTestValue();
    }
    return null;
});

