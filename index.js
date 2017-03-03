"use strict";

var Core = require("lapis-core/index.js");

exports.Area = require("lazuli-data/Area.js");

exports.areas = Core.Collection.clone({
    id: "areas",
    item_type: exports.Area,
});

exports.FieldSet = require("lazuli-data/FieldSet.js");
exports.Entity = require("lazuli-data/Entity.js");
require("lazuli-data/Entity-SQL.js");         // adds to Entity

exports.entities = Core.Collection.clone({
    id: "entities",
    item_type: exports.Entity,
});

exports.Transaction = require("lazuli-data/Transaction.js");
exports.LoV = require("lazuli-data/LoV.js");
exports.Form = require("lazuli-data/Form.js");

exports.forms = Core.Collection.clone({
    id: "forms",
    item_type: exports.Form,
});

exports.MessageManagerTrans = require("lazuli-data/MessageManagerTrans.js");
exports.MessageManagerRecord = require("lazuli-data/MessageManagerRecord.js");
exports.MessageManagerField = require("lazuli-data/MessageManagerField.js");

// Fields
exports.Text = require("lazuli-data/fields_core/Text.js");
require("lazuli-data/fields_core/Text-SQL.js");
require("lazuli-data/fields_core/Text-Render.js");

exports.fields = Core.Collection.clone({
    id: "fields",
    item_type: exports.Text,
});

exports.fields.add(exports.Text);
exports.fields.add(exports.Attributes = require("lazuli-data/fields_core/Attributes.js"));
exports.fields.add(exports.Boolean = require("lazuli-data/fields_core/Boolean.js"));
exports.fields.add(exports.Date = require("lazuli-data/fields_core/Date.js"));
exports.fields.add(exports.DateTime = require("lazuli-data/fields_core/DateTime.js"));
exports.fields.add(exports.Email = require("lazuli-data/fields_core/Email.js"));
exports.fields.add(exports.InternalLink = require("lazuli-data/fields_core/InternalLink.js"));
exports.fields.add(exports.Number = require("lazuli-data/fields_core/Number.js"));
exports.fields.add(exports.Money = require("lazuli-data/fields_core/Money.js"));        // Money inherits from Number
exports.fields.add(exports.Option = require("lazuli-data/fields_core/Option.js"));
exports.fields.add(exports.Password = require("lazuli-data/fields_core/Password.js"));
exports.fields.add(exports.Postcode = require("lazuli-data/fields_core/Postcode.js"));
exports.fields.add(exports.Reference = require("lazuli-data/fields_core/Reference.js"));
exports.fields.add(exports.File = require("lazuli-data/fields_core/File.js"));          // File inherits from Reference
exports.fields.add(exports.Textarea = require("lazuli-data/fields_core/Textarea.js"));
exports.fields.add(exports.URL = require("lazuli-data/fields_core/URL.js"));
exports.fields.add(exports.WorkflowState = require("lazuli-data/fields_core/WorkflowState.js"));

exports.fields.add(exports.Binary = require("lazuli-data/fields_supl/Binary.js"));
exports.fields.add(exports.Combo = require("lazuli-data/fields_supl/Combo.js"));
exports.fields.add(exports.ContextButton = require("lazuli-data/fields_supl/ContextButton.js"));
exports.fields.add(exports.DateRange = require("lazuli-data/fields_supl/DateRange.js"));
exports.fields.add(exports.DotGraph = require("lazuli-data/fields_supl/DotGraph.js"));
exports.fields.add(exports.Duration = require("lazuli-data/fields_supl/Duration.js"));
exports.fields.add(exports.Flex = require("lazuli-data/fields_supl/Flex.js"));
exports.fields.add(exports.LoVCounter = require("lazuli-data/fields_supl/LoVCounter.js"));
exports.fields.add(exports.NINumber = require("lazuli-data/fields_supl/NINumber.js"));
exports.fields.add(exports.Time = require("lazuli-data/fields_supl/Time.js"));
exports.fields.add(exports.Event = require("lazuli-data/fields_supl/Event.js"));
