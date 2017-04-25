"use strict";

var Data = require("lazuli-data/index.js");


// ---------------------------------------------------------------------------- DateRange
/**
* To represent a period of time visually as a block
* Designed to be computed only - never rendered editable!
* value should be 'yyyy-MM-dd' for single-day event, or 'yyyy-MM-dd yyyy-MM-dd'
* for a multi-day event
*/

module.exports = Data.Text.clone({
    id                      : "DateRange",
    css_type                : "daterange",
    data_length             : -1,           // Ignore in Text.validate()
    total_width_pixels      : 484,          // 12 * pix per tick
    pixels_per_tick         : 42,
    pixels_per_day          : null,         // set by setTotalDateRange()
    zero_date               : null          // set by setTotalDateRange()
});


module.exports.define("isMultiDay", function () {
    return (this.get().length === 21);
});


module.exports.define("getStart", function () {
    if (!this.isBlank()) {
        return this.get().substr(0, 10);
    }
    return "";
});


module.exports.define("getEnd", function () {
    if (this.isMultiDay()) {
        return this.get().substr(11, 10);
    }
    if (!this.isBlank()) {
        return this.get().substr(0, 10);
    }
    return "";
});


module.exports.override("getTextFromVal", function () {
    var val = Date.parse(this.getStart()).display();
    if (this.isMultiDay()) {
        val += " - " + Date.parse(this.getEnd()).display();
    }
    return val;
});

module.exports.define("renderListHeader", function (row_elmt, render_opts, css_class) {
    var i = 0;
    var elmt = row_elmt.makeElement("th", (css_class || "") + " daterange");

    if (this.width) {
        elmt.attr("style", "width: " + this.width);
    }
    if (this.min_width) {
        elmt.attr("style", "min-width: " + this.min_width);
    }
    if (this.max_width) {
        elmt.attr("style", "max-width: " + this.max_width);
    }
    if (this.description && render_opts.dynamic_page !== false) {
        elmt.makeTooltip(this.hover_text_icon, this.description);
        elmt.text("&nbsp;", true);
    }
    elmt.makeElement("div").text(this.label);
    elmt = elmt.makeElement("div");
    while (((i * this.pixels_per_tick) / this.pixels_per_day) < this.days_range) {
    // while ((i * this.pixels_per_tick) < this.total_width_pixels) {
        elmt.makeElement("span").text(this.getTickLabel(i));
        i += 1;
    }
});

module.exports.override("renderCell", function (row_elem, render_opts) {
    var cell_elem = row_elem.makeElement("td", "daterange");
    return this.renderFormGroup(cell_elem, render_opts, "table-cell");
});


module.exports.define("getTickLabel", function (i) {
    var date = Date.parse(this.zero_date + "+" + i + this.scale);
    var out = date.format(this.tick_label_format);

    if (this.scale === "months") {
        out = out.substr(0, 3);
    }
    return out;
});


module.exports.override("renderUneditable", function (elem, render_opts) {
    var inner;

    if (this.isBlank()) {
        return;
    }
    inner = elem.makeElement("a");
    inner.attr("rel", "tooltip");
    inner.attr("title", this.getText());
    inner.attr("style", this.getUneditableCSSStyle());

    if (!this.isMultiDay()) {
        inner.attr("class", "css_daterange_milestone");
        inner.text("🔹");      // ◊
    } else {
        inner.attr("class", "css_daterange_iteration");
    }
/*
    svg  = elem.makeElement("svg");
    rect = svg .makeElement("rect");
    rect.attr("x", String(start * this.pixels_per_day));
    rect.attr("y", "0");
    rect.attr("width" , String((this.getDaysFromZero(this.getEnd()) - start) *
         this.pixels_per_day));
    rect.attr("height", String(this.height));
*/
});


module.exports.override("getUneditableCSSStyle", function () {
    var out = "";
    var positioning = this.getPositioning();

    if (!this.isBlank()) {
        out = "margin-left: " + positioning.left_offset_pixels + "px; " +
            "width: " + positioning.width_pixels + "px;";

        if (positioning.colour) {
            out += " color: " + positioning.colour + ";";
        }
    }
    return out;
});


module.exports.define("getPositioning", function () {
    var out = {};
    if (!this.isBlank()) {
        out.start_days_from_zero = this.getDaysFromZero(this.getStart());
        out.end_days_from_zero = this.getDaysFromZero(this.getEnd());
        out.days_between = out.end_days_from_zero - out.start_days_from_zero;
        out.left_offset_pixels = out.start_days_from_zero * this.pixels_per_day;
        out.width_pixels = out.days_between * this.pixels_per_day;
        out.colour = null;
    }
    this.debug("DateRange.getPositioning(): " + JSON.stringify(out));
    return out;
});


module.exports.define("setTotalDateRange", function (from_dt, to_dt) {
    this.days_range = Date.parse(from_dt).daysBetween(Date.parse(to_dt));
    if (this.days_range > 0) {
        this.pixels_per_day = this.total_width_pixels / this.days_range;
    } else {
        this.pixels_per_day = 1;
    }
    this.zero_date = from_dt;

    if (this.pixels_per_day >= this.pixels_per_tick) {
        this.scale = "days";
        this.tick_label_format = "d/M";
        this.pixels_per_day = this.pixels_per_tick;
    } else if (this.pixels_per_day >= (this.pixels_per_tick / 7)) {
        this.scale = "weeks";
        this.tick_label_format = "d/M";
        this.zero_date = Date.parse(from_dt + "+week-start").internal();
        this.pixels_per_day = (this.pixels_per_tick / 7);
    } else if (this.pixels_per_day >= (this.pixels_per_tick / 30.5)) {
        this.scale = "months";
        this.tick_label_format = "MMM";
        this.zero_date = Date.parse(from_dt + "+month-start").internal();
        this.pixels_per_day = (this.pixels_per_tick / 30.5);
    } else {
        this.scale = "years";
        this.tick_label_format = "y";
        this.zero_date = Date.parse(from_dt + "+year-start").internal();
        this.pixels_per_day = (this.pixels_per_tick / 365);
    }

    this.debug("setTotalDateRange: " + this.days_range + ", " + this.zero_date + ", " + this.scale + ", " + this.pixels_per_day);
});

/*
Let U be the (fixed) horizontal tick interval in pixels - 20px
scale   1 - U = 1 day       d
        2 - U = 1 week      w
        3 - U = 1 month     m
*/


module.exports.define("getDaysFromZero", function (date_str) {
    var days_between = 0;
    if (date_str && this.zero_date) {
        days_between = Date.parse(this.zero_date).daysBetween(Date.parse(date_str));
    }
    return days_between;
});


module.exports.define("getColour", function () {
    return "";
});
