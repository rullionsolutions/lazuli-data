"use strict";

var Data = require("lazuli-data/index.js");
var SQL = require("lazuli-sql/index.js");
var UI = require("lazuli-ui/index.js");
var IO = require("lazuli-io/index.js");

/**
* To represent a record in a database table
*/
module.exports = Data.FieldSet.clone({
    id: "Entity",
    db_record_exists: false,            // whether or not a corresponding record exists in the db
    db_record_locked: false,            // whether or not we have a lock on the db record
    duplicate_key: false,
    pack_level: 99,
    export_sql_block: 100,
    use_query_cache: true,
    using_max_key_table: false,
    data_volume_oom: null,              // expected data size as a power of 10
});


module.exports.register("initCreate");
module.exports.register("initUpdate");
module.exports.register("load");
module.exports.register("reload");
module.exports.register("update");
module.exports.register("afterTransChange");
module.exports.register("presave");


module.exports.defbind("setupEntity", "cloneType", function () {
    var parent_entity;
    this.table = this.table || this.id;
    if (!this.skip_registration) {
        Data.entities.add(this);
    }
    if (this.parent_entity) {            // parent_entity MUST be loaded first
        this.trace("Linking " + this.id + " to its parent " + this.parent_entity);
        // parent entities will have to be loaded before their children!
        parent_entity = Data.entities.getThrowIfUnrecognized(this.parent_entity);
        if (!parent_entity.children) {
            parent_entity.children = {};
        }
        parent_entity.children[this.id] = this;
    }
});


module.exports.define("getRecord", function (spec) {
    spec = spec || {};
    spec.id = spec.id || this.id;
    spec.instance = true;
    delete spec.key;
    return this.clone(spec);
});


module.exports.define("getRow", function (arg, connection) {
    var row;
    var obj = this;

    if (obj.instance) {
        obj = obj.parent;
    }
    row = obj.clone({
        id: obj.id,
        connection: connection,         // transactional connection
        modifiable: false,
        instance: true,
    });
    if (typeof arg === "string") {
        row.load(arg);          // throws 'Record not found' if not found
    } else if (arg && arg.resultset) {
        row.populate(arg.resultset);
        row.db_record_exists = true;
    } else {
        this.throwError("invalid argument: " + arg);
    }
    return row;
});


/**
* Create a new transactional record object inherited from this entity object,
*   or a descendant of this one
* @param transaction object, action code string ('C', 'U' or ''),
*   key string (if action <> 'C') or addl_data passed into createNewRow() (if action = 'C')
* @return Newly cloned record object
*/
module.exports.define("getTransRow", function (trans, action, key, addl_data) {
    var row_number = trans.row_number;
    var row;

    trans.row_number += 1;
    row = this.clone({
        id: this.id,
        connection: trans.connection,
        trans: trans,
        modifiable: true,
        instance: true,
        row_number: row_number,
        id_prefix: "_" + row_number,
        action: action,
    });
    row.messages = row.getMessageManager();
    return row;
});


module.exports.define("getMessageManager", function () {
    if (!this.messages) {
        this.messages = Data.MessageManagerRecord.clone({
            id: "row_" + this.row_number,
            record: this,
            instance: true,
        });
    }
    return this.messages;
});

module.exports.define("getKey", function () {
    var key_fields = this.primary_key.split(",");
    var delim = "";
    var i;

    if (!this.key) {
        this.key = "";
        for (i = 0; i < key_fields.length; i += 1) {
            this.key += delim + this.getField(key_fields[i]).get();
            delim = ".";
        }
    }
    return this.key;
});


module.exports.define("getLabel", function (pattern_type) {
    var pattern = this["label_pattern_" + pattern_type] || this.label_pattern;
    var out;

    if (pattern) {
        out = this.detokenize(pattern);
    } else if (this.title_field) {
        out = this.getField(this.title_field).getText();
    }
    return out || "(ERROR: no label defined for " + this.id + ")";
});


module.exports.define("getPluralLabel", function () {
    return this.plural_label || this.title + "s";
});


module.exports.define("getSearchPage", function () {
    var page_id = this.id + "_search";
    if (typeof this.search_page === "string") {
        page_id = this.search_page;
    }
    return UI.pages.get(page_id);        // can't declare at top due to circularity!!!!
});


module.exports.define("getDisplayPage", function () {
    var page_id = this.id + "_display";
    if (typeof this.display_page === "string") {        // ignores this.display_page if boolean
        page_id = this.display_page;
    }
    return UI.pages.get(page_id);
});


module.exports.define("getDisplayURL", function (key) {
    if (typeof key !== "string") {
        key = this.getKey();
    }
    this.checkKey(key);            // throws exception if key is invalid
    return this.getDisplayPage().getSimpleURL(key);
});


module.exports.define("isKey", function (field_id) {
    var key_fields = this.primary_key.split(",");
    return (key_fields.indexOf(field_id) > -1);
});


module.exports.define("isKeyComplete", function (key) {
    if (typeof key !== "string") {
        key = this.getKey();
    }
    try {
        this.checkKey(key);
        return true;
    } catch (ignore) {
        return false;
    }
});


module.exports.define("getKeyPieces", function () {
    var key_fields = this.primary_key.split(",");
    var i;
    var field;

    if (!this.key_pieces) {
        this.key_pieces = 0;
        for (i = 0; i < key_fields.length; i += 1) {
            field = this.getField(key_fields[i]);
            if (!field) {
                this.throwError("invalid field in primary key");
            }
            this.key_pieces += field.getKeyPieces();
        }
    }
    return this.key_pieces;
});


module.exports.define("getKeyLength", function () {
    var key_fields = (this.primary_key && this.primary_key.split(",")) || [];
    var i;
    var field;
    var delim = 0;

    if (typeof this.key_length !== "number") {
        this.key_length = 0;
        for (i = 0; i < key_fields.length; i += 1) {
            field = this.getField(key_fields[i]);
            if (!field) {
                this.throwError("invalid field in primary key");
            }
            this.key_length += delim + field.getDataLength();
            delim = 1;
        }
    }
    return this.key_length;
});


module.exports.define("checkKey", function (key) {
    var pieces;
    var piecesRequired;
    var val;
    var i;

    if (typeof key !== "string" || key === "") {
        this.throwError("key must be nonblank string");
    }
    pieces = key.split(".");            // Argument is NOT a regex
    piecesRequired = this.getKeyPieces();
    if (piecesRequired !== pieces.length) {
        this.throwError("wrong number of key pieces");
    }
    for (i = 0; i < pieces.length; i += 1) {
        val = pieces[i];
        if (!val) {
            this.throwError("key piece is blank");
        }
        if (val && !val.match(/^[a-zA-Z0-9_-]+$/)) {
            this.throwError("invalid character in key string");
        }
    }
});


module.exports.define("populateFromKey", function (key) {
    var key_fields = this.primary_key.split(",");
    var pieces = key.split(".");
    var start = 0;
    var end;
    var field;
    var i;

    this.checkKey(key);
    for (i = 0; i < key_fields.length; i += 1) {
        field = this.getField(key_fields[i]);
        end = start + field.getKeyPieces();
        field.set(pieces.slice(start, end).join("."));
        start = end;
    }
});


module.exports.define("getAutoIncrementColumn", function () {
    var key_fields = this.primary_key.split(",");
    return (key_fields.length === 1) && this.getField(key_fields[0]).auto_generate && key_fields[0];
});


module.exports.override("isValid", function () {
    // TODO - some code sets the key of sub-records in page presave(),
    // which is only called if the transaction is valid already
    return Data.FieldSet.isValid.call(this) && (!this.messages || !this.messages.error_recorded);
});


module.exports.override("setDelete", function (bool) {
    // var that = this;
    Data.FieldSet.setDelete.call(this, bool);
/* - nice idea, but needs testing                        TODO
    if (this.action === "C" || this.action === "I") {
        this.action = bool ? "I" : "C";        // 'I' = ignore (create & delete); 'C' = create
    } else if (this.action === "U" || this.action === "D") {
        this.action = bool ? "D" : "U";        // 'D' = delete; 'U' = update
    }
*/
    if (this.deleting && this.db_record_exists /* && !this.db_record_locked*/) {
//        this.lock();      trans.getRow() and trans.getActiveRow() now lock the obtained row
        this.eachChildRow(function (row) {
            row.setDelete(bool);
        });
    }
});


module.exports.define("eachChildRow", function (callback) {
    var that = this;
    if (!this.children) {
        return;
    }
    Object.keys(this.children).forEach(function (entity_id) {
        that.trace("loadChildRows() found child: " + entity_id);
        that.eachLinkedRow(entity_id, null, callback);
    });
});


module.exports.define("eachLinkedRow", function (entity_id, link_field_id, callback) {
    var entity = Data.entities.getThrowIfUnrecognized(entity_id);
    var that = this;
    var query;
    var row;
    var response;

    if (!this.trans) {
        this.throwError("row has no transaction");
    }
    if (!link_field_id && entity.parent_entity === this.id) {
        link_field_id = entity.link_field;
    }

    query = entity.getQuery();
    query.addCondition({
        column: "A." + link_field_id,
        operator: "=",
        value: this.getKey(),
    });
    while (query.next() && response !== false) {
        if (this.trans) {
            row = this.trans.getActiveRow(entity_id, query.getColumn("A._key").get());
            response = callback.call(this, row);
        } else {
            response = callback.call(this, query);
        }
    }
    query.reset();
    if (!this.trans || !this.trans.curr_rows[entity_id]) {
        return;
    }
    Object.keys(this.trans.curr_rows[entity_id]).forEach(function (i) {
        var row2 = that.trans.curr_rows[entity_id][i];
        if (row2.action === "C" && row2.getField(link_field_id).get() === that.getKey()) {
            callback.call(that, row2);
        }
    });
});


module.exports.define("eachLinkedRow2", function (entity_id, link_field_id, callback,
        force_trans, override_scope) {
    var entity = Data.entities.getThrowIfUnrecognized(entity_id);
    var query;
    var row;
    var record;
    var that = this;
    var scope = override_scope || this;

    if (!link_field_id) {
        if (entity.parent_entity === this.id) {
            link_field_id = entity.link_field;
        }
    }

    query = entity.getQuery();
    query.addCondition({
        column: "A." + link_field_id,
        operator: "=",
        value: this.getKey(),
    });
    while (query.next()) {
        row = this.trans && this.trans.curr_rows[entity_id]
            && this.trans.curr_rows[entity_id][query.getColumn("A._key").get()];
        if (!row && force_trans) {          // fail if no trans
            row = this.trans.getRow(entity_id, query.getColumn("A._key").get());
        }
        if (row) {
            callback.call(scope, row);
        } else {
            if (!record) {
                record = entity.getRecord({ modifiable: false, });
            }
            record.populate(query.resultset);
            callback.call(scope, record);
        }
    }
    query.reset();

    if (!this.trans || !this.trans.curr_rows[entity_id]) {
        return;
    }
    // do new rows added to the transaction
    Object.keys(this.trans.curr_rows[entity_id]).forEach(function (key) {
        row = that.trans.curr_rows[entity_id][key];
        if (row.action === "C" && row.getField(link_field_id).get() === that.getKey()) {
            callback.call(scope, row, null);
        }
    });
});


module.exports.defbind("preventKeyChange", "beforeFieldChange", function (arg) {
    if (this.isKey(arg.field.getId()) && this.db_record_exists) {
        this.throwError("trying to change key field of existing record");
    }
    this.trace("preventKeyChange() " + this.db_record_exists + ", " + this.db_record_locked);
    if (this.db_record_exists && this.action !== "C" && !this.db_record_locked && !this.lock_failure_message) {
        this.lock();
    }
});


module.exports.defbind("doKeyChange", "afterFieldChange", function (arg) {
    this.trace(this.id + "::afterFieldChange(): " + arg.field.old_val + "->" + arg.field.get() + ", trans: " + this.trans);
    if (this.trans) {
        // only try keyChange() on a valid value
        if (this.isKey(arg.field.getId()) && arg.field.isValid()) {
            this.keyChange(arg.field, arg.field.old_val);
        }
        this.happen("afterTransChange", arg);
    }
});


module.exports.define("linkToParent", function (parent_record, link_field) {
    // if (!this.db_record_exists && parent_record && link_field) {
    if (typeof parent_record.getKey() === "string" && this.getField(link_field).get() !== parent_record.getKey()) {
        this.getField(link_field).set(parent_record.getKey());
    }
    this.parent_record = parent_record;         // support key change linkage
    this.trans_link_field = link_field;         // invoked when keyChange() calls trans.addToCache()
    // }
});


// copy values from fieldset's fields for each field whose id matches, except for keys,
// using setInitial()
module.exports.override("copyFrom", function (fieldset) {
    this.each(function (field) {
        if (fieldset.getField(field.id) && !field.isKey()) {
            field.setInitial(fieldset.getField(field.id).get());
        }
    });
});


// copy values from query's columns for each field whose id matches, except for keys,
// using setInitial()
module.exports.define("copyFromQuery", function (query) {
    this.each(function (field) {
        if (!field.isKey()) {
            field.copyFromQuery(query);
        }
    });
});


// FieldSet.update() does something completely different and not wanted?
module.exports.override("update", function () {
/*
    var label = this.getLabel();
    if (this.messages && this.messages.prefix) {            // Only update prefix if it not blank
        this.messages.prefix = this.title;
        if (label) {
            this.messages.prefix += " " + label;
        }
    }
*/
    if (this.messages && this.duplicate_key) {
        this.messages.add({
            type: "E",
            text: "Duplicate key",
        });
    }
    this.happen("update");
});


module.exports.define("presave", function (outcome_id) {
    this.presave_called = true;
    this.happen("presave", outcome_id);
});


/* convert a label pattern (e.g. "{org} / {date}") to a SQL CONCAT() expression
* UC1 - one token, nothing else, e.g. "{field}" should return "[alias.]field_expr"
* UC2 - one token, preceding static, e.g. "Blah {field}" should return
*   "CONCAT('Blah ', [alias.]field_expr)"
* UC3 - two tokens, static in between, e.g. "{field1} / {field2}" should return
*   "CONCAT([alias.]field1_expr, ' / ', [alias.]field2_expr)"
* UC4 - no tokens, static, e.g. "Blah", should return "'Blah'"
*/
module.exports.define("getPatternConcatExpr", function (pattern, alias) {
    var out;
    var parts = 0;

    pattern = pattern || this.label_pattern;
    out = this.detokenize(pattern,
        function (token) {
            parts += 1;
            return (parts > 1 ? ", " : "") + this.getField(token).getDBTextExpr(alias);
        },
        function (non_token) {
            if (!non_token) {
                return "";
            }
            parts += 1;
            return (parts > 1 ? ", " : "") + SQL.Connection.escape(non_token);
        }
    );
    if (parts > 1) {
        out = "CONCAT(" + out + ")";
    }
    return out;
});


module.exports.define("getAutoCompleterQuery", function () {
    var that = this;
    var query = this.getQuery(true, true);          // default sort, skip adding columns

    query.get_found_rows = false;
    query.main.addColumn({
        name: "_key",
        visible: true,
    });

    function addField(field_id) {
        var field = that.getField(field_id);
        if (!field) {
            that.throwError("unrecognized autocompleter field: " + field_id);
        }
        query.addColumn({
            name: "match_term",
            visible: true,
            sql_function: field.sql_function || field.id,
        });
    }

    if (this.autocompleter_pattern) {
        query.addColumn({
            name: "match_term",
            visible: true,
            sql_function: this.getPatternConcatExpr(this.autocompleter_pattern),
        });
    } else if (this.autocompleter_field) {
        addField(this.autocompleter_field);
    } else if (this.label_pattern) {
        query.addColumn({
            name: "match_term",
            visible: true,
            sql_function: this.getPatternConcatExpr(this.label_pattern),
        });
    } else if (this.title_field) {
        addField(this.title_field);
    } else {
        this.throwError("no match field defined");
    }
    return query;
});


module.exports.define("addAutoCompleterSelectionCondition", function (query, match_term) {
    var condition = "_key LIKE " + SQL.Connection.escape(match_term + "%")            // make case-insensitive
                  + " OR UPPER(match_term) LIKE UPPER(" + SQL.Connection.escape("%" + match_term + "%") + ")";
    query.addCondition({
        full_condition: condition,
        type: "H",  /* HAVING */
    });
});


module.exports.define("addAutoCompleterFilterCondition", function (query) {
    if (this.selection_filter) {
        query.addCondition({ full_condition: this.selection_filter, });
    }
});


// This function is NOT defined in an entity unless it actually does something
// - so the existence of this function indicates whether or not record security
// is applicable for the entity.
// module.exports.define("addSecurityCondition", function (query, session) {
// });
module.exports.define("renderLineItem", function (element, render_opts) {
    var display_page = this.getDisplayPage();
    var anchor = element.makeAnchor(this.getLabel("list_item"), display_page && display_page.getSimpleURL(this.getKey()));
    return anchor;
});


module.exports.define("renderTile", function (parent_elem, render_opts) {
    var div_elem = parent_elem.addChild("div", this.id + "_" + this.getKey(), this.getTileCSSClass(render_opts));
    var css_style = this.getTileCSSStyle(render_opts);
    if (css_style) {
        div_elem.attribute("style", css_style);
    }
    this.addTileURL(div_elem, render_opts);
    this.addTileContent(div_elem, render_opts);
});


module.exports.define("getTileCSSClass", function (render_opts) {
    return "css_tile";
});


module.exports.define("getTileCSSStyle", function (render_opts) {
    return null;
});


module.exports.define("addTileURL", function (div_elem, render_opts) {
    // var display_page = this.getDisplayPage();
    // if (display_page) {
    //     div_elem.attr("url", display_page.getSimpleURL(this.getKey()));
    // }
    if (!this.tile_control_field) {
        this.tile_control_field = Data.Reference.clone({
            id: "_tile_control",
            label: "",
            ref_entity: this.id,
            session: this.page.session,
            // dropdown_label: "",
            // dropdown_button: true,
            // dropdown_css_class: "btn-mini",
        });
    }
    this.tile_control_field.set(this.getKey());
    this.tile_control_field.renderNavOptions(div_elem.makeElement("span"), render_opts, this);
});


module.exports.define("addTileContent", function (div_elem, render_opts) {
    if (this.glyphicon) {
        div_elem.makeElement("i", this.glyphicon);
        div_elem.text("&nbsp;");
    } else if (this.icon) {
        div_elem.makeElement("img")
            .attr("alt", this.title)
            .attr("src", "/cdn/" + this.icon);
    }
    div_elem.text(this.getLabel("tile"));
});


module.exports.define("getDotGraphNode", function (render_opts, highlight) {
    var key = this.getKey();
    var out = key + " [ label=\"" + this.getLabel("dotgraph") + "\" URL=\"" + this.getDisplayURL(key) + "\"";
    if (highlight) {
        out += " style=\"filled\" fillcolor=\"#f8f8f8\"";
    }
    return out + "]; ";
});


module.exports.define("getDotGraphEdge", function (render_opts, parent_key) {
    var out = "";
    if (parent_key) {
        out = parent_key + " -> " + this.getKey() + ";";            // add label property if relevant
    }
    return out;
});


module.exports.define("replaceTokenRecord", function (key) {
    var row;
    var page = this.getDisplayPage();
    if (!page) {
        return "(ERROR: no display page for entity: " + this.id + ")";
    }
    row = this.getRow(key);
    if (!row) {
        return "(ERROR: record not found: " + this.id + ":" + key + ")";
    }
    return IO.XmlStream.left_bracket_subst + "a href='" +
        page.getSimpleURL(row.getKey()) + "'" + IO.XmlStream.right_bracket_subst + row.getLabel("article_link") +
        IO.XmlStream.left_bracket_subst + "/a" + IO.XmlStream.right_bracket_subst;
});


module.exports.define("getUnisrchColumns", function () {
    var columns = {
        key: { name: "_key", },
        match: {},
    };
    columns.match.name = this.unisrch_field || this.autocompleter_field || this.title_field;
    if (!columns.match.name) {
        this.throwError("getUnisrchColumns(): no match_field");
    }
    if (this.getField(columns.match.name)) {
        if (this.getField(columns.match.name).sql_function) {
            columns.match.sql_function = this.getField(columns.match.name).sql_function;
        }
    } else {
        columns.match.sql_function = columns.match.name;
        columns.match.name = "match_funct";
    }
    return columns;
});


module.exports.define("getUnisrchQuery", function (session, query_str, columns) {
    var page_entity = this.getDisplayPage().entity;
    var query = page_entity.getQuery(null, false, true);
    query_str = SQL.Connection.escape(query_str + "%");
    query.main.addColumn(columns.key);
    query.main.addColumn(columns.match);
    query.addCondition({
        type: SQL.Query.Condition.types.having_cond,
        full_condition: columns.match.name + " LIKE " + query_str + " OR " + columns.key.name + " LIKE " + query_str,
    });
    if (typeof page_entity.addSecurityCondition === "function") {
        page_entity.addSecurityCondition(query, session);
    }
    return query;
});


module.exports.define("unisrch", function (session, query_str, out, count, limit) {
    var added = 0;
    var display_page = this.getDisplayPage();
    var allowed = { access: false, };
    var columns;
    var query;

    display_page.checkBasicSecurity(session, allowed);
    if (!allowed.access) {
        return 0;       // type safe return of 0 prevent count becoming NaN
    }
    columns = this.getUnisrchColumns();
    query = this.getUnisrchQuery(session, query_str, columns);

    while (query.next() && (count + added) < limit) {
        if (count + added > 0) {
            out.print("\n");
        }
        out.print(this.getUnisrchLine(query, columns, display_page));
        added += 1;
    }
    query.reset();
    return added;
});


module.exports.define("getUnisrchLine", function (query, columns, display_page) {
    return query.getColumn(columns.key.name).get().replace(/\|/g, "&#x007C;") +
        "|" + query.getColumn(columns.match.name).get().replace(/\|/g, "&#x007C;") +
        "|" + display_page.id +
        "|" + this.title;
});


module.exports.define("setupDateRangeValidation", function (start_dt_field_id, end_dt_field_id) {
    var start_dt_field = this.getField(start_dt_field_id);
    var end_dt_field = this.getField(end_dt_field_id);

    start_dt_field.css_reload = true;
    end_dt_field.css_reload = true;

// could perhaps use update event instead of these two...
    start_dt_field.defbind("setMinDateInitial_" + end_dt_field_id, "setInitialTrans", function () {
        var end_dt_field2 = this.owner.getField(end_dt_field_id);
        end_dt_field2.min = this.get();
        this.max = end_dt_field2.get();
    });

    start_dt_field.defbind("setMinDateChange_" + end_dt_field_id, "afterTransChange", function () {
        var end_dt_field2 = this.owner.getField(end_dt_field_id);
        end_dt_field2.min = this.get();
        this.max = end_dt_field2.get();
    });

    end_dt_field.defbind("setMinDateChange_" + start_dt_field_id, "afterTransChange", function () {
        var start_dt_field2 = this.owner.getField(start_dt_field_id);
        start_dt_field2.max = this.get();
        this.min = start_dt_field2.get();
    });
});


module.exports.define("setupOneWayLinkedFields", function (parent_field_id, child_field_id, interlink_field_id) {
    this.getField(parent_field_id).css_reload = true;
    this.getField(child_field_id).render_autocompleter = false;
    this.getField(child_field_id).editable = false;


    this.defbind("initOneWayLink_" + child_field_id, "initUpdate", function () {
        this.updateLinkedFields(parent_field_id, child_field_id, interlink_field_id);
    });

    this.defbind("updateOneWayLink_" + child_field_id, "update", function () {
        this.updateLinkedFields(parent_field_id, child_field_id, interlink_field_id);
    });
});


module.exports.define("updateLinkedFields", function (parent_field_id, child_field_id, interlink_field_id) {
    var parent_field = this.getField(parent_field_id);
    var child_field = this.getField(child_field_id);

    if (!parent_field.isBlank()) {
        child_field.editable = true;
        if (!child_field.lov || parent_field.isChangedSincePreviousUpdate()) {
            child_field.getOwnLoV({ condition: "A." + interlink_field_id + " = " + parent_field.getSQL(), });
        }
        if (parent_field.isChangedSincePreviousUpdate()) {
            child_field.set("");
        }
    }
});


module.exports.define("slimDataForTesting", function () {
    return undefined;
});


module.exports.define("obfuscate", function () {
    this.each(function (field) {
        field.obfuscate();
    });
});

