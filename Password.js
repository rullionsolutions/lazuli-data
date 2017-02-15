"use strict";

var Data = require("lazuli-data/index.js");

/**
* To represent a password field
*/
module.exports = Data.Text.clone({
    id: "Password",
    css_type: "password",
    data_length: 80,            // needs to store the MD5 hash
    input_type: "password",
    regex_pattern: "((?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{6,20})",
    regex_label: "between 6 and 20 characters, including at least 1 digit, 1 uppercase and 1 lowercase",
});

/* Regex to validate passwords:
 *
(                       # Start of group
  (?=.*\d)              #   must contains one digit from 0-9
  (?=.*[a-z])           #   must contains one lowercase characters
  (?=.*[A-Z])           #   must contains one uppercase characters
  (?=.*[@#$%])          #   must contains one special symbols in the list "@#$%"
              .         #     match anything with previous condition checking
                {6,20}  #        length at least 6 characters and maximum of 20
)                       # End of group */

// prevent logging the actual value being set
module.exports.override("set", function (new_val) {
    return this.setInternal(new_val);
});
