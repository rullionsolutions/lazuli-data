/*jslint node: true */
"use strict";

var FieldSet = require("./FieldSet");

require("./Area");
require("./Entity");
require("./EntitySQL");
require("./Transaction");
require("./LoV");

// Fields

FieldSet.registerFieldType(require("./Text"));
require("./TextSQL");
require("./TextRender");
FieldSet.registerFieldType(require("./Attributes"));
FieldSet.registerFieldType(require("./Binary"));
FieldSet.registerFieldType(require("./Boolean"));
FieldSet.registerFieldType(require("./Date"));
FieldSet.registerFieldType(require("./DateTime"));
FieldSet.registerFieldType(require("./InternalLink"));
FieldSet.registerFieldType(require("./Number"));
FieldSet.registerFieldType(require("./Money"));			// Money inherits from Number
FieldSet.registerFieldType(require("./Option"));
FieldSet.registerFieldType(require("./Password"));
FieldSet.registerFieldType(require("./Reference"));
FieldSet.registerFieldType(require("./Textarea"));
FieldSet.registerFieldType(require("./URL"));
