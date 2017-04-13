"use strict";

var Core = require("lapis-core/index.js");
var SQL = require("lazuli-sql/index.js");
var Data = require("lazuli-data/index.js");


/**
* To manage a set of database record updates, ensuring ACID compliance
*/
module.exports = Core.Base.clone({
    id: "Transaction",
    active: false,
    allow_no_modifications: false,
    fully_identify_rows_in_messages: false,
});


module.exports.override("clone", function (spec) {
    var trans;
    var connection;

    if (typeof spec.session !== "object") {
        this.throwError("requires session");
    }
    // moved up to here to open connection now, so that connection.conn.getId() works
    // specifically AVOID putting connection into spec, so that tx_row doesn't use it...
    connection = SQL.Connection.getTransConnection("Trans_" + spec.session.getSessionId());
    connection.executeUpdate("START TRANSACTION");
    // prevent re-creating a dropped connection during transaction
    connection.connection_retries = 1;

    spec.tx_row = Data.entities.get("ac_tx").cloneAutoIncrement(spec, {
        start_point: "now",
        user_id: spec.session.user_id,
        session_id: spec.session.getSessionId(),
        page: ((spec.page && spec.page.id) || ""),
        tx_stat: "P",
        // getId doesn't exist in pooled connection
        mysql_conn_id: ((connection.conn.getId && connection.conn.getId()) || ""),
    });
    spec.id = spec.tx_row.getKey();

    trans = Core.Base.clone.call(this, spec);
    trans.curr_rows = {};            // full key rows
    trans.new_rows = [];            // partial key rows
    trans.messages = trans.getMessageManager();
    trans.connection = connection;
    trans.active = true;
    trans.row_number = 0;
    trans.modified = false;
    trans.next_auto_steps_to_perform = [];
    trans.session.addActiveTransaction(trans);
    return trans;
});


module.exports.define("getMessageManager", function () {
    if (!this.messages) {
        this.messages = Data.MessageManagerTrans.clone({
            id: this.id,
            trans: this,
            instance: true,
        });
    }
    return this.messages;
});


/**
* To create a new row for the given entity in this transaction, which will initially have
* @param string id of the entity
* @return new row object (clone of x.entities[entity_id]) belonging to this transaction
*/
module.exports.define("createNewRow", function (entity, addl_data) {
    var row;
    if (!this.active) {
        this.throwError("transaction not active");
    }
    if (typeof entity === "string") {
        entity = Data.entities.get(entity);
    }
    row = entity.getTransRow(this, "C", null, addl_data);
    this.new_rows.push(row);            // add to new_rows cache before generating key
    row.setDefaultVals();
    row.generateKey();                  // which may move it into the curr_rows cache
    // added to Entity.keyChange() to happen automatically whenever a key field is changed
    row.happen("initCreate");
    if (this.presave_called && !row.presave_called) {
        row.presave(this.presave_outcome_id);
    }
    return row;
});


/**
* To amend an existing row for the given entity in this transaction, whose key cannot be
* @param string id of the entity; string key referencing the row
* @return row object (clone of x.entities[entity_id]) belonging to this transaction
*/
module.exports.define("getActiveRow", function (entity, key) {
    var row;
    if (!this.active) {
        this.throwError("transaction not active");
    }
    if (typeof entity === "string") {
        entity = Data.entities.get(entity);
    }
    row = this.isInCache(entity.id, key);
    if (row) {
        return row;
    }
    row = entity.getTransRow(this, "U", key);
    row.load(key);                    // throws 'Record not found' if not found
    this.addToCache(row);
    row.happen("initUpdate");
    if (this.presave_called && !row.presave_called) {
        row.presave(this.presave_outcome_id);
    }
    return row;
});


module.exports.define("getRow", function (entity, key, addl_data) {
    var row;
    if (!this.active) {
        this.throwError("transaction not active");
    }
    if (typeof entity === "string") {
        entity = Data.entities.get(entity);
    }
    row = this.isInCache(entity.id, key);
    if (row) {
        return row;
    }
    row = entity.getTransRow(this, "", key, addl_data);
    try {
        row.load(key);                // throws 'Record not found' if not found
        // added to Entity.keyChange() to happen automatically whenever a key field is changed
        this.addToCache(row);
        row.action = "U";
        row.happen("initUpdate");
    } catch (ignore) {
        this.new_rows.push(row);            // add to new_rows cache before generating key
        row.action = "C";
        row.populateFromKey(key);
        row.setDefaultVals();
        row.generateKey();                    // which may move it into the curr_rows cache
        row.happen("initCreate");
    }
    if (this.presave_called && !row.presave_called) {
        row.presave(this.presave_outcome_id);
    }
    return row;
});


/**
* To return an array containing each full-key rows in this transaction. Optional filtered
*   by entity Id
* @param Entity id or undefined
* @return Array of entities row or an empty array
*/
module.exports.define("getExistingRows", function (select_entity_id) {
    var rows = [];
    this.doFullKeyRows(function (row) {
        rows.push(row);
    }, select_entity_id);
    rows.sort(function (row1, row2) {
        return row1.getKey() > row2.getKey() ? 1 : -1;
    });
    return rows;
});


module.exports.define("removeRow", function (row) {
    if (!this.active) {
        this.throwError("transaction not active");
    }
    row.cancel();
    if (this.curr_rows[row.id] && this.curr_rows[row.id][row.getKey()]) {
        delete this.curr_rows[row.id][row.getKey()];
    } else if (this.new_rows.indexOf(row) > -1) {
        this.new_rows.splice(this.new_rows.indexOf(row), 1);
    }
});


module.exports.define("doFullKeyRows", function (funct, select_entity_id) {
    var that = this;
    function doRowsForEntity(rows_entity_id) {
        if (that.curr_rows[rows_entity_id]) {
            Object.keys(that.curr_rows[rows_entity_id]).forEach(function (key) {
                funct(that.curr_rows[rows_entity_id][key]);
            });
        }
    }
    if (select_entity_id) {
        doRowsForEntity(select_entity_id);
    } else {
        Object.keys(this.curr_rows).forEach(function (rows_entity_id) {
            doRowsForEntity(rows_entity_id);
        });
    }
});


module.exports.define("doPartialKeyRows", function (funct) {
    var temp_rows = this.new_rows.slice(0);         // avoid mutations in new_rows during execution
    var i;
    for (i = 0; i < temp_rows.length; i += 1) {
        funct(temp_rows[i]);
    }
});


module.exports.define("addToCache", function (row, prev_key) {
    var entity = row.id;
    var key = row.getKey();
    var new_row;

    row.checkKey(key);          // throws errort if incomplete
    if (this.curr_rows[entity] && this.curr_rows[entity][key]) {
        this.throwError("id already present in cache: " + entity + ":" + key);
    }
    new_row = this.new_rows.indexOf(row);
    if (new_row > -1) {
        this.new_rows.splice(new_row, 1);      // Remove row from new_rows
        this.debug("Removing row from new_rows cache: " + entity + ":" + key);
    }
    if (prev_key && this.curr_rows[entity] && this.curr_rows[entity][prev_key] === row) {
        this.debug("Removing row from curr_rows cache: " + entity + ":" + prev_key);
        delete this.curr_rows[entity][prev_key];
    }

    this.debug("Adding row to curr_rows cache: " + entity + ":" + key);
    if (!this.curr_rows[entity]) {
        this.curr_rows[entity] = {};
    }
    this.curr_rows[entity][key] = row;

    this.debug("Checking for parent_record updates: " + entity + ":" + key);
    // do full-key rows first; a partial-key row may be turned into a full-key row by this call
    this.doFullKeyRows(function (child_row) {
        if (child_row.parent_record === row && child_row.trans_link_field) {
            child_row.getField(child_row.trans_link_field).set(key);
        }
    });
    this.doPartialKeyRows(function (child_row) {
        if (child_row.parent_record === row && child_row.trans_link_field) {
            child_row.getField(child_row.trans_link_field).set(key);
        }
    });
});


module.exports.define("isInCache", function (entity, key) {
    return this.curr_rows[entity] && this.curr_rows[entity][key];
});


module.exports.define("setModified", function () {
    this.modified = true;
});


module.exports.define("isModified", function () {
    return this.modified;
});


module.exports.define("isValid", function () {
    var valid = true;
    this.doFullKeyRows(function (row) {
        if (!row.deleting && row.isModified()) {
            valid = valid && row.isValid();
        }
    });
    this.doPartialKeyRows(function (row) {
        if (!row.deleting) {
            valid = valid && row.isValid();
        }
    });
    valid = valid && !this.messages.error_recorded;
    return valid;
//    return this.messages.isValid();
});


module.exports.define("isActive", function () {
    return this.active && this.session.active;
});


module.exports.define("getStatus", function () {
    if (this.saved) {
        return "S";
    } else if (!this.active) {
        return "I";
    } else if (this.isValid()) {
        return "V";
    }
    return "N";
});


module.exports.define("update", function () {
    if (!this.active) {
        this.throwError("transaction not active");
    }
    if (this.presave_called) {
        this.throwError("presave already called");
    }
    this.doPartialKeyRows(function (row) {
        if (row.isModified()) {
            row.update();
        }
    });
    this.doFullKeyRows(function (row) {
        row.update();
    });
});


module.exports.define("getRowCount", function (modified_only) {
    if (modified_only) {
        return this.getFullKeyRowCount(modified_only) + this.getPartialKeyRowCount(modified_only);
    }
    return this.row_number;
});


module.exports.define("getFullKeyRowCount", function (modified_only) {
    var count = 0;
    this.doFullKeyRows(function (row) {
        if (!modified_only || row.isModified()) {
            count += 1;
        }
    });
    return count;
});


module.exports.define("getPartialKeyRowCount", function (modified_only) {
    var count = 0;
    if (modified_only) {
        this.doPartialKeyRows(function (row) {
            if (row.isModified()) {
                count += 1;
            }
        });
        return count;
    }
    return this.new_rows.length;
});


module.exports.define("getPartialKeyRowsDescription", function () {
    var text = "";
    var delim = "";
    this.doPartialKeyRows(function (row) {
        text += delim + row.id;
        delim = ", ";
    });
    return text;
});


module.exports.define("presave", function (outcome_id) {
    var partial_key_rows = 0;
    if (!this.active) {
        this.throwError("transaction not active");
    }
    if (this.presave_called) {
        this.throwError("presave already called");
    }
    this.presave_called = true;
    this.presave_outcome_id = outcome_id;
    this.doPartialKeyRows(function (row) {
        if (!row.deleting) {
            partial_key_rows += 1;
        }
    });
    if (partial_key_rows > 0) {
        this.messages.add({
            type: "E",
            text: partial_key_rows + " partial-key rows still exist: " +
            this.getPartialKeyRowsDescription(),
        });
    }
    this.doFullKeyRows(function (row) {
        if (row.isModified() && !row.presave_called) {
            row.presave(outcome_id);
        }
    });
});


module.exports.define("save", function (outcome_id) {
    if (!this.active) {
        this.throwError("transaction not active");
    }
    if (!this.presave_called) {     // page calls trans.presave() separately before trans.save()
        this.presave(outcome_id);   // if transation used outside of page, ensure presave() called
    }
    if (!this.isModified() && !this.allow_no_modifications) {
        this.messages.add({
            type: "E",
            text: "Transaction not modified so won't save",
        });
    }
    if (!this.isValid()) {
        this.throwError("transaction invalid");
    }
    try {
        this.doFullKeyRows(function (row) {
            if (row.isModified()) {
                row.save();
            }
        });
        if (!this.active) {
            this.throwError("transaction not active");
        }
        this.tx_row.getField("tx_stat").set("A");
        this.tx_row.getField("commit_point").set("NOW");
        this.tx_row.getField("outcome").set(outcome_id || "");
        this.tx_row.save();
        this.connection.executeUpdate("COMMIT");
        this.saved = true;
        // Data.LoV.clearLoVCache(this.session);
    // } catch (e) {
    //     throw e;
    } finally {
        if (!this.saved) {
            this.connection.executeUpdate("ROLLBACK");
            this.connection.executeUpdate("UPDATE ac_tx SET tx_stat='C' WHERE id = " + this.id);    // C = cancelled
            this.connection.executeUpdate("COMMIT");
        }
        this.active = false;
        this.connection.finishedWithConnection();
        this.session.removeActiveTransaction(this.id);
    }
    // this.performNextAutoSteps();
});


module.exports.define("cancel", function () {
    if (!this.active) {
        this.throwError("transaction not active");
    }
    this.session.removeActiveTransaction(this.id);
    this.connection.executeUpdate("ROLLBACK");
    this.doFullKeyRows(function (row) {
        row.cancel(SQL.Connection.shared);               // use the auto-committing connection
    });
    this.connection.finishedWithConnection();           // C = cancelled
    SQL.Connection.shared.executeUpdate("UPDATE ac_tx SET tx_stat='C' WHERE id = " + this.id);
// Don't want to do this normally
//    this.reportErrors();
    this.active = false;
});
