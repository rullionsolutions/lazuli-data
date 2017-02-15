"use strict";


exports.Area = require("lazuli-data/Area.js");

exports.FieldSet = require("lazuli-data/FieldSet.js");
exports.Entity = require("lazuli-data/Entity.js");
require("lazuli-data/Entity-SQL.js");         // adds to Entity

exports.Transaction = require("lazuli-data/Transaction.js");
exports.LoV = require("lazuli-data/LoV.js");
exports.Form = require("lazuli-data/Form.js");
exports.MessageManagerTrans = require("lazuli-data/MessageManagerTrans.js");
exports.MessageManagerRecord = require("lazuli-data/MessageManagerRecord.js");
exports.MessageManagerField = require("lazuli-data/MessageManagerField.js");

// Fields
exports.Text = require("lazuli-data/Text.js");
require("lazuli-data/Text-SQL.js");
require("lazuli-data/Text-Render.js");

exports.Text.registerFieldType(exports.Attributes = require("lazuli-data/Attributes.js"));
exports.Text.registerFieldType(exports.Binary = require("lazuli-data/Binary.js"));
exports.Text.registerFieldType(exports.Boolean = require("lazuli-data/Boolean.js"));
exports.Text.registerFieldType(exports.Date = require("lazuli-data/Date.js"));
exports.Text.registerFieldType(exports.DateTime = require("lazuli-data/DateTime.js"));
exports.Text.registerFieldType(exports.DotGraph = require("lazuli-data/DotGraph.js"));
exports.Text.registerFieldType(exports.Duration = require("lazuli-data/Duration.js"));
exports.Text.registerFieldType(exports.Email = require("lazuli-data/Email.js"));
exports.Text.registerFieldType(exports.Flex = require("lazuli-data/Flex.js"));
exports.Text.registerFieldType(exports.InternalLink = require("lazuli-data/InternalLink.js"));
exports.Text.registerFieldType(exports.NINumber = require("lazuli-data/NINumber.js"));
exports.Text.registerFieldType(exports.Number = require("lazuli-data/Number.js"));
exports.Text.registerFieldType(exports.Money = require("lazuli-data/Money.js"));        // Money inherits from Number
exports.Text.registerFieldType(exports.Option = require("lazuli-data/Option.js"));
exports.Text.registerFieldType(exports.Password = require("lazuli-data/Password.js"));
exports.Text.registerFieldType(exports.Postcode = require("lazuli-data/Postcode.js"));
exports.Text.registerFieldType(exports.Reference = require("lazuli-data/Reference.js"));
exports.Text.registerFieldType(exports.File = require("lazuli-data/File.js"));          // File inherits from Reference
exports.Text.registerFieldType(exports.Textarea = require("lazuli-data/Textarea.js"));
exports.Text.registerFieldType(exports.URL = require("lazuli-data/URL.js"));
exports.Text.registerFieldType(exports.WorkflowState = require("lazuli-data/WorkflowState.js"));
