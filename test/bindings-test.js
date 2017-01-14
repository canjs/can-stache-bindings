require("./bindings-define-test");

var stacheBindings = require('can-stache-bindings');

var QUnit = require('steal-qunit');
var CanList = require('can-list');
var CanMap = require("can-map");
var stache = require('can-stache');
var canEvent = require('can-event');
var canBatch = require('can-event/batch/batch');
var viewCallbacks = require('can-view-callbacks');
var canCompute = require('can-compute');
var canViewModel = require('can-view-model');
require('can-util/dom/events/inserted/');

var stacheExpression = require('can-stache/src/expression');

var domData = require('can-util/dom/data/data');
var domMutate = require('can-util/dom/mutate/mutate');

var makeDocument = require('can-vdom/make-document/make-document');
var MUTATION_OBSERVER = require('can-util/dom/mutation-observer/mutation-observer');
var DOCUMENT = require("can-util/dom/document/document");


var dev = require('can-util/js/dev/dev');
var canEach = require('can-util/js/each/each');
var types = require('can-types');

var MockComponent = require("./mock-component");

var DefaultMap = types.DefaultMap;

var DOC = DOCUMENT();
var MUT_OBS = MUTATION_OBSERVER();
makeTest("can-stache-bindings - dom", document, MUT_OBS);
makeTest("can-stache-bindings - vdom", makeDocument(), null);

function makeTest(name, doc, mutObs){

var testIfRealDocument = function(/* args */) {
	if(doc === document) {
		test.apply(null, arguments);
	}
};

var isRealDocument = function(){
	return doc === document;
};

QUnit.module(name, {
	setup: function () {
		DOCUMENT(doc);
		MUTATION_OBSERVER(mutObs);

		types.DefaultMap = CanMap;

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
		setTimeout(function(){
			types.DefaultMap = DefaultMap;
			start();
			DOCUMENT(DOC);
			MUTATION_OBSERVER(MUT_OBS);
		},1);
	}
});


test("attributeNameInfo", function(){
	// MUSTACHE BEHAVIOR
	var info = stacheBindings.getBindingInfo({name: "foo", value: "bar"},{foo: "@"},"legacy");
	deepEqual(info,undefined, "legacy with @");


	info = stacheBindings.getBindingInfo({name: "foo-ed", value: "bar"},{},"legacy");
	deepEqual(info, undefined,"legacy");

	// ORIGINAL STACHE BEHAVIOR
	info = stacheBindings.getBindingInfo({name: "foo-ed", value: "bar"});
	deepEqual(info, undefined, "OG stache attr binding");

	info = stacheBindings.getBindingInfo({name: "foo-ed", value: "{bar}"});
	deepEqual(info, undefined, "OG stache vm binding");

	// NEW BINDINGS

	// element based
	info = stacheBindings.getBindingInfo({name: "{$foo-ed}", value: "bar"});
	deepEqual(info, {
		parent: "scope",
		child: "attribute",
		childToParent: false,
		parentToChild: true,
		parentName: "bar",
		childName: "foo-ed",
		bindingAttributeName: "{$foo-ed}",
		initializeValues: true,
		syncChildWithParent: false
	}, "new el binding");

	info = stacheBindings.getBindingInfo({name: "{($foo-ed)}", value: "bar"});
	deepEqual(info, {
		parent: "scope",
		child: "attribute",
		childToParent: true,
		parentToChild: true,
		parentName: "bar",
		childName: "foo-ed",
		bindingAttributeName: "{($foo-ed)}",
		initializeValues: true,
		syncChildWithParent: true
	}, "new el binding");

	info = stacheBindings.getBindingInfo({name: "{^$foo-ed}", value: "bar"});
	deepEqual(info, {
		parent: "scope",
		child: "attribute",
		childToParent: true,
		parentToChild: false,
		parentName: "bar",
		childName: "foo-ed",
		bindingAttributeName: "{^$foo-ed}",
		initializeValues: true,
		syncChildWithParent: false
	}, "new el binding");

	// vm based
	info = stacheBindings.getBindingInfo({name: "{foo-ed}", value: "bar"});
	deepEqual(info, {
		parent: "scope",
		child: "viewModel",
		parentToChild: true,
		childToParent: false,
		childName: "fooEd",
		parentName: "bar",
		bindingAttributeName: "{foo-ed}",
		initializeValues: true,
		syncChildWithParent: false
	}, "new vm binding");

	info = stacheBindings.getBindingInfo({name: "{(foo-ed)}", value: "bar"});
	deepEqual(info, {
		parent: "scope",
		child: "viewModel",
		parentToChild: true,
		childToParent: true,
		childName: "fooEd",
		parentName: "bar",
		bindingAttributeName: "{(foo-ed)}",
		initializeValues: true,
		syncChildWithParent: true
	}, "new el binding");

	info = stacheBindings.getBindingInfo({name: "{^foo-ed}", value: "bar"});
	deepEqual(info, {
		parent: "scope",
		child: "viewModel",
		parentToChild: false,
		childToParent: true,
		childName: "fooEd",
		parentName: "bar",
		bindingAttributeName: "{^foo-ed}",
		initializeValues: true,
		syncChildWithParent: false
	}, "new el binding");

});

var foodTypes = new CanList([{
	title: "Fruits",
	content: "oranges, apples"
}, {
	title: "Breads",
	content: "pasta, cereal"
}, {
	title: "Sweets",
	content: "ice cream, candy"
}]);

if(typeof doc.getElementsByClassName === 'function') {
	test("event handlers", function () {
		//expect(12);
		var ta = this.fixture;
		var template = stache("<div>" +
		"{{#each foodTypes}}" +
		"<p ($click)='doSomething(., %element, %event)'>{{content}}</p>" +
		"{{/each}}" +
		"</div>");



		function doSomething(foodType, el, ev) {
			ok(true, "doSomething called");
			equal(el.nodeName.toLowerCase(), "p", "this is the element");
			equal(ev.type, "click", "1st argument is the event");
			equal(foodType, foodTypes[0], "2nd argument is the 1st foodType");

		}

		var frag = template({
			foodTypes: foodTypes,
			doSomething: doSomething
		});

		ta.appendChild(frag);
		var p0 = ta.getElementsByTagName("p")[0];
		canEvent.trigger.call(p0, "click");

	});

	test("event special keys", function() {
		expect( 11 );

		var scope = new CanMap({
			test: "testval"
		});
		var ta = this.fixture;
		MockComponent.extend({
			tag: "can-event-args-tester",
			viewModel: scope
		});
		var template = stache("<div>" +
		"{{#each foodTypes}}" +
		"<can-event-args-tester class='with-args' ($click)='withArgs(%event, %element, %viewModel, %viewModel.test, ., title, content=content)'/>" +
		"{{/each}}" +
		"</div>");

		function withArgs(ev1, el1, compScope, testVal, context, title, hash) {
			ok(true, "withArgs called");

			ok(ev1);
			ok(el1);
			ok(compScope);

			equal(el1.nodeName.toLowerCase(), "can-event-args-tester", "%element is the event's DOM element");
			equal(ev1.type, "click", "%event is the click event");
			equal(scope, compScope, "Component scope accessible through %viewModel");
			equal(testVal, scope.attr("test"), "Attributes accessible");
			equal(context.title, foodTypes[0].title, "Context passed in");
			equal(title, foodTypes[0].title, "Title passed in");
			equal(hash.content, foodTypes[0].content, "Args with = passed in as a hash");
		}

		var frag = template({
			foodTypes: foodTypes,
			withArgs: withArgs
		});
		ta.innerHTML = "";
		ta.appendChild(frag);
		var p0 = ta.getElementsByClassName("with-args")[0];
		canEvent.trigger.call(p0, "click");
	});

	test("(event) handlers", function () {
		expect(15);
		var ta = this.fixture;
		var template = stache("<div>" +
		"{{#each foodTypes}}" +
		"<p ($click)='doSomething'>{{content}}</p>" +
		"{{/each}}" +
		"</div>");

		var foodTypes = new CanList([{
			title: "Fruits",
			content: "oranges, apples"
		}, {
			title: "Breads",
			content: "pasta, cereal"
		}, {
			title: "Sweets",
			content: "ice cream, candy"
		}]);

		function doSomething(foodType, el, ev) {
			ok(true, "doSomething called");
			equal(el.nodeName.toLowerCase(), "p", "this is the element");
			equal(ev.type, "click", "1st argument is the event");
			equal(foodType, foodTypes[0], "2nd argument is the 1st foodType");

		}

		var frag = template({
			foodTypes: foodTypes,
			doSomething: doSomething
		});

		ta.appendChild(frag);
		var p0 = ta.getElementsByTagName("p")[0];
		canEvent.trigger.call(p0, "click");


		var scope = new CanMap({
			test: "testval"
		});
		MockComponent.extend({
			tag: "fancy-event-args-tester",
			viewModel: scope
		});

		template = stache("<div>" +
		"{{#each foodTypes}}" +
		"<fancy-event-args-tester class='with-args' ($click)='withArgs %event %element %viewModel %viewModel.test . title content=content'/>" +
		"{{/each}}" +
		"</div>");
		function withArgs(ev1, el1, compScope, testVal, context, title, hash) {
			ok(true, "withArgs called");

			ok(ev1);
			ok(el1);
			ok(compScope);

			equal(el1.nodeName.toLowerCase(), "fancy-event-args-tester", "%element is the event's DOM element");
			equal(ev1.type, "click", "%event is the click event");
			equal(scope, compScope, "Component scope accessible through %viewModel");
			equal(testVal, scope.attr("test"), "Attributes accessible");
			equal(context.title, foodTypes[0].title, "Context passed in");
			equal(title, foodTypes[0].title, "Title passed in");
			equal(hash.content, foodTypes[0].content, "Args with = passed in as a hash");
		}

		frag = template({
			foodTypes: foodTypes,
			withArgs: withArgs
		});
		ta.innerHTML = "";
		ta.appendChild(frag);
		p0 = ta.getElementsByClassName("with-args")[0];
		canEvent.trigger.call(p0, "click");
	});
}

test("{($value)} input text", function () {

	var template = stache("<input {($value)}='age'/>");

	var map = new CanMap();

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

test("{($value)} with spaces (#1477)", function () {

	var template = stache("<input {($value)}=' age '/>");

	var map = new CanMap();

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

test("($enter)", function () {
	var template = stache("<input ($enter)='update()'/>");

	var called = 0;

	var frag = template({
		update: function () {
			called++;
			ok(called, 1, "update called once");
		}
	});

	var input = frag.childNodes.item(0);

	canEvent.trigger.call(input, {
		type: "keyup",
		keyCode: 38
	});

	canEvent.trigger.call(input, {
		type: "keyup",
		keyCode: 13
	});

});

test("two bindings on one element call back the correct method", function () {
	expect(2);
	var template = stache("<input ($mousemove)='first()' ($click)='second()'/>");

	var callingFirst = false,
		callingSecond = false;

	var frag = template({
		first: function () {
			ok(callingFirst, "called first");
		},
		second: function () {
			ok(callingSecond, "called second");
		}
	});
	var input = frag.childNodes.item(0);

	callingFirst = true;

	canEvent.trigger.call(input, {
		type: "mousemove"
	});

	callingFirst = false;
	callingSecond = true;
	canEvent.trigger.call(input, {
		type: "click"
	});
});

test("template with view binding breaks in stache, not in mustache (#966)", function(){
	var templateString = '<a href="javascript://" ($click)="select">'+
							'{{#if thing}}\n<div />{{/if}}'+
							'<span>{{name}}</span>'+
						 '</a>';

	var stacheRenderer = stache(templateString);

	var obj = new CanMap({thing: 'stuff'});


	stacheRenderer(obj);
	ok(true, 'stache worked without errors');

});

test("event throws an error when inside #if block (#1182)", function(){
	var flag = canCompute(false),
		clickHandlerCount = 0;
	var frag = stache("<div {{#if flag}}($click)='foo()'{{/if}}>Click</div>")({
		flag: flag,
		foo: function () {
			clickHandlerCount++;
		}
	});
	var fixture = this.fixture;
	var trig = function(){
		var div = fixture.getElementsByTagName('div')[0];
		canEvent.trigger.call(div, {
			type: "click"
		});
	};
	domMutate.appendChild.call(this.fixture, frag);
	trig();
	equal(clickHandlerCount, 0, "click handler not called");
});

testIfRealDocument("($event) removed in live bindings doesn't unbind (#1112)", function(){
	var flag = canCompute(true),
		clickHandlerCount = 0;
	var frag = stache("<div {{#if flag}}($click)='foo'{{/if}}>Click</div>")({
		flag: flag,
		foo: function () {
			clickHandlerCount++;
		}
	});
	var testEnv = this;
	var trig = function () {
		var div = testEnv.fixture.getElementsByTagName('div')[0];
		canEvent.trigger.call(div, {
			type: "click"
		});
	};
	domMutate.appendChild.call(this.fixture, frag);

	// Attribute mutation observers are called asyncronously,
	// so give some time for the mutation handlers.
	stop();
	var numTrigs = 3;
	var testTimer = setInterval(function () {
		if (numTrigs--) {
			trig();
			flag( !flag() );
		} else {
			clearTimeout(testTimer);
			equal(clickHandlerCount, 2, "click handler called twice");
			start();
		}
	}, 100);
});

test("can-value compute rejects new value (#887)", function() {
	var template = stache("<input {($value)}='age'/>");

	// Compute only accepts numbers
	var compute = canCompute(30, function(newVal, oldVal) {
		if(isNaN(+newVal)) {
			return oldVal;
		} else {
			return +newVal;
		}
	});

	var frag = template({
		age: compute
	});

	var ta = this.fixture;
	ta.appendChild(frag);

	var input = ta.getElementsByTagName("input")[0];

	// Set to non-number
	input.value = "30f";
	canEvent.trigger.call(input, "change");

	equal(compute(), 30, "Still the old value");
	equal(input.value, "30", "Text input has also not changed");
});


test('{($checked)} with truthy and falsy values binds to checkbox (#1478)', function() {
	var data = new CanMap({
			completed: 1
		}),
		frag = stache('<input type="checkbox" {($checked)}="completed"/>')(data);
	domMutate.appendChild.call(this.fixture, frag);

	var input = this.fixture.getElementsByTagName('input')[0];
	equal(input.checked, true, 'checkbox value bound (via attr check)');
	data.attr('completed', 0);
	equal(input.checked, false, 'checkbox value bound (via attr check)');
});

test("($event) can call intermediate functions before calling the final function (#1474)", function () {
	var ta = this.fixture;
	var template = stache("<div id='click-me' ($click)='does.some.thing(this)'></div>");
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
	canEvent.trigger.call(doc.getElementById("click-me"), "click");
});



test('Conditional ($event) bindings are bound/unbound', 2, function () {
	var state = new CanMap({
		enableClick: true,
		clickHandler: function () {
			ok(true, '"click" was handled');
		}
	});

	var template = stache('<button id="find-me" {{#if enableClick}}($click)="clickHandler()"{{/if}}></button>');
	var frag = template(state);

	var sandbox = this.fixture;
	sandbox.appendChild(frag);

	var btn = doc.getElementById('find-me');

	canEvent.trigger.call(btn, 'click');
	state.attr('enableClick', false);

	stop();
	setTimeout(function() {
		canEvent.trigger.call(btn, 'click');
		state.attr('enableClick', true);

		setTimeout(function() {
			canEvent.trigger.call(btn, 'click');
			start();
		}, 100);
	}, 100);
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
	canEvent.trigger.call( frag.firstChild, "click" );
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
	canEvent.trigger.call( frag.firstChild, "click" );
});

test("two way - viewModel (#1700)", function(){

	MockComponent.extend({
		tag: "view-model-able"
	});

	var template = stache("<div {(view-model-prop)}='scopeProp'/>");

	var attrSetCalled = 0;

	var map = new CanMap({scopeProp: "Hello"});
	var oldAttr = map.attr;
	map.attr = function(attrName, value){
		if(typeof attrName === "string" && arguments.length > 1) {
			attrSetCalled++;
		}

		return oldAttr.apply(this, arguments);
	};


	var frag = template(map);
	var viewModel = canViewModel(frag.firstChild);

	equal(attrSetCalled, 0, "set is not called on scope map");
	equal( viewModel.attr("viewModelProp"), "Hello", "initial value set" );

	viewModel = canViewModel(frag.firstChild);

	var viewModelAttrSetCalled = 1;
	viewModel.attr = function(attrName){
		if(typeof attrName === "string" && arguments.length > 1) {
			viewModelAttrSetCalled++;
		}

		return oldAttr.apply(this, arguments);
	};

	viewModel.attr("viewModelProp","HELLO");
	equal(map.attr("scopeProp"), "HELLO", "binding from child to parent");

	equal(attrSetCalled, 1, "set is called once on scope map");

	equal(viewModelAttrSetCalled, 3, "set is called once viewModel");


	map.attr("scopeProp","WORLD");
	equal( viewModel.attr("viewModelProp"), "WORLD", "binding from parent to child" );
	equal(attrSetCalled, 2, "set is called once on scope map");
	equal(viewModelAttrSetCalled, 4, "set is called once on viewModel");

});

// new two-way binding

test("two-way - DOM - input text (#1700)", function () {

	var template = stache("<input {($value)}='age'/>");

	var map = new CanMap();

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

test('two-way - DOM - {($checked)} with truthy and falsy values binds to checkbox (#1700)', function() {
	var data = new CanMap({
			completed: 1
		}),
		frag = stache('<input type="checkbox" {($checked)}="completed"/>')(data);

	domMutate.appendChild.call(this.fixture, frag);

	var input = this.fixture.getElementsByTagName('input')[0];
	equal(input.checked, true, 'checkbox value bound (via attr check)');
	data.attr('completed', 0);
	equal(input.checked, false, 'checkbox value bound (via attr check)');
});

test('two-way - reference - {(child)}="*ref" (#1700)', function(){
	var data = new CanMap({person: {name: {}}});
	MockComponent.extend({
		tag: 'reference-export',
		viewModel: {tag: 'reference-export'}
	});
	MockComponent.extend({
		tag: 'ref-import',
		viewModel: {tag: 'ref-import'}
	});

	var template = stache("<reference-export {(name)}='*refName'/>"+
		"<ref-import {(name)}='*refName'/> {{helperToGetScope}}");

	var scope;
	var frag = template(data,{
		helperToGetScope: function(options){
			scope = options.scope;
		}
	});

	var refExport = canViewModel(frag.firstChild);
	var refImport = canViewModel(frag.firstChild.nextSibling);

	refExport.attr("name","v1");

	equal( scope.getRefs()._context.attr("*refName"), "v1", "reference scope updated");

	equal(refImport.attr("name"),"v1", "updated ref-import");

	refImport.attr("name","v2");

	equal(refExport.attr("name"),"v2", "updated ref-export");

	equal( scope.getRefs()._context.attr("*refName"), "v2", "actually put in refs scope");

});



test('two-way - reference shorthand (#1700)', function(){
	var data = new CanMap({person: {name: {}}});
	MockComponent.extend({
		tag: 'reference-export',
		template: stache('<span>{{*referenceExport.name}}</span>'),
		viewModel: {}
	});

	var template = stache('{{#person}}{{#name}}'+
		"<reference-export *reference-export/>"+
		"{{/name}}{{/person}}<span>{{*referenceExport.name}}</span>");
	var frag = template(data);

	var refExport = canViewModel(frag.firstChild);
	refExport.attr("name","done");

	equal( frag.lastChild.firstChild.nodeValue, "done");
	equal( frag.firstChild.firstChild.firstChild.nodeValue, "", "not done");
});

test('one-way - parent to child - viewModel', function(){


	var template = stache("<div {view-model-prop}='scopeProp'/>");


	var map = new CanMap({scopeProp: "Venus"});

	var frag = template(map);
	var viewModel = canViewModel(frag.firstChild);

	equal( viewModel.attr("viewModelProp"), "Venus", "initial value set" );

	viewModel.attr("viewModelProp","Earth");
	equal(map.attr("scopeProp"), "Venus", "no binding from child to parent");

	map.attr("scopeProp","Mars");
	equal( viewModel.attr("viewModelProp"), "Mars", "binding from parent to child" );
});

test('one-way - child to parent - viewModel', function(){

	MockComponent.extend({
		tag: "view-model-able",
		viewModel: {
			viewModelProp: "Mercury"
		}
	});

	var template = stache("<view-model-able {^view-model-prop}='scopeProp'/>");

	var map = new CanMap({scopeProp: "Venus"});

	var frag = template(map);
	var viewModel = canViewModel(frag.firstChild);

	equal( viewModel.attr("viewModelProp"), "Mercury", "initial value kept" );
	equal( map.attr("scopeProp"), "Mercury", "initial value set on parent" );

	viewModel.attr("viewModelProp","Earth");
	equal(map.attr("scopeProp"), "Earth", "binding from child to parent");

	map.attr("scopeProp","Mars");
	equal( viewModel.attr("viewModelProp"), "Earth", "no binding from parent to child" );
});

test('one way - child to parent - importing viewModel {^.}="test"', function() {
	MockComponent.extend({
		tag: 'import-scope',
		template: stache('Hello {{name}}'),
		viewModel: {
			name: 'David',
			age: 7
		}
	});

	MockComponent.extend({
		tag: 'import-parent',
		template: stache('<import-scope {^.}="test"></import-scope>' +
			'<div>Imported: {{test.name}} {{test.age}}</div>')
	});

	var template = stache('<import-parent></import-parent>');
	var frag = template({});

	equal(frag.childNodes.item(0).childNodes.item(1).innerHTML,
		'Imported: David 7',
		'{.} component scope imported into variable');
});


test('one way - child to parent - importing viewModel {^prop}="test"', function() {
	MockComponent.extend({
		tag: 'import-prop-scope',
		template: stache('Hello {{name}}'),
		viewModel: {
			name: 'David',
			age: 7
		}
	});

	MockComponent.extend({
		tag: 'import-prop-parent',
		template: stache('<import-prop-scope {^name}="test"></import-prop-scope>' +
			'<div>Imported: {{test}}</div>')
	});

	var template = stache('<import-prop-parent></import-prop-parent>');
	var frag = template({});

	equal(frag.childNodes.item(0).childNodes.item(1).innerHTML,
		'Imported: David',  '{name} component scope imported into variable');
});

test('one way - child to parent - importing viewModel {^hypenated-prop}="test"', function(){
	MockComponent.extend({
		tag: 'import-prop-scope',
		template: stache('Hello {{userName}}'),
		viewModel: {
			userName: 'David',
			age: 7,
			updateName: function(){
				this.attr('userName', 'Justin');
			}
		}
	});

	MockComponent.extend({
		tag: 'import-prop-parent',
		template: stache('<import-prop-scope {^user-name}="test" {^.}="childComponent"></import-prop-scope>' +
			'<div>Imported: {{test}}</div>')
	});

	var template = stache('<import-prop-parent></import-prop-parent>');
	var frag = template({});
	var importPropParent = frag.firstChild;
	var importPropScope = importPropParent.getElementsByTagName("import-prop-scope")[0];

	canViewModel(importPropScope).updateName();

	var importPropParentViewModel = canViewModel(importPropParent);

	equal(importPropParentViewModel.attr("test"), "Justin", "got hypenated prop");

	equal(importPropParentViewModel.attr("childComponent"), canViewModel(importPropScope), "got view model");

});




test("viewModel binding (event)", function(){

	MockComponent.extend({
		tag: "viewmodel-binding",
		viewModel: {
			makeMyEvent: function(){
				this.dispatch("myevent");
			}
		}
	});
	var frag = stache("<viewmodel-binding (myevent)='doSomething()'/>")({
		doSomething: function(){
			ok(true, "called!");
		}
	});
	canViewModel(frag.firstChild).makeMyEvent();
});

test("checkboxes with {($checked)} bind properly", function () {
	var data = new CanMap({
		completed: true
	}),
		frag = stache('<input type="checkbox" {($checked)}="completed"/>')(data);
	domMutate.appendChild.call(this.fixture, frag);

	var input = this.fixture.getElementsByTagName('input')[0];
	equal(input.checked, data.attr('completed'), 'checkbox value bound (via attr check)');
	data.attr('completed', false);
	equal(input.checked, data.attr('completed'), 'checkbox value bound (via attr uncheck)');
	input.checked = true;
	canEvent.trigger.call(input, 'change');
	equal(input.checked, true, 'checkbox value bound (via check)');
	equal(data.attr('completed'), true, 'checkbox value bound (via check)');
	input.checked = false;
	canEvent.trigger.call(input, 'change');
	equal(input.checked, false, 'checkbox value bound (via uncheck)');
	equal(data.attr('completed'), false, 'checkbox value bound (via uncheck)');
});

test("two-way element empty value (1996)", function(){
	var template = stache("<input {($value)}='age'/>");

	var map = new CanMap();

	var frag = template(map);

	var ta = this.fixture;
	ta.appendChild(frag);

	var input = ta.getElementsByTagName("input")[0];
	equal(input.value, "", "input value set correctly if key does not exist in map");

	map.attr("age", "30");

	equal(input.value, "30", "input value set correctly");

	map.attr("age", "31");

	equal(input.value, "31", "input value update correctly");

	input.value = "";

	canEvent.trigger.call(input, "change");

	equal(map.attr("age"), "", "updated from input");

});

test("exporting methods (#2051)", function(){
	expect(2);


	MockComponent.extend({
		tag : 'foo-bar',
		viewModel : {
			method : function() {
				ok(true, "foo called");
				return 5;
			}
		}
	});

	var template = stache("<foo-bar {^@method}='@*refKey'></foo-bar>{{*refKey()}}");

	var frag = template({});
	equal( frag.lastChild.nodeValue, "5");

});


test("renders dynamic custom attributes (#1800)", function () {

	var template = stache("<ul>{{#actions}}<li ($click)='{{.}}'>{{.}}</li>{{/actions}}</ul>");

	var map = new CanMap({
		actions: ["action1", "action2"],
		action1: function(){
			equal(calling, 0,"action1");
		},
		action2: function(){
			equal(calling, 1,"action2");
		}
	});

	var frag = template(map),
		lis = frag.firstChild.getElementsByTagName("li");

	var calling = 0;
	canEvent.trigger.call(lis[0], "click");
	calling  = 1;
	canEvent.trigger.call(lis[1], "click");
});

if (System.env.indexOf('production') < 0) {
	test("warning on a mismatched quote (#1995)", function () {
		expect(4);
		var oldlog = dev.warn,
			message = 'can/view/bindings/bindings.js: mismatched binding syntax - (foo}';

		dev.warn = function (text) {
			equal(text, message, 'Got expected message logged.');
		};

		stache("<div (foo}='bar'/>")();

		message = 'can/view/bindings/bindings.js: mismatched binding syntax - {foo)';
		stache("<div {foo)='bar'/>")();

		message = 'can/view/bindings/bindings.js: mismatched binding syntax - {(foo})';
		stache("<div {(foo})='bar'/>")();

		message = 'can/view/bindings/bindings.js: mismatched binding syntax - ({foo})';
		stache("<div ({foo})='bar'/>")();


		dev.warn = oldlog;
	});
}

testIfRealDocument("One way binding from a select's value to a parent compute updates the parent with the select's initial value (#2027)", function(){
	var template = stache("<select {^$value}='value'><option value='One'>One</option></select>");
	var map = new CanMap();

	var frag = template(map);
	var select = frag.childNodes.item(0);

	setTimeout(function(){
		equal(select.selectedIndex, 0, "selectedIndex is 0 because no value exists on the map");
		equal(map.attr("value"), "One", "The map's value property is set to the select's value");
		start();
	}, 50);

	stop();

});

testIfRealDocument("two way binding from a select's value to null has no selection (#2027)", function(){
	var template = stache("<select {($value)}='key'><option value='One'>One</option></select>");
	var map = new CanMap({key: null});

	var frag = template(map);
	var select = frag.childNodes.item(0);

	setTimeout(function(){
		equal(select.selectedIndex, -1, "selectedIndex is 0 because no value exists on the map");
		equal(map.attr("key"), null, "The map's value property is set to the select's value");
		start();
	}, 50);

	stop();

});

testIfRealDocument('two-way bound values that do not match a select option set selectedIndex to -1 (#2027)', function() {
	var renderer = stache('<select {($value)}="key"><option value="foo">foo</option><option value="bar">bar</option></select>');
	var map = new CanMap({ });
	var frag = renderer(map);

	equal(frag.firstChild.selectedIndex, 0, 'undefined <- {($first value)}: selectedIndex = 0');

	map.attr('key', 'notfoo');
	equal(frag.firstChild.selectedIndex, -1, 'notfoo: selectedIndex = -1');

	map.attr('key', 'foo');
	strictEqual(frag.firstChild.selectedIndex, 0, 'foo: selectedIndex = 0');

	map.attr('key', 'notbar');
	equal(frag.firstChild.selectedIndex, -1, 'notbar: selectedIndex = -1');

	map.attr('key', 'bar');
	strictEqual(frag.firstChild.selectedIndex, 1, 'bar: selectedIndex = 1');

	map.attr('key', 'bar');
	strictEqual(frag.firstChild.selectedIndex, 1, 'bar (no change): selectedIndex = 1');
});

testIfRealDocument("two way bound select empty string null or undefined value (#2027)", function () {

	var template = stache(
		"<select id='null-select' {($value)}='color-1'>" +
			"<option value=''>Choose</option>" +
			"<option value='red'>Red</option>" +
			"<option value='green'>Green</option>" +
		"</select>" +
		"<select id='undefined-select' {($value)}='color-2'>" +
			"<option value=''>Choose</option>" +
			"<option value='red'>Red</option>" +
			"<option value='green'>Green</option>" +
		"</select>"+
		"<select id='string-select' {($value)}='color-3'>" +
			"<option value=''>Choose</option>" +
			"<option value='red'>Red</option>" +
			"<option value='green'>Green</option>" +
		"</select>");

	var map = new CanMap({
		'color-1': null,
		'color-2': undefined,
		'color-3': ""
	});
	stop();
	var frag = template(map);
	domMutate.appendChild.call(this.fixture, frag);

	var nullInput = doc.getElementById("null-select");
	var nullInputOptions = nullInput.getElementsByTagName('option');
	var undefinedInput = doc.getElementById("undefined-select");
	var undefinedInputOptions = undefinedInput.getElementsByTagName('option');
	var stringInput = doc.getElementById("string-select");
	var stringInputOptions = stringInput.getElementsByTagName('option');

	// wait for set to be called which will change the selects
	setTimeout(function(){
		ok(!nullInputOptions[0].selected, "default (null) value set");
		// the first item is selected because "" is the value.
		ok(undefinedInputOptions[0].selected, "default (undefined) value set");
		ok(stringInputOptions[0].selected, "default ('') value set");
		start();
	}, 50);
});

if (System.env !== 'canjs-test') {
	test("dynamic attribute bindings (#2016)", function(){

		var template = stache("<input {($value)}='{{propName}}'/>");

		var map = new CanMap({propName: 'first', first: "Justin", last: "Meyer"});

		var frag = template(map);

		var ta = this.fixture;
		ta.appendChild(frag);

		var input = ta.getElementsByTagName("input")[0];
		equal(input.value, "Justin", "input value set correctly if key does not exist in map");

		stop();
		map.attr('propName','last');
		setTimeout(function(){

			equal(input.value, "Meyer", "input value set correctly if key does not exist in map");

			input.value = "Lueke";

			canEvent.trigger.call(input, "change");

			equal(map.attr("last"), "Lueke", "updated from input");

			start();
		},10);

	});
}

test("select bindings respond to changes immediately or during insert (#2134)", function(){
	var countries = [{code: 'MX', countryName:'MEXICO'},
		{code: 'US', countryName:'USA'},
		{code: 'IND', countryName:'INDIA'},
		{code: 'RUS', countryName:'RUSSIA'}
	];

	var template = stache('<select {($value)}="countryCode">'+
		'{{#each countries}}'+
			'<option value="{{code}}">{{countryName}}</option>'+
		'{{/each}}'+
	'</select>');

	var data = new CanMap({
		countryCode: 'US',
		countries: countries
	});

	var frag = template(data);
	data.attr('countryCode', 'IND');

	stop();
	setTimeout(function(){
		start();
		equal(frag.firstChild.value, "IND", "got last updated value");
	},10);

});

test("select bindings respond to changes immediately or during insert using can-value (#2134)", function(){
	var countries = [{code: 'MX', countryName:'MEXICO'},
		{code: 'US', countryName:'USA'},
		{code: 'IND', countryName:'INDIA'},
		{code: 'RUS', countryName:'RUSSIA'}
	];

	var template = stache('<select {($value)}="countryCode">'+
		'{{#each countries}}'+
			'<option value="{{code}}">{{countryName}}</option>'+
		'{{/each}}'+
	'</select>');

	var data = new CanMap({
		countryCode: 'US',
		countries: countries
	});

	var frag = template(data);
	data.attr('countryCode', 'IND');

	stop();
	setTimeout(function(){
		start();
		equal(frag.firstChild.value, "IND", "got last updated value");
	},10);

});

testIfRealDocument("two-way <select> bindings update to `undefined` if options are replaced (#1762)", function(){
	var countries = [{code: 'MX', countryName:'MEXICO'},
		{code: 'US', countryName:'USA'}
	];

	var data = new CanMap({
		countryCode: 'US',
		countries: countries
	});

	var template = stache('<select {($value)}="countryCode">'+
		'{{#countries}}'+
			'<option value="{{code}}">{{countryName}}</option>'+
		'{{/countries}}'+
	'</select>');

	template(data);

	stop();
	setTimeout(function(){
		data.attr("countries").replace([]);


		setTimeout(function(){
			equal(data.attr("countryCode"), undefined, "countryCode set to undefined");

			start();
		},10);

	},10);

});

testIfRealDocument("two-way <select> bindings update to `undefined` if options are replaced - each (#1762)", function(){
	var countries = [{code: 'MX', countryName:'MEXICO'},
		{code: 'US', countryName:'USA'}
	];

	var data = new CanMap({
		countryCode: 'US',
		countries: countries
	});

	var template = stache('<select {($value)}="countryCode">'+
		'{{#each countries}}'+
			'<option value="{{code}}">{{countryName}}</option>'+
		'{{/each}}'+
	'</select>');

	template(data);
	stop();
	setTimeout(function(){
		data.attr("countries").replace([]);


		setTimeout(function(){
			equal(data.attr("countryCode"), undefined, "countryCode set to undefined");

			start();
		},10);

	},10);

});

test('previously non-existing select value gets selected from a list when it is added (#1762)', function() {
  var template = stache('<select {($value)}="{person}">' +
      '<option></option>' +
      '{{#each people}}<option value="{{.}}">{{.}}</option>{{/each}}' +
    '</select>' +
    '<input type="text" size="5" {($value)}="person">'
  );

  var people = new CanList([
    "Alexis",
    "Mihael",
    "Curtis",
    "David"
  ]);

  var vm = new CanMap({
    person: 'Brian',
    people: people
  });

  stop();
  vm.bind('person', function(ev, newVal, oldVal) {
    ok(false, 'person attribute should not change');
  });

  var frag = template(vm);

  equal(vm.attr('person'), 'Brian', 'Person is still set');

  setTimeout(function() {
    people.push('Brian');
    setTimeout(function() {
      var select = frag.firstChild;
      ok(select.lastChild.selected, 'New child should be selected');
      start();
    }, 20);
  }, 20);
});

test("one-way <select> bindings keep value if options are replaced (#1762)", function(){
	var countries = [{code: 'MX', countryName:'MEXICO'},
		{code: 'US', countryName:'USA'}
	];

	var data = new CanMap({
		countryCode: 'US',
		countries: countries
	});

	var template = stache('<select {$value}="countryCode">'+
		'{{#countries}}'+
			'<option value="{{code}}">{{countryName}}</option>'+
		'{{/countries}}'+
	'</select>');

	var frag = template(data);
	var select = frag.firstChild;
	stop();
	setTimeout(function(){

		data.attr("countries").replace([]);

		setTimeout(function(){
			data.attr("countries").replace(countries);

			equal(data.attr("countryCode"), "US", "country kept as USA");

			setTimeout(function(){
				ok( select.getElementsByTagName("option")[1].selected, "USA still selected");
			},10);

			start();
		},10);

	},10);

});

test("one-way <select> bindings keep value if options are replaced - each (#1762)", function(){
	var countries = [{code: 'MX', countryName:'MEXICO'},
		{code: 'US', countryName:'USA'}
	];

	var data = new CanMap({
		countryCode: 'US',
		countries: countries
	});

	var template = stache('<select {$value}="countryCode">'+
		'{{#each countries}}'+
			'<option value="{{code}}">{{countryName}}</option>'+
		'{{/each}}'+
	'</select>');

	var frag = template(data);
	var select = frag.firstChild;
	stop();
	setTimeout(function(){

		data.attr("countries").replace([]);

		setTimeout(function(){
			data.attr("countries").replace(countries);

			equal(data.attr("countryCode"), "US", "country kept as USA");

			setTimeout(function(){
				ok( select.getElementsByTagName("option")[1].selected, "USA still selected");
			},10);

			start();
		},10);

	},10);

});

test("@function reference to child (#2116)", function(){
	expect(2);
	var template = stache('<foo-bar {@child}="@parent"></foo-bar>');
	MockComponent.extend({
		tag : 'foo-bar',
		viewModel : {
			method: function(){
				ok(false, "should not be called");
			}
		}
	});

	var VM = CanMap.extend({
		parent : function() {
			ok(false, "should not be called");
		}
	});

	var vm = new VM({});
	var frag = template(vm);

	equal( typeof canViewModel(frag.firstChild).attr("child"), "function", "to child binding");


	template = stache('<foo-bar {^@method}="@vmMethod"></foo-bar>');
	vm = new VM({});
	template(vm);

	ok(typeof vm.attr("vmMethod") === "function", "parent export function");
});

test("setter only gets called once (#2117)", function(){
	expect(1);
	var VM = CanMap.extend({
		_set: function(prop, val){
			if(prop === "bar") {
				equal(val, "BAR");
			}
			return CanMap.prototype._set.apply(this, arguments);
		}
	});

	MockComponent.extend({
		tag : 'foo-bar',
		viewModel : VM
	});

	var template = stache('<foo-bar {bar}="bar"/>');

	template(new CanMap({bar: "BAR"}));

});

test("function reference to child binding (#2116)", function(){
	expect(2);
	var template = stache('<foo-bar {child}="@parent"></foo-bar>');
	MockComponent.extend({
		tag : 'foo-bar',
		viewModel : {

		}
	});

	var VM = CanMap.extend({
	});

	var vm = new VM({});
	var frag = template(vm);

	vm.attr("parent", function(){ ok(false, "should not be called"); });

	equal( typeof canViewModel(frag.firstChild).attr("child"), "function", "to child binding");


	template = stache('<foo-bar {^@method}="vmMethod"></foo-bar>');
	vm = new VM({});
	frag = template(vm);

	canViewModel(frag.firstChild).attr("method",function(){
		ok(false, "method should not be called");
	});

	equal(typeof vm.attr("vmMethod"), "function", "parent export function");

});

test("backtrack path in to-parent bindings (#2132)", function(){
	MockComponent.extend({
		tag: "parent-export",
		viewModel: {
			value: "VALUE"
		}
	});

	var template = stache("{{#innerMap}}<parent-export {^value}='../parentValue'/>{{/innerMap}}");

	var data = new CanMap({
		innerMap: {}
	});

	template(data);

	equal(data.attr("parentValue"), "VALUE", "set on correct context");
	equal(data.attr("innerMap.parentValue"), undefined, "nothing on innerMap");

});

test("two-way binding with empty strings (#2147)", function(){
	var template = stache("<select {($value)}='val'>"+
		'<option value="">Loading...</option>'+
		'<option>Empty...</option>'+
		"</select>");

	var map = new CanMap({
		foo: true,
		val: ""
	});

	var frag = template(map);

	setTimeout(function(){
		equal(frag.firstChild.value, '', "is an empty string");
		if(isRealDocument()) {
			equal( frag.firstChild.selectedIndex, 0, "empty strings are bound");
		}
		start();
	},10);
	stop();
});

test("double render with batched / unbatched events (#2223)", function(){
	var template = stache("{{#page}}{{doLog}}<input {($value)}='notAHelper'/>{{/page}}");

	var appVM = new CanMap();

	var logCalls = 0;
	stache.registerHelper('doLog', function(){
		logCalls++;
	});

	template(appVM);


	canBatch.start();
	appVM.attr('page', true);
	canBatch.stop();

	// logs 'child' a 2nd time
	appVM.attr('notAHelper', 'bar');


	equal(logCalls, 1, "input rendered the right number of times");
});


test("Child bindings updated before parent (#2252)", function(){
	var template = stache("{{#eq page 'view'}}<child-binder {page}='page'/>{{/eq}}");
	MockComponent.extend({
		tag: 'child-binder',
		template: stache('<span/>'),
		viewModel: {
			_set: function(prop, val){
				if(prop === "page"){
					equal(val,"view", "value should not be edit");
				}

				return CanMap.prototype._set.apply(this, arguments);
			}
		}
	});

	var vm = new CanMap({
		page : 'view'
	});
	template(vm);

	canBatch.start();
	vm.attr('page', 'edit');
	canBatch.stop();
});



test("Child bindings updated before parent (#2252)", function(){
	var template = stache("{{#eq page 'view'}}<child-binder {page}='page'/>{{/eq}}");
	MockComponent.extend({
		tag: 'child-binder',
		template: stache('<span/>'),
		viewModel: {
			_set: function(prop, val){
				if(prop === "page"){
					equal(val,"view", "value should not be edit");
				}

				return CanMap.prototype._set.apply(this, arguments);
			}
		}
	});

	var vm = new CanMap({
		page : 'view'
	});
	template(vm);

	canBatch.start();
	vm.attr('page', 'edit');
	canBatch.stop();
});

test("can-value memory leak (#2270)", function () {

	var template = stache('<div><input {($value)}="foo"></div>');

	var vm = new CanMap({foo: ''});

	var frag = template(vm);

	var ta = this.fixture;
	domMutate.appendChild.call(ta,frag);

	domMutate.removeChild.call(ta, ta.firstChild);
	stop();
	setTimeout(function(){
		// still 1 binding, should be 0
		equal(vm._bindings,0, "no bindings");
		start();
	}, 100);

});

test("converters work (#2299)", function(){

 	stache.registerHelper("numberToString", function(newVal, source){
 		if(newVal instanceof stacheExpression.SetIdentifier) {
 			source(newVal.value === "" ? null : +newVal.value );
 		} else {
 			source = newVal;
 			return source() + "";
 		}
 	});

 	var template = stache('<input {($value)}="numberToString(~age)">');

 	var map = new CanMap({age: 25});

 	var frag = template(map);

 	equal(frag.firstChild.value, "25");
 	equal(map.attr("age"), 25);

 	map.attr("age",33);

 	equal(frag.firstChild.value, "33");
 	equal(map.attr("age"), 33);

 	frag.firstChild.value = "1";

 	canEvent.trigger.call(frag.firstChild,"change");

 	equal(frag.firstChild.value, "1");
 	equal(map.attr("age"), 1);

});

test("$element is wrapped with types.wrapElement", function(){
	var $ = function(element){
		this.element = element;
	};

	var wrapElement = types.wrapElement,
		unwrapElement = types.unwrapElement;

	types.wrapElement = function(element){
		return new $(element);
	};

	types.unwrapElement = function(object){
		return object.element;
	};

	var template = stache("<button ($click)='doSomething($element)'>Clicky</button>");
	var MyMap = DefaultMap.extend({
		doSomething: function(element){
			types.wrapElement = wrapElement;
			types.unwrapElement = unwrapElement;

			ok(element instanceof $);
		}

	});
	var button = template(new MyMap()).firstChild;

	canEvent.trigger.call(button, "click");
});

test("one-way pass computes to components with ~", function(assert) {
	expect(7);
	MockComponent.extend({
		tag: "foo-bar"
	});

	var baseVm = new CanMap({foo : "bar"});

	this.fixture.appendChild(stache("<foo-bar {compute}=\"~foo\"></foo-bar>")(baseVm));

	var vm = canViewModel(this.fixture.firstChild);

	ok(vm.attr("compute").isComputed, "Compute returned");
	equal(vm.attr("compute")(), "bar", "Compute has correct value");

	vm.attr("compute").bind("change", function() {
		// NB: This gets called twice below, once by
		//  the parent and once directly.
		ok(true, "Change handler called");
	});

	baseVm.attr("foo", "quux");
	equal(vm.attr("compute")(), "quux", "Compute updates");

	vm.attr("compute")("xyzzy");
	equal(baseVm.attr("foo"), "quux", "Compute does not update the other direction");

	vm.attr("compute", "notACompute");
	baseVm.attr("foo", "thud");
	ok(vm.attr("compute").isComputed, "Back to being a compute");
});

test("special values get called", function(assert) {
	assert.expect(2);
	var done = assert.async(1);

	MockComponent.extend({
		tag: 'ref-syntax',
		template: stache("<input ($change)=\"%scope.attr('*foo', $element.value)\">"),
		viewModel: new CanMap({
			method: function() {
				assert.ok(true, "method called");

				done();
			}
		})
	});

	var template = stache("<ref-syntax ($inserted)=\"%viewModel.method()\"></ref-syntax>");
	var frag = template({});
	domMutate.appendChild.call(this.fixture, frag);

	var input = doc.getElementsByTagName("input")[0];
	input.value = "bar";
	canEvent.trigger.call(input, "change");

	// Read from mock component's shadow scope for refs.
	var scope = domData.get.call(this.fixture.firstChild).shadowScope;
	assert.equal(scope.get("*foo"), "bar", "Reference attribute set");
});

test("%arguments gives the event arguments", function(){
	var template = stache("<button ($click)='doSomething(%event, %arguments)'>Default Args</button>");

	var MyMap = DefaultMap.extend({
		doSomething: function(ev, args){
			equal(args[0], ev, 'default arg is ev');
		}
	});

	var frag = template(new MyMap());
	var button = frag.firstChild;

	canEvent.trigger.call(button, "click");
});

}
