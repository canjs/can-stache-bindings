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
	testIfRealDocument("setup/teardown works correctly", function(assert) {
		var done = assert.async(2);
		var input = document.createElement("input");

		var ta = this.fixture;
		ta.appendChild(input);

		var obs = new AttributeObservable(input, "value", {});
		assert.equal(canReflect.getValue(obs), "", "correct default value");

		// override the internal handler so it calls `QUnit.done` itself,
		// if AttributeObservable does not teardown the handler correctly
		// this test will fail with "Too many calls to the `assert.async` callback"
		var handler = obs.handler;
		obs.handler = function overrideHandler() {
			handler.apply(obs, arguments);
			done();
		};

		var onValue = function onValue(newVal) {
			assert.equal(newVal, "newVal", "calls handlers correctly");
			done();
		};

		canReflect.onValue(obs, onValue);

		// trigger the event to make sure handlers are called
		input.value = "newVal";
		domEvents.dispatch.call(input, "change");

		// unbound handler and trigger the event again,
		// if teardown works fine, test should pass
		canReflect.offValue(obs, onValue);
		domEvents.dispatch.call(input, "change");
	});

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
