var QUnit = require('steal-qunit');
var testHelpers = require('../helpers');

require('can-stache-bindings');

var stache = require('can-stache');

var SimpleMap = require("can-simple-map");
var domEvents = require("can-dom-events");

testHelpers.makeTests("can-stache-bindings - colon - hybrids", function(name, doc, enableMO){

	test("value:to:on:click and on:click:value:to work (#269)", function() {
		var template = stache(
			"<input value:to:on:click='theProp'/>" +
				"<input on:click:value:to='theProp'/>"
		);

		var map = new SimpleMap({});

		var frag = template(map);

		var ta = this.fixture;
		ta.appendChild(frag);

		var bindFirstInput = ta.getElementsByTagName("input")[0];
		bindFirstInput.value = "22";
		domEvents.dispatch(bindFirstInput, "click");
		QUnit.equal(map.get('theProp'), "22");


		var eventFirstInput = ta.getElementsByTagName("input")[1];
		eventFirstInput.value = "23";
		domEvents.dispatch(eventFirstInput, "click");
		QUnit.equal(map.get('theProp'), "23");
	});

	QUnit.test("on:input:value:to works (#289)", function() {
		var scope = new SimpleMap({
			myProp: ""
		});

		var renderer = stache("<input type='text' value='hai' on:input:value:to='myProp' />");

		var view = renderer(scope);

		var ta = this.fixture;
		ta.appendChild(view);

		var inputTo = ta.getElementsByTagName('input')[0];

		inputTo.value = 'wurld';
		domEvents.dispatch(inputTo, 'input');

		equal(scope.get('myProp'), 'wurld', "Got the value on the scope");

	});

	QUnit.test("on:input:value:to does not initialize values (#289)", function() {
		try {
			stache("<input on:input:value:to='scope.vars.editing.licensePlate'/>")();
			ok(true, "renderer was made without error");
		}
		catch(e) {
			ok(false, e.message);
		}
	});

	QUnit.test("on:input:value:bind should initialize values (#457)", function() {

		var frag = stache("<input on:input:value:bind='foo'/>")({
			foo: "bar"
		});
		var input = frag.firstChild;

		QUnit.equal(input.value, "bar", "initialized to the parent value");
	});

});
