var QUnit = require('steal-qunit');
var testHelpers = require('../helpers');

require('can-stache-bindings');

var stache = require('can-stache');
var SimpleMap = require("can-simple-map");
var domMutate = require('can-dom-mutate');
var domMutateNode = require('can-dom-mutate/node');

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

		var attributeChangeCount = 0;
		var isAttributeChangeTracked = false;
		var onNodeAttributeChange = domMutate.onNodeAttributeChange;
		domMutate.onNodeAttributeChange = function (node) {
			if (!isTarget(node)) {
				return onNodeAttributeChange.apply(null, arguments);
			}

			attributeChangeCount++;
			isAttributeChangeTracked = true;
			var disposal = onNodeAttributeChange.apply(null, arguments);
			return function () {
				attributeChangeCount--;
				return disposal();
			};
		};

		var removalCount = 0;
		var isRemovalTracked = false;
		var onNodeRemoval = domMutate.onNodeRemoval;
		domMutate.onNodeRemoval = function (node) {
			if (!isTarget(node)) {
				return onNodeRemoval.apply(null, arguments);
			}

			removalCount++;
			isRemovalTracked = true;
			var disposal = onNodeRemoval.apply(null, arguments);
			return function () {
				removalCount--;
				return disposal();
			};
		};

		var fragment = template(viewModel);
		domMutateNode.appendChild.call(this.fixture, fragment);

		// We use the also effected hr so we
		// can test the span handlers in isolation.
		var hr = this.fixture.firstChild.lastChild;
		var removalDisposal = domMutate.onNodeRemoval(hr, function () {
			removalDisposal();

			domMutate.onNodeAttributeChange = onNodeAttributeChange;
			assert.ok(isAttributeChangeTracked, 'Attribute foo:from="bar" should be tracked');
			assert.equal(attributeChangeCount, 0, 'all attribute listeners should be disposed');

			domMutate.onNodeRemoval = onNodeRemoval;
			assert.ok(isRemovalTracked, 'Element span should be tracked');
			assert.equal(removalCount, 0, 'all removal listeners should be disposed');

			done();
		});
		viewModel.attr('isShowing', false);
	});

	QUnit.test("raw bindings using :raw", function(assert){
		var template = stache("<span foo:raw='bar'></span>");
		var frag = template();
		assert.equal(frag.firstChild.getAttribute("foo"), "bar", "bound raw");
	});
});
