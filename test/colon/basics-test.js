var QUnit = require('steal-qunit');
var testHelpers = require('../helpers');

var stacheBindings = require('can-stache-bindings');

var domEvents = require('can-dom-events');
var stache = require('can-stache');

var SimpleMap = require("can-simple-map");
var MockComponent = require("../mock-component-simple-map");

var canTestHelpers = require('can-test-helpers');

testHelpers.makeTests("can-stache-bindings - colon - basics", function(name, doc, enableMO){

	test("basics", 5, function(){

		var viewModel = new SimpleMap({
			toChild: "toChild",
			toParent: "toParent",
			twoWay: "twoWay"
		});

		MockComponent.extend({
			tag: "basic-colon",
			viewModel: viewModel
		});
		var template = stache("<basic-colon "+
			"toChild:from='valueA' toParent:to='valueB' twoWay:bind='valueC' "+
			"on:vmevent='methodD()'" +
			"/>");

		var MySimpleMap = SimpleMap.extend({
			methodD: function(){
				QUnit.ok(true, "on:vmevent bindings work");
			}
		});

		var parent = new MySimpleMap({
			valueA: 'A',
			valueB: 'B',
			valueC: 'C'
		});

		template(parent);

		QUnit.deepEqual(parent.get(), {
			valueA: 'A',
			valueB: 'toParent',
			valueC: 'C',
		}, "initial scope values correct");

		QUnit.deepEqual(viewModel.get(), {
			toChild: "A",
			toParent: "toParent",
			twoWay: "C"
		}, "initial VM values correct");

		// Change scope
		parent.set({
			valueA: 'a',
			valueB: 'b',
			valueC: 'c'
		});

		QUnit.deepEqual(viewModel.get(), {
			toChild: "a",
			toParent: "toParent",
			twoWay: "c"
		}, "scope set VM values correct");

		// Change vm
		viewModel.set({
			toChild: "to-child",
			toParent: "to-parent",
			twoWay: "two-way"
		});

		QUnit.deepEqual(parent.get(), {
			valueA: "a",
			valueB: "to-parent",
			valueC: "two-way"
		}, "vm set scope values correct");

		viewModel.dispatch({type: "vmevent"});

	});

	test("getBindingInfo", function(){
		var info = stacheBindings.getBindingInfo({name: "foo-ed:from", value: "bar"});
		deepEqual(info, {
			parent: "scope",
			child: "viewModelOrAttribute",
			childEvent: undefined,
			parentToChild: true,
			childToParent: false,
			childName: "foo-ed",
			parentName: "bar",
			bindingAttributeName: "foo-ed:from",
			initializeValues: true,
			syncChildWithParent: false
		}, ":from");

		info = stacheBindings.getBindingInfo({name: "foo-ed:bind", value: "bar"});
		deepEqual(info, {
			parent: "scope",
			child: "viewModelOrAttribute",
			childEvent: undefined,
			parentToChild: true,
			childToParent: true,
			childName: "foo-ed",
			parentName: "bar",
			bindingAttributeName: "foo-ed:bind",
			initializeValues: true,
			syncChildWithParent: true
		}, ":bind");

		info = stacheBindings.getBindingInfo({name: "foo-ed:to", value: "bar"});
		deepEqual(info, {
			parent: "scope",
			child: "viewModelOrAttribute",
			childEvent: undefined,
			parentToChild: false,
			childToParent: true,
			childName: "foo-ed",
			parentName: "bar",
			bindingAttributeName: "foo-ed:to",
			initializeValues: true,
			syncChildWithParent: false
		}, ":to");

		info = stacheBindings.getBindingInfo({name: "foo-ed:from", value: "bar"}, null, null, null, true);
		deepEqual(info, {
			parent: "scope",
			child: "viewModel",
			childEvent: undefined,
			parentToChild: true,
			childToParent: false,
			childName: "foo-ed",
			parentName: "bar",
			bindingAttributeName: "foo-ed:from",
			initializeValues: true,
			syncChildWithParent: false
		}, ":from, favorViewModel=true");

		info = stacheBindings.getBindingInfo({name: "foo-ed:bind", value: "bar"}, null, null, null, true);
		deepEqual(info, {
			parent: "scope",
			child: "viewModel",
			childEvent: undefined,
			parentToChild: true,
			childToParent: true,
			childName: "foo-ed",
			parentName: "bar",
			bindingAttributeName: "foo-ed:bind",
			initializeValues: true,
			syncChildWithParent: true
		}, ":bind, favorViewModel=true");

		info = stacheBindings.getBindingInfo({name: "foo-ed:to", value: "bar"}, null, null, null, true);
		deepEqual(info, {
			parent: "scope",
			child: "viewModel",
			childEvent: undefined,
			parentToChild: false,
			childToParent: true,
			childName: "foo-ed",
			parentName: "bar",
			bindingAttributeName: "foo-ed:to",
			initializeValues: true,
			syncChildWithParent: false
		}, ":to, favorViewModel=true");
	});

	test("getBindingInfo for vm:", function() {
		var info = stacheBindings.getBindingInfo({name: "vm:foo-ed:from", value: "bar"});
		deepEqual(info, {
			parent: "scope",
			child: "viewModel",
			childEvent: undefined,
			parentToChild: true,
			childToParent: false,
			childName: "foo-ed",
			parentName: "bar",
			bindingAttributeName: "vm:foo-ed:from",
			initializeValues: true,
			syncChildWithParent: false
		}, ":from");

		info = stacheBindings.getBindingInfo({name: "vm:foo-ed:bind", value: "bar"});
		deepEqual(info, {
			parent: "scope",
			child: "viewModel",
			childEvent: undefined,
			parentToChild: true,
			childToParent: true,
			childName: "foo-ed",
			parentName: "bar",
			bindingAttributeName: "vm:foo-ed:bind",
			initializeValues: true,
			syncChildWithParent: true
		}, ":bind");

		info = stacheBindings.getBindingInfo({name: "vm:foo-ed:to", value: "bar"});
		deepEqual(info, {
			parent: "scope",
			child: "viewModel",
			childEvent: undefined,
			parentToChild: false,
			childToParent: true,
			childName: "foo-ed",
			parentName: "bar",
			bindingAttributeName: "vm:foo-ed:to",
			initializeValues: true,
			syncChildWithParent: false
		}, ":to");

		info = stacheBindings.getBindingInfo({name: "vm:foo-ed:from", value: "bar"}, null, null, null, true);
		deepEqual(info, {
			parent: "scope",
			child: "viewModel",
			childEvent: undefined,
			parentToChild: true,
			childToParent: false,
			childName: "foo-ed",
			parentName: "bar",
			bindingAttributeName: "vm:foo-ed:from",
			initializeValues: true,
			syncChildWithParent: false
		}, ":from, favorViewModel=true");

		info = stacheBindings.getBindingInfo({name: "vm:foo-ed:bind", value: "bar"}, null, null, null, true);
		deepEqual(info, {
			parent: "scope",
			child: "viewModel",
			childEvent: undefined,
			parentToChild: true,
			childToParent: true,
			childName: "foo-ed",
			parentName: "bar",
			bindingAttributeName: "vm:foo-ed:bind",
			initializeValues: true,
			syncChildWithParent: true
		}, ":bind, favorViewModel=true");

		info = stacheBindings.getBindingInfo({name: "vm:foo-ed:to", value: "bar"}, null, null, null, true);
		deepEqual(info, {
			parent: "scope",
			child: "viewModel",
			childEvent: undefined,
			parentToChild: false,
			childToParent: true,
			childName: "foo-ed",
			parentName: "bar",
			bindingAttributeName: "vm:foo-ed:to",
			initializeValues: true,
			syncChildWithParent: false
		}, ":to, favorViewModel=true");
	});

	test("getBindingInfo for el:", function() {
		var info = stacheBindings.getBindingInfo({name: "el:foo-ed:from", value: "bar"});
		deepEqual(info, {
			parent: "scope",
			child: "attribute",
			childEvent: undefined,
			parentToChild: true,
			childToParent: false,
			childName: "foo-ed",
			parentName: "bar",
			bindingAttributeName: "el:foo-ed:from",
			initializeValues: true,
			syncChildWithParent: false
		}, ":from");

		info = stacheBindings.getBindingInfo({name: "el:foo-ed:bind", value: "bar"});
		deepEqual(info, {
			parent: "scope",
			child: "attribute",
			childEvent: undefined,
			parentToChild: true,
			childToParent: true,
			childName: "foo-ed",
			parentName: "bar",
			bindingAttributeName: "el:foo-ed:bind",
			initializeValues: true,
			syncChildWithParent: true
		}, ":bind");

		info = stacheBindings.getBindingInfo({name: "el:foo-ed:to", value: "bar"});
		deepEqual(info, {
			parent: "scope",
			child: "attribute",
			childEvent: undefined,
			parentToChild: false,
			childToParent: true,
			childName: "foo-ed",
			parentName: "bar",
			bindingAttributeName: "el:foo-ed:to",
			initializeValues: true,
			syncChildWithParent: false
		}, ":to");

		info = stacheBindings.getBindingInfo({name: "el:foo-ed:from", value: "bar"}, null, null, null, true);
		deepEqual(info, {
			parent: "scope",
			child: "attribute",
			childEvent: undefined,
			parentToChild: true,
			childToParent: false,
			childName: "foo-ed",
			parentName: "bar",
			bindingAttributeName: "el:foo-ed:from",
			initializeValues: true,
			syncChildWithParent: false
		}, ":from, favorViewModel=true");

		info = stacheBindings.getBindingInfo({name: "el:foo-ed:bind", value: "bar"}, null, null, null, true);
		deepEqual(info, {
			parent: "scope",
			child: "attribute",
			childEvent: undefined,
			parentToChild: true,
			childToParent: true,
			childName: "foo-ed",
			parentName: "bar",
			bindingAttributeName: "el:foo-ed:bind",
			initializeValues: true,
			syncChildWithParent: true
		}, ":bind, favorViewModel=true");

		info = stacheBindings.getBindingInfo({name: "el:foo-ed:to", value: "bar"}, null, null, null, true);
		deepEqual(info, {
			parent: "scope",
			child: "attribute",
			childEvent: undefined,
			parentToChild: false,
			childToParent: true,
			childName: "foo-ed",
			parentName: "bar",
			bindingAttributeName: "el:foo-ed:to",
			initializeValues: true,
			syncChildWithParent: false
		}, ":to, favorViewModel=true");
	});

	QUnit.test("getBindingInfo works for value:to:on:click (#269)", function(){

		var info = stacheBindings.getBindingInfo({name: "value:to:on:click", value: "bar"});
		deepEqual(info, {
			parent: "scope",
			child: "viewModelOrAttribute",
			childEvent: "click",
			parentToChild: false,
			childToParent: true,
			childName: "value",
			parentName: "bar",
			bindingAttributeName: "value:to:on:click",
			initializeValues: false,
			syncChildWithParent: false
		}, "new vm binding");

	});

	canTestHelpers.dev.devOnlyTest("warning when binding to non-existing value (#136) (#119)", function() {
		var teardown = canTestHelpers.dev.willWarn('This element does not have a viewModel. (Attempting to bind `target:vm:bind="source.bar"`)');

		var template = stache("<div target:vm:bind='source.bar'/>");

		var map = new SimpleMap({ source: new SimpleMap({ foo: "foo" }) });
		template(map);
		QUnit.equal(teardown(), 1, 'warning shown');

	});

	QUnit.test("parent stache is able to teardown child bindings (#278)", function(){
		var map = new SimpleMap({value: "VALUE"});

		var template = stache("<div>{{#if value}}<span><input value:bind='value'/></span>{{/if}}</div>");

		var frag = template(map),
			input = frag.firstChild.getElementsByTagName("input")[0];

		this.fixture.appendChild(frag);

		QUnit.equal(input.value, "VALUE", "value set initially");
		map.set("value","");

		QUnit.equal(input.value, "VALUE", "value should not have been updated");
	});

	QUnit.test("bindings still work for moved elements (#460)", function(assert) {
		var done = assert.async();
		var map = new SimpleMap({value: "first"});
		var template = stache("<input value:bind='value'/>");
		var frag = template(map);
		var input = frag.firstChild;

		this.fixture.appendChild(frag);

		// Move the input to inside the div
		var div = doc.createElement("div");
		this.fixture.appendChild(div);
		div.appendChild(input);

		testHelpers.afterMutation(function() {
			map.set("value", "second");
			QUnit.equal(input.value, "second", "value should have been updated");

			input.value = "third";
			domEvents.dispatch(input, "change");
			QUnit.equal(map.get("value"), "third", "map should have been updated");

			done();
		});
	});

});
