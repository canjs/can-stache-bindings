var QUnit = require('steal-qunit');
var testHelpers = require('../helpers');

require('can-stache-bindings');

var stache = require('can-stache');
var SimpleMap = require("can-simple-map");
var domMutate = require('can-util/dom/mutate/mutate');
var domEvents = require('can-util/dom/events/events');

testHelpers.makeTests("can-stache-bindings - data", function(name, doc, enableMO, testIfRealDocument){
	QUnit.test('event bindings should be removed when the bound element is', function (assert) {
		var done = assert.async();
		var template = stache('<div>{{#if isShowing}}<span foo:from="bar"></span><hr/>{{/if}}</div>');
		var viewModel = new SimpleMap({
			isShowing: true,
			bar: 'baz'
		});
		var isTarget = function (target) {
			return target.nodeName === 'SPAN';
		};
		var listeners = new Set();
		var hasAddedBindingListener = false;
		var hasRemovedBindingListener = false;
		var undo = testHelpers.interceptDomEvents(
			function add (event, handler) {
				if (isTarget(this)) {
					listeners.add(handler);
					hasAddedBindingListener = true;
				}
			},
			function remove (event, handler) {
				if (isTarget(this)) {
					listeners.delete(handler);
					hasRemovedBindingListener = true;
				}
			}
		);

		var fragment = template(viewModel);
		domMutate.appendChild.call(this.fixture, fragment);

		// We use the also effected hr so we
		// can test the span handlers in isolation.
		var hr = this.fixture.firstChild.lastChild;
		domEvents.addEventListener.call(hr, 'removed', function andThen () {
			domEvents.removeEventListener.call(hr, 'removed', andThen);

			assert.ok(hasAddedBindingListener, 'An event listener should have been added for the binding');
			assert.ok(hasRemovedBindingListener, 'An event listener should have been removed for the binding');
			assert.equal(listeners.size, 0, 'all listeners should be removed');
			undo();
			done();
		});
		viewModel.attr('isShowing', false);
	});
});
