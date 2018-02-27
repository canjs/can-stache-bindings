var QUnit = require("steal-qunit");

var stacheBindings = require('can-stache-bindings');

var makeDocument = require('can-vdom/make-document/make-document');
var MUTATION_OBSERVER = require('can-util/dom/mutation-observer/mutation-observer');
var DOCUMENT = require("can-util/dom/document/document");
var domEvents = require('can-util/dom/events/events');
var domMutate = require('can-util/dom/mutate/mutate');
var domData = require('can-util/dom/data/data');
var MockComponent = require("./mock-component-simple-map");
var stache = require("can-stache");
var SimpleMap = require("can-simple-map");
var DefineMap = require("can-define/map/map");
var canEvent = require("can-event");

function afterMutation(cb) {
	var doc = DOCUMENT();
	var div = doc.createElement("div");
	domEvents.addEventListener.call(div, "inserted", function(){
		doc.body.removeChild(div);
		setTimeout(cb, 5);
	});
	domMutate.appendChild.call(doc.body, div);
}

var DOC = DOCUMENT();
var MUT_OBS = MUTATION_OBSERVER();
makeTest("can-stache-bindings - colon - dom", document, MUT_OBS);
makeTest("can-stache-bindings - colon - vdom", makeDocument(), null);

function makeTest(name, doc, mutObs){

QUnit.module(name, {
	setup: function() {
		DOCUMENT(doc);
		MUTATION_OBSERVER(mutObs);

		if(doc === document) {
			this.fixture = document.getElementById("qunit-fixture");
		} else {
			this.fixture = doc.createElement("qunit-fixture");
			doc.body.appendChild(this.fixture);
		}
	},
	teardown: function(){
		if(doc !== document) {
			doc.body.removeChild(this.fixture);
		}

		stop();
		afterMutation(function() {
			DOCUMENT(DOC);
			MUTATION_OBSERVER(MUT_OBS);

			var fixture = document.getElementById("qunit-fixture");
			while (fixture && fixture.hasChildNodes()) {
				domData.delete.call(fixture.lastChild);
				fixture.removeChild(fixture.lastChild);
			}

			start();
		});
	}
});


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

QUnit.test("scope child-to-parent propagates undefined value", function() {
	var viewModel = new SimpleMap({ toParent: "toParent" });
	MockComponent.extend({
		tag: "basic-colon",
		viewModel: viewModel
	});

	var template = stache("<basic-colon toParent:to='valueB' />");
	var parent = new SimpleMap({ valueB: "B" });
	template(parent);

	QUnit.deepEqual(
		parent.get(),
		{ valueB: "toParent" },
		"initial scope values correct"
	);

	QUnit.deepEqual(
		viewModel.get(),
		{ toParent: "toParent" },
		"initial VM values correct"
	);

	// Change vm
	viewModel.set({ toParent: undefined });

	QUnit.deepEqual(
		parent.get(),
		{ valueB: undefined },
		"vm set undefined correctly"
	);
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

test("value:from works with camelCase and kebab-case properties", function() {
	var template = stache(
		"<input value:from='theProp'/>" +
		"<input value:from='the-prop'/>"
	);

	var map = new SimpleMap({});

	var frag = template(map);

	var ta = this.fixture;
	ta.appendChild(frag);

	var camelPropInput = ta.getElementsByTagName("input")[0];
	var kebabPropInput = ta.getElementsByTagName("input")[1];

	equal(camelPropInput.value, "", "input bound to camelCase prop value set correctly if camelCase key does not exist in map");
	equal(kebabPropInput.value, "", "input bound to kebab-case prop value set correctly if kebab-case key does not exist in map");

	map.attr("theProp", "30");
	equal(camelPropInput.value, "30", "input bound to camelCase prop value set correctly when camelCase prop changes");
	equal(kebabPropInput.value, "", "input bound to kebab-case prop value not updated when camelCase prop changes");

	map.attr("theProp", "31");
	equal(camelPropInput.value, "31", "input bound to camelCase prop value updated correctly when camelCase prop changes");
	ok(!kebabPropInput.value, "input bound to kebab-case prop value not updated when camelCase prop changes");

	camelPropInput.value = "32";
	canEvent.trigger.call(camelPropInput, "change");
	equal(map.attr("theProp"), "31", "camelCase prop NOT updated when input bound to camelCase prop changes");
	ok(!map.attr("the-prop"), "kebabCase prop NOT updated when input bound to camelCase prop changes");

	map.attr("the-prop", "33");
	equal(kebabPropInput.value, "33", "input bound to kebab-case prop value set correctly when kebab-case prop changes");
	equal(camelPropInput.value, "32", "input bound to camelCase prop value not updated when kebab-case prop changes");

	map.attr("the-prop", "34");
	equal(kebabPropInput.value, "34", "input bound to kebab-case prop value updated correctly when kebab-case prop changes");
	equal(camelPropInput.value, "32", "input bound to camelCase prop value not updated when kebab-case prop changes");

	kebabPropInput.value = "35";
	canEvent.trigger.call(kebabPropInput, "change");
	equal(map.attr("the-prop"), "34", "kebab-case prop NOT updated from input bound to kebab-case prop");
	equal(map.attr("theProp"), "31", "camelCase prop NOT updated from input bound to kebab-case prop");
});

test("value:to works with camelCase and kebab-case properties", function() {
	var template = stache(
		"<input value:to='theProp'/>" +
		"<input value:to='the-prop'/>"
	);

	var map = new SimpleMap({});

	var frag = template(map);

	var ta = this.fixture;
	ta.appendChild(frag);

	var camelPropInput = ta.getElementsByTagName("input")[0];
	var kebabPropInput = ta.getElementsByTagName("input")[1];

	camelPropInput.value = "32";
	canEvent.trigger.call(camelPropInput, "change");
	equal(map.attr("theProp"), "32", "camelCaseProp updated from input bound to camelCase Prop");
	ok(!map.attr("the-prop"), "kebabCaseProp NOT updated from input bound to camelCase Prop");

	map.attr("theProp", "30");
	equal(camelPropInput.value, "32", "input bound to camelCase Prop value NOT updated when camelCase prop changes");
	ok(!kebabPropInput.value, "input bound to kebabCase Prop value NOT updated when camelCase prop changes");

	kebabPropInput.value = "33";
	canEvent.trigger.call(kebabPropInput, "change");
	equal(map.attr("the-prop"), "33", "kebabCaseProp updated from input bound to kebabCase Prop");
	equal(map.attr("theProp"), "30", "camelCaseProp NOT updated from input bound to camelCase Prop");

	map.attr("theProp", "34");
	equal(kebabPropInput.value, "33", "input bound to kebabCase Prop value NOT updated when kebabCase prop changes");
	equal(camelPropInput.value, "32", "input bound to camelCase Prop value NOT updated when kebabCase prop changes");
});

test("value:bind works with camelCase and kebab-case properties", function() {
	var template = stache(
		"<input value:bind='theProp'/>" +
		"<input value:bind='the-prop'/>"
	);

	var map = new SimpleMap({});

	var frag = template(map);

	var ta = this.fixture;
	ta.appendChild(frag);

	var camelPropInput = ta.getElementsByTagName("input")[0];
	var kebabPropInput = ta.getElementsByTagName("input")[1];

	camelPropInput.value = "32";
	canEvent.trigger.call(camelPropInput, "change");
	equal(map.attr("theProp"), "32", "camelCaseProp updated from input bound to camelCase Prop");
	ok(!map.attr("the-prop"), "kebabCaseProp NOT updated from input bound to camelCase Prop");

	map.attr("theProp", "30");
	equal(camelPropInput.value, "30", "input bound to camelCase Prop value updated when camelCase prop changes");
	ok(!kebabPropInput.value, "input bound to kebabCase Prop value NOT updated when camelCase prop changes");

	kebabPropInput.value = "33";
	canEvent.trigger.call(kebabPropInput, "change");
	equal(map.attr("the-prop"), "33", "kebabCaseProp updated from input bound to kebabCase Prop");
	equal(map.attr("theProp"), "30", "camelCaseProp NOT updated from input bound to camelCase Prop");

	map.attr("theProp", "34");
	equal(kebabPropInput.value, "33", "input bound to kebabCase Prop value NOT updated when kebabCase prop changes");
	equal(camelPropInput.value, "34", "input bound to camelCase Prop value updated when kebabCase prop changes");
});

test("Bracket expression with dot and no explicit root and value:bind", function () {
	var template;
	var div = this.fixture;

	template = stache('<input value:bind="[\'two.hops\']" >');

	var Data = DefineMap.extend({
		'two.hops': 'string'
	});

	var data = new Data();
	// var data = new DefineMap({
	// 	"two.hops": ""
	// });

	var dom = template(data);
	div.appendChild(dom);
	var input = div.getElementsByTagName('input')[0];

	equal(input.value, "", "input value set correctly if key does not exist in map");

	data["two.hops"] = "slide to the left";

	equal(input.value, "slide to the left", "input value set correctly");

	data["two.hops"] = "slide to the right";

	equal(input.value, "slide to the right", "input value update correctly");

	input.value = "REVERSE REVERSE";

	canEvent.trigger.call(input, "change");

	equal(data["two.hops"], "REVERSE REVERSE", "updated from input");
});

test("Bracket expression with colon and no explicit root and value:bind", function () {
	var template;
	var div = this.fixture;

	template = stache('<input value:bind="[\'two:hops\']" >');

	var Data = DefineMap.extend({
		'two:hops': 'string'
	});

	var data = new Data();
	// var data = new DefineMap({
	// 	"two.hops": ""
	// });

	var dom = template(data);
	div.appendChild(dom);
	var input = div.getElementsByTagName('input')[0];

	equal(input.value, "", "input value set correctly if key does not exist in map");

	data["two:hops"] = "slide to the left";

	equal(input.value, "slide to the left", "input value set correctly");

	data["two:hops"] = "slide to the right";

	equal(input.value, "slide to the right", "input value update correctly");

	input.value = "REVERSE REVERSE";

	canEvent.trigger.call(input, "change");

	equal(data["two:hops"], "REVERSE REVERSE", "updated from input");
});

test('can listen to camelCase events using on:', function(){
	QUnit.stop();
	expect(1);

	var map = new DefineMap({
		someProp: 'foo',

		someMethod: function() {
			QUnit.start();
			ok(true);
		}
	});

	var template = stache("<div on:someProp:by:this='someMethod'/>");
	template(map);

	map.someProp = "baz";
});

test('can listen to kebab-case events using on:', function(){
	QUnit.stop();
	expect(1);

	var map = new DefineMap({
		'some-prop': 'foo',

		someMethod: function() {
			QUnit.start();
			ok(true);
		}
	});

	var template = stache("<div on:some-prop:by:this='someMethod'/>");
	template(map);

	map['some-prop'] = "baz";
});

test('can bind to property on scope using :by:', function(){
	stop();
	expect(1);

	MockComponent.extend({
		tag: "view-model-able"
	});

	var template = stache("<view-model-able on:prop:by:obj='someMethod'/>");

	var map = new DefineMap({
		obj: {
			prop: "Mercury"
		},
		someMethod: function(scope, el, ev, newVal){
			start();
			equal(newVal, "Venus", "method called");
		}
	});

	template(map);
	map.obj.prop = "Venus";
});

test('can bind to entire scope using :by:this', function(){
	stop();
	expect(1);

	MockComponent.extend({
		tag: "view-model-able"
	});

	var template = stache("<view-model-able on:prop:by:this='someMethod'/>");

	var map = new DefineMap({
		prop: "Mercury",

		someMethod: function(scope, el, ev, newVal){
			start();
			equal(newVal, "Venus", "method called");
		}
	});

	template(map);
	map.prop = "Venus";
});

test('can bind to viewModel using on:vm:prop', function() {
	stop();
	expect(1);

	var map = new SimpleMap({
		prop: "Mercury"
	});

	var MySimpleMap = SimpleMap.extend({
		someMethod: function(scope, el, ev, newVal){
			start();
			equal(newVal, "Venus", "method called");
		}
	});
	var parent = new MySimpleMap();

	MockComponent.extend({
		tag: "view-model-able",
		viewModel: map
	});

	var template = stache("<view-model-able on:vm:prop='someMethod'/>");

	template(parent);
	map.attr("prop", "Venus");
});

test('can bind to element using on:el:prop', function() {
	stop();
	expect(1);

	var map = new SimpleMap({
		prop: "Mercury"
	});

	var MySimpleMap = SimpleMap.extend({
		someMethod: function(){
			start();
			ok(true, "method called");
		}
	});
	var parent = new MySimpleMap();

	MockComponent.extend({
		tag: "view-model-able",
		viewModel: map
	});

	var template = stache("<view-model-able on:el:prop='someMethod'/>");

	var frag = template(parent);
	var element = frag.firstChild;

	canEvent.trigger.call(element, "prop");
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
	canEvent.trigger.call(bindFirstInput, "click");
	QUnit.equal(map.get('theProp'), "22");


	var eventFirstInput = ta.getElementsByTagName("input")[1];
	eventFirstInput.value = "23";
	canEvent.trigger.call(eventFirstInput, "click");
	QUnit.equal(map.get('theProp'), "23");
});

QUnit.test("on:el:click works inside {{#if}} on element with a viewModel (#279)", function() {
	var map = new SimpleMap({
	});

	var MySimpleMap = SimpleMap.extend({
		show: true,
		method: function(){
			ok(true, "method called");
		}
	});
	var parent = new MySimpleMap();

	MockComponent.extend({
		tag: "view-model-able",
		viewModel: map
	});

	var template = stache("<view-model-able {{#if show}} on:el:click='method()' {{/if}} />");

	var frag = template(parent);
	var el = frag.firstChild;
	canEvent.trigger.call(el, "click");
});

QUnit.test("vm:prop:to/:from/:bind work (#280)", function() {
	var vm1 = new SimpleMap({ value: 'vm1' });
	var vm2 = new SimpleMap({ value: 'vm2' });
	var vm3 = new SimpleMap({ value: 'vm3' });

	MockComponent.extend({
		tag: "comp-1",
		viewModel: vm1
	});
	MockComponent.extend({
		tag: "comp-2",
		viewModel: vm2
	});
	MockComponent.extend({
		tag: "comp-3",
		viewModel: vm3
	});

	var template = stache(
		"<comp-1 vm:value:to='scope1'/>" +
		"<comp-2 vm:value:from='scope2'/>" +
		"<comp-3 vm:value:bind='scope3'/>"
	);

	var scope = new SimpleMap({
		scope1: 'scope1',
		scope2: 'scope2',
		scope3: 'scope3'
	});
	template(scope);

	// vm:value:to
	equal(scope.attr('scope1'), 'vm1', 'vm:value:to - scope value set from vm');

	vm1.attr('value', 'vm4');
	equal(scope.attr('scope1'), 'vm4', 'vm:value:to - scope updated when vm changes');

	scope.attr('scope1', 'scope4');
	equal(vm1.attr('value'), 'vm4', 'vm:value:to - vm not updated when scope changes');

	// vm:value:from
	equal(vm2.attr('value'), 'scope2', 'vm:value:from - vm value set from scope');

	scope.attr('scope2', 'scope5');
	equal(vm2.attr('value'), 'scope5', 'vm:value:from - vm updated when scope changes');

	vm2.attr('value', 'vm5');
	equal(scope.attr('scope2'), 'scope5', 'vm:value:from - scope not updated when vm changes');

	// vm:value:bind
	equal(vm3.attr('value'), 'scope3', 'vm:value:bind - vm value set from scope');

	scope.attr('scope3', 'scope6');
	equal(vm3.attr('value'), 'scope6', 'vm:value:bind - vm updated when scope changes');

	vm3.attr('value', 'vm6');
	equal(scope.attr('scope3'), 'vm6', 'vm:value:bind - scope updated when vm changes');
});

QUnit.test('el:prop:to/:from/:bind work (#280)', function() {
	var template = stache(
		"<input el:value:to='scope1' value='1'/>" +
		"<input el:value:from='scope2' value='2'/>" +
		"<input el:value:bind='scope3' value='3'/>"
	);

	var scope = new SimpleMap({
		scope1: 'scope1',
		scope2: 'scope2',
		scope3: 'scope3'
	});
	var frag = template(scope);
	var ta = this.fixture;
	ta.appendChild(frag);

	var inputTo = ta.getElementsByTagName('input')[0];
	var inputFrom = ta.getElementsByTagName('input')[1];
	var inputBind = ta.getElementsByTagName('input')[2];

	// el:value:to
	equal(scope.attr('scope1'), '1', 'el:value:to - scope value set from attribute');

	inputTo.value = '4';
	canEvent.trigger.call(inputTo, 'change');
	equal(scope.attr('scope1'), '4', 'el:value:to - scope updated when attribute changed');

	scope.attr('scope1', 'scope4');
	equal(inputTo.value, '4', 'el:value:to - attribute not updated when scope changed');

	// el:value:from
	equal(inputFrom.value, 'scope2', 'el:value:from - attribute set from scope');

	inputFrom.value = 'scope5';
	canEvent.trigger.call(inputFrom, 'change');
	equal(scope.attr('scope2'), 'scope2', 'el:value:from - scope not updated when attribute changed');

	scope.attr('scope2', 'scope6');
	equal(inputFrom.value, 'scope6', 'el:value:from - attribute updated when scope changed');

	// el:value:bind
	equal(inputBind.value, 'scope3', 'el:value:bind - attribute set from scope prop (parent -> child wins)');

	inputBind.value = 'scope6';
	canEvent.trigger.call(inputBind, 'change');
	equal(scope.attr('scope3'), 'scope6', 'el:value:bind - scope updated when attribute changed');

	scope.attr('scope3', 'scope7');
	equal(inputBind.value, 'scope7', 'el:value:bind - attribute updated when scope changed');
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
	canEvent.trigger.call(inputTo, 'input');

	equal(scope.get('myProp'), 'wurld', "Got the value on the scope");

});

QUnit.test("on:input:value:to does not initialize values (#289)", function() {
	try {
		stache("<input on:input:value:to='*editing.licensePlate'/>")();
		ok(true, "renderer was made without error");
	}
	catch(e) {
		ok(false, e.message);
	}
});

QUnit.test("errors subproperties of undefined properties (#298)", function() {
	try {
		stache("<input value:to='prop.subprop'/>")();
		ok(true, "renderer was made without error");
	}
	catch(e) {
		ok(false, e.message);
	}
});

}
