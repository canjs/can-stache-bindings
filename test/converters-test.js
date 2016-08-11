require("can-stache-bindings");
var canEvent = require("can-event");
var DefineList = require("can-define/list/list");
var DefineMap = require("can-define/map/map");
var stache = require("can-stache");

var QUnit = require("steal-qunit");

QUnit.module("Converters - boolean-to-inList");

QUnit.test("Works with checkboxes", function(){
	var template = stache("<input type='checkbox' {($checked)}='boolean-to-inList(item, list)' />");
	var map = new DefineMap({
		item: 2,
		list: new DefineList([ 1, 2, 3 ])
	});

	var frag = template(map);
	var input = frag.firstChild;

	QUnit.ok(input.checked, "it is initially checked");
	QUnit.equal(map.list.indexOf(2), 1, "two is in the list");

	input.checked = false;
	canEvent.trigger.call(input, "change");

	QUnit.equal(map.list.indexOf(2), -1, "No longer in the list");

	map.item = 3;
	QUnit.ok(input.checked, "3 is in the list");

	// Add something to the list
	map.item = 5;
	QUnit.ok(!input.checked, "5 is not in the list");

	map.list.push(5);
	QUnit.ok(input.checked, "Now 5 is in the list");

	map.item = 6;
	input.checked = true;
	canEvent.trigger.call(input, "change");

	QUnit.equal(map.list.indexOf(6), 3, "pushed into the list");
});

QUnit.test("If there is no list, treated as false", function(){
	var template = stache("<input type='checkbox' {($checked)}='boolean-to-inList(item, list)' />");
	var map = new DefineMap({
		item: 2,
		list: undefined
	});
	var frag = template(map);
	var input = frag.firstChild;

	QUnit.ok(!input.checked, "not checked because there is no list");

	input.checked = true;
	canEvent.trigger.call(input, "change");

	QUnit.ok(true, "no errors thrown");
});

QUnit.test("works with radio buttons", function(){
	var template = stache("<form><input type='radio' name='name' value='Matthew' {($checked)}='boolean-to-inList(\"Matthew\", names)' /><input type='radio' name='name' value='Wilbur' {($checked)}='boolean-to-inList(\"Wilbur\", names)' /></form>");
	var map = new DefineMap({
		names: ['Wilbur']
	});

	var frag = template(map);
	var radioOne = frag.firstChild.firstChild;
	var radioTwo = radioOne.nextSibling;

	// Initial state
	QUnit.equal(radioOne.checked, false, "Matthew not checked");
	QUnit.equal(radioTwo.checked, true, "Wilbur is checked");

	radioOne.checked = true;
	canEvent.trigger.call(radioOne, "change");

	QUnit.equal(radioOne.checked, true, "Matthew is checked");
	QUnit.equal(radioTwo.checked, false, "Wilbur is not checked");
});
