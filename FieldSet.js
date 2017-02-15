"use strict";

var Core = require("lapis-core/index.js");
var Data = require("lazuli-data/index.js");

/**
* An OrderedMap of fields, whose ids are unique within this object
*/
module.exports = Core.OrderedMap.clone({
    id: "FieldSet",
    modifiable: false,
    modified: false,                       // private - modified since original value, or not?
    deleting: false,                       // whether or not we are deleting this record
});


module.exports.register("beforeFieldChange");
module.exports.register("afterFieldChange");


module.exports.define("addFields", function (spec_array) {
    var i;
    for (i = 0; i < spec_array.length; i += 1) {
        this.addField(spec_array[i]);
    }
});


module.exports.define("addField", function (field_spec) {
    var field;
    if (!field_spec.id || typeof field_spec.id !== "string") {
        this.throwError("id must be nonblank string");
    }
    if (!field_spec.type) {
        this.throwError("field type must be specified");
    }
    if (!field_spec.type || !Data.Text.getFieldType(field_spec.type)) {
        this.throwError("field type does not exist: " + field_spec.type);
    }
    field_spec.instance = this.instance;
    field = Data.Text.getFieldType(field_spec.type).clone(field_spec);
    this.add(field);
    if (this.page) {
        field.addToPage(this.page);
    }
    return field;
});


module.exports.define("cloneField", function (field, spec) {
    var new_field;
    spec.instance = this.instance;
    new_field = field.clone(spec);
    this.add(new_field);
    if (this.page) {
        new_field.addToPage(this.page);
    }
    return new_field;
});


module.exports.define("getField", function (id) {
    return this.get(id);
});


module.exports.define("getFieldCount", function () {
    return this.length();
});


module.exports.define("removeField", function (id) {
    var field = this.get(id);
    if (field && this.page) {
        delete this.page.fields[field.getControl()];
    }
    Core.OrderedMap.remove.call(this, id);
});


module.exports.define("beforeFieldChange", function (field, new_val) {
    if (!this.modifiable) {
        this.throwError("fieldset not modifiable");
    }
    this.happen("beforeFieldChange", {
        field: field,
        new_val: new_val,
    });
});


module.exports.define("afterFieldChange", function (field, old_val) {
    if (field.isModified()) {
        this.touch();
    }
    this.happen("afterFieldChange", {
        field: field,
        old_val: old_val,
    });
});


module.exports.define("touch", function () {
    this.modified = true;
    if (this.trans) {
        this.trans.setModified();
        if (this.db_record_exists && this.action !== "C"
                && !this.db_record_locked && !this.lock_failure) {
            this.lock();
        }
    }
});


module.exports.define("setDefaultVals", function () {
    this.each(function (field) {
        field.setDefaultVal();
    });
});


/**
* Add a property to the given spec object for each field in this FieldSet, with its string value
* @param spec: object to which the properties are added;
* options.text_values: set property value to field.getText() instead of field.get()
*/
module.exports.define("addValuesToObject", function (spec, options) {
    this.each(function (field) {
        // CL - id comes out as "undefined" + field.id without this fix
        spec[((options && options.prefix) ? options.prefix : "") + field.id] =
            ((options && options.text_values) ? field.getText() : field.get());
    });
});


module.exports.override("replaceToken", function (token) {
    var field;
    this.trace("replaceToken(): " + token);
    token = token.split("|");
    if (token[0] === "key" && typeof this.getKey === "function") {
        return this.getKey();
    }
    field = this.getField(token[0]);
    if (!field) {
        return "(ERROR: unrecognized field: " + token[0] + ")";
    }
    return field.getTokenValue(token);
});


module.exports.define("setDelete", function (bool) {
    if (!this.isModifiable()) {
        this.throwError("fieldset not modifiable");
    }
    if (this.deleting !== bool) {
        this.trace("set modified");
        this.modified = true;
        if (this.trans) {
            this.trans.setModified();
        }
    }
    this.deleting = bool;
});


module.exports.define("isModified", function () {
    return this.modified;
});


module.exports.define("isModifiable", function () {
    return this.modifiable;
});


module.exports.define("isValid", function (modified_only, field_group) {
    var valid = true;
    if (this.deleting) {
        return true;
    }
    this.each(function (field) {
        if (field_group && field_group !== field.field_group) {
            return;
        }
        valid = valid && field.isValid(modified_only);
    });
    return valid;
});


// copy values from fieldset's fields for each field whose id matches
module.exports.override("copyFrom", function (fieldset) {
    this.each(function (field) {
        if (fieldset.getField(field.id)) {
            field.set(fieldset.getField(field.id).get());
        }
    });
});


module.exports.define("update", function (params) {
    if (this.modifiable) {
        this.each(function (field) {
            field.update(params);
        });
    }
});


module.exports.define("getTBFormType", function (our_form_type) {
    var tb_form_type = our_form_type;
    if (tb_form_type === "basic") {
        tb_form_type = "row";
    } else if (tb_form_type === "table-cell") {
        tb_form_type = "";
    } else if (tb_form_type === "form-inline-labelless") {
        tb_form_type = "form-inline";
    // } else if (tb_form_type === "form-horizontal-readonly") {
    //     tb_form_type = "form-horizontal";
    }
    return tb_form_type;
});


module.exports.define("renderForm", function (parent_elem, render_opts, form_type, field_group, hide_blank_uneditable_fields) {
    var tb_form_type = this.getTBFormType(form_type);
    var form_elem;
    var count = 0;

    this.each(function (field) {
        if (field.isVisible(field_group, hide_blank_uneditable_fields)) {
            if (!form_elem) {
                form_elem = parent_elem.makeElement("form", tb_form_type);
            }
            field.renderFormGroup(form_elem, render_opts, form_type);
            count += 1;
        }
    });
    return count;
});


module.exports.define("addToPage", function (page, field_group) {
    this.page = page;
//    if (this.modifiable) {
    this.each(function (field) {
        if (!field_group || field_group === field.field_group) {
            field.addToPage(page);
        }
    });
//    }
});


module.exports.define("removeFromPage", function (field_group) {
    var page = this.page;
    if (this.modifiable) {
        this.each(function (field) {
            if (!field_group || field_group === field.field_group) {
                field.removeFromPage(page);
            }
        });
    }
});

