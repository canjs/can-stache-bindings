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

test("getBindingInfo", function(){
	var info = stacheBindings.getBindingInfo({name: "foo-ed:from", value: "bar"});
	deepEqual(info, {
		parent: "scope",
		child: "viewModelOrAttribute",
		parentToChild: true,
		childToParent: false,
		childName: "fooEd",
		parentName: "bar",
		bindingAttributeName: "foo-ed:from",
		initializeValues: true,
		syncChildWithParent: false
	}, "new vm binding");

	info = stacheBindings.getBindingInfo({name: "foo-ed:bind", value: "bar"});
	deepEqual(info, {
		parent: "scope",
		child: "viewModelOrAttribute",
		parentToChild: true,
		childToParent: true,
		childName: "fooEd",
		parentName: "bar",
		bindingAttributeName: "foo-ed:bind",
		initializeValues: true,
		syncChildWithParent: true
	}, "new el binding");

	info = stacheBindings.getBindingInfo({name: "foo-ed:to", value: "bar"});
	deepEqual(info, {
		parent: "scope",
		child: "viewModelOrAttribute",
		parentToChild: false,
		childToParent: true,
		childName: "fooEd",
		parentName: "bar",
		bindingAttributeName: "foo-ed:to",
		initializeValues: true,
		syncChildWithParent: false
	}, "new el binding");
	info = stacheBindings.getBindingInfo({name: "foo-ed:from", value: "bar"}, null, null, null, true);
	deepEqual(info, {
		parent: "scope",
		child: "viewModel",
		parentToChild: true,
		childToParent: false,
		childName: "fooEd",
		parentName: "bar",
		bindingAttributeName: "foo-ed:from",
		initializeValues: true,
		syncChildWithParent: false
	}, "new vm binding");

	info = stacheBindings.getBindingInfo({name: "foo-ed:bind", value: "bar"}, null, null, null, true);
	deepEqual(info, {
		parent: "scope",
		child: "viewModel",
		parentToChild: true,
		childToParent: true,
		childName: "fooEd",
		parentName: "bar",
		bindingAttributeName: "foo-ed:bind",
		initializeValues: true,
		syncChildWithParent: true
	}, "new el binding");

	info = stacheBindings.getBindingInfo({name: "foo-ed:to", value: "bar"}, null, null, null, true);
	deepEqual(info, {
		parent: "scope",
		child: "viewModel",
		parentToChild: false,
		childToParent: true,
		childName: "fooEd",
		parentName: "bar",
		bindingAttributeName: "foo-ed:to",
		initializeValues: true,
		syncChildWithParent: false
	}, "new el binding");
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

test('can bind to property on viewModel using on:vm:prop:by:obj', function() {
	stop();
	expect(1);

	var map = new SimpleMap({
		obj: new SimpleMap({
			prop: "Mercury"
		})
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

	var template = stache("<view-model-able on:vm:prop:by:obj='someMethod'/>");

	template(parent);
	map.attr("obj").attr("prop", "Venus");
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

}
