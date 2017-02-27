"use strict";

var Core = require("lapis-core/index.js");
var UI = require("lazuli-ui/index.js");
var SQL = require("lazuli-sql/index.js");
var Data = require("lazuli-data/index.js");
var Rhino = require("lazuli-rhino/index.js");

var templates = {};

/**
 * To represent a Worflow
 * @type {x.fields.Text}
 */

// There are two potential flavours here:
// Stored = wf state is stored in this field (which is an Option and exists in the DB table)
// Derived = wf state is derived as a SQL function from other fields


// --- Use of ac_wf_inst_node records ---
// to simplify migrating to this new approach, we'll use the existing ac_wf_inst_node record
// to store active tasks, hence avoiding the need to change task display and security code
//
// to identify stateful-workflow records, their 'icon' field will be set to 'STATEFUL'


// Stored Flavour
// x.fields.WorkflowState = x.fields.Option.clone({
//     id: "WorkflowState",
// });


// Derived Flavour
module.exports = Data.Text.clone({
    id: "WorkflowState",
    editable: false,
    sql_function: "NULL",
    next_seq_number: 0,
});

/*
Rhino.App.defbind("statefulDailyRetest", "dailyBatch", function (session) {
    Data.entities.each(function (entity_id, entity) {
        entity.each(function (field) {
            if (field.type === "WorkflowState") {
                field.dailyRetest(session);
            }
        });
    });
});
*/

module.exports.define("getDailyRetestCondition", function () {
    var condition = "";
    var delim = "";
    var that = this;
    Object.keys(this.wf_states).forEach(function (wf_state) {
        if (that.wf_states[wf_state].auto_transitions) {
            that.wf_states[wf_state].auto_transitions.forEach(function (auto_transition) {
                if (auto_transition.daily_retest) {
                    condition += delim + SQL.Connection.escape(wf_state);
                    delim = ", ";
                }
            });
        }
    });
    return condition;
});


module.exports.define("dailyRetest", function (session) {
    var that = this;
    var trans;
    var row;
    var query = this.owner.getQuery();
    var condition = this.getDailyRetestCondition();
    if (condition !== "") {
        query.addCondition({
            type: SQL.Query.Condition.types.having_cond,
            full_condition: "A_" + that.id + " IN (" + condition + ")",
        });
        while (query.next()) {
            trans = session.getNewTrans();
            try {
                row = query.getRow(trans);
                row.touch();
                trans.save();
            } catch (e) {
                that.error(e);
                that.error(trans.messages.getString());
                trans.cancel();
            }
        }
    }

    query.reset();
});


module.exports.defbind("addLoadEndLogic", "cloneType", function () {
    var that = this;
    if (this.parent !== module.exports) {
        return;
    }
    that.debug("calling addLoadEndLogic");
    Rhino.App.defbind("setupWorkflow_" + this.id, "loadEnd", function () {
        that.debug("calling setupWorkflow");
        that.setupWorkflow();
    });
});


module.exports.define("setupWorkflow", function () {
    var that = this;
    if (!this.wf_states) {
        this.throwError("No wf_states object defined for WorkflowState field");
    }
    this.sql_function = "CASE";
    Object.keys(this.wf_states).forEach(function (wf_state_id) {
        that.setupWorkflowState(wf_state_id);
    });
    this.sql_function += " ELSE 'error' END";

    // needed only while we use ac_wf_inst and ac_wf_inst_node - for backward compatibility
    this.wf_tmpl_id = "swf_" + this.id;         // 25 char limit
    Data.entities.get("ac_wf_inst").templates[this.wf_tmpl_id] = Data.entities.get("ac_wf_inst");
    if (templates[this.wf_tmpl_id]) {
        this.throwError("swf field id already used: " + this.wf_tmpl_id);
    }
    templates[this.wf_tmpl_id] = this;

    // by this point, the field should have an owner which is the Entity
    this.owner.defbind("updateWorkflowState_" + this.id, "presave", function (outcome_id) {
        var wf_field = this.getField(that.id);
        wf_field.presaveEntryPoint(outcome_id);
        this.trans.defbind("checkWorkflowState_" + that.id, "beforeCommit", function () {
            wf_field.checkWorkflowStateAfterSave();
        });
    });
});


module.exports.define("setupWorkflowState", function (wf_state_id) {
    var that = this;
    var wf_state = this.wf_states[wf_state_id];
    if (wf_state.sql_ident_expr) {
        this.sql_function += " WHEN " + wf_state.sql_ident_expr + " THEN " + SQL.Connection.escape(wf_state_id);
    }
    if (wf_state.auto_transitions) {
        wf_state.auto_transitions.forEach(function (transition) {
            that.validateAutoTransition(transition);
        });
    }
    if (wf_state.page_transitions) {
        wf_state.page_transitions.forEach(function (transition) {
            that.validatePageTransition(transition);
        });
    }
    if (wf_state.on_entry_notifications) {
        wf_state.on_entry_notifications.forEach(function (notification) {
            that.validateOnEntryNotification(notification);
        });
    }
});


module.exports.define("validateAutoTransition", function (transition) {
    if (typeof transition.id !== "string") {
        this.throwError("'id' string property required for transition: " + JSON.stringify(transition));
    }
    if (typeof transition.to_state_id !== "string") {
        this.throwError("either 'to_state_id' string property required for transition: " + JSON.stringify(transition));
    }
    if (typeof transition.test_function !== "string" && typeof transition.test_static !== "boolean") {
        this.throwError("'test_function' string property or 'test_static' boolean property required for transition: " + JSON.stringify(transition));
    }
    if (typeof transition.test_function === "string" && typeof this.owner[transition.test_function] !== "function") {
        this.throwError("'test_function' string property does not reference a function property for transition: " + JSON.stringify(transition));
    }
    if (typeof transition.change_action === "string" && typeof this.owner[transition.change_action] !== "function") {
        this.throwError("'change_action' string property does not reference a function property for transition: " + JSON.stringify(transition));
    }
});


module.exports.define("validatePageTransition", function (transition) {
    if (typeof transition.page_id !== "string") {
        this.throwError("'page_id' string property required for transition: " + JSON.stringify(transition));
    }
    if (typeof transition.actor_id !== "string" && transition.actor_id) {
        this.throwError("'actor_id' string property required for transition: " + JSON.stringify(transition));
    }
    if (typeof transition.actor_id === "string" && typeof this.owner["getUserFromActor_" + transition.actor_id] !== "function") {
        this.throwError("'actor_id' string property does not reference a function property for transition: " + JSON.stringify(transition));
    }
    if (typeof transition.to_state_id !== "string" && typeof transition.outcomes !== "object") {
        this.throwError("either 'to_state_id' string property or 'outcomes' object property required for transition: " + JSON.stringify(transition));
    }
    if (typeof transition.change_action === "string" && typeof this.owner[transition.change_action] !== "function") {
        this.throwError("'change_action' string property does not reference a function property for transition: " + JSON.stringify(transition));
    }
    if (typeof transition.set_parameters === "string" && typeof this.owner[transition.set_parameters] !== "function") {
        this.throwError("'set_parameters' string property does not reference a function property for transition: " + JSON.stringify(transition));
    }
});


module.exports.define("validateOnEntryNotification", function (notification) {
    if (typeof notification.recipient_actor !== "string") {
        this.throwError("'recipient_actor' string property required for notification: " + JSON.stringify(notification));
    }
    if (typeof notification.recipient_actor === "string" && typeof this.owner["getUserFromActor_" + notification.recipient_actor] !== "function") {
        this.throwError("'recipient_actor' string property does not reference a function property for on_entry_notifications: " + JSON.stringify(notification));
    }
    if (typeof notification.email_text_string !== "string") {
        this.throwError("'email_text_string' string property required for notification: " + JSON.stringify(notification));
    }
});


module.exports.define("presaveEntryPoint", function (outcome_id) {
    var page_id = this.owner.trans.page && this.owner.trans.page.id;
    this.orig_state_id = (this.owner.action === "C") ? "initial" : this.orig_val;
    this.debug("initial WF state: " + this.orig_state_id + ", at page: " + page_id);
    this.updateWorkflowState(page_id, outcome_id);
});


module.exports.define("updateWorkflowState", function (page_id, outcome_id) {
    var transition = this.getPageTransition(this.orig_state_id, page_id, outcome_id);
    if (transition) {
        this.setCurrentTaskCompleted(page_id);
        this.performTransition(transition);
    } else if (this.orig_state_id === "initial") {
        this.createNewWorkflow();
        this.performTransitionToState("initial");
    } else {
        this.recheckCurrentState();
    }
});

module.exports.define("recheckCurrentState", function () {
    var that = this;
    var this_state = this.getState(this.orig_state_id);
    var next_auto_transition = this.getNextAutoTransition(this_state);
    if (next_auto_transition) {         // support recursive auto_transitions
        this.performTransition(next_auto_transition);
    } else {
        // re-calc actor, due and reminder dates on the active WF task
        this.forEachActiveNode(function (node) {
            that.refreshActiveNode(node, that.orig_state_id);
        });
    }
});


module.exports.define("performTransition", function (transition) {
    if (!transition.to_state_id) {
        this.throwError("invalid transition - no to_state_id: " + transition.id);
    }
    if (transition.to_state_id === this.orig_state_id
            && !transition.allow_transition_to_same_state) {
        this.throwError("already in this state: " + transition.to_state_id);
    }
    this.debug("performTransition() from: " + this.orig_state_id + " to: " + transition.to_state_id);
    if (transition.change_action) {
        if (typeof this.owner[transition.change_action] !== "function") {
            this.throwError("unrecognized change_action: " + transition.change_action);
        }
        this.owner[transition.change_action]();
    }
    this.performTransitionToState(transition.to_state_id);
});


module.exports.define("performTransitionToState", function (to_state_id) {
    var that = this;
    var next_auto_transition;
    var to_state = this.getState(to_state_id);
    if (!to_state) {
        this.throwError("unrecognized state: " + to_state_id);
    }
    next_auto_transition = this.getNextAutoTransition(to_state);
    if (next_auto_transition) {         // support recursive auto_transitions
        this.performTransition(next_auto_transition);
    } else {
        this.debug("entering new state: " + to_state_id);
        this.final_state_id = to_state_id;
        this.sendEntryNotifications(to_state);
        this.forEachActiveNode(function (node) {
            that.skipActiveNode(node);
        });
        this.createNewNodes(to_state);
    }
});


module.exports.define("getState", function (wf_state_id) {
    var wf_state = this.wf_states[wf_state_id];
    if (!wf_state) {
        this.throwError("unrecognized workflow state: " + wf_state_id);
    }
    wf_state.id = wf_state_id;
    return wf_state;
});


// @returns the spec object for the matched transition
//  IF outcome_id is passed in AND the page transition defines multiple outcomes THEN
//  one of them must match the argument and the transition is cloned and any properties
//  defined against the outcome override those of the transition
module.exports.define("getPageTransition", function (wf_state_id, page_id, outcome_id) {
    var transitions = this.getState(wf_state_id).page_transitions;
    var that = this;
    var out = null;
    if (transitions) {
        transitions.forEach(function (transition) {
            if (!out && transition.page_id === page_id) {
                if (outcome_id && transition.outcomes) {
                    if (!transition.outcomes[outcome_id]) {
                        that.throwError("unrecognized outcome: " + outcome_id);
                    }
                    out = Object.create(transition);            // clone main transition spec object
                                    // override any properties defined against the specific outcome
                    Core.Base.addProperties.call(out, transition.outcomes[outcome_id]);
                } else {
                    out = transition;
                }
            }
        });
    }
    this.debug("getPageTransition(): " + out ? JSON.stringify(out) : "none");
    return out;
});


module.exports.define("getNextAutoTransition", function (wf_state) {
    var that = this;
    var out = null;
    if (wf_state.auto_transitions) {
        wf_state.auto_transitions.forEach(function (transition) {
            if (!out) {
                out = that.checkAutoTransition(transition);
            }
        });
    }
    return out;
});


module.exports.define("checkAutoTransition", function (transition) {
    var result;
    if (typeof transition.test_static === "boolean") {
        result = transition.test_static;
    } else {
        if (typeof this.owner[transition.test_function] !== "function") {
            this.throwError("invalid auto_transition test function: " + transition.id);
        }
        result = this.owner[transition.test_function]();
    }
    this.debug("checkAutoTransitions(): " + JSON.stringify(transition) + " -> " + result);
    return result ? transition : null;
});


module.exports.define("sendEntryNotifications", function (wf_state) {
    var that = this;
    var record = this.owner;
    // TODO: send email_text_string to recipient_actor
    if (wf_state.on_entry_notifications && Array.isArray(wf_state.on_entry_notifications)) {
        wf_state.on_entry_notifications.forEach(function (entry_notification) {
            var actor = that.getUserFromActor(entry_notification.recipient_actor);
            var spec = {
                text_string: entry_notification.email_text_string,
            };
            if (actor) {
                spec.to_user = actor;
                record.addValuesToObject(spec, { text_values: true, });

                if (entry_notification.set_parameters
                        && typeof record[entry_notification.set_parameters] === "function") {
                    record[entry_notification.set_parameters](spec);
                }

                record.trans.addEmail(spec);
            } else {
                that.error("Couldn't find actor " + entry_notification.recipient_actor);
            }
        });
    }
});

module.exports.define("forEachActiveNode", function (callback) {
    var query;
    if (!this.active_nodes) {
        this.active_nodes = [];
        query = Data.entities.get("ac_wf_inst_node").getQuery();
        query.addCondition({
            column: "A.wf_inst",
            operator: "=",
            value: this.getWfInstRow().getKey(),
        });
        query.addCondition({
            column: "A.status",
            operator: "=",
            value: "A",
        });
        while (query.next()) {
            this.active_nodes.push(this.getNodeRowFromQuery(query));
        }
        query.reset();
    }
    this.active_nodes.forEach(function (node_row) {
        callback(node_row);
    });
});


module.exports.define("getNodeRowFromQuery", function (query) {
    var row = query.getRow(this.owner.trans);
    var seq_number = row.getField("seq_number").getNumber(0);
    if (seq_number >= this.next_seq_number) {
        this.next_seq_number = seq_number + 1;
    }
    this.debug("row: " + row.getKey() + ", seq_number: " + seq_number + ", next_seq_number: " + this.next_seq_number);
    return row;
});


module.exports.define("setCurrentTaskCompleted", function (page_id) {
    var that = this;
    this.forEachActiveNode(function (node_row) {
        if (node_row.getField("page").get() === page_id) {
            that.setNodeRowCompleted(node_row);
        }
    });
});


module.exports.define("setNodeRowCompleted", function (node_row) {
    node_row.getField("status").set("C");
    node_row.getField("completed_at").set(this.owner.trans.id);
    node_row.getField("completed_by").set(this.owner.trans.session.user_id);
});


module.exports.define("refreshActiveNode", function (node_row, state_id) {
    var actor_id = node_row.getField("actor_id").get();
    var page_id = node_row.getField("page").get();
    var transition = this.getPageTransition(state_id, page_id);
    var activation_dt = node_row.getField("activated_on").get();
    var user_id;

    if (actor_id && !node_row.getField("attributes").isItem("OA")) {
        user_id = this.getUserFromActor(actor_id);
        if (user_id === node_row.getField("assigned_user").get()) {
            this.trace("refreshActiveNode() no change to user_id for actor: " + actor_id);
        } else {
            node_row.changeAssignedUser(user_id);           // use exsiting logic from here....
        }
    }

    node_row.getField("rmdr_date").set(this.getReminderDate(activation_dt, transition));
    node_row.getField("due_date").set(this.getDueDate(activation_dt, transition));
    node_row.getField("wf_inst").getRow().getField("title").set(this.owner.getLabel("workflow_title"));
});


module.exports.define("skipActiveNode", function (node_row) {
        // .setDelete(true);
    if (node_row.getField("status").get() === "A") {
        node_row.getField("status").set("K");
        if (this.active_nodes && this.active_nodes.indexOf(node_row) > -1) {
            this.active_nodes.splice(this.active_nodes.indexOf(node_row), 1);
        }
    }
});


module.exports.define("createNewNodes", function (wf_state) {
    var that = this;
    if (wf_state.page_transitions) {
        wf_state.page_transitions.forEach(function (transition) {
            that.createNewNode(wf_state, transition);
        });
    }
});


module.exports.define("createNewWorkflow", function () {
    var flex;
    this.debug("createNewWorkflow()");
    this.wf_inst_row = this.owner.trans.createNewRow("ac_wf_inst", this.wf_tmpl_id);
    this.wf_inst_row.getField("wf_tmpl").set(this.wf_tmpl_id);
    this.wf_inst_row.getField("entity").set(this.owner.id);
    flex = this.wf_inst_row.getField("base_record");
    flex.reset({
        id: "base_record",
        type: "Reference",
        label: "Base Record",
        ref_entity: this.owner.id,
    });
    flex.set(this.owner.getKey());
    this.wf_inst_row.getField("title").set(this.owner.getLabel("workflow_title"));
    this.wf_inst_row.getField("key_string").set(this.owner.getKey());
    this.wf_inst_row.getField("created_at").set(this.owner.trans.id);
    this.wf_inst_row.getField("created_by").set(this.owner.trans.session.user_id);
});


module.exports.define("createNewNode", function (wf_state, transition) {
    var page = UI.pages.get(transition.page_id);
/*
    var node_row = this.owner.trans.createNewRow("swf_inst_node");
    this.debug("createNewNode(): " + JSON.stringify(transition));
    node_row.getField("entity_id").set(this.owner.id);
    node_row.getField("page_id").set(page.id);
    node_row.getField("page_key").set(this.owner.getKey());
    node_row.getField("actor_id").set(transition.actor_id);
    node_row.getField("assigned_user").set(this.getUserFromActor(transition.actor_id));
    node_row.getField("created_at").set(this.owner.trans.id);
    // node_row.getField("wf_state").set(wf_state_id);
    // node_row.getField("rmdr_date").set();
    // node_row.getField("due_date").set();
*/
    var node_row = this.owner.trans.createNewRow("ac_wf_inst_node", {
        wf_inst: this.getWfInstRow(),
        tmpl_node_id: null,     // this is allowed to be null
    });
    node_row.getField("wf_inst").set(this.getWfInstRow().getKey());
    node_row.getField("seq_number").set(this.next_seq_number);
    this.next_seq_number += 1;
    this.debug("row: " + node_row.getKey() + ", next_seq_number: " + this.next_seq_number);

    node_row.getField("title").set(page.title);
    node_row.getField("page").set(page.id);
    node_row.getField("status").set("A");
    // node_row.getField("prev_node").set();
    // node_row.getField("outcome_id").set();
    if (transition.actor_id) {
        node_row.getField("actor_id").set(transition.actor_id);
    }
    node_row.getField("page_key").set(this.owner.getKey());
    node_row.getField("created_at").set(this.owner.trans.id);
    node_row.getField("activated_at").set(this.owner.trans.id);
    node_row.getField("activated_on").set("today");
    node_row.getField("wf_tmpl_node").set(wf_state.id);
    node_row.getField("icon").set("STATEFUL");

    node_row.getField("attributes").setItem("ST", transition.show_in_taskbar);
    // node_row.getField("attributes").setItem("AU", transition.automatic);
    // node_row.getField("attributes").setItem("SU", transition.skip_if_no_user);
    node_row.getField("attributes").setItem("PD", transition.prevent_delegation);
    node_row.getField("attributes").setItem("SN", transition.skip_notification);
    node_row.getField("attributes").setItem("SM", transition.suppress_activation_message);
    node_row.getField("attributes").setItem("OT", transition.one_time_link_execution);

    // set assigned_user from actor, rmdr_date and due_date
    this.refreshActiveNode(node_row, wf_state.id);
    // this.debug("createNewNode(): " + node_row.isValid() + ", " + node_row.action + ", " +
    //  node_row.isKeyComplete() + ", " + node_row.isModified() + ", " + node_row.getKey());
});


module.exports.define("getWfInstRow", function () {
    var query;
    if (!this.wf_inst_row) {
        query = Data.entities.get("ac_wf_inst").getQuery();
        query.addCondition({
            column: "A.wf_tmpl",
            operator: "=",
            value: this.wf_tmpl_id,
        });
        query.addCondition({
            column: "A.key_string",
            operator: "=",
            value: this.owner.getKey(),
        });
        if (query.next()) {
            if (this.owner.trans) {
                this.wf_inst_row = query.getRow(this.owner.trans);
            } else {
                this.wf_inst_row = Data.entities.get("ac_wf_inst").getRow(query.getColumn("A._key").get());
            }
        }
        query.reset();
        if (!this.wf_inst_row) {
            this.throwError("workflow instance not found");
        }
    }
    return this.wf_inst_row;
});


module.exports.define("getUserFromActor", function (actor_id) {
    var out;
    if (typeof this["getUserFromActor_" + actor_id] === "function") {
        out = this["getUserFromActor_" + actor_id]();
    }
    // allow actor mappings to be defined at entity level
    if (typeof this.owner["getUserFromActor_" + actor_id] === "function") {
        out = this.owner["getUserFromActor_" + actor_id]();
    }
    if (!out) {
        this.throwError("no actor mapping: " + actor_id);
    }
    this.debug("getUserFromActor(): " + actor_id + " -> " + out);
    return out;
});


module.exports.define("getDueDate", function (activation_dt, transition) {
    var out = "";
    if (transition.days_from_activation_to_due) {
        out = Date.parse(activation_dt + "+" + transition.days_from_activation_to_due);
    }
    return out;
});


module.exports.define("getReminderDate", function (activation_dt, transition) {
    var out = "";
    if (transition.days_from_activation_to_reminder) {
        out = Date.parse(activation_dt + "+" + transition.days_from_activation_to_reminder);
    }
    return out;
});


/*
    var keys = Object.keys(this.wf_states);
    keys.forEach(function (state_id) {

    });


module.exports.defbind("checkStateChange", "afterTransChange", function () {
    if (this.processed_state_change) {
        this.throwError("multiple changes of state in one transaction are not supported");
    }
    this.stateChange();
    this.processed_state_change = true;
});


module.exports.define("stateChange", function () {

});

*/


module.exports.define("checkWorkflowStateAfterSave", function () {
    var new_state_id;
    this.owner.reload();      // get new values from database
    new_state_id = this.get();
    if (new_state_id !== this.orig_state_id) {
        if (!this.final_state_id) {
            this.throwError("expecting final_state_id property to be set by performTransition()");
        }
        if (new_state_id !== this.final_state_id) {
            this.throwError("final state mismatch, should be: " + this.final_state_id + ", is: " + new_state_id);
        }
    }
});


module.exports.override("renderNavOptions", function (parent_elem, render_opts, cached_record) {
    var count = 0;
    var wf_inst_id;
    var ul_elem = this.renderDropdownDiv(parent_elem, "nav_" + this.getControl(), "Navigation options for this item");
    try {
        wf_inst_id = this.getWfInstRow().getKey();
        ul_elem.addChild("li").addChild("a")
            .attr("href", UI.pages.get("ac_swf_inst_display").getSimpleURL(wf_inst_id))
            .text("Show Instance");
        count += 1;
    } catch (e1) {
        this.report(e1);
    }
    try {
        ul_elem.addChild("li").addChild("a")
            .attr("href", UI.pages.get("ac_swf_tmpl_display").getSimpleURL() + "&wf_tmpl_id=" + this.wf_tmpl_id)
            .text("Show Template");
        count += 1;
    } catch (e2) {
        this.report(e2);
    }
    return count;
});


module.exports.define("getTemplateDotGraph", function () {
    var that = this;
    var out = "digraph " + this.id + " { "
        + " graph [ penwidth=1 ]; "
        + " node [ fontname=Arial, fontsize=10, shape=box ]; "
        + " edge [ fontname=Arial, fontsize=10 ]; ";

    Object.keys(this.wf_states).forEach(function (wf_state_id) {
        out += that.getTemplateStateDotGraph(wf_state_id);
    });
    out += " }";
    return out;
});


module.exports.define("getTemplateStateDotGraph", function (wf_state_id) {
    var that = this;
    var wf_state = this.getState(wf_state_id);
    var out = wf_state_id + "; ";
    if (wf_state.auto_transitions) {
        wf_state.auto_transitions.forEach(function (transition, seq_number) {
            out += that.getTemplateAutoTransitionDotGraph(wf_state_id, transition, seq_number);
        });
    }
    if (wf_state.page_transitions) {
        wf_state.page_transitions.forEach(function (transition) {
            out += that.getTemplatePageTransitionDotGraph(wf_state_id, transition);
        });
    }
    return out;
});


module.exports.define("getTemplateAutoTransitionDotGraph", function (from_state_id, transition, seq_number) {
    var out = from_state_id + " -> " + transition.to_state_id + " [ label=\"" + seq_number + ". ";
    if (transition.test_function) {
        out += transition.test_function + "()";
    } else {
        out += transition.test_static;
    }
    out += "\" tooltip=\"" + transition.id + "\" style=filled, color=\"#aaaaaa\" ]; ";
    return out;
});


module.exports.define("getTemplatePageTransitionDotGraph", function (from_state_id, transition) {
    var out = "";
    var page = UI.pages.get(transition.page_id);
    function addTransition(to_state_id, title_addl) {
        out += from_state_id + " -> " + to_state_id +
            " [ label=\"" + (page.short_title || page.title) + title_addl + "\"";
        if (transition.actor_id) {
            out += " tooltip=\"actor: " + transition.actor_id;
            if (transition.show_in_taskbar) {
                out += ", show_in_taskbar";
            }
            out += "\"";
        }
        out += " ];";
    }
    if (transition.outcomes) {
        Object.keys(transition.outcomes).forEach(function (outcome_id) {
            addTransition(transition.outcomes[outcome_id].to_state_id, " [" + outcome_id + "]");
        });
    } else {
        addTransition(transition.to_state_id, "");
    }
    return out;
});
