"use strict";

var Data = require("lazuli-data/index.js");


/**
* To represent a field that is composed of multiple other fields
*/
module.exports = Data.Text.clone({
    id: "Composite",
    css_type: "composite",
    data_length: -1,        // Ignore in Text.validate()
    db_type: "B",
    text_delim: " ",
});


module.exports.defbind("clonePartFields", "clone", function () {
    var i;
    if (this.parent === module.exports) {
        return;
    }
    if (!this.part_fields) {
        this.throwError("no part fields defined");
    }
    this.part_fields = [];
    for (i = 0; i < this.parent.part_fields.length; i += 1) {
        this.part_fields[i] = this.parent.part_fields[i].clone({
            id: this.parent.part_fields[i].id,
            instance: this.instance,
        });
    }
});


module.exports.defbind("determineDBLengthAndType", "cloneType", function () {
    var i;
    if (this.parent === module.exports) {
        return;
    }
    this.data_length = 0;
    this.db_type = "C";
    for (i = 0; i < this.part_fields.length; i += 1) {
        if (this.part_fields[i].getDataLength() === -1) {
            this.data_length = -1;
        } else if (this.data_length >= 0) {
            this.data_length += this.part_fields[i].getDataLength() + 1;
        }
        if (this.part_fields[i].db_type === "B") {
            this.db_type = "B";
        }
    }
});


module.exports.define("each", function (funct) {
    this.part_fields.forEach(function (part_field) {
        funct(part_field);
    });
});


module.exports.override("get", function () {
    var str = "";
    var delim = "";
    this.each(function (part_field) {
        str += delim + part_field.get();
        delim = "|";
    });
    return str;
});


module.exports.override("setInitial", function (new_val) {
    var str = new_val.split("|");
    var i = 0;
    this.val = new_val;
    this.each(function (part_field) {
        part_field.setInitial(str.length > i ? str[i] : "");
        i += 1;
    });
});


module.exports.override("set", function (new_val) {
    var str = new_val.split("|");
    var i = 0;
    var out = false;
    this.val = new_val;
    this.each(function (part_field) {
        out = out || part_field.set(str.length > i ? str[i] : "");
        i += 1;
    });
    return out;
});


module.exports.override("setProperty", function (name, val) {
    this.each(function (part_field) {
        part_field.setProperty(name, val);
    });
});


module.exports.override("validate", function () {
    this.each(function (part_field) {
        part_field.validate();
    });
});


module.exports.override("isValid", function () {
    var out = true;
    this.each(function (part_field) {
        out = out && part_field.isValid();
    });
    return out;
});


module.exports.override("isBlank", function () {
    var out = true;
    this.each(function (part_field) {
        out = out && part_field.isBlank();
    });
    return out;
});


module.exports.override("isModified", function () {
    var out = false;
    this.each(function (part_field) {
        out = out || part_field.isModified();
    });
    return out;
});


module.exports.override("isChangedSincePreviousUpdate", function () {
    var out = false;
    this.each(function (part_field) {
        out = out || part_field.isChangedSincePreviousUpdate();
    });
    return out;
});


module.exports.override("getText", function () {
    var out = "";
    var delim = "";
    var that = this;
    this.each(function (part_field) {
        out += delim + part_field.getText();
        delim = that.text_delim;
    });
    return out;
});


module.exports.override("renderFormGroup", function (div, render_opts, form_type) {
    var last_elem;
    this.each(function (part_field) {
        last_elem = part_field.renderFormGroup(div, render_opts, form_type);
    });
    return last_elem;
});


module.exports.override("renderUneditable", function (div, render_opts) {
    var last_elem;
    this.each(function (part_field) {
        last_elem = part_field.renderUneditable(div, render_opts);
    });
    return last_elem;
});


module.exports.override("renderFieldMessages", function (span, render_opts) {
    var text = "";
    var delim = "";
    this.each(function (part_field) {
        text += delim + part_field.renderFieldMessages(span, render_opts);
        delim = ", ";
    });
    return text;
});


module.exports.override("generateTestValue", function (session) {
    this.throwError("not implemented yet");
});

