var canReflect = require("can-reflect");
var testHelpers = require("../test/helpers");
var domEvents = require("can-util/dom/events/events");
var AttributeObservable = require("./attribute-observable");

testHelpers.makeTests("AttributeObservable", function(
	name,
	doc,
	enableMO,
	testIfRealDocument
) {
	testIfRealDocument("it listens to change event by default", function(assert) {
		var done = assert.async();
		var input = document.createElement("input");

		var ta = this.fixture;
		ta.appendChild(input);

		var obs = new AttributeObservable(input, "value", {});
		assert.equal(canReflect.getValue(obs), "", "correct default value");

		canReflect.onValue(obs, function(newVal) {
			assert.equal(newVal, "newVal", "calls handlers correctly");
			done();
		});

		input.value = "newVal";
		domEvents.dispatch.call(input, "change");
	});
});
