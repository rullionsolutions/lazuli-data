"use strict";

var Data = require("lazuli-data/index.js");
var IO = require("lazuli-io/index.js");


module.exports.main = function (test) {
    var xmlstream = IO.XmlStream.clone({ id: "render", });
    var fieldset;
    var field;

    test.expect(130);

    fieldset = Data.FieldSet.clone({ id: "test_1", });        // basic fieldset
    test.ok(!fieldset.isModifiable(), "FieldSet is by default unmodifiable");
    test.ok(!fieldset.isModified(), "FieldSet is by default initially unmodified");
    test.equal(fieldset.length(), 0, "FieldSet is by default initially empty");
    test.ok(fieldset.isValid(), "FieldSet is by default initially valid");
    test.equal(xmlstream.solo(fieldset), "<render/>", "FieldSet by default initially renders blank");
    field = fieldset.addField({
        id: "name",
        type: "Text",
        regex_pattern: "^[A-Z]['A-Za-z-]*, [A-Z]['A-Za-z- ]*$",
    });
    test.ok(!fieldset.isModified(), "FieldSet is still unmodified");
    test.equal(fieldset.length(), 1, "FieldSet now has 1 field");
    test.ok(fieldset.isValid(), "FieldSet is still valid");
    try {
        field.set("Bryson, Bill");
        test.ok(false, "Can't set a field in an unmodifiable FieldSet");
    } catch (e) {
        test.equal(e.id, "fieldset_not_modifiable", "Unexpected exception: " + e.id);
    }
    test.equal(xmlstream.solo(fieldset),
        "<render><div id=\"name_div\" class=\"css_type_text\"/></render>", "FieldSet renders empty field");
    test.equal(fieldset.getField("name"), field, "Field got by getField(name)");
    test.equal(fieldset.getField(0), field, "Field got by getField(0)");
    test.equal(typeof fieldset.getField("blah"), "undefined", "getField(blah) returns undefined");
    test.equal(typeof fieldset.getField(1), "undefined", "getField(1) returns undefined");
    try {
        fieldset.getField({});
        test.ok(false, "getField({}) throws exception");
    } catch (e) {
        test.equal(e.id, "invalid_argument", "getField({}) throws exception: " + e.id);
    }

    fieldset = Data.FieldSet.clone({
        id: "test_2",
        modifiable: true,
    });        // modifiable fieldset
    test.ok(fieldset.isModifiable(), "FieldSet is modifiable");
    test.ok(!fieldset.isModified(), "FieldSet is by default initially unmodified");
    test.equal(fieldset.length(), 0, "FieldSet is by default initially empty");
    test.ok(fieldset.isValid(), "FieldSet is by default initially valid");
    test.equal(xmlstream.solo(fieldset), "<render/>", "FieldSet by default initially renders blank");

    field = fieldset.addField({
        id: "name",
        type: "Text",
        tb_input: "input-large",
        regex_pattern: "^[A-Z]['A-Za-z-]*, [A-Z]['A-Za-z- ]*$",
    });
    test.ok(!fieldset.isModified(), "FieldSet is still unmodified");
    test.equal(fieldset.length(), 1, "FieldSet now has 1 field");
    test.ok(fieldset.isValid(), "FieldSet is still valid");
    test.equal(xmlstream.solo(fieldset), "<render><div id=\"name_div\" class=\"css_type_text css_edit\"><input id=\"name\" class=\"input-large\" value=\"\" name=\"name\" type=\"text\"/><span class=\"hidden css_render_data\">{\"regex_pattern\":\"^[A-Z]['A-Za-z-]*, [A-Z]['A-Za-z- ]*$\",\"auto_search_oper\":\"CO\"}</span></div></render>", "FieldSet renders field");
    test.equal(field.getSQL(), "null", "getSQL() on blank field returns 'null'");
    test.equal(field.getDBType(), "C", "getDBType() on Text field returns 'C'");
    test.equal(field.getDBLength(), 255, "getDBLength() on Text field returns 255");
    test.equal(field.getDDL(), "name CHAR(255)", "getDDL() on Text field returns 'name CHAR(255)'");

    field.set("Bryson, Bill");
    test.ok(true, "Can set a field in a modifiable FieldSet");
    test.ok(fieldset.isModified(), "FieldSet is modified");
    test.ok(fieldset.isValid(), "FieldSet is still valid");
    test.ok(field.isModified(), "Field is modified");
    test.ok(field.isValid(), "Field is still valid");
    test.equal(field.messages.number, 0, "Field has no error messages");
    test.equal(field.get(), "Bryson, Bill", "Field returns same value");
    test.equal(field.getText(), "Bryson, Bill", "Field returns same value as text label");
    test.equal(xmlstream.solo(fieldset), "<render><div id=\"name_div\" class=\"css_type_text css_edit\"><input id=\"name\" class=\"input-large\" value=\"Bryson, Bill\" name=\"name\" type=\"text\"/><span class=\"hidden css_render_data\">{\"regex_pattern\":\"^[A-Z]['A-Za-z-]*, [A-Z]['A-Za-z- ]*$\",\"auto_search_oper\":\"CO\"}</span></div></render>", "FieldSet renders field");
    test.equal(field.getSQL(), "'Bryson, Bill'", "getSQL() returns 'Bryson, Bill'");
    field.set("Bill Bryson");
    test.ok(!fieldset.isValid(), "FieldSet is now invalid (doesn't match regex)");
    test.ok(!field.isValid(), "Field is now invalid");
    test.equal(field.messages.number, 1, "Field has 1 error message");
    test.equal(field.messages.messages[0].text, "match pattern", "Error is 'match pattern'");
    test.equal(xmlstream.solo(fieldset), "<render><div id=\"name_div\" class=\"css_type_text error css_edit\"><input id=\"name\" class=\"input-large\" value=\"Bill Bryson\" name=\"name\" type=\"text\"/><span class=\"hidden css_render_data\">{\"regex_pattern\":\"^[A-Z]['A-Za-z-]*, [A-Z]['A-Za-z- ]*$\",\"auto_search_oper\":\"CO\"}</span><span class=\"help-inline\">match pattern</span></div></render>", "FieldSet renders field");
    test.equal(field.getSQL(), "'Bill Bryson'", "getSQL() returns 'Bill Bryson'");
    field.setProperty("regex_label", "Name must be of form 'Surname, Firstname'");
    field.validate();
    test.equal(field.messages.messages[0].text, "Name must be of form 'Surname, Firstname'", "Error is 'Name must be of form 'Surname, Firstname''");

    field.set("O'Leary, Michael");
    test.equal(field.getSQL(), "'O''Leary, Michael'", "getSQL() returns 'O''Leary, Michael'");
    test.ok(fieldset.isValid(), "FieldSet is now valid again (set to new name including ')");
    field.set("Moggs, Mary");
    test.ok(fieldset.isValid(), "FieldSet is now valid again (set to new name)");
    test.ok(field.isValid(), "Field is now valid again");
    test.equal(field.messages.number, 0, "Field has 0 error messages");
    field.setProperty("data_length", 10);
    test.ok(!fieldset.isValid(), "FieldSet is now made invalid by a property changes");
    test.ok(!field.isValid(), "Field is now now made invalid by a property changes");
    test.equal(field.messages.number, 1, "Field has 1 error message");
    test.equal(field.messages.messages[0].text, "longer than 10 characters", "Error is 'longer than 10 characters'");
    test.equal(field.getDBLength(), 10, "getDBLength() on Text field returns 10");
    test.equal(field.getDDL(), "name CHAR(10)", "getDDL() on Text field returns 'name CHAR(10)'");

    field.set("");
    test.ok(field.isValid(), "Field is now valid again (set blank)");
    field.setProperty("mandatory", true);
    test.ok(!field.isValid(), "Field is now invalid (mandatory)");
    test.equal(field.messages.number, 1, "Field has 1 error message");
    test.equal(field.messages.messages[0].text, "mandatory", "Error is 'mandatory'");
    field.setProperty("editable", false);
    test.equal(xmlstream.solo(fieldset), "<render><div id=\"name_div\" class=\"css_type_text error\"/></render>", "FieldSet renders field non-editable");
    field.setProperty("editable", true);
    test.equal(xmlstream.solo(fieldset), "<render><div id=\"name_div\" class=\"css_type_text error css_edit css_mand\"><input id=\"name\" class=\"input-large\" value=\"\" size=\"80\"/><span class=\"css_field_errors\">mandatory</span></div></render>", "FieldSet renders field editable");

    field.set("Green, Sue");
    test.ok(field.isValid(), "Field is now valid (mandatory & non-blank, length = data_length)");
    test.equal(xmlstream.solo(fieldset), "<render><div id=\"name_div\" class=\"css_type_text css_edit css_mand\"><input id=\"name\" class=\"input-large\" value=\"Green, Sue\" size=\"80\"/></div></render>", "FieldSet renders field editable");

    field = fieldset.addField({
        id: "birthday",
        type: "Date",
        label: "Someone's Birthday",
        editable: true,
        mandatory: true,
    });
    test.ok(field.isValid(), "Field reports being valid even though mandatory - does NOT automatically call validate() !!!");
    field.validate();
    test.ok(!field.isValid(), "Field is now invalid (mandatory)");
    test.ok(!fieldset.isValid(), "FieldSet is now invalid (mandatory)");
    test.equal(field.messages.number, 1, "Field has 1 error message");
    test.equal(field.messages.messages[0].text, "mandatory", "Error is 'mandatory'");
    field.set("28/02/09");
    test.ok(field.isValid(), "Field is now valid");
    test.ok(fieldset.isValid(), "FieldSet is now valid");
    test.equal(field.messages.number, 0, "Field has 0 error message");
    test.equal(field.getText(), "28/02/09", "Text representation of date");
    test.equal(field.get(), "2009-02-28", "Internal representation of date");
    test.equal(xmlstream.solo(fieldset), "<render><div id=\"name_div\" class=\"css_type_text css_edit css_mand\"><input value=\"Green, Sue\" size=\"80\"/></span><span id=\"birthday\" class=\"css_type_date css_edit css_mand\" val=\"2009-02-28\"><input value=\"28/02/09\" size=\"10\"/></div></render>", "FieldSet renders both fields");
    test.equal(field.getSQL(), "'2009-02-28'", "getSQL() on blank field returns '2009-02-28'");
    test.equal(field.getDBType(), "C", "getDBType() on Text field returns 'C'");
    test.equal(field.getDBLength(), 10, "getDBLength() on Text field returns 10");
    test.equal(field.getDDL(), "birthday CHAR(10)", "getDDL() on Date field returns 'birthday CHAR(10)'");

    field.set("29/02/09");
    test.ok(!field.isValid(), "Field is now invalid (non-existent date)");
    test.ok(!fieldset.isValid(), "FieldSet is now invalid (non-existent date)");
    test.equal(field.messages.number, 1, "Field has 1 error message");
    test.equal(field.messages.messages[0].text, "not a valid date", "Error is 'not a valid date'");
    test.equal(field.getText(), "29/02/09", "Text representation of invalid date");
    test.equal(field.get(), "29/02/09", "Internal representation of invalid date");
    test.equal(xmlstream.solo(field), "<render><div id=\"birthday_div\" class=\"css_type_date error css_edit css_mand\"><input value=\"29/02/09\" size=\"10\"/><span class=\"css_field_errors\">not a valid date</span></div></render>", "Render invalid date field");

    field.set("bleurgh");
    test.ok(!field.isValid(), "Field is now invalid (not a date)");
    test.ok(!fieldset.isValid(), "FieldSet is now invalid (not a date)");
    test.equal(field.messages.number, 1, "Field has 1 error message");
    test.equal(field.messages.messages[0].text, "not a valid date", "Error is 'not a valid date'");
    test.equal(field.getText(), "bleurgh", "Text representation of invalid date");
    test.equal(field.get(), "bleurgh", "Internal representation of invalid date");
    test.equal(xmlstream.solo(field), "<render><div id=\"birthday_div\" class=\"css_type_date error css_edit css_mand\"><input value=\"bleurgh\" size=\"10\"/><span class=\"css_field_errors\">not a valid date</span></div></render>", "Render invalid date field");
    field.set("28/02/09");            // Make birthday field valid again

    field = fieldset.addField({
        id: "age",
        type: "Number",
        label: "Someone's Age",
        editable: true,
        data_length: 10,
    });
    test.ok(field.isValid(), "Field is now valid (blank)");

    field.set("50");
    test.ok(field.isValid(), "Field is now valid (50)");
    test.ok(fieldset.isValid(), "FieldSet is now valid");
    test.equal(field.messages.number, 0, "Field has 0 error message");
    test.equal(field.getText(), "50", "Text representation of number");
    test.equal(field.get(), "50", "Internal representation of number");
    test.equal(xmlstream.solo(fieldset), "<render><div id=\"name_div\" class=\"css_type_text css_edit css_mand\"><input value=\"Green, Sue\" size=\"80\"/></div><div id=\"birthday_div\" class=\"css_type_date css_edit css_mand\" val=\"2009-02-28\"><input value=\"28/02/09\" size=\"10\"/></div><div id=\"age_div\" class=\"css_type_number css_edit\"><input value=\"50\" size=\"10\"/></div></render>", "FieldSet renders all fields");
    test.equal(field.getSQL(), "'50'", "getSQL() on Number field returns '50'");
    test.equal(field.getDBType(), "I", "getDBType() on Number field returns 'C'");
    test.equal(field.getDBLength(), 10, "getDBLength() on Number field returns 10");
    test.equal(field.getDDL(), "age INTEGER", "getDDL() on Number field returns 'age INTEGER'"); //age integer

    field.set("20k");
    test.ok(!field.isValid(), "Field is now invalid (not a number)");
    test.ok(!fieldset.isValid(), "FieldSet is now invalid (not a number)");
    test.equal(field.messages.number, 1, "Field has 1 error message");
    test.equal(field.messages.messages[0].text, "20k is not a number", "Error is '20k is not a number'");
    test.equal(field.getText(), "20k", "Text representation of invalid number");
    test.equal(field.get(), "20k", "Internal representation of invalid number");
    test.equal(xmlstream.solo(field), "<render><div id=\"age_div\" class=\"css_type_number error css_edit\"><input value=\"20k\" size=\"10\"/><span class=\"css_field_errors\">not a number</span></div></render>", "Field renders invalid number");
    field.set("100");            // Make age field valid again

    field = fieldset.addField({
        id: "empl_type",
        type: "Option",
        label: "Employment Type",
        list: "rm.empl_type",
        editable: true,
    });
    test.ok(field.isValid(), "Field is now valid (blank)");
    field.set("P");
    test.ok(field.isValid(), "Field is valid with value P");
    test.ok(fieldset.isValid(), "FieldSet is now valid");
    test.equal(field.messages.number, 0, "Field has 0 error message");
    test.equal(field.getText(), "permanent", "Text representation of value P");
    test.equal(field.get(), "P", "Internal representation of value P");
    test.equal(xmlstream.solo(field), "<render><div id=\"empl_type_div\" class=\"css_type_option css_edit\"><select><option value=\"\">[blank]</option><option value=\"P\" selected=\"selected\">Permanent</option><option value=\"C\">Consultant</option><option value=\"X\">Contractor</option><option value=\"T\">Temp</option></select></div></render>", "Field renders");
    field.set("Q");
    test.ok(!field.isValid(), "Field is now invalid (value Q)");
    test.ok(!fieldset.isValid(), "FieldSet is now invalid (value Q)");
    test.equal(field.messages.number, 1, "Field has 1 error message");
    test.equal(field.messages.messages[0].text, "invalid option: Q", "Error is 'invalid option: Q'");
    test.equal(field.getText(), "[unknown]: Q", "Text representation of invalid option Q");
    test.equal(field.get(), "Q", "Internal representation of invalid option Q");
    test.equal(xmlstream.solo(field), "<render><div id=\"empl_type_div\" class=\"css_type_option error css_edit\"><select><option value=\"\">[blank]</option><option value=\"P\">Permanent</option><option value=\"C\">Consultant</option><option value=\"X\">Contractor</option><option value=\"T\">Temp</option></select><span class=\"css_field_errors\">invalid option: Q</span></div></render>", "Field renders invalid option");
    // LoV.getListLoV("rm.empl_type").getItem("T").active = false;
    field.lov.getItem("T").active = false;
    field.set("T");
    field.validate();
    test.ok(!field.isValid(), "Field is invalid with value T");
    test.ok(!fieldset.isValid(), "FieldSet is now invalid (value T)");
    test.equal(field.messages.number, 1, "Field has 1 error message" + field.messages.number);
    test.equal(field.messages.messages[0].text, "invalid option: T", "Error is 'invalid option: T'");
    field.lov.getItem("T").active = true;
    field.set("T");
    field.validate();
    test.equal(field.getText(), "temp", "Text representation of option T");
    test.equal(field.get(), "T", "Internal representation of option T");
    test.equal(xmlstream.solo(field), "<render><div id=\"empl_type_div\" class=\"css_type_option error css_edit\"><select><option value=\"\">[blank]</option><option value=\"P\">Permanent</option><option value=\"C\">Consultant</option><option value=\"X\">Contractor</option></select><span class=\"css_field_errors\">option is inactive: Temp</span></div></render>", "Field renders invalid option");
    field.set("X");            // Make empl_type field valid again

    field = fieldset.addField({
        id: "empl_type2",
        type: "Attributes",
        label: "Employment Type",
        list: "rm.empl_type",
        editable: true,
    });
    test.ok(field.isValid(), "Field is now valid (blank)");
    field.setItem("P", true);
    test.ok(field.isValid(), "Field is valid with value P");
    test.ok(fieldset.isValid(), "FieldSet is now valid");
    test.equal(field.messages.number, 0, "Field has 0 error message");
    test.equal(field.getText(), "permanent", "Text representation of value P");
    test.equal(field.get(), "|P|", "Internal representation of value |P|");
    // TODO wait until developed
    // test.equal(xmlstream.solo(field), "<render><span id=\"empl_type2\" class=\"css_type_attributes css_edit\" val=\"|P|\">Permanent</span></render>", "Field renders");
    field.setItem("Q", false);
    test.ok(field.isValid(), "Setting invalid item to false has no effect");
    field.setItem("Q", true);
    test.ok(!field.isValid(), "Field is invalid with value P & Q");
    test.equal(field.messages.number, 1, "Field has 1 error message");
    test.equal(field.messages.messages[0].text, "invalid option: Q", "Error is 'invalid option: Q'");
    test.equal(field.getText(), "permanent, [unknown: Q]", "Text representation of value P & Q");
    test.equal(field.get(), "|P|Q|", "Internal representation of value |P|Q|");
    //TODO wait until developed
    //test.equal(xmlstream.solo(field), "<render><span id=\"empl_type2\" class=\"css_type_attributes error css_edit\" val=\"|P|Q|\">Permanent, [unknown: Q]</span></render>", "Field renders");
    field.lov.getItem("T").active = false;
    field.setItem( "T", true );
    field.validate();
    test.ok(!field.isValid(), "Field is invalid with value P, Q & T");
    test.equal(field.messages.number, 2, "Field has 2 error message" + field.messages.number);
    test.equal(field.messages.messages[0].text, "invalid option: Q", "Error is 'invalid option: Q'");
    test.equal(field.messages.messages[1].text, "option is inactive: temp", "Error is 'option is inactive: Temp'");
    test.equal(field.getText(), "permanent, [unknown: Q], temp", "Text representation of value P, Q & T");
    test.equal(field.get(), "|P|Q|T|", "Internal representation of value |P|Q|T|");
    //TODO wait until developed
    //test.equal(xmlstream.solo(field), "<render><span id=\"empl_type2\" class=\"css_type_attributes error css_edit\" val=\"|P|Q|T|\">Permanent, [unknown: Q], Temp</span></render>", "Field renders");
    //LoV.getListLoV("rm.empl_type").getItem("T").status = true;
    field.lov.getItem("T").active = true;
    field.setItem( "Q", false );
    field.validate();
    test.ok(field.isValid(), "Field is valid with value P & T");
    test.equal(field.messages.number, 0, "Field has 0 error message");
    test.equal(field.getText(), "permanent, temp", "Text representation of value P & T");
    test.equal(field.get(), "|P|T|", "Internal representation of value |P|T|");
    //TODO wait until developed
    //test.equal(xmlstream.solo(field), "<render><span id=\"empl_type2\" class=\"css_type_attributes css_edit\" val=\"|P|T|\">Permanent, Temp</span></render>", "Field renders");

    field = fieldset.addField({ id: "user_id", type: "Reference", label: "User", ref_entity: "ac_user", editable: true });
    test.ok(field.isValid(), "Field is now valid (blank)");
    field.set( "batch" );
    field.validate();
    test.ok(field.isValid(), "Field is valid with value 'batch'");
    test.ok(fieldset.isValid(), "FieldSet is now valid");
    test.equal(field.messages.number, 0, "Field has 0 error message");
    test.equal(field.getText(), "Batch Run", "Text representation of value 'batch'");
    test.equal(field.get(), "batch", "Internal representation of value 'batch'");
    test.equal(xmlstream.solo(field), "<render><div id=\"user_id_div\" class=\"css_type_reference css_edit\"><input id=\"user_id\" value=\"Batch Run\" type=\"text\"/><input class=\"hidden\" value=\"batch\" type=\"hidden\" name=\"user_id\"/><span class=\"hidden css_render_data\">{\"auto_search_oper\":\"EQ\",\"autocompleter_max_rows\":10,\"autocompleter_min_length\":2}</span></div></render>", "Field renders");
    field.set( "bleurgh" );
    test.ok(!field.isValid(), "Field is now invalid (value 'bleurgh')");
    test.ok(!fieldset.isValid(), "FieldSet is now invalid (value 'bleurgh')");
    test.equal(field.messages.number, 1, "Field has 1 error message");
    test.equal(field.messages.messages[0].text, "invalid reference: bleurgh", "Error is 'invalid reference: bleurgh'");
    test.equal(field.getText(), "[unknown: bleurgh]", "Text representation of invalid option bleurgh");
    test.equal(field.get(), "bleurgh", "Internal representation of invalid option bleurgh");
    test.equal(xmlstream.solo(field), "<render><div id=\"user_id_div\" class=\"css_type_reference error css_edit\"><input id=\"user_id\" value=\"[unknown: bleurgh]\" type=\"text\"/><input class=\"hidden\" value=\"bleurgh\" type=\"hidden\" name=\"user_id\"/><span class=\"hidden css_render_data\">{\"auto_search_oper\":\"EQ\",\"autocompleter_max_rows\":10,\"autocompleter_min_length\":2}</span><span class=\"help-inline\">invalid reference: bleurgh</span></div></render>", "Field renders invalid option");
    field.set( "batch" );            // Make user_id field valid again

    field = fieldset.addField({ id: "home_page", type: "URL", label: "Home Page", editable: true });
    field.set( "www.google.com" );
    test.ok(field.isValid(), "URL is valid");
    test.equal(field.get(), "www.google.com", "Internal representation of URL is valid");
    test.equal(field.getText(), "www.google.com", "Text representation of URL is valid 3" + field.url);
    test.equal(field.getURL(), "www.google.com", "URL representation of URL is valid 3" + field.getURL());
    test.equal(xmlstream.solo(field), "<render><div id=\"home_page_div\" class=\"css_type_url css_edit\"><input id=\"home_page\" value=\"www.google.com\" name=\"home_page\" type=\"text\"/><span class=\"hidden css_render_data\">{\"auto_search_oper\":\"CO\"}</span></div></render>", "Field renders editable");
    field.editable = false;
    test.equal(xmlstream.solo(field), "<render><div id=\"home_page_div\" class=\"css_type_url\" val=\"www.google.com\"/></render>", "Field renders uneditable");
    field.editable = true;
    field.setProperty( "url_pattern", "../main/some_page?page_key={val}" );
    field.set( "14" );
    test.equal(field.get(), "14", "Internal representation of URL is valid");
    //test.equal(field.getURL(), "../main/some_page?page_key=14", "URL representation of URL is valid");
    test.equal(xmlstream.solo(field), "<render><div id=\"home_page_div\" class=\"css_type_url css_edit\"><input id=\"home_page\" value=\"14\" name=\"home_page\" type=\"text\"/><span class=\"hidden css_render_data\">{\"auto_search_oper\":\"CO\"}</span></div></render>", "Field renders editable");
    field.editable = false;
    test.equal(xmlstream.solo(field), "<render><div id=\"home_page_div\" class=\"css_type_url\" val=\"14\"/></render>", "Field renders uneditable");

    test.done();
};

/*
"use strict";
var Session      = require("../session/Session")
  ;


function isSorted(arr) {
    var len = arr.length - 1, i;
    for (i = 0; i < len; i += 1) {
        if (arr[i].getKey() > arr[i+1].getKey()) {
            return false;
        }
    }
    return true;
}

module.exports.main = function (test) {
    var session      = Session.clone({ user_id: "batch" }),
        trans        = session.getNewTrans(),
        existingRows = trans.getExistingRows();

    test.expect(12);

    test.equal(Array.isArray(existingRows) && existingRows.length, 0, "GetExistingRows expecting an empty array");

    //adding single type rows
    trans.createNewRow("ad_locn");
    trans.createNewRow("ad_locn");

    existingRows = trans.getExistingRows();
    test.equal(Array.isArray(existingRows) && existingRows.length, 2, "GetExistingRows expecting an array with 2 elements without using the entity_id");
    existingRows = trans.getExistingRows("ad_locn");
    test.equal(Array.isArray(existingRows) && existingRows.length, 2, "GetExistingRows expecting an array with 2 elements");

    //adding multiple type rows
    trans.createNewRow("ad_role");

    existingRows = trans.getExistingRows();
    test.equal(Array.isArray(existingRows) && existingRows.length, 3, "GetExistingRows expecting an array with 2 elements without using the entity_id");
    existingRows = trans.getExistingRows("ad_locn");
    test.equal(Array.isArray(existingRows) && existingRows.length, 2, "GetExistingRows expecting an array with 2 elements");
    existingRows = trans.getExistingRows("ad_role");
    test.equal(Array.isArray(existingRows) && existingRows.length, 1, "GetExistingRows expecting an array with 1 elements");

    //removing rows
    trans.removeRow(existingRows[0]);

    existingRows = trans.getExistingRows("ad_role");
    test.equal(Array.isArray(existingRows) && existingRows.length, 0, "GetExistingRows expecting an array with 1 elements");
    existingRows = trans.getExistingRows("ad_locn");
    test.equal(Array.isArray(existingRows) && existingRows.length, 2, "GetExistingRows expecting an array with 1 elements");
    existingRows = trans.getExistingRows();
    test.equal(Array.isArray(existingRows) && existingRows.length, 2, "GetExistingRows expecting an array with 2 elements without using the entity_id");
    trans.cancel();

    //checking array order by key
    trans = session.getNewTrans();
    trans.createNewRow("ad_locn");
    trans.createNewRow("ad_locn");
    trans.createNewRow("ad_role");
    trans.createNewRow("ad_role");
    trans.createNewRow("ad_locn");

    test.ok(isSorted(trans.getExistingRows())         , "GetExistingRows expecting a sorted array");
    test.ok(isSorted(trans.getExistingRows("ad_role")), "GetExistingRows expecting a sorted array");
    test.ok(isSorted(trans.getExistingRows("ad_locn")), "GetExistingRows expecting a sorted array");

    trans.cancel();
    session.close();

    test.done();
};
*/
