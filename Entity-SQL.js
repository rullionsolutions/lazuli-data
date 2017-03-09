"use strict";

var Data = require("lazuli-data/index.js");
var SQL = require("lazuli-sql/index.js");


module.exports = Data.Entity;


module.exports.define("getSelectClause", function () {
    var out = "";
    var delim = "";

    if (this.use_query_cache === true) {
        out = " SQL_CACHE ";
    } else if (this.use_query_cache === false) {
        out = " SQL_NO_CACHE ";
    }
    this.each(function (field) {
        if (field.ignore_in_query) {
            return;
        }
        if (field.sql_function) {
            out += delim + " ( " + SQL.Connection.detokenizeAlias(field.sql_function, "A") + " ) AS A_" + field.getId();
        } else {
            out += delim + "A." + field.getId();
        }
        delim = ", ";
    });
    return out;
});


module.exports.define("getInsertStatement", function (temp_key) {
    return "INSERT INTO " + this.table + " ( " + this.getInsertClause() + " ) VALUES ( " + this.getValuesClause(temp_key) + " )";
});


module.exports.define("getInsertClause", function (allow_overrides) {
    var sql_string = "_key";
    if (this.transactional) {
        sql_string += ", _tx";
    }
    this.each(function (field) {
        if (!field.sql_function && !field.skip_insert) {
            sql_string += ", " + ((allow_overrides && field.override_insert_column) || field.getId());
        }
    });
    return sql_string;
});


module.exports.define("getValuesClause", function (temp_key) {
    var values = SQL.Connection.escape(temp_key || this.key);
    if (this.transactional) {
        values += ", " + (this.trans ? this.trans.id : "null");
    }
    this.each(function (field) {
        if (!field.sql_function && !field.skip_insert) {
            values += ", " + field.getSQL();
        }
    });
    return values;
});


module.exports.define("getSecurityRecord", function (session, key) {
    var record = null;
    var query;
    var obj = this;

    if (obj.instance) {
        obj = obj.parent;
    }
    query = obj.getQuery();
    query.use_query_cache = true;
    try {
        query.addCondition({
            column: "A._key",
            operator: "=",
            value: key,
        });
        if (typeof obj.addSecurityCondition === "function") {
            obj.addSecurityCondition(query, session);
        }
        if (query.next()) {
            record = obj.clone({
                id: obj.id,
                modifiable: false,
                instance: true,
                db_record_exists: true,
            });
            record.populate(query.resultset);
        }
    } catch (e) {
        this.report(e);
    }
    query.reset();
    return record;
});


module.exports.define("getConnection", function (id) {
    var conn = this.connection || SQL.Connection.getQueryConnection(id + "|" + this.id);
    this.debug("getConnection() object: " + conn);
    return conn;
});


module.exports.define("finishedWith", function (conn, resultset) {
    if (resultset) {
        conn.finishedWithResultSet(resultset);
    }
    if (conn !== this.connection) {
        conn.finishedWithConnection();
    }
});


module.exports.define("getQuery", function (set_default_sort, skip_adding_columns) {
    var conn = this.getConnection("query");
    var query = SQL.Query.clone({
        id: this.id,
        table: this.table,
        connection: conn,
        main_entity_id: this.id,
    });
    if (!skip_adding_columns) {
        this.addColumnsToTable(query.main);
        if (set_default_sort) {
            this.setDefaultSort(query);
        }
    }
    return query;
});


module.exports.define("load", function (key) {
    if (this.db_record_locked) {
        this.throwError("record locked: " + this.getLabel() + ": " + key);
    }
    this.reload(key);
    this.action = "U";            // flag means updating an existing row
    this.happen("load");
});


module.exports.define("reload", function (key) {
    var select;
    var conn = this.getConnection("reload");
    var primary_key_col = this.getAutoIncrementColumn() || "_key";
    var resultset;

    if (!key) {
        key = this.key;
    }
    this.checkKey(key);
    select = "SELECT " + this.getSelectClause();
    if (this.transactional) {
        select += ", A._tx";
    }
    select += " FROM " + this.table + " A WHERE A." + primary_key_col + " = " + SQL.Connection.escape(key);

    try {
        this.debug("reload() connection object: " + conn);
        resultset = conn.executeQuery(select);
        this.db_record_exists = resultset.next();
        if (this.db_record_exists) {
            this.key = key;
            this.db_record_key = key;
            this.populate(resultset);
            if (this.transactional) {
                this.curr_tx = SQL.Connection.getColumnString(resultset, "A._tx");
            }
        }
    } catch (e) {
        this.report(e);
        if (e.lock_wait_timeout) {
            this.throwError("record locked: " + this.title + ": " + key);
        }
    } finally {
        this.finishedWith(conn, resultset);
    }
    if (!this.db_record_exists) {
        this.throwError("record not found: " + this.title + ": " + key);
    }
    this.happen("reload");
});


module.exports.define("lock", function () {
    var conn = this.getConnection("lock");
    var sql;
    var primary_key_col = this.getAutoIncrementColumn() || "_key";
    var resultset;
    var lock_failure = false;

    if (this.db_record_locked) {
        this.throwError("record already locked: " + this.title + " " + this.key);
    }
    if (!this.db_record_exists) {
        this.throwError("record doesn't exist: " + this.title + " " + this.key);
    }
    sql = "SELECT " + (this.transactional ? "_tx" : "1") + " FROM " + this.table
        + " WHERE " + primary_key_col + " = " + SQL.Connection.escape(this.db_record_key) + " FOR UPDATE";

    try {
        resultset = conn.executeQuery(sql);
        if (resultset.next() && (!this.transactional
                || this.curr_tx === SQL.Connection.getColumnString(resultset, 1))) {
            this.db_record_locked = true;
        } else {
            lock_failure = true;
        }
    } catch (e) {
        this.report(e);
        if (e.lock_wait_timeout) {
            lock_failure = true;
        }
    } finally {
        this.finishedWith(conn, resultset);
    }
    if (lock_failure) {
        this.lock_failure_message = this.getMessageManager().add({
            type: "E",
            fixed: true,
            text: "record has been updated by another user, please cancel and try again",
        });
    }
});


module.exports.define("exportTable", function (out) {
    var count = 0;
    var query = this.getExportQuery();
    while (query.next()) {
        if (count % this.export_sql_block === 0) {
            if (count > 0) {
                out.println(";");
            }
            out.println("INSERT INTO " + this.table + " ( " + this.getInsertClause() + " ) VALUES ");
        } else {
            out.println(", ");
        }
        this.populate(query.resultset);
        out.print("\t ( " + this.getValuesClause() + " )");
        count += 1;
    }
    query.reset();
    if (count > 0) {
        out.println(";");
    }
});


/**
* To create a query object for use in exportTable
* @returns newly created query object
*/
module.exports.define("getExportQuery", function () {
    var query = this.getQuery();
    if (this.pack_condition) {
        query.addCondition({ full_condition: this.pack_condition, });
    }
    return query;
});


module.exports.define("populate", function (resultset) {
    var key_fields = this.primary_key.split(",");
    var delim = "";
    var i;
    var key_field;

    this.each(function (field) {
        if (field.ignore_in_query) {
            return;
        }
        field.setFromResultSet(resultset);
    });
    this.key = "";
    for (i = 0; i < key_fields.length; i += 1) {
        key_field = this.getField(key_fields[i]);
        if (!key_field) {
            this.throwError("field not found");
        }
        key_field.fixed_key = true;
        this.key += delim + key_field.get();
        delim = ".";
    }
});


module.exports.define("generateKey", function () {
    var key_fields = this.primary_key.split(",");
    var where_clause = "";
    var delim = " WHERE ";
    var field;
    var auto_generate_field = null;
    var otherwise_complete = true;
    var i;

    this.rest_of_key = "";
    for (i = 0; i < key_fields.length; i += 1) {
        field = this.getField(key_fields[i]);
        if (!field.isBlank()) {
            where_clause += delim + field.id + "=" + SQL.Connection.escape(field.get());
            delim = " AND ";
            this.rest_of_key += field.get() + "|";
        } else if (field.auto_generate) {
            auto_generate_field = field;
        } else {
            otherwise_complete = false;
        }
    }

    this.trace("generateKey() gen_field: " + auto_generate_field + ", where_clause: " + where_clause + ", otherwise_complete:" + otherwise_complete);
    if (auto_generate_field) {
        if (key_fields.length === 1) {          // single-field key
            this.insertAutoIncrement();         // calls populateFromKey so sets value already...
            return true;
        }
        if (otherwise_complete) {
            auto_generate_field.set(this.getNewKeyValue(auto_generate_field, where_clause));
            return true;
        }
    }
    return false;
});


module.exports.define("getNewKeyValue", function (auto_generate_field, where_clause) {
    var conn;
    var new_max = 1;
    var resultset;

    if (!where_clause) {
        where_clause = "";
    }
    if (this.using_max_key_table) {
        new_max = Data.entities.get("ac_max_key").generate(this.table, where_clause, this.rest_of_key,
            auto_generate_field.id, this.trans ? this.trans.id : "NULL", this.trans ? this.trans.session : null);
    } else {
        try {
            conn = SQL.Connection.getUncommittedConnection("getNewKeyValue");          // needs a separate connection, outside the transaction
            resultset = conn.executeQuery("SELECT IFNULL(MAX(" + auto_generate_field.id + "), 0) FROM " +
                this.table + where_clause);     // use isolation level read uncommitted
            if (resultset.next()) {
                new_max = resultset.getInt(1) + 1;
            }
        } finally {
            conn.finishedWithResultSet(resultset);
            conn.finishedWithConnection();
        }
    }
    this.debug("getNewKeyValue() new value: " + new_max);
    return new_max;
});


module.exports.define("insertAutoIncrement", function () {
    var auto_incr_col = this.getAutoIncrementColumn();
    var conn = this.getConnection("insertAutoIncrement");

    try {
        conn.executeUpdate(this.getInsertStatement());
        this.db_record_exists = true;
        this.getField(auto_incr_col).setInitial(conn.getAutoIncrement());
        this.db_record_key = this.getField(auto_incr_col).get();
        if (this.trans) {
            this.trans.addToCache(this);
        }
        this.debug("newly generated key: " + this.getKey() + ", or " + this.key + " for " + this);
        conn.executeUpdate("UPDATE " + this.table + " SET _key = " + SQL.Connection.escape(this.key) +
            " WHERE " + auto_incr_col + " = " + SQL.Connection.escape(this.key));
    } finally {
        this.finishedWith(conn);
    }
});


module.exports.define("cloneAutoIncrement", function (spec, init_values) {
    var new_obj;
    spec.modifiable = true;
    spec.action = "C";
    new_obj = this.getRecord(spec);
    new_obj.setDefaultVals();
    Object.keys(init_values).forEach(function (field_id) {
        new_obj.getField(field_id).set(init_values[field_id]);
    });
    new_obj.insertAutoIncrement();
    return new_obj;
});


module.exports.define("keyChange", function (field, old_val) {
    var conn;
    var key_fields = this.primary_key.split(",");
    var prev_key = this.key;
    var temp_key = "";
    var delim = "";
    var i;
    var resultset;
    var result;
    var duplicate_key = false;

    if (this.db_record_exists) {
        this.throwError("key change after record saved");        // Should never happen!
    }
    for (i = 0; i < key_fields.length; i += 1) {
        temp_key += delim + this.getField(key_fields[i]).get();
        delim = ".";
    }
    try {
        this.checkKey(temp_key);
    } catch (ignore) {
        // generateKey(), if successful, calls set() on the numeric key field,
        // which in turn calls keyChange() -
        //    in that 2nd call, temp_key should be valid, so it passes straight over here,
        // so this needs to return
        this.generateKey();
        return;                       // exit whether full key generated or not
    }

    this.debug("key now complete: " + temp_key + " for Entity: " + this.id);
    conn = this.getConnection("keyChange");
    try {
        if (this.trans && this.trans.isInCache(this.id, temp_key)) {
            this.throwError("Key already in cache: " + temp_key + " for " + this);
        } else if (this.using_max_key_table) {
            resultset = conn.executeQuery("SELECT COUNT(*) FROM " + this.table + " WHERE _key=" + SQL.Connection.escape(temp_key));
            if (resultset.next() && resultset.getInt(1) > 0) {
                this.throwError("new key '" + temp_key + "' already exists in db table: " + this.table);
            }
        } else {
            result = conn.executeUpdate(this.getInsertStatement(temp_key));
            if (result !== 1) {
                this.throwError("keyChange() result = " + result);
            }
            this.db_record_exists = true;
            this.db_record_key = temp_key;
        }
        this.key = temp_key;
        if (this.trans) {
            this.trans.addToCache(this, prev_key);
        }
    } catch (e) {
        this.report(e);
        duplicate_key = true;
    } finally {
        this.finishedWith(conn, resultset);
    }
    if (duplicate_key) {
        if (!this.duplicate_key_message) {
            this.duplicate_key_message = this.getMessageManager().add({
                type: "E",
                fixed: true,
            });
        }
        this.duplicate_key_message.text = "key value conflicts with another record: " + temp_key;
    } else if (this.duplicate_key_message) {
        this.getMessageManager().remove(this.duplicate_key_message);
        delete this.duplicate_key_message;
    }
});


module.exports.define("save", function () {
    var conn = this.getConnection("save");
    try {
        if (!this.deleting && !this.isValid()) {
            this.throwError("cannot save invalid record: " + this.getMessageManager().getString());
        }
        if (!this.db_record_exists && !this.using_max_key_table) {
            this.throwError("cannot save db record non-existent");
        }
        this.checkKey(this.key);
        if (this.deleting) {
            this.saveDelete(conn);
        } else if (!this.db_record_exists) {
            this.saveCreate(conn);
        } else {
            this.saveUpdate(conn);
        }
        if (this.transactional && this.trans && this.action) {
            conn.executeUpdate(
                "INSERT INTO ac_tx_sub ( _key, tx, id, entity, key_string, action_type, prev_tx ) VALUES ( '" +
                this.trans.id + "." + this.row_number + "', " + this.trans.id + ", " + this.row_number + ", '" +
                this.id + "', " + SQL.Connection.escape(this.key) + ", '" + this.action + "', " +
                SQL.Connection.escape(this.curr_tx) + " )");
        }
        this.modifiable = false;                // Prevent any further updates
    } finally {
        this.finishedWith(conn);
    }
});


module.exports.define("saveCreate", function (conn) {
    this.action = "C";
    conn.executeUpdate(this.getInsertStatement());
    if (this.transactional) {
        conn.executeUpdate("REPLACE INTO _history_" + this.table +
            " ( " + this.getInsertClause() + " ) VALUES ( " + this.getValuesClause() + " )");
    }
});


module.exports.define("saveUpdate", function (conn) {
    var sql_string = "UPDATE " + this.table + " SET ";
    var delim = "";

    if (!this.db_record_key) {
        this.throwError("expecting db_record_key to be set");
    }
    if (this.trans && this.transactional) {
        sql_string += "_tx=" + this.trans.id + ", ";
    }
    this.each(function (field) {
        if (!field.sql_function && field.isModified()) {
            sql_string += delim + field.getId() + "=" + field.getSQL();
            delim = ", ";
        }
    });
    if (delim) {
        sql_string += " WHERE _key = " + conn.escape(this.db_record_key);
        conn.executeUpdate(sql_string);
        if (this.transactional) {
            conn.executeUpdate("REPLACE INTO _history_" + this.table +
                " ( " + this.getInsertClause() + " ) VALUES ( " + this.getValuesClause() + " )");
        }
    } else {
        this.action = null;
    }
});


module.exports.define("saveDelete", function (conn) {
    var sql_string = "DELETE FROM " + this.table + " WHERE _key='" + this.key + "'";
    var result;

    if (this.db_record_exists) {
        this.action = "D";
        result = conn.executeUpdate(sql_string);
        if (result === 1) {
            this.db_record_exists = false;
        } else {
            this.throwError("delete unsuccessful");
        }
    } else {
        this.action = null;
    }
});


module.exports.define("cancel", function (conn) {
    var sql;
    if (this.using_max_key_table && this.action === "C") {
        try {
            sql = "UPDATE ac_max_key SET highest_val=highest_val-1 WHERE entity='" + this.table +
                "' AND taken_by_tx=" + this.trans.id;
            if (this.rest_of_key) {
                sql += " AND rest_of_key=" + SQL.Connection.escape(this.rest_of_key);
            }
            conn.executeUpdate(sql);
        } catch (e) {
            this.report(e);
        }
    }
});


module.exports.define("getComparator", function (history) {
    var comparator = {};
    this.populateComparatorFromConfig(comparator, history);
    this.populateComparatorFromDatabase(comparator);
    return comparator;
});


module.exports.define("populateComparatorFromConfig", function (comparator, history) {
    var i;
    var field;
    var auto_incr_col = this.getAutoIncrementColumn();

   // make _tx the first field in the PKEY of a _history table so it is indexed for conditions in
   // _tx alone
    if (this.transactional) {
        this.addComparatorItem(comparator, "_tx", "I", history, null, "_tx INT", "INT");
    }
    this.addComparatorItem(comparator, "_key", "C", true, this.getKeyLength(), "_key CHAR(" + this.getKeyLength() + ")");
    comparator._key.table = (history ? "_history_" : "") + this.table;  // eslint-disable-line no-underscore-dangle
    comparator._key.table_key_exists = false;           // eslint-disable-line no-underscore-dangle
    comparator._key.table_key_valid = true;             // eslint-disable-line no-underscore-dangle

    for (i = 0; i < this.getFieldCount(); i += 1) {
        field = this.getField(i);
        if (!field.sql_function) {
            this.addComparatorItem(comparator, field.getId(), field.getDBType(), false,
                field.getDBLength(), field.getDDL(), field.db_int_type);
        }
    }
    if (!history && auto_incr_col) {
        comparator[auto_incr_col].ddl += " AUTO_INCREMENT";
        comparator[auto_incr_col].key = true;
        comparator[auto_incr_col].auto_incr = true;
        // key property used to generate table-level PRIMARY KEY
        comparator._key.key = false;                    // eslint-disable-line no-underscore-dangle
    }
});

module.exports.define("addComparatorItem", function (comparator, id, type, key, len, ddl, int_type) {
    comparator[id] = {
        id: id,
        type: type,
        key: key,
        len: len,
        ddl: ddl,
        delta: "no_column",
        db_int_type: int_type,
        destructive: false,
    };
    return comparator[id];
});

/*
    resultset = this.connection.executeQuery("SELECT * FROM " + localTable +
        " WHERE 1=2", null, function(e) {});
    if (resultset) {
        this.processResultSetMetaData(comparator, resultset.getMetaData());
        resultset.getStatement().close();
    } else {                                // Assume this error is table not found
        comparator._key.delta = "no_table";
    }
*/
module.exports.define("populateComparatorFromDatabase", function (comparator) {
    var col_name;
    var col_is_key;
    var col_auto_incr;
    var count = 0;
    var resultset = SQL.Connection.shared.executeQuery(
        "SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, COLUMN_KEY, EXTRA " +
        "  FROM information_schema.COLUMNS " +  // eslint-disable-next-line no-underscore-dangle
        " WHERE TABLE_SCHEMA='" + SQL.Connection.shared.database + "' AND TABLE_NAME='" + comparator._key.table + "'" +
        " ORDER BY ORDINAL_POSITION");

    while (resultset.next()) {
        col_name = SQL.Connection.getColumnString(resultset, 1);
        col_is_key = (SQL.Connection.getColumnString(resultset, 4) === "PRI");
        col_auto_incr = (SQL.Connection.getColumnString(resultset, 4) === "auto_increment");
        if (comparator[col_name]) {
            this.processSchemaColumn(comparator[col_name],
                SQL.Connection.getColumnString(resultset, 2),
                resultset.getLong(3), col_is_key, col_auto_incr);

            if (col_is_key) {                       // eslint-disable-next-line no-underscore-dangle
                comparator._key.table_key_exists = true;
            }
            if (comparator[col_name].key_delta) {   // eslint-disable-next-line no-underscore-dangle
                comparator._key.table_key_valid = false;
            }
            count += 1;
        } else {
            comparator[col_name] = {
                id: col_name,
                delta: "no_field",
                destructive: true,
            };
        }
    }
    resultset.getStatement().close();
    if (count === 0) {                          // eslint-disable-next-line no-underscore-dangle
        comparator._key.delta = "no_table";
    }
});


module.exports.define("processSchemaColumn", function (col_comparator, col_type, col_length, col_is_key, col_auto_incr) {
    col_comparator.delta = "ok";
    if (col_comparator.type === "I") {
        if (col_type !== col_comparator.db_int_type.toLowerCase()) {
            col_comparator.delta = "not_number";
            col_comparator.destructive = true;
        }
    } else if (col_comparator.type === "B") {
        if (col_type !== "longblob") {
            col_comparator.delta = "not_blob";
            col_comparator.destructive = false;
        }
    } else {
        if (col_length > col_comparator.len) {
            col_comparator.delta = "too_long";
            col_comparator.destructive = true;
        }
        if (col_length < col_comparator.len) {
            col_comparator.delta = "too_short";
            col_comparator.destructive = false;
        }
        if (col_comparator.len <= 255 && col_type !== "char") {
            col_comparator.delta = "not_char";
            col_comparator.destructive = true;
        }
        if (col_comparator.len > 255 && col_type !== "varchar") {
            col_comparator.delta = "not_varchar";
            col_comparator.destructive = true;
        }
    }
    if (col_comparator.key) {
        if (!col_is_key) {
            col_comparator.key_delta = "not_key";
        }
    } else if (col_is_key) {
        col_comparator.key_delta = "is_key";
    }
    if (col_comparator.auto_incr) {
        if (!col_auto_incr) {
            col_comparator.delta = "not_auto_incr";
        }
    } else if (col_auto_incr) {
        col_comparator.delta = "auto_incr";
    }
    if (col_comparator.ddl) {
        col_comparator.ddl += (col_comparator.key ? " NOT NULL" : " NULL");
    }
});


module.exports.define("alterTable", function (comparator, opts) {
    var changes = false;             // eslint-disable-next-line no-underscore-dangle
    var rebuild_primary_keys = (opts.rebuild_primary_keys || !comparator._key.table_key_valid);
    var that = this;
    var drop_auto_incr_ddl;
    var key = "";
    var key_delim = "";
    var sql = "";
    var delim = "";

    if (this.view_only) {
        return false;
    }

    function swallowException(ignore) { return undefined; }
    function addAlterSpec(str) {
        sql += delim + str;
        delim = ", ";
        changes = true;
    }

//   if (!e.toString().match(/Can't DROP '[a-zA-Z0-9_-]*'; check that column\/key exists/)) {
    Object.keys(comparator).forEach(function (column_name) {
        var col_comparator = comparator[column_name];
        // skip destructive DDL if not destructive mode
        if (col_comparator.delta === "auto_incr" || col_comparator.auto_incr) {   // eslint-disable-next-line no-underscore-dangle
            drop_auto_incr_ddl = "ALTER  TABLE " + comparator._key.table + " MODIFY COLUMN " + col_comparator.id + " " + col_comparator.db_int_type + " NULL";
        }
        if (col_comparator.destructive && !opts.destructive) {
            that.debug("Skipping destructive change: " + col_comparator.delta + " " + col_comparator.key_delta + " " + (col_comparator.ddl || column_name));

        // existing auto-incr col must be made non-auto-incr BEFORE DROP KEY
        } else if (col_comparator.delta === "no_field") {
            addAlterSpec("DROP COLUMN " + column_name);
        } else if (col_comparator.delta === "no_column") {
            addAlterSpec("ADD COLUMN " + col_comparator.ddl);
        } else if (col_comparator.delta !== "ok" || col_comparator.key_delta
                || (drop_auto_incr_ddl && col_comparator.auto_incr)) {
            addAlterSpec("MODIFY COLUMN " + col_comparator.ddl);
        }
        if (col_comparator.key) {
            key += key_delim + column_name;
            key_delim = ", ";
        }
        rebuild_primary_keys = rebuild_primary_keys || col_comparator.key_delta;
    });
    if (rebuild_primary_keys) {
        if (drop_auto_incr_ddl) {
            SQL.Connection.shared.executeUpdate(drop_auto_incr_ddl, null, swallowException);
        }             // eslint-disable-next-line no-underscore-dangle
        if (comparator._key.table_key_exists) {    // eslint-disable-next-line no-underscore-dangle
            SQL.Connection.shared.executeUpdate("ALTER  TABLE " + comparator._key.table + " DROP PRIMARY KEY", null, swallowException);            // might not exist so do as separate command
        }
        addAlterSpec("ADD PRIMARY KEY (" + key + ")");
    }
    if (sql) {
//        this.info("ALTER TABLE " + comparator._key.table + " " + sql);
        // eslint-disable-next-line no-underscore-dangle
        SQL.Connection.shared.executeUpdate("ALTER  TABLE " + comparator._key.table + " " + sql);
    }

    return changes;
});


module.exports.define("printDifferences", function (comparator) {
    var that = this;
    Object.keys(comparator).forEach(function (column_name) {
        var col_comparator = comparator[column_name];
        if (col_comparator.delta === "no_field" && col_comparator.id !== "tx_st"
                && col_comparator.id !== "tx_id") {
            that.view.call(col_comparator);
        }
    });
});


module.exports.define("dropTable", function (comparator) {
    var sql = this.getDropTableDDL(comparator);
//    this.info(sql);
    return SQL.Connection.shared.executeUpdate(sql);
});


module.exports.define("getDropTableDDL", function (comparator) {
    // eslint-disable-next-line no-underscore-dangle
    return "DROP TABLE IF EXISTS " + comparator._key.table;
});


module.exports.define("createTable", function (comparator) {
    var sql = this.getCreateTableDDL(comparator);
//    this.info(sql);
    return SQL.Connection.shared.executeUpdate(sql);
});


module.exports.define("getStorageEngine", function () {
    return (this.storage_engine || SQL.Connection.storage_engine);
});


module.exports.define("getCreateTableDDL", function (comparator) {
    var create = "CREATE " + (this.temporary_table ? "TEMPORARY " : "") + "TABLE " +
            comparator._key.table + " (";    // eslint-disable-line no-underscore-dangle
    var that = this;
    var key = "";
    var key_delim = "";

    if (this.view_only) {
        return null;
    }
    Object.keys(comparator).forEach(function (column_name) {
        var col_comparator = comparator[column_name];
        if (col_comparator.ddl) {
            that.trace("Adding column: " + column_name + " with DDL " + col_comparator.ddl);
            create += col_comparator.ddl + ", ";
            if (col_comparator.key) {
                key += key_delim + column_name;
                key_delim = ", ";
            }
        }
    });
    create += " PRIMARY KEY (" + key + ")) ENGINE=" + this.getStorageEngine();
    return create;
});


module.exports.define("rebuildIndexesAndViews", function () {
    var i;
    var name;

    function swallowException(ignore) { return undefined; }
    for (i = 0; this.indexes && i < this.indexes.length; i += 1) {
        name = this.table + (parseInt(i, 10) + 1);
        this.trace("Re-creating index: " + name + " ON " + this.table + " (" + this.indexes[i] + ")");
        SQL.Connection.shared.executeUpdate("DROP   INDEX " + name + " ON " + this.table, null, swallowException);
        SQL.Connection.shared.executeUpdate("CREATE INDEX " + name + " ON " + this.table + " (" + this.indexes[i] + ")");
    }
    for (i = 0; this.views && i < this.views.length; i += 1) {
        name = this.table + (i + 1);
        if (this.view_only && i === (this.views.length - 1)) {
            name = this.table;                    // use table name for main view-only view
            SQL.Connection.shared.executeUpdate("DROP TABLE IF EXISTS " + name);
        }
        SQL.Connection.shared.executeUpdate("DROP VIEW IF EXISTS " + name);
        SQL.Connection.shared.executeUpdate("CREATE VIEW " + name + " AS " + this.views[i]);
    }
});


module.exports.define("refreshKeyColumn", function () {
    var key_fields = this.primary_key.split(",");
    var sql = "";
    var delim = "";
    var i;

    for (i = 0; i < key_fields.length; i += 1) {
        sql += delim + key_fields[i];
        delim = ", '.', ";
    }
    sql = "UPDATE " + this.table + " SET _key = CONCAT(" + sql + ") WHERE _key <> CONCAT(" + sql + ")";
    SQL.Connection.shared.executeUpdate(sql);
});


module.exports.define("findKeyMergeUpdates", function (from_key, to_key, chg_array) {
    var that = this;
    Data.entities.each(function (entity) {
        if (!entity.view_only) {
            entity.each(function (field) {
                if (field.ref_entity === that.id && !field.sql_function) {
                    that.debug("findKeyMergeUpdates() testing field: " + field.owner.id + "." + field.id);
                    field.findKeyMergeUpdates(from_key, to_key, chg_array);
                }
            });
        }
    });
});


module.exports.define("addReferentialIntegrity", function () {
    var table = this.table;
    this.each(function (field) {
        var sql = field.getReferentialIntegrityDDL();
        if (sql) {
            SQL.Connection.shared.executeUpdate("ALTER TABLE " + table + " ADD " + sql);
        }
    });
});


module.exports.define("archive", function (max_trans, ignore, path, non_destructive) {
    var filename = "_history_" + this.id + ".sql";
    var rows;

    if (!this.transactional) {
        return null;
    }
    try {
        SQL.Connection.shared.executeQuery("ALTER TABLE " + this.table + " ADD COLUMN _tx_purge INTEGER");
        SQL.Connection.shared.executeQuery("ALTER TABLE _history_" + this.table + " ADD COLUMN _to_purge CHAR(1)");
        SQL.Connection.shared.executeQuery("UPDATE " + this.table + " A SET A._tx_purge = (SELECT MAX(B._tx) FROM _history_" + this.table + " B WHERE B._key = A._key AND B._tx < " + SQL.Connection.escape(max_trans) + ")");
        SQL.Connection.shared.executeQuery("UPDATE _history_" + this.table + " B, " + this.table + " A SET B._to_purge = 'Y' WHERE A._key = B._key AND B._tx < A._tx_purge");

        if (path) {
            SQL.Connection.dumpTable("_history_" + this.table, path + filename, "_to_purge = 'Y'");
        }
        if (!non_destructive) {
            rows = SQL.Connection.shared.executeUpdate("DELETE FROM _history_" + this.table + " WHERE _to_purge = 'Y'");
            this.debug("Purged " + rows + " rows from _history_" + this.table);
        }
        SQL.Connection.shared.executeQuery("ALTER TABLE " + this.table + " DROP COLUMN _tx_purge");
        SQL.Connection.shared.executeQuery("ALTER TABLE _history_" + this.table + " DROP COLUMN _to_purge");
    } catch (e1) {
        this.report(e1);
    }
    return path ? filename : rows;
});


module.exports.define("rebuild", function (opts) {
    var changes = false;
    var force_drop;
    var comparator;

    if (!opts) {
        opts = {};
    }
    force_drop = opts.force_drop;
    if (this.view_only) {
        this.rebuildIndexesAndViews();
        return null;
    }
    comparator = this.getComparator(false);            // main table, not _history_
    if (comparator._key.delta === "no_table") {    // eslint-disable-line no-underscore-dangle
        force_drop = true;
    }
    if (force_drop) {
        this.dropTable(comparator);
        this.createTable(comparator);
        changes = true;
    } else {
        changes = this.alterTable(comparator, opts);
    }
    if ((changes && opts.destructive) || opts.rebuild_indexes_views) {
        this.rebuildIndexesAndViews();
    }

    if (!this.transactional) {          // no need for _history_ table
        return changes;
    }
    comparator = this.getComparator(true);            // _history_ table this time
    if (comparator._key.delta === "no_table") {    // eslint-disable-line no-underscore-dangle
        force_drop = true;
    }
    if (force_drop) {
        this.dropTable(comparator);
        this.createTable(comparator);
        changes = true;
    } else {
        changes = this.alterTable(comparator, opts);
    }
    return changes;
});


module.exports.define("truncate", function (connection) {
    if (!connection) {
        connection = SQL.Connection.shared;
    }
    return connection.executeUpdate("TRUNCATE TABLE " + this.table);
});


module.exports.define("truncateHistory", function (connection) {
    if (!connection) {
        connection = SQL.Connection.shared;
    }
    return connection.executeUpdate("TRUNCATE TABLE _history_" + this.table);
});

module.exports.define("addColumnsToTable", function (query_table) {
    if (this.primary_key) {
        query_table.addColumn({
            name: "_key",
            visible: true,
        });
    }
    this.each(function (field) {
        if (field.ignore_in_query) {
            return;
        }
        field.addColumnToTable(query_table);
    });
});


module.exports.define("setDefaultSort", function (query) {
    var sort_cols;
    var i;
    var column;

    if (!this.default_order) {
        this.throwError("undefined property");
    }
    sort_cols = this.default_order.split(/\s*,\s*/);
    for (i = 0; i < sort_cols.length; i += 1) {
        column = query.getColumn("A." + sort_cols[i]);
        if (!column) {
            column = query.getColumn("A_" + sort_cols[i]);
            if (!column) {
                this.throwError("unknown sort column: " + sort_cols[i] + " for entity: " + this);
            }
        }
        if (i > 0 && sort_cols[i] === sort_cols[i - 1]) {
            column.sortDesc();
        } else {
            column.sortBottom();
        }
    }
});
