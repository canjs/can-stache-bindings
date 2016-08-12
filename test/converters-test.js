require("can-stache-bindings");
var canEvent = require("can-event");
var DefineList = require("can-define/list/list");
var DefineMap = require("can-define/map/map");
var stache = require("can-stache");
var each = require("can-util/js/each/each");

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

QUnit.module("Converters - string-to-any");

QUnit.test("Works on all the types", function(){
	var types = {
		"22.3": 22.3,
		"foo": "foo",
		"true": true,
		"false": false,
		"undefined": undefined,
		"null": null,
		"Infinity": Infinity,
		"NaN": {
			expected: NaN,
			equalityTest: function(a){
				return isNaN(a);
			}
		}
	};

	var defaultEquality = function(a, b) {
		return a === b;
	};

	each(types, function(expected, type){
		var template = stache('<select {($value)}="string-to-any(~val)"><option value="test">test</option><option value="' + type + '">' + type + '</option></select>');
		var map = new DefineMap({
			val: "test"
		});

		var frag = template(map);
		var select = frag.firstChild;
		var option = select.firstChild.nextSibling;

		var equality = defaultEquality;
		if(expected != null && expected.equalityTest) {
			equality = expected.equalityTest;
			expected = expected.expected;
		}

		// Select this type's option
		select.value = type;
		canEvent.trigger.call(select, "change");

		QUnit.ok(equality(map.val, expected), "map's value updated to: " + type);

		// Now go the other way.
		map.val = "test";
		map.val = expected;

		QUnit.equal(select.value, type, "select's value updated to: " + type);
	});


});

QUnit.module("Converters - not");

QUnit.test("saves the inverse of the selected value", function(){
	var template = stache('<input type="checkbox" {($checked)}="not(~val)" />');
	var map = new DefineMap({
		val: true
	});

	var input = template(map).firstChild;

	QUnit.equal(input.checked, false, "initially false");

	map.val = false;

	QUnit.equal(input.checked, true, "true because map val is false");

	input.checked = false;
	canEvent.trigger.call(input, "change");

	QUnit.equal(map.val, true, "map is now true because checkbox is false");
});

QUnit.test("works with boolean-to-inList", function(){
	var template = stache("<input type='checkbox' {($checked)}='not(~boolean-to-inList(item, list))' />");
	var map = new DefineMap({
		item: 2,
		list: new DefineList([ 1, 2, 3 ])
	});

	var input = template(map).firstChild;

	QUnit.equal(input.checked, false, "not checked because it is in the list");

	map.item = 4;

	QUnit.equal(input.checked, true, "checked because not in the list");

	input.checked = false;
	canEvent.trigger.call(input, "change");

	QUnit.equal(map.list.indexOf(4), 3, "it was pushed into the list");

	// Remove it from the list
	map.list.splice(3, 1);
	QUnit.equal(input.checked, true, "now it's checked because not in the list");
});

QUnit.module("Converters - select-by-index");

QUnit.test("chooses select option by the index from a list", function(){
	var template = stache('<select {($value)}="select-by-index(~person, people)">{{#each people}}<option value="{{%index}}">{{name}}</option>{{/each}}</select>');

	var map = new DefineMap({
		person: "Anne",
		people: [
			"Matthew",
			"Anne",
			"Wilbur"
		]
	});

	var select = template(map).firstChild;

	// Initial value
	QUnit.equal(select.value, 1, "initially set to the first value");

	// Select a different thing.
	select.value = 2;
	canEvent.trigger.call(select, "change");

	QUnit.equal(map.person, "Wilbur", "now it is me");

	// Change the selected the other way.
	map.person = map.people.item(0);

	QUnit.equal(select.value, 0, "set back");
});
