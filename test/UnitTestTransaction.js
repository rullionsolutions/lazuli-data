/* global module, require */

"use strict";

var Test = require("lazuli-test/UnitTests.js");

module.exports = Test.clone({
    id: "UnitTestTransaction",
});

module.exports.override("test", function () {
    var session;
    var trans;
    var existingRows;

    session = this.changeSession("batch");
    trans = session.getNewTrans();

    existingRows = trans.getExistingRows();
    this.assert(Array.isArray(existingRows) && existingRows.length === 0, "GetExistingRows expecting an empty array");

    // adding single type rows
    trans.createNewRow("ad_locn");
    trans.createNewRow("ad_locn");

    existingRows = trans.getExistingRows();
    this.assert(Array.isArray(existingRows) && existingRows.length === 2, "GetExistingRows expecting an array with 2 elements without using the entity_id");
    existingRows = trans.getExistingRows("ad_locn");
    this.assert(Array.isArray(existingRows) && existingRows.length === 2, "GetExistingRows expecting an array with 2 elements");

    // adding multiple type rows
    trans.createNewRow("ad_role");

    existingRows = trans.getExistingRows();
    this.assert(Array.isArray(existingRows) && existingRows.length === 3, "GetExistingRows expecting an array with 2 elements without using the entity_id");
    existingRows = trans.getExistingRows("ad_locn");
    this.assert(Array.isArray(existingRows) && existingRows.length === 2, "GetExistingRows expecting an array with 2 elements");
    existingRows = trans.getExistingRows("ad_role");
    this.assert(Array.isArray(existingRows) && existingRows.length === 1, "GetExistingRows expecting an array with 1 elements");

    // removing rows
    trans.removeRow(existingRows[0]);

    existingRows = trans.getExistingRows("ad_role");
    this.assert(Array.isArray(existingRows) && existingRows.length === 0, "GetExistingRows expecting an array with 1 elements");
    existingRows = trans.getExistingRows("ad_locn");
    this.assert(Array.isArray(existingRows) && existingRows.length === 2, "GetExistingRows expecting an array with 1 elements");
    existingRows = trans.getExistingRows();
    this.assert(Array.isArray(existingRows) && existingRows.length === 2, "GetExistingRows expecting an array with 2 elements without using the entity_id");
    trans.cancel();

    // checking array order by key
    trans = session.getNewTrans();
    trans.createNewRow("ad_locn");
    trans.createNewRow("ad_locn");
    trans.createNewRow("ad_role");
    trans.createNewRow("ad_role");
    trans.createNewRow("ad_locn");

    this.assert(this.isSorted(trans.getExistingRows()), "GetExistingRows expecting a sorted array");
    this.assert(this.isSorted(trans.getExistingRows("ad_role")), "GetExistingRows expecting a sorted array");
    this.assert(this.isSorted(trans.getExistingRows("ad_locn")), "GetExistingRows expecting a sorted array");

    trans.cancel();
    session.close();
});

module.exports.define("isSorted", function (arr) {
    var len = arr.length - 1;
    var i;
    for (i = 0; i < len; i += 1) {
        if (arr[i].getKey() > arr[i + 1].getKey() === 1) {
            return false;
        }
    }
    return true;
})
;