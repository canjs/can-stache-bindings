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
var DefineList = require("can-define/list/list");
var canEvent = require("can-util/dom/events/events");
var queues = require("can-queues");
var dev = require('can-util/js/dev/dev');
var viewCallbacks = require('can-view-callbacks');
var canViewModel = require('can-view-model');
var canSymbol = require('can-symbol');
var canReflect = require('can-reflect');

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
	canEvent.dispatch.call(camelPropInput, "change");
	equal(map.attr("theProp"), "31", "camelCase prop NOT updated when input bound to camelCase prop changes");
	ok(!map.attr("the-prop"), "kebabCase prop NOT updated when input bound to camelCase prop changes");

	map.attr("the-prop", "33");
	equal(kebabPropInput.value, "33", "input bound to kebab-case prop value set correctly when kebab-case prop changes");
	equal(camelPropInput.value, "32", "input bound to camelCase prop value not updated when kebab-case prop changes");

	map.attr("the-prop", "34");
	equal(kebabPropInput.value, "34", "input bound to kebab-case prop value updated correctly when kebab-case prop changes");
	equal(camelPropInput.value, "32", "input bound to camelCase prop value not updated when kebab-case prop changes");

	kebabPropInput.value = "35";
	canEvent.dispatch.call(kebabPropInput, "change");
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
	canEvent.dispatch.call(camelPropInput, "change");
	equal(map.attr("theProp"), "32", "camelCaseProp updated from input bound to camelCase Prop");
	ok(!map.attr("the-prop"), "kebabCaseProp NOT updated from input bound to camelCase Prop");

	map.attr("theProp", "30");
	equal(camelPropInput.value, "32", "input bound to camelCase Prop value NOT updated when camelCase prop changes");
	ok(!kebabPropInput.value, "input bound to kebabCase Prop value NOT updated when camelCase prop changes");

	kebabPropInput.value = "33";
	canEvent.dispatch.call(kebabPropInput, "change");
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
	canEvent.dispatch.call(camelPropInput, "change");
	equal(map.attr("theProp"), "32", "camelCaseProp updated from input bound to camelCase Prop");
	ok(!map.attr("the-prop"), "kebabCaseProp NOT updated from input bound to camelCase Prop");

	map.attr("theProp", "30");
	equal(camelPropInput.value, "30", "input bound to camelCase Prop value updated when camelCase prop changes");
	ok(!kebabPropInput.value, "input bound to kebabCase Prop value NOT updated when camelCase prop changes");

	kebabPropInput.value = "33";
	canEvent.dispatch.call(kebabPropInput, "change");
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

	canEvent.dispatch.call(input, "change");

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

	canEvent.dispatch.call(input, "change");

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

	var template = stache("<view-model-able on:prop:by:obj='someMethod(%arguments)'/>");

	var map = new DefineMap({
		obj: {
			prop: "Mercury"
		},
		someMethod: function(args){
			start();
			equal(args[0], "Venus", "method called");
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

		someMethod: function(scope, el, newVal){
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
		someMethod: function(scope, el, newVal){
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

	canEvent.dispatch.call(element, "prop");
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
	canEvent.dispatch.call(bindFirstInput, "click");
	QUnit.equal(map.get('theProp'), "22");


	var eventFirstInput = ta.getElementsByTagName("input")[1];
	eventFirstInput.value = "23";
	canEvent.dispatch.call(eventFirstInput, "click");
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
	canEvent.dispatch.call(el, "click");
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
	canEvent.dispatch.call(inputTo, 'change');
	equal(scope.attr('scope1'), '4', 'el:value:to - scope updated when attribute changed');

	scope.attr('scope1', 'scope4');
	equal(inputTo.value, '4', 'el:value:to - attribute not updated when scope changed');

	// el:value:from
	equal(inputFrom.value, 'scope2', 'el:value:from - attribute set from scope');

	inputFrom.value = 'scope5';
	canEvent.dispatch.call(inputFrom, 'change');
	equal(scope.attr('scope2'), 'scope2', 'el:value:from - scope not updated when attribute changed');

	scope.attr('scope2', 'scope6');
	equal(inputFrom.value, 'scope6', 'el:value:from - attribute updated when scope changed');

	// el:value:bind
	equal(inputBind.value, 'scope3', 'el:value:bind - attribute set from scope prop (parent -> child wins)');

	inputBind.value = 'scope6';
	canEvent.dispatch.call(inputBind, 'change');
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
	canEvent.dispatch.call(inputTo, 'input');

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

if (System.env.indexOf('production') < 0) {
	test("Warning happens when changing the map that a to-parent binding points to.", function() {
		var tagName = "merge-warn-test";

		// Delete previous tags, to avoid warnings from can-view-callbacks.
		delete viewCallbacks._tags[tagName];

		expect(2);

		var step1 = { "baz": "quux" };
		var overwrite = { "plonk": "waldo" };

		var oldlog = dev.warn,
			message = 'can-view-scope: Merging data into "bar" because its parent is non-observable';

		var thisTest = QUnit.config.current;
		dev.warn = function(text) {
			if(QUnit.config.current === thisTest) {
				if(text === message) {
					ok(true, 'Got expected message logged.');
				}
			}
		};
		var viewModel;
		MockComponent.extend({
			tag: tagName,
			viewModel: function() {
				return viewModel = new SimpleMap({
					"foo": new SimpleMap({})
				});

			}
		});

		var template = stache("<merge-warn-test foo:bind='bar'/>");

		var data = {
			bar: new SimpleMap(step1)
		};
		this.fixture.appendChild(template(data));
		viewModel.set("foo", overwrite);
		deepEqual(data.bar.get(), { "baz": undefined, "plonk": "waldo" }, "sanity check: parent binding set (default map -> default map)");

		dev.warn = oldlog;
	});
}

test("updates happen on two-way even when one binding is satisfied", function() {
	var template = stache('<input value:bind="firstName"/>');

	var ViewModel = DefineMap.extend({
		firstName: {
			set: function(newValue) {
				if(newValue) {
					return newValue.toLowerCase();
				}
			}
		}
	});
	var viewModel = new ViewModel({ firstName: "jeffrey" });
	stop(); // Stop here just to ensure the attributes event generated here is handled before the next test.
	var frag = template(viewModel);
	domMutate.appendChild.call(this.fixture, frag);
	equal(this.fixture.firstChild.value, "jeffrey");

	this.fixture.firstChild.value = "JEFFREY";
	domEvents.dispatch.call(this.fixture.firstChild, "change");
	equal(this.fixture.firstChild.value, "jeffrey");
	afterMutation(start);
});

QUnit.test("updates happen on changed two-way even when one binding is satisfied", function() {
	stop();
	var template = stache('<input value:bind="{{bindValue}}"/>');

	var ViewModel = DefineMap.extend({
		firstName: {
			set: function(newValue) {
				if(newValue) {
					return newValue.toLowerCase();
				}
			}
		},
		lastName: {
			set: function(newValue) {
				if(newValue) {
					return newValue.toLowerCase();
				}
			}
		},
		bindValue: "string"
	});
	var viewModel = new ViewModel({ firstName: "Jeffrey", lastName: "King", bindValue: "firstName" });

	var frag = template(viewModel);
	domMutate.appendChild.call(this.fixture, frag);
	afterMutation(function() {
		equal(this.fixture.firstChild.value, "jeffrey");

		viewModel.bindValue = "lastName";
		afterMutation(function() {
			equal(this.fixture.firstChild.value, "king");

			this.fixture.firstChild.value = "KING";
			domEvents.dispatch.call(this.fixture.firstChild, "change");
			equal(this.fixture.firstChild.value, "king");
			start();
		}.bind(this));
	}.bind(this));
});

if (System.env.indexOf('production') < 0) {
	test("warning when binding to non-existing value (#136) (#119)", function() {
		var oldWarn = dev.warn;
		dev.warn = function(message) {
			ok(true, message);
		};

		var template = stache("<div target:vm:bind='source.bar'/>");

		expect(1);
		var map = new SimpleMap({ source: new SimpleMap({ foo: "foo" }) });
		template(map);

		dev.warn = oldWarn;
	});
}


QUnit.test("changing a scope property calls registered stache helper's returned function", function(){
	expect(1);
	stop();
	var scope = new SimpleMap({
		test: "testval"
	});
	MockComponent.extend({
		tag: "test-component",
		viewModel: scope,
		template: stache('<span>Hello world</span>')

	});

	stache.registerHelper("propChangeEventStacheHelper", function(){
		return function(){
			start();
			ok(true, "helper's returned function called");
		};
	});

	var template = stache('<test-component on:test="propChangeEventStacheHelper()" />');

	template({});

	scope.set('test', 'changed');

});



test("call expressions work (#208)", function(){
	expect(2);

	stache.registerHelper("addTwo", function(arg){
		return arg+2;
	});

	stache.registerHelper("helperWithArgs", function(arg){
		QUnit.equal(arg, 3, "got the helper");
		ok(true, "helper called");
	});

	var template = stache("<p on:click='helperWithArgs(addTwo(arg))'></p>");
	var frag = template({arg: 1});


	this.fixture.appendChild(frag);
	var p0 = this.fixture.getElementsByTagName("p")[0];
	domEvents.dispatch.call(p0, "click");

});


QUnit.test("events should bind when using a plain object", function () {
	var flip = false;
	var template = stache("<div {{#if test}}on:foo=\"log()\"{{/if}}>Test</div>");

	var frag = template({
		log: function() {flip = true;},
		test: true
	});

	domEvents.dispatch.call(frag.firstChild, 'foo');
	QUnit.ok(flip, "Plain object method successfully called");
});

QUnit.test('change event handler set up when binding on radiochange (#206)', function() {

	var template = stache('<input type="radio" checked:bind="attending" />');

	var map = new SimpleMap({
		attending: false
	});

	var frag = template(map);
	var input = frag.firstChild;

	input.checked = true;
	domEvents.dispatch.call(input, "change");

	QUnit.equal(map.get('attending'), true, "now it is true");
});

QUnit.test("%arguments gives the event arguments", function(){
	var template = stache("<button on:click='doSomething(%event, %arguments)'>Default Args</button>");

	var MyMap = SimpleMap.extend({
		doSomething: function(ev, args){
			equal(args[0], ev, 'default arg is ev');
		}
	});

	var frag = template(new MyMap());
	var button = frag.firstChild;

	domEvents.dispatch.call(button, "click");
});


test("one-way pass computes to components with ~", function(assert) {
	expect(6);
	MockComponent.extend({
		tag: "foo-bar"
	});

	var baseVm = new SimpleMap({foo : "bar"});

	this.fixture.appendChild(stache("<foo-bar compute:from=\"~foo\"></foo-bar>")(baseVm));

	var vm = canViewModel(this.fixture.firstChild);
	ok(vm.get("compute")[canSymbol.for('can.getValue')], "observable returned");
	equal(vm.get("compute")(), "bar", "Compute has correct value");

	canReflect.onValue(vm.get("compute"), function() {
		// NB: This gets called twice below, once by
		//  the parent and once directly.
		ok(true, "Change handler called");
	});

	baseVm.set("foo", "quux");
	equal(vm.get("compute")(), "quux", "Compute updates");

	vm.get("compute")("xyzzy");
	equal(baseVm.get("foo"), "xyzzy", "Compute does update the other direction");
});

test("special values get called", function(assert) {
	assert.expect(2);
	var done = assert.async(1);

	MockComponent.extend({
		tag: 'ref-syntax',
		template: stache("<input on:change=\"%scope.set('*foo', %element.value)\">"),
		viewModel: new ( SimpleMap.extend({
			method: function() {
				assert.ok(true, "method called");

				done();
			}
		}) )
	});

	var template = stache("<ref-syntax on:el:inserted=\"%viewModel.method()\"></ref-syntax>");
	var frag = template({});
	domMutate.appendChild.call(this.fixture, frag);
	QUnit.stop();

	afterMutation(function() {
		var input = doc.getElementsByTagName("input")[0];
		input.value = "bar";
		domEvents.dispatch.call(input, "change");

		// Read from mock component's shadow scope for refs.
		var scope = domData.get.call(this.fixture.firstChild).shadowScope;
		assert.equal(scope.get("*foo"), "bar", "Reference attribute set");
		start();
	}.bind(this));
});

test("Multi-select empty string works(#1263)", function(){

		var data = new SimpleMap({
				isMultiple: 1,
				isSelect: 1,
				name: "attribute_ 0",
				options: new DefineList([
						{label: 'empty', value: ""},
						{label: 'zero', value: 0},
						{label: 'one', value: 1},
						{label: 'two', value: 2},
						{label: 'three', value: 3},
						{label: 'four', value: 4}
				]),
				value: new DefineList(["1"])
		});

		var template = stache("<select {{#if isMultiple}}multiple{{/if}} values:bind='value'> " +
				"{{#each options}} <option value='{{value}}' >{{label}}</option>{{/each}} </select>");

		var frag = template(data);

		equal(frag.firstChild.getElementsByTagName("option")[0].selected, false, "The first empty value is not selected");
		equal(frag.firstChild.getElementsByTagName("option")[2].selected, true, "One is selected");

});


test("converters work (#2299)", function(){
	stache.registerConverter("numberToString",{
		get: function(source){
			return source() + "";
		},
		set: function(newVal, source){
			source(newVal === "" ? null : +newVal );
		}
	});

	var template = stache('<input value:bind="numberToString(~age)">');

	var map = new SimpleMap({age: 25});

	var frag = template(map);

	equal(frag.firstChild.value, "25");
	equal(map.get("age"), 25);

	map.set("age",33);

	equal(frag.firstChild.value, "33");
	equal(map.get("age"), 33);

	frag.firstChild.value = "1";

	domEvents.dispatch.call(frag.firstChild, "change");

	stop();
	afterMutation(function() {
		start();
		equal(frag.firstChild.value, "1");
		equal(map.get("age"), 1);
	});

});

test("value:bind memory leak (#2270)", function() {

	var template = stache('<div><input value:bind="foo"></div>');

	var vm = new SimpleMap({foo: ''});

	var frag = template(vm);

	var ta = this.fixture;
	domMutate.appendChild.call(ta,frag);

	stop();
	afterMutation(function(){
		domMutate.removeChild.call(ta, ta.firstChild);
		// still 1 binding, should be 0
		afterMutation(function(){
			var checkLifecycleBindings = function(){
				var meta = vm[canSymbol.for("can.meta")]
				if( meta.handlers.get([]).length === 0 ) {
					QUnit.ok(true, "no bindings");
					start();
				} else {
					setTimeout(checkLifecycleBindings, 10);
				}
			};
			checkLifecycleBindings();
		});
	});

});

test("Child bindings updated before parent (#2252)", function(){
	var template = stache("{{#eq page 'view'}}<child-binder page:from='page' title:from='title'/>{{/eq}}");
	MockComponent.extend({
		tag: 'child-binder',
		template: stache('<span/>'),
		viewModel: function(props){
			var map = new SimpleMap(props);
			canReflect.assignSymbols(map,{
				"can.setKeyValue": function(key, value){
					if(key === "page"){
						equal(value, "view", "value should not be edit");
					} else {
						QUnit.equal(key, "title", "title was set, we are trapping right");
					}

					this.set(key, value);
				}
			});
			return map;
		}
	});

	var data = new SimpleMap({
		page : 'view'
	});
	template(data);

	data.set('title', 'foo');

	queues.batch.start();
	data.set('page', 'edit');
	queues.batch.stop();
});

}
