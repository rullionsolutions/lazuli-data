"use strict";

var Data = require("lazuli-data/index.js");
var SQL = require("lazuli-sql/index.js");


module.exports = Data.Text;


module.exports.define("db_type", "C");


/**
* To provide a string version of the value of this field, suitable for use in
* x.sql.Condition.value properties
* @param none
* @return An escaped string representation of the field's value
*/
module.exports.define("getConditionValue", function () {
    return this.val;
});


/**
* To provide a string version of the value of this field, suitable for use in
* SQL SELECT, VALUES, and WHERE clauses
* @param none
* @return An escaped string representation of the field's value, produced by calling x.sql.escape()
*/
module.exports.define("getSQL", function () {
    return SQL.Connection.escape(this.val, this.getDataLength());
});


/**
* To call addColumn() on the argument query object for a column representing this field
* @param x.sql.Query object, col_spec object, which has its sql_function property set if given
* @return new column object
*/
module.exports.define("addColumnToTable", function (query_table, col_spec) {
    if (!col_spec) {
        col_spec = { name: this.getId(), };
    }
    if (this.sql_function) {
        col_spec.sql_function = SQL.Connection.detokenizeAlias(this.sql_function,
            query_table.alias);
        this.query_column = query_table.alias + "_" + this.id;
    } else {
        this.query_column = query_table.alias + "." + this.id;
    }
    return query_table.addColumn(col_spec);
});


/**
* To set the value of this field from the resultset argument, provided that this
* @param java.sql.ResultSet object
*/
module.exports.define("setFromResultSet", function (resultset) {
    var value = "";
    if (this.query_column) {
        value = SQL.Connection.getColumnString(resultset, this.query_column);
    }
    this.trace("setFromResultSet[" + this.query_column + "] setting to '" + value + "'");
    this.setInitial(value);
});


module.exports.define("copyFromQuery", function (query, column_id) {
    var column = query.getColumn(column_id || this.query_column);
    if (!column) {
        this.throwError("no column found");
    }
    this.setInitial(column.get());
});


/**
* To indicate the type of the RDBMS column to store this field
* @return single-char string
*/
module.exports.define("getDBType", function () {
    return this.db_type;
});


/**
* To return the size of the RDBMS CHAR column to store this field
* @return integer character length
*/
module.exports.define("getDBLength", function () {
    return this.getDataLength();
});


/**
* To obtain the DDL expression for the nature of the RDBMS column to store this field
* @return DDL clause string
*/
module.exports.define("getDDL", function (delta) {
    var db_type = this.getDBType();
    var out = this.getId() + " ";

    if (db_type === "I") {
        out += this.db_int_type;
    } else if (db_type === "B") {
        out += (this.owner.getStorageEngine() === "MEMORY" ? "VARBINARY(2000)" : "LONGBLOB");
    } else {
        out += (this.getDBLength() > 255 ? "VAR" : "") + "CHAR(" + this.getDBLength() + ")";
    }
    return out;
});


module.exports.define("findKeyMergeUpdates", function (from_val, to_val, chg_array) {
    var sql = "SELECT A._key";
    var resultset;
    var start_index = chg_array.length;
    var end_index;
    var i;

    if (this.isKey()) {
        sql += ", (SELECT B._key FROM " + this.owner.table + " B WHERE B._key = REPLACE(REPLACE(A._key, '." +
            from_val + "', '." + to_val + "'), '" + from_val + ".', '" + to_val + ".')) AS dup";
    }
    sql += " FROM " + this.owner.table + " A WHERE A." + this.id + " = " + SQL.Connection.escape(from_val);
    resultset = SQL.Connection.shared.executeQuery(sql);
    while (resultset.next()) {
        this.debug("findKeyMergeUpdates() adding item " + SQL.Connection.getColumnString(resultset, 1));
        chg_array.push({
            entity_id: this.owner.id,
            entity_title: this.owner.title,
            key_string: SQL.Connection.getColumnString(resultset, 1),
            field_id: this.id,
            field_label: this.label,
            from_val: from_val,
            to_val: to_val,
            dup: (this.isKey() && !!SQL.Connection.getColumnString(resultset, 2)),
        });
    }
    SQL.Connection.shared.finishedWithResultSet(resultset);
    end_index = chg_array.length;
    if (this.isKey()) {
        for (i = start_index; i < end_index; i += 1) {
            chg_array[i].new_key = chg_array[i].key_string
                .replace("." + from_val, "." + to_val)
                .replace(from_val + ".", to_val + ".");
            this.debug("findKeyMergeUpdates() recursing " +
                chg_array[i].key_string + " -> " + chg_array[i].new_key);
            this.owner.findKeyMergeUpdates(chg_array[i].key_string,
                chg_array[i].new_key, chg_array);
        }
    }
});


module.exports.define("setAllowingExistingRecordKeyChange", function (new_val) {
    if (this.isKey()) {
        this.owner.db_record_exists = false;    // override to allow update to key field
        this.fixed_key = false;         // override to allow update to key fields!
    }
    return this.set(new_val);
});
