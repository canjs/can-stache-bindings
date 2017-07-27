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
			QUnit.ok(true, "on:vmEvent bindings work");
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

test('scope method called when scope property changes on DefineMap (#197)', function(){
	stop();
	expect(1);

	MockComponent.extend({
		tag: "view-model-able"
	});

	var template = stache("<view-model-able on:subprop:by:prop='someMethod'/>");

	var map = new DefineMap({
		prop: {
			subprop: "Mercury"
		},
		someMethod: function(scope, el, ev, newVal){
			start();
			equal(newVal, "Venus", "method called");
		}
	});

	template(map);
	map.prop.subprop = "Venus";
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

test("value:from", function() {
	var template = stache("<input value:from='age'/>");

	var map = new SimpleMap({});

	var frag = template(map);

	var ta = this.fixture;
	ta.appendChild(frag);

	var input = ta.getElementsByTagName("input")[0];
	equal(input.value, "", "input value set correctly if key does not exist in map");

	map.attr("age", "30");

	equal(input.value, "30", "input value set correctly");

	map.attr("age", "31");

	equal(input.value, "31", "input value update correctly");

	input.value = "32";

	canEvent.trigger.call(input, "change");

	equal(map.attr("age"), "31", "NOT updated from input");

});

test("value:to", function() {
	var template = stache("<input value:to='age'/>");

	var map = new SimpleMap({});

	var frag = template(map);

	var ta = this.fixture;
	ta.appendChild(frag);

	var input = ta.getElementsByTagName("input")[0];

	input.value = "32";

	canEvent.trigger.call(input, "change");

	equal(map.attr("age"), "32", "updated from input");

	map.attr("age", "30");

	equal(input.value, "32", "input value NOT updated");
});

test("value:bind", function() {
	var template = stache("<input value:bind='age'/>");

	var map = new SimpleMap({});

	var frag = template(map);

	var ta = this.fixture;
	ta.appendChild(frag);

	var input = ta.getElementsByTagName("input")[0];
	equal(input.value, "", "input value set correctly if key does not exist in map");

	map.attr("age", "30");

	equal(input.value, "30", "input value set correctly");

	map.attr("age", "31");

	equal(input.value, "31", "input value update correctly");

	input.value = "32";

	canEvent.trigger.call(input, "change");

	equal(map.attr("age"), "32", "updated from input");
});

}