"use strict";

var Core = require("lapis-core/index.js");
var Data = require("lazuli-data/index.js");
var SQL = require("lazuli-sql/index.js");

/**
* To support a list of available options for drop-downs, radio buttons, etc
*/
module.exports = Core.OrderedMap.clone({
    id: "LoV",
    blank_label: "[blank]",
    choose_label: "[choose]",
});


module.exports.define("getLoV", function (spec, session) {
    var lov;
    var cache_key;

    if (!spec.skip_cache && session) {
        if (spec.list_id) {
            cache_key = "list:" + spec.list_id;
        } else if (spec.entity_id) {
            cache_key = "entity:" + spec.entity_id + ":" + spec.condition;
        } else if (spec.collection_id) {
            cache_key = "collection:" + spec.collection_id;
        }
        if (cache_key) {
            if (!session.lov_cache) {
                session.lov_cache = {};
            }
            lov = session.lov_cache[cache_key];
        }
    }
    // spec.      list_id = spec.      list_id || spec.list;                   // backward-compat
    // spec.    entity_id = spec.    entity_id || spec.entity;                 // backward-compat
    // spec.collection_id = spec.collection_id || spec.collection;             // backward-compat
    // if (!spec.list_id && !spec.entity_id && !spec.collection_id) {
    //     this.throwError("one of: list_id, entity_id or collection_id must be specified");
    // }
    if (!lov) {
        if (spec.collection_id && !spec.label_prop) {
            this.throwError("collection_id requires label_prop");
        }
        spec.id = (spec.list_id || spec.entity_id || spec.collection_id || "basic") +
            ":" + Core.Format.getRandomNumber(9999);
        spec.instance = true;
        lov = this.clone(spec);
        lov.reload();
        if (!spec.skip_cache && session && cache_key) {
            session.lov_cache[cache_key] = lov;
        }
    }
    return lov;
});


module.exports.define("clearLoVCache", function (session) {
    session.lov_cache = null;
});


module.exports.define("getListLoV", function (list_id) {
    return this.getLoV({ list_id: list_id, });
});


module.exports.define("getEntityLoV", function (entity_id, condition) {
    return this.getLoV({
        entity_id: entity_id,
        condition: condition,
    });
});


module.exports.define("getCollectionLoV", function (collection_id, label_prop, active_prop) {
    return this.getLoV({
        collection_id: collection_id,
        label_prop: label_prop,
        active_prop: active_prop,
    });
});


module.exports.define("addItem", function (id, label, active) {
    if (!label) {
        this.throwError("label must be nonblank: " + id);
    }
    if (typeof active !== "boolean") {
        this.throwError("active property must be boolean");
    }
    this.trace("label: " + label + ", active: " + active);
    return this.add(Core.Base.clone({
        id: id,
        label: label,
        active: active,
    }));
});


module.exports.define("getItem", function (id) {
    var item = this.get(id);
    if (item && item.label === "" && this.entity_id) {      // item added before label set....
        this.remove(id);
        item = null;
    }
    // always check again in case (a) data not completely loaded,
    // (b) record data change to now match condition, or (c) new record added
    if (!item && this.entity_id /* && (!this.complete || this.condition)*/) {
        item = this.loadEntityInternal("A._key = " + SQL.Connection.escape(id), false, false);
    }
    return item;
});


module.exports.override("clear", function () {
    Core.OrderedMap.clear.call(this);
    this.complete = false;
});


module.exports.define("reload", function () {
    this.clear();
    if (!this.skip_full_load) {
        this.reloadComplete();
    }
});


module.exports.define("reloadComplete", function () {
    if (this.list_id) {
        this.loadList();
    } else if (this.entity_id) {
        this.loadEntity();
    } else if (this.collection_id) {
        this.loadCollection();
    } else {
        this.complete = true;               // basic LoV is complete by definition
    }
});


module.exports.define("loadList", function () {
    var sql;
    var lastItem = null;
    var conn;
    var resultset;

    if (!this.list_id || typeof this.list_id !== "string" || !this.list_id.match(/^[a-z]{2}\.[a-z_]+$/)) {
        this.throwError("invalid list id: " + this.list_id);
    }
    this.clear();
    sql = "SELECT SQL_CACHE id, text, active FROM sy_list_item WHERE list = " + SQL.Connection.escape(this.list_id) + " ORDER BY seq_number";
    conn = SQL.Connection.getQueryConnection("loadList");
    try {
        resultset = conn.executeQuery(sql);
        while (resultset.next()) {
            lastItem = this.addItem(String(resultset.getString(1)), String(resultset.getString(2)), (String(resultset.getString(3)) === "A"));
        }
        this.complete = true;
    } catch (e) {
        this.report(e);
    }
    conn.finishedWithResultSet(resultset);
//    resultset.close();
    return lastItem;
});


module.exports.define("loadEntity", function () {
    this.clear();
    this.loadEntityInternal(this.condition, true, true);
    this.complete = true;
});


module.exports.define("loadEntityInternal", function (condition, sort, active) {
    var query;
    var last_item = null;

    if (!this.record) {
        this.record = Data.entities.getThrowIfUnrecognized(this.entity_id).getRecord({
            connection: this.connection,
        });
    }
    query = this.record.getQuery();
    query.use_query_cache = true;
    if (sort) {
        this.record.setDefaultSort(query);            // only sort if getting lots of records
    }
    if (condition) {
        query.addCondition({ full_condition: condition, });
    }
    if (typeof active !== "boolean") {
        active = true;
    }
    while (query.next()) {
        this.record.populate(query.resultset);
        if (this.length() > 99) {
            this.warn("large data volume: " + this.length() + " for " + this);
            // this.throwError("large data volume");
        }
        last_item = this.addItem(this.record.getKey(), this.record.getLabel("dropdown"), active);
    }
    query.reset();
    return last_item;
});


module.exports.define("loadCollection", function () {
    var that = this;
    Data.Collection.getCollection(this.collection_id).each(function (source_item) {
        that.addItem(source_item.id, source_item[that.label_prop],
            !that.active_prop || source_item[that.active_prop]);
    });
    this.complete = true;
});


module.exports.define("loadObject", function (obj, label_prop, active_prop) {
    var that = this;
    var last_item = null;

    this.clear();
    Object.keys(obj).forEach(function (key) {
        var active = !active_prop || obj[key][active_prop];
        last_item = that.addItem(key, obj[key][label_prop], active);
    });
    this.sort("label");
    if (!last_item) {
        this.throwError("no config items found");
    }
    this.complete = true;
    return last_item;
});


module.exports.define("loadArray", function (array, id_prop, label_prop, active_prop) {
    var i;
    var active = true;
    var last_item = null;

    this.clear();
    for (i = 0; i < array.length; i += 1) {
        if (active_prop) {
            active = array[i][active_prop];
        }
        last_item = this.addItem(array[i][id_prop], array[i][label_prop], active);
    }
    if (!last_item) {
        this.throwError("no config items found");
    }
    this.complete = true;
    return last_item;
});


module.exports.define("renderDropdown", function (div, render_opts, val, control, css_class, mandatory) {
    var i;
    var item;
    var select;

    if (!this.complete) {
        this.throwError("LoV is not complete");
    }
    select = div.makeElement("select", css_class, control);
//    select.attr("name", control);
    if (!mandatory) {
        select.makeOption("", this.blank_label, !val);
    } else if (!val || !this.getItem(val) || !this.getItem(val).active) {
        select.makeOption("", this.choose_label, true);
    }
    for (i = 0; i < this.length(); i += 1) {
        item = this.getItem(i);
        if (item.active) {
            select.makeOption(item.id, item.label, (item.id === val));
        }
    }
    return select;
});


module.exports.define("renderRadio", function (div, render_opts, val, control, css_class, mandatory) {
    var inner;
    if (!this.complete) {
        this.throwError("LoV is not complete");
    }
    inner = div.makeElement("span", css_class, control);
    if (!mandatory) {
        inner.makeRadioLabelSpan(control, "", (this.blank_label || "[blank]"), !val);
    }
    this.each(function (item) {
        if (item.active) {
            inner.makeRadioLabelSpan(control, item.id, item.label, (item.id === val));
        }
    });
});


module.exports.define("renderMulti", function (div, render_opts, control, pieces, css_class) {
    var inner;
    if (!this.complete) {
        this.throwError("LoV is not complete");
    }
    inner = div.makeElement("span", css_class, control);
    this.each(function (item) {
        if (item.active) {
            inner.makeCheckboxLabelSpan(control, item.id, item.label,
                (pieces.indexOf(item.id) > -1));
        }
    });
});


module.exports.define("getCountObject", function () {
    var count_obj = {};
    this.each(function (item) {
        count_obj[item.id] = 0;
    });
    return count_obj;
});


module.exports.define("queryMerge", function (query, lov_column) {
    var count_obj = this.getCountObject();
    var col_val;

    while (query.next()) {
        col_val = query.getColumn(lov_column).get();
        count_obj[col_val] += 1;
    }
    query.reset();
    return count_obj;
});


module.exports.define("addCountsFromSQL", function (sql) {
    var count_obj = this.getCountObject();
    var conn = SQL.Connection.getQueryConnection("addCountsFromSQL");
    var resultset;

    try {
        resultset = conn.executeQuery(sql);
        while (resultset.next()) {
            count_obj[SQL.Connection.getColumnString(resultset, 1)] = resultset.getInt(2);
        }
    } catch (e) {
        this.report(e);
    }
    conn.finishedWithResultSet(resultset);
    return count_obj;
});


module.exports.define("getCountString", function (count_obj, include_zeros, sentence_mode) {
    var str = "";
    var delim = "";
    var index;

    this.each(function (item) {
        if (count_obj[item.id] > 0 || include_zeros) {
            str += delim + "<b>" + (count_obj[item.id] || 0) + "</b> <i>" + item.label + "</i>";
            delim = ", ";
        }
    });
    index = str.lastIndexOf(",");
    if (index > -1 && sentence_mode) {
        str = str.substr(0, index) + " and " + str.substr(index + 1);
    }
    if (!delim) {
        str = sentence_mode ? "no" : "none";
    }
    return str;
});

