
var stacheBindings = require('can-stache-bindings');

var QUnit = require('steal-qunit');
var SimpleMap = require("can-simple-map");
var DefineList = require("can-define/list/list");
var stache = require('can-stache');
var SimpleObservable = require("can-simple-observable");
var canViewModel = require('can-view-model');
var canSymbol = require('can-symbol');
var canReflect = require('can-reflect');


var domData = require('can-util/dom/data/data');
var domMutate = require('can-util/dom/mutate/mutate');
var domEvents = require('can-util/dom/events/events');
require('can-util/dom/events/inserted/inserted');

var globals = require('can-globals');
var makeDocument = require('can-vdom/make-document/make-document');

var dev = require('can-util/js/dev/dev');
var canEach = require('can-util/js/each/each');
var types = require('can-types');

var MockComponent = require("./mock-component");

var DefaultMap = types.DefaultMap;

function afterMutation(cb) {
	var doc = globals.getKeyValue('document');
	var div = doc.createElement("div");
	domEvents.addEventListener.call(div, "inserted", function(){
		doc.body.removeChild(div);
		setTimeout(cb, 5);
	});
	domMutate.appendChild.call(doc.body, div);
}

makeTest("can-stache-bindings - dom", document, true);
makeTest("can-stache-bindings - vdom", makeDocument(), false);

function makeTest(name, doc, enableMO){

var testIfRealDocument = function(/* args */) {
	if(doc === document) {
		test.apply(null, arguments);
	} else {
		//QUnit.skip.apply(null, arguments);
	}
};

var isRealDocument = function(){
	return doc === document;
};

QUnit.module(name, {
	setup: function() {

		globals.setKeyValue('document', doc);
		if(!enableMO){
			globals.setKeyValue('MutationObserver', null);
		}

		types.DefaultMap = SimpleMap;

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
			types.DefaultMap = DefaultMap;

			globals.deleteKeyValue('document');
			globals.deleteKeyValue('MutationObserver');

			var fixture = document.getElementById("qunit-fixture");
			while (fixture && fixture.hasChildNodes()) {
				domData.delete.call(fixture.lastChild);
				fixture.removeChild(fixture.lastChild);
			}

			start();
		});
	}
});







// TODO: Remove this test in next major version.
// This behavior is now in can-event-dom-enter,
// which will be removed from here and users
// will add it to an event registry themselves.















testIfRealDocument("can-value select multiple applies initial value, when options rendered from array (#1414)", function() {
	var template = stache(
		"<select can-value='colors' multiple>" +
		"{{#each allColors}}<option value='{{value}}'>{{label}}</option>{{/each}}" +
		"</select>");

	var map = new SimpleMap({
		colors: ["red", "green"],
		allColors: [
			{ value: "red", label: "Red"},
			{ value: "green", label: "Green"},
			{ value: "blue", label: "Blue"}
		]
	});

	stop();
	var frag = template(map);

	var ta = this.fixture;
	ta.appendChild(frag);

	var select = ta.getElementsByTagName("select")[0],
		options = select.getElementsByTagName("option");

	// Wait for Multiselect.set() to be called.
	afterMutation(function(){
		ok(options[0].selected, "red should be set initially");
		ok(options[1].selected, "green should be set initially");
		ok(!options[2].selected, "blue should not be set initially");
		start();
	});

});

test('can-value with truthy and falsy values binds to checkbox (#1478)', function() {
	var data = new SimpleMap({
			completed: 1
		}),
		frag = stache('<input type="checkbox" can-value="completed"/>')(data);
	stop();
	domMutate.appendChild.call(this.fixture, frag);

	var input = this.fixture.getElementsByTagName('input')[0];
	equal(input.checked, true, 'checkbox value bound (via attr check)');
	data.attr('completed', 0);
	equal(input.checked, false, 'checkbox value bound (via attr check)');
	afterMutation(start);
});

test("can-EVENT can call intermediate functions before calling the final function(#1474)", function() {
	var ta = this.fixture;
	var template = stache("<div id='click-me' can-click='{does.some.thing}'></div>");
	var frag = template({
		does: function(){
			return {
				some: function(){
					return {
						thing: function(context) {
							ok(typeof context.does === "function");
							start();
						}
					};
				}
			};
		}
	});

	stop();
	ta.appendChild(frag);
	domEvents.dispatch.call(doc.getElementById("click-me"), "click");
});

test("by default can-EVENT calls with values, not computes", function(){
	stop();
	var ta = this.fixture;
	var template = stache("<div id='click-me' can-click='{map.method one map.two map.three}'></div>");

	var one = canCompute(1);
	var three = canCompute(3);
	var MyMap = SimpleMap.extend({
		method: function(ONE, two, three){
			equal(ONE, 1);
			equal(two, 2);
			equal(three, 3);
			equal(this, map, "this set right");
			start();
		}
	});

	var map = new MyMap({"two": 2, "three": three});

	var frag = template({one: one, map: map});
	ta.appendChild(frag);
	domEvents.dispatch.call(doc.getElementById("click-me"), "click");

});

test('Conditional can-EVENT bindings are bound/unbound', 2, function() {
	var state = new SimpleMap({
		enableClick: true,
		clickHandler: function() {
			ok(true, '"click" was handled');
		}
	});

	var template = stache('<button id="find-me" {{#if enableClick}}can-click="{clickHandler}"{{/if}}></button>');
	var frag = template(state);

	var sandbox = this.fixture;
	sandbox.appendChild(frag);

	var btn = doc.getElementById('find-me');

	domEvents.dispatch.call(btn, 'click');
	state.attr('enableClick', false);

	stop();
	afterMutation(function() {
		domEvents.dispatch.call(btn, 'click');
		state.attr('enableClick', true);

		afterMutation(function() {
			domEvents.dispatch.call(btn, 'click');
			start();
		});
	});
});

testIfRealDocument("<select can-value={value}> with undefined value selects option without value", function() {

	var template = stache("<select can-value='opt'><option>Loading...</option></select>");

	var map = new SimpleMap();

	var frag = template(map);

	var ta = this.fixture;
	ta.appendChild(frag);

	var select = ta.childNodes.item(0);
	QUnit.equal(select.selectedIndex, 0, 'Got selected index');
});

testIfRealDocument("<select can-value> keeps its value as <option>s change with {{#list}} (#1762)", function(){

	var template = stache("<select can-value='{id}'>{{#values}}<option value='{{.}}'>{{.}}</option>{{/values}}</select>");
	var values = canCompute( ["1", "2", "3", "4"]);
	var id = canCompute("2");
	var frag = template({
		values: values,
		id: id
	});
	stop();
	var select = frag.firstChild;
	// the value is set asynchronously
	afterMutation(function(){
		ok(select.childNodes.item(1).selected, "value is initially selected");

		values(["7", "2", "5", "4"]);

		ok(select.childNodes.item(1).selected, "after changing options, value should still be selected");


		start();
	});

});

testIfRealDocument("<select can-value> keeps its value as <option>s change with {{#each}} (#1762)", function(){
	var template = stache("<select can-value='{id}'>{{#each values}}<option value='{{.}}'>{{.}}</option>{{/each}}</select>");
	var values = canCompute( ["1","2","3","4"]);
	var id = canCompute("2");
	var frag = template({
		values: values,
		id: id
	});
	stop();
	var select = frag.firstChild;
	var options = select.getElementsByTagName("option");


	// the value is set asynchronously
	afterMutation(function(){
		ok(options[1].selected, "value is initially selected");
		values(["7","2","5","4"]);

		afterMutation(function(){
			ok(options[1].selected, "after changing options, value should still be selected");
			start();
		});
	});

});

test("(event) methods on objects are called (#1839)", function(){
	var template = stache("<div ($click)='setSomething person.message'/>");
	var data = {
		setSomething: function(message){
			equal(message, "Matthew P finds good bugs");
			equal(this, data, "setSomething called with correct scope");
		},
		person: {
			name: "Matthew P",
			message: function(){
				return this.name + " finds good bugs";
			}
		}
	};
	var frag = template(data);
	domEvents.dispatch.call( frag.firstChild, "click" );
});

test("(event) methods on objects are called with call expressions (#1839)", function(){
	var template = stache("<div ($click)='setSomething(person.message)'/>");
	var data = {
		setSomething: function(message){
			equal(message, "Matthew P finds good bugs");
			equal(this, data, "setSomething called with correct scope");
		},
		person: {
			name: "Matthew P",
			message: function(){
				return this.name + " finds good bugs";
			}
		}
	};
	var frag = template(data);
	domEvents.dispatch.call( frag.firstChild, "click" );
});

test("two way - viewModel (#1700)", function(){
	var template = stache("<div {(view-model-prop)}='scopeProp'/>");
	var map = new SimpleMap({ scopeProp: "Hello" });

	var scopeMapSetCalled = 0;

	// overwrite setKeyValue to catch child->parent updates
	var origMapSetKeyValue = map[canSymbol.for("can.setKeyValue")];
	map[canSymbol.for("can.setKeyValue")] = function(attrName, value){
		if(typeof attrName === "string" && arguments.length > 1) {
			scopeMapSetCalled++;
		}

		return origMapSetKeyValue.apply(this, arguments);
	};
	// overwrite _set to catch changes made by calling attr()
	var origMapSet = map._set;
	map._set = function(attrName, value) {
		if(typeof attrName === "string" && arguments.length > 1) {
			scopeMapSetCalled++;
		}

		return origMapSet.apply(this, arguments);
	};

	var frag = template(map);
	var viewModel = canViewModel(frag.firstChild);

	equal(scopeMapSetCalled, 0, "set is not called on scope map");
	equal(viewModel.attr("viewModelProp"), "Hello", "initial value set" );

	viewModel = canViewModel(frag.firstChild);

	var viewModelSetCalled = 1; // set once already - on "initial value set"
	var origViewModelSet = viewModel[canSymbol.for("can.setKeyValue")];
	viewModel[canSymbol.for("can.setKeyValue")] = function(attrName){
		if(typeof attrName === "string" && arguments.length > 1) {
			viewModelSetCalled++;
		}

		return origViewModelSet.apply(this, arguments);
	};

	viewModel.attr("viewModelProp", "HELLO");
	equal(map.attr("scopeProp"), "HELLO", "binding from child to parent");
	equal(scopeMapSetCalled, 1, "set is called on scope map");
	equal(viewModelSetCalled, 2, "set is called viewModel");

	map.attr("scopeProp", "WORLD");
	equal(viewModel.attr("viewModelProp"), "WORLD", "binding from parent to child" );
	equal(scopeMapSetCalled, 2, "set is called again on scope map");
	equal(viewModelSetCalled, 3, "set is called again on viewModel");
});

// new two-way binding

test("two-way - DOM - input text (#1700)", function() {

	var template = stache("<input {($value)}='age'/>");

	var map = new SimpleMap();

	var frag = template(map);

	var ta = this.fixture;
	ta.appendChild(frag);

	var input = ta.getElementsByTagName("input")[0];
	equal(input.value, "", "input value set correctly if key does not exist in map");

	map.attr("age", "30");

	stop();
	afterMutation(function() {
		start();
		equal(input.value, "30", "input value set correctly");

		map.attr("age", "31");

		stop();
		afterMutation(function() {
			start();
			equal(input.value, "31", "input value update correctly");

			input.value = "32";

			domEvents.dispatch.call(input, "change");

			stop();
			afterMutation(function() {
				start();
				equal(map.attr("age"), "32", "updated from input");
			});
		});
	});
});

test('two-way - DOM - {($checked)} with truthy and falsy values binds to checkbox (#1700)', function() {
	var data = new SimpleMap({
			completed: 1
		}),
		frag = stache('<input type="checkbox" el:checked:bind="completed"/>')(data);

	domMutate.appendChild.call(this.fixture, frag);

	var input = this.fixture.getElementsByTagName('input')[0];
	equal(input.checked, true, 'checkbox value bound (via attr check)');
	data.attr('completed', 0);
	stop();

	afterMutation(function() {
		start();
		equal(input.checked, false, 'checkbox value bound (via attr check)');
	});
});

test('one-way - DOM - {$checked} with undefined (#135)', function() {
	var data = new SimpleMap({
			completed: undefined
		}),
		frag = stache('<input type="checkbox" el:checked:from="completed"/>')(data);

	domMutate.appendChild.call(this.fixture, frag);

	var input = this.fixture.getElementsByTagName('input')[0];
	equal(input.checked, false, 'checkbox value should be false for undefined');
});































}
