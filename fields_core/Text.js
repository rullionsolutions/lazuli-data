"use strict";

var Core = require("lapis-core/index.js");
var SQL = require("lazuli-sql/index.js");
var Data = require("lazuli-data/index.js");

/**
* To represent a basic unit of textual information, how it is captured, validated, stored
*   in the database, and represented on screen
*/
module.exports = Core.Base.clone({
    id: "Text",
    css_type: "text",
    data_length: 255,
    visible: true,
    editable: true,
    search_oper_list: "sy.search_oper_list_text",
    auto_search_oper: "CO",
    search_filter: "Filter",
    table_alias: "A",
    input_type: "text",
    tb_input: "input-sm",
    disp_col_lg: 2,
    disp_col_md: 3,
    disp_col_sm: 4,
    disp_col_xs: 6,
    edit_col_lg: 6,
    edit_col_md: 8,
    edit_col_sm: 10,
    edit_col_xs: 10,
    unicode_icon: "&#x27BD;",              // Heavy Wedge-Tailed Rightwards Arrow; x25B7 = open right-pointing triangle
    unicode_icon_class: "css_uni_icon",
    hover_text_icon: "&#x24D8;",
    text_pattern: "{val}",
    skip_insert: false,
    unique_error_msg: "Another record has this value",
});


module.exports.register("setInitial");
module.exports.register("setInitialTrans");
module.exports.register("beforeChange");
module.exports.register("beforeTransChange");
module.exports.register("validate");
module.exports.register("afterChange");
module.exports.register("afterTransChange");


module.exports.defbind("backwardCompatibility", "cloneType", function () {
    if (this.config_item && !this.collection_id) {
        this.collection_id = this.config_item;
        delete this.config_item;
    }
});


/**
* To initialise this field when cloned - sets query_column property based on
*   table_alias, sql_function and id
*/
module.exports.defbind("resetVal", "cloneInstance", function () {
    this.val = "";
    this.orig_val = "";
    this.prev_val = "";
    this.text = null;
    this.url = null;
    this.validated = false;                    // private - validated since last significant change?
    this.modified = false;                    // private - modified since original value, or not?
    if (this.table_alias) {
        this.query_column = this.table_alias + (this.sql_function ? "_" : ".") + this.id;
    }
});

// ONLY called from FieldSet.addToPage() - IF field is intended to appear on a page
/**
* To add this field to the page object, for UI and response parameter purposes, sets
*   control property, which must be unique to the page, and calls page.addField()
* @param Page object
*/
module.exports.define("addToPage", function (page) {
    if (!this.control) {
        this.control = "";
        if (this.owner && this.owner.id_prefix) {
            this.control = this.owner.id_prefix + "_";
        }
        this.control += this.id;
    }
    page.addField(this);
});


/**
* To remove this field from the page object by calling page.removeField()
* @param Page object
*/
module.exports.define("removeFromPage", function (page) {
    page.removeField(this);
});


/**
* To return this field's control property, or calls getId() is control not defined
*   (should never happen)
* @return Value of this field's control property - should be string
*/
module.exports.define("getControl", function () {
    return this.control || this.getId();
});


/**
* Returns this field's val property - should always be used instead of accessing val directly
* @return Value of this field's val property - should be string
*/
module.exports.define("get", function () {
    if (typeof this.getComputed === "function") {
        this.val = this.getComputed();
    }
    return this.val;
});


/**
* To get a numerical representation of this field's value
* @param Default value to use if this field's value is not a number
* @return Number value of field (if the value can be interpreted as numeric), or the default
*   value argument (if numeric) or undefined
*/
module.exports.define("getNumber", function (def_val) {
    var number_val = parseFloat(this.get());
    if (isNaN(number_val) && typeof def_val === "number") {
        number_val = def_val;
    }
    return number_val;
});


/**
* To indicate whether or not this field's value is blank
* @return True if this field's value is blank (i.e. empty string) otherwise false
*/
module.exports.define("isBlank", function (val) {
    if (typeof val !== "string") {
        val = this.get();
    }
    return !val;
});


/**
* To set the initial value of this field - called by Entity.setInitial()
* @param Initial string value to set
*/
module.exports.define("setInitial", function (new_val) {
    if (typeof new_val === "number") {
        new_val = String(new_val);       // allow a "free" type conversion from number to string...
    }
    if (typeof new_val !== "string") {
        this.throwError("invalid argument");
    }
    this.resetVal();
    this.val = new_val;
    this.orig_val = new_val;
    this.prev_val = new_val;

    this.happen("setInitial", new_val);
    if (this.owner && this.owner.trans) {
        this.happen("setInitialTrans", new_val);
    }
});


module.exports.define("setDefaultVal", function () {
    if (this.default_val) {
        this.setInitial(this.default_val);
        this.modified = true;
        this.validate();
    }
});


module.exports.define("set", function (new_val) {
    var old_val = this.get();
    var changed = this.setInternal(new_val);
    if (changed) {
        this.trace("setting " + this.getId() + " from '" + old_val + "' to '" + new_val + "'");
    }
    return changed;
});

/**
* To set this field's value to the string argument specified, returning false if no change,
*   otherwise calling owner.beforeFieldChange() and this.beforeChange() before making the change,
*   then owner.afterFieldChange() and this.afterChange() then returning true
* @param String new value to set this field to
* @return True if this field's value is changed, and false otherwise
*/
module.exports.define("setInternal", function (new_val) {
    var old_val = this.get();
    this.prev_val = old_val;            // to support isChangedSincePreviousUpdate()
    if (typeof new_val !== "string") {
        this.throwError("argument not string: " + this.owner.id + "." + this.id);
    }
    if (this.fixed_key) {
        this.throwError("fixed key");
    }
    if (new_val === this.val) {
        return false;
    }
    if (this.owner && this.owner.beforeFieldChange) {
        this.owner.beforeFieldChange(this, new_val);            // May throw an error
    }
    this.happen("beforeChange", new_val);
    if (this.owner && this.owner.trans) {
        this.happen("beforeTransChange", new_val);
    }
    this.val = new_val;
    this.text = null;
    this.url = null;
    this.modified = true;
    this.validated = false;
    if (this.owner && this.owner.afterFieldChange) {
        this.owner.afterFieldChange(this, old_val);
    }
    this.happen("afterChange", old_val);
    if (this.owner && this.owner.trans) {
        this.happen("afterTransChange", old_val);
    }
    return true;
});


module.exports.define("setFromParams", function (params) {
    var control = this.getControl();
    if (typeof params[control] === "string") {
        if (this.isEditable()) {
            this.trace("updateFields(): updating field " + control + " to value: " + params[control]);
            this.setFromParamValue(params[control]);
        } else {
            this.warn("updateFields(): Can't update uneditable field " + control + " to value: " + params[control]);
        }
//            SF: params should remain unchanged
//            delete params[control];
    } else if (params[control] === undefined) {
        this.trace("updateFields(): field not updated " + control);
        this.prev_val = this.val;
    } else {
        this.throwError("param not string");
    }
});


module.exports.define("setFromParamValue", function (str) {
    this.set(str);
});


/**
* To indicate if this field's value has been changed in the last call to set() - based on
*   property prev_val, which is set in set()
* @return True if this field's value was changed in the last call to set()
*/
module.exports.define("isChangedSincePreviousUpdate", function () {
    return (this.prev_val !== this.get());
});


/**
* Returns the value of this field's id property
* @return This field's id property as a string
*/
module.exports.define("getId", function () {
    return this.id;
});


/**
* To set a given property, and unset the validated property, prompting another call to
*   validate() when next required
* @param String property name, and property value
*/
module.exports.define("setProperty", function (name, val) {
    if (name === "id") {
        this.throwError("can't change property 'id'");
    }
    if (name === "type") {
        this.throwError("can't change property 'type'");
    }
    this[name] = val;
    this.text = null;
    this.url = null;
    this.validated = false;                            // property change might affect validation
});


/**
* To obtain the field's data length, in most cases the character length of the database field
* @return The data length of this field, as an integer number of characters
*/
module.exports.define("getDataLength", function () {
    return (typeof this.data_length === "number") ? this.data_length : 255;
});


/**
* To obtain the number of pieces the value of this field represents as a key string
* @return The number 1
*/
module.exports.define("getKeyPieces", function () {
    return 1;
});


/**
* To report whether or not this field is a key of the entity to which it belongs
* @return True if this field is a key, otherwise false
*/
module.exports.define("isKey", function () {
    if (this.owner && this.owner.isKey) {
        return this.owner.isKey(this.getId());
    }
    return false;
});


module.exports.define("getLoV", function () {
    if (!this.lov) {
        this.lov = this.getLoVInternal({});
    }
    return this.lov;
});


module.exports.define("getOwnLoV", function (spec) {
    if (this.lov && this.lov.skip_cache) {
        this.warn("recreating own lov with spec: " + this.view.call(spec));
    }
    spec = spec || {};
    spec.skip_cache = true;
    this.lov = this.getLoVInternal(spec);
    return this.lov;
});


module.exports.define("getLoVInternal", function (spec) {
    var entity;
    spec.list_id = spec.list_id || this.list_id || this.list;
    spec.entity_id = spec.entity_id || this.ref_entity;
    spec.collection_id = spec.collection_id || this.collection_id;
    spec.label_prop = spec.label_prop || this.label_prop;
    spec.active_prop = spec.active_prop || this.active_prop;
    spec.connection = spec.connection || (this.owner && this.owner.connection);
    // include this.owner.connection - to use Transaction's connection if within a transaction
    if (spec.entity_id) {
        entity = Data.entities.get(this.ref_entity);
        spec.condition = spec.condition || this.selection_filter || this.ref_condition
            || entity.selection_filter;
        if (spec.skip_full_load === undefined) {
            // if (spec.condition) {
            //     spec.skip_full_load = false;
            // } else
            // if (typeof this.isAutocompleter === "function") {
                            // avoid caching large data volumes
            //     spec.skip_full_load = this.isAutocompleter();
            // } else {
            if (typeof entity.data_volume_oom === "number") {
                spec.skip_full_load = !!(entity.data_volume_oom > 1);
            } else {
                spec.skip_full_load = true;
            }

            // }
        }
    }
    this.lov = Data.LoV.getLoV(spec, this.owner && this.owner.trans);
    if (this.allow_unchanged_inactive_value && this.orig_val && this.lov.getItem(this.orig_val)) {
        this.lov.getItem(this.orig_val).active = true;
    }
    return this.lov;
});


/**
* To validate the value this field is currently set to; this function
*   (or its descendents) can report errors
*/
module.exports.define("validate", function () {
    if (this.getComputed) {
        return;                     // no validation on computed fields
    }
    if (this.messages) {
        this.messages.clear();
    } else {
        this.messages = this.getMessageManager();
    }
//    this.text = this.getTextFromVal();
//    this.url  = this. getURLFromVal();
    if (this.mandatory && !this.val) {
        this.messages.add({
            type: "E",
            text: "mandatory",
            cli_side_revalidate: true,
        });
    }
    if (this.val && this.val.length > this.getDataLength() && this.getDataLength() > -1) {
        this.messages.add({
            type: "E",
            text: "longer than " + this.getDataLength() + " characters",
            cli_side_revalidate: true,
        });
    }
    if (this.val && this.regex_pattern && !(this.val.match(new RegExp(this.regex_pattern)))) {
        this.messages.add({
            type: "E",
            text: this.regex_label || "match pattern",
            cli_side_revalidate: true,
        });
    }
    if (this.val && this.enforce_unique) {
        if (this.checkUnique(this.val)) {
            this.messages.add({
                id: "non_unique_field",
                type: "E",
                text: this.unique_error_msg,
            });
        }
    }
    this.validated = true;
    this.happen("validate");
});


module.exports.define("getMessageManager", function () {
    if (!this.messages) {
        this.messages = Data.MessageManagerField.clone({
            id: this.id,
            field: this,
            instance: true,
        });
    }
    return this.messages;
});

/**
* To report whether or not this field is valid, based on the last call to validate()
*   (validate() is called again
* @return true if this field is valid, false otherwise
*/
module.exports.define("isValid", function (modified_only) {
    if ((!modified_only || this.isModified()) && !this.validated) {
        this.validate();
    }
    if (!this.messages) {
        return true;
    }
    return !this.messages.error_recorded;
});


/**
* To report whether or not this field has been modified (by a call to set()), since it was
*   originally created and set
* @return true if this field has been modified, otherwise false
*/
module.exports.define("isModified", function () {
    return this.modified;
});


/**
* To check whether another record exists in the table with the same value, used in validate()
*   if property enforce_unique is true
* @param val to check uniqueness for
* @return true if other record(s) found in the table with the same value of this field
*/
module.exports.define("checkUnique", function (val) {
    var out = false;
    var conn;
    var resultset;

    if (this.owner && this.owner.trans && this.owner.isKeyComplete()) {
        conn = SQL.Connection.getQueryConnection("checkUnique");
        try {
            resultset = conn.executeQuery("SELECT COUNT(*) FROM " + this.owner.table +
                " WHERE " + this.id + " = " + SQL.Connection.escape(val) + " AND _key <> " +
                SQL.Connection.escape(this.owner.getKey()));
            out = (resultset.next() && resultset.getInt(1) > 0);
        } catch (e) {
            this.report(e);
        }
        conn.finishedWithResultSet(resultset);
    }
    return out;
});


/**
* To convert the properties of this field (especially this.val) into the display text string
*   for this field
* @return display text string appropriate to this field and its properties
*/
module.exports.define("getTextFromVal", function () {
    var val = this.get();
    var out = this.detokenize(this.text_pattern);
    if (this.collection_id && !this.isBlank(val)) {
        try {
            out = "[" + val + "] " + this.getCollectionItemText(this.collection_id, val);
        } catch (e) {        // assume unrecognised config item
            out = e.toString();
            this.report(e);
        }
    }
    return out;
});


/**
* To obtain the display text string for this field, which is set by the last call to validate()
* @return the value of this field's 'text' property - always a string
*/
module.exports.define("getText", function () {
    // set() sets this.text to null; only other reason to recompute is if using getComputed()
    // function
    if (typeof this.text !== "string" || this.getComputed) {
        this.text = this.getTextFromVal();
//        this.validate();
    }
    return this.text;
});


/**
* To obtain the text title of the config item which the value of this field represents -
*   if this field has a
* @return [config_item][this.get()].title as a string, otherwise '[unknown]'
*/
module.exports.define("getCollectionItemText", function (collection_id, val) {
    var collection = Core.Collection.getCollectionThrowIfUnrecognized(collection_id);
    var out = collection.getLabelThrowIfUnrecognized(val);
    if (typeof out !== "string") {
        this.throwError(collection_id + "[" + val + "] is not a string");
    }
    return out;
});


/**
* To obtain the string representation of the value of this field for use in an update
*   control (i.e. input box)
* @return the value of the 'val' property of this field
*/
module.exports.define("getUpdateText", function () {
    return this.get();
});


module.exports.define("getDBTextExpr", function (alias) {
    return (alias ? alias + (this.sql_function ? "_" : ".") : "") + this.id;
});


/**
* To indicate whether or not this field is editable, i.e. its 'editable' property is true,
*   its 'fixed_key'
* @return true if this field is editable, otherwise false
*/
module.exports.define("isEditable", function () {
    return this.editable && !this.fixed_key && (!this.owner || this.owner.modifiable !== false);
});


/**
* To indicate whether or not this field is visible, i.e. its 'visible' property is true,
*   its 'accessible'
* @return true if this field is visible, otherwise false
*/
module.exports.define("isVisible", function (field_group, hide_blank_uneditable) {
    return this.visible && (this.accessible !== false)
            && (!field_group || field_group === this.field_group)
            && (!this.hide_if_no_link || this.getURL())
            && ((this.editable && this.owner && this.owner.modifiable) || !this.isBlank()
            || !hide_blank_uneditable);
});


/**
* To set the visible and editable attributes combined, and mandatory as a separate arg,
*   set the field blank is not visible, and validate
* @param whether visible/editable, whether mandatory (only if visible/editable)
*/
module.exports.define("setVisEdMand", function (visible_editable, mandatory) {
    if (visible_editable && !this.visible && this.isBlank() && this.default_val) {
        this.set(this.default_val);
    }
    this.visible = visible_editable;
    this.editable = visible_editable;
    this.mandatory = visible_editable && mandatory;
    if (!visible_editable) {
        this.set("");
    }
    this.validated = false;                            // property change might affect validation
});


/**
* To get a URL corresponding to the value of this field, if there is one; by default this
* @return url string if produced
*/
module.exports.define("getURLFromVal", function () {
    var url;
    var val = this.get();

    if (this.url_pattern) {
        url = val ? this.detokenize(this.url_pattern) : "";
    }
    if (url) {
        if (this.url_expected === "internal") {     // assumed to begin "index.html#page_id=" or similar
            try {
                if (!this.getSession().allowedURL(url)) {
                    url = "";
                }
            } catch (e) {        // Assume is page_not_found exception
                this.report(e);
                url = "";
            }
        } else if (this.url_expected === "external" && url.indexOf("http") !== 0) {
            url = "http://" + url;
        }
    }
    return url;
});


/**
* To obtain the url string for this field, which is set by the last call to validate()
* @return the value of this field's 'url' property - always a string
*/
module.exports.define("getURL", function () {
    if (typeof this.url !== "string") {
        this.url = this.getURLFromVal();
    }
    return this.url;
});


/**
* To get a session object associated with this field, if one is available
* @return session object or null
*/
module.exports.define("getSession", function () {
    return this.session
        || (this.owner && this.owner.session)
        || (this.owner && this.owner.trans && this.owner.trans.session)
        || (this.owner && this.owner.page && this.owner.page.session);
});


module.exports.define("appendClientSideProperties", function (obj) {
    obj.data_length = this.getDataLength();
    obj.regex_label = this.regex_label;
    obj.regex_pattern = this.regex_pattern;
    obj.input_mask = this.input_mask;
    obj.before_validation = this.before_validation;
    obj.auto_search_oper = this.auto_search_oper;
});


/**
* To compose a string of selected properties of this field and add them to a hidden span element
* @param the XmlStream object representing the parent element to which this span should be rendered,
*   and render_opts
*/
module.exports.define("addClientSideProperties", function (span, render_opts) {
    var obj = {};
    this.appendClientSideProperties(obj);
    Object.keys(obj).forEach(function (key) {
        if (obj[key] === null || obj[key] === undefined) {
            delete obj[key];
        }
    });
    span.addChild("span", null, "css_hide css_render_data", JSON.stringify(obj));
});


module.exports.define("isDatabaseColumn", function () {
    return (!this.sql_function && !this.getComputed);
});


module.exports.define("obfuscate", function () {
    var sql;
    if (!this.obfuscate_funct || !this.isDatabaseColumn()) {
        return;
    }
    sql = "UPDATE " + this.owner.id + " SET " + this.id + "=" + this[this.obfuscate_funct]();
    SQL.Connection.shared.executeUpdate(sql);
});


module.exports.define("getTokenValue", function (token) {
    var out;
    if (token.length < 2 || token[1] === "text") {
        out = this.getText();
    } else if (token[1] === "val") {
        out = this.get();
    } else if (Core.Format.isStrictNumber(token[1])) {
        out = this.getText().substr(0, parseInt(token[1], 10) - 3) + "...";
    } else {
        out = "(ERROR: unrecognized token modifier: " + token[1] + " for " + token[0] + ")";
    }
    return out;
});


// Filter Field Generator
module.exports.define("getFilterField", function (fieldset, spec, suffix) {
    return fieldset.cloneField(spec.base_field, {
        id: spec.id + "_filt",
        editable: true,
        mandatory: false,
        css_reload: false,
        instance: spec.instance,
    });
});


/**
* To generate a reasonable test value for this field
* @param session object
* @return test value string
*/
module.exports.define("generateTestValue", function (session) {
    var attempt = 0;
    var length = Math.min(this.getDataLength() / 2, 500);
    var valid = false;
    var regex;
    var array;
    var val;

    if (this.regex_pattern || this.isKey()) {
        regex = this.regex_pattern ? new RegExp(this.regex_pattern) : null;
        array = Core.Format.getRandomStringArray({ space: !this.isKey(), });
        while (!valid && attempt < 100) {
            val = Core.Format.getRandomString(length, array);
            valid = regex ? regex.test(val) : true;
            attempt += 1;
        }
        if (!valid) {
            this.throwError("Couldn't generate test value after 100 attempts: " + this);
        }
    } else {
        val = Core.Format.getRandomWords(length);
    }
    return val;
});
