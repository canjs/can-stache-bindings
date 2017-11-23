var QUnit = require('steal-qunit');
var testHelpers = require('../helpers');

require('can-stache-bindings');

var stache = require('can-stache');
var MockComponent = require("../mock-component-simple-map");

var SimpleMap = require("can-simple-map");


var SimpleObservable = require("can-simple-observable");
var canViewModel = require('can-view-model');



var domData = require('can-util/dom/data/data');
var domMutate = require('can-util/dom/mutate/mutate');
var domEvents = require('can-util/dom/events/events');



testHelpers.makeTests("can-stache-bindings - colon - event", function(name, doc, enableMO){

	QUnit.test("on:enter", function () {
		var template = stache("<input on:enter='update()'/>");

		var called = 0;

		var frag = template({
			update: function() {
				called++;
				equal(called, 1, "update called once");
			}
		});

		var input = frag.childNodes.item(0);

		domEvents.dispatch.call(input, {
			type: "keyup",
			keyCode: 38
		});

		domEvents.dispatch.call(input, {
			type: "keyup",
			keyCode: 13
		});
	});

	QUnit.only("can call intermediate functions before calling the final function(#1474)", function(assert) {
		var ta = this.fixture;
		var done = assert.async();

		var template = stache("<div id='click-me' on:click='does.some.thing(this)'></div>");
		var frag = template({
			does: function(){
				return {
					some: function(){
						return {
							thing: function(context) {
								assert.ok(typeof context.does === "function");
								done();
							}
						};
					}
				};
			}
		});

		ta.appendChild(frag);
		domEvents.dispatch.call(doc.getElementById("click-me"), "click");
	});

	test("two bindings on one element call back the correct method", function() {
		expect(2);
		var template = stache("<input on:mousemove='first()' on:click='second()'/>");

		var callingFirst = false,
			callingSecond = false;

		var frag = template({
			first: function() {
				ok(callingFirst, "called first");
			},
			second: function() {
				ok(callingSecond, "called second");
			}
		});
		var input = frag.childNodes.item(0);

		callingFirst = true;

		domEvents.dispatch.call(input, {
			type: "mousemove"
		});

		callingFirst = false;
		callingSecond = true;
		domEvents.dispatch.call(input, {
			type: "click"
		});
	});


	test("event behavior event bindings should be removed when the bound element is", function(assert) {
		// This test checks whether when an element
		// with an event binding is removed from the
		// DOM properly cleans up its event binding.

		var template = stache('<div>{{#if isShowing}}<input on:el:click="onClick()"><span></span>{{/if}}</div>');
		var viewModel = new SimpleMap({
			isShowing: false
		});
		viewModel.onClick = function(){};
		var bindingListenerCount = 0;
		var hasAddedBindingListener = false;
		var hasRemovedBindingListener = false;

		// Set the scene before we override domEvents
		// as we don't care about "click" events before
		// our input is shown/hidden.
		var fragment = template(viewModel);
		domMutate.appendChild.call(this.fixture, fragment);

		// Predicate for relevant events
		var isInputBindingEvent = function(element, eventName) {
			return element.nodeName === 'INPUT' && eventName === 'click';
		};

		// Override domEvents to detect removed handlers
		var realAddEventListener = domEvents.addEventListener;
		var realRemoveEventListener = domEvents.removeEventListener;
		domEvents.addEventListener = function(eventName) {
			if (isInputBindingEvent(this, eventName)) {
				bindingListenerCount++;
				hasAddedBindingListener = true;
			}
			return realAddEventListener.apply(this, arguments);
		};
		domEvents.removeEventListener = function(eventName) {
			if (isInputBindingEvent(this, eventName)) {
				bindingListenerCount--;
				hasRemovedBindingListener = true;
			}
			return realRemoveEventListener.apply(this, arguments);
		};

		// Add and then remove the input from the DOM
		// NOTE: the implementation uses "remove" which is asynchronous.
		viewModel.set('isShowing', true);

		var andThen = function() {
			domEvents.removeEventListener.call(span, 'removed', andThen);
			start();

			// Reset domEvents
			domEvents.addEventListener = realAddEventListener;
			domEvents.removeEventListener = realRemoveEventListener;

			// We should have:
			// - Called add/remove for the event handler at least once
			// - Called add/remove for the event handler an equal number of times
			assert.ok(hasAddedBindingListener, 'An event listener should have been added for the binding');
			assert.ok(hasRemovedBindingListener, 'An event listener should have been removed for the binding');

			var message = bindingListenerCount + ' event listeners were added but not removed';
			if (removeEventListener < 0) {
				message = 'Event listeners were removed more than necessary';
			}
			assert.equal(bindingListenerCount, 0, message);
		};

		// We use the also effected span so we
		// can test the input handlers in isolation.
		var span = this.fixture.firstChild.lastChild;
		domEvents.addEventListener.call(span, 'removed', andThen);
		viewModel.set('isShowing', false);
		stop();
	});

	test("on:event throws an error when inside #if block (#1182)", function(assert){
		var done = assert.async();
		var flag = new SimpleObservable(false),
			clickHandlerCount = 0;
		var frag = stache("<div {{#if flag}}on:click='foo'{{/if}}>Click</div>")({
			flag: flag,
			foo: function() {
				clickHandlerCount++;
			}
		});
		var fixture = this.fixture;
		var trig = function(){
			var div = fixture.getElementsByTagName('div')[0];
			domEvents.dispatch.call(div, {
				type: "click"
			});
		};
		domMutate.appendChild.call(this.fixture, frag);
		trig();
		testHelpers.afterMutation(function() {
			equal(clickHandlerCount, 0, "click handler not called");
			done();
		});
	});


	test('can listen to camelCase events using on:', function(){
		QUnit.stop();
		expect(1);

		var map = new SimpleMap({
			someProp: 'foo'
		});
		map.someMethod =  function() {
			QUnit.start();
			ok(true);
		};

		var template = stache("<div on:someProp:by:this='someMethod()'/>");
		template(map);

		map.set("someProp" , "baz");
	});

	test('can listen to kebab-case events using on:', function(){
		QUnit.stop();
		expect(1);

		var map = new SimpleMap({
			'some-prop': 'foo'
		});

		map.someMethod = function() {
			QUnit.start();
			ok(true);
		};

		var template = stache("<div on:some-prop:by:this='someMethod()'/>");
		template(map);

		map.set('some-prop',"baz");
	});

	test('can bind to property on scope using :by:', function(){
		stop();
		expect(1);

		MockComponent.extend({
			tag: "view-model-able"
		});

		var template = stache("<view-model-able on:prop:by:obj='someMethod(scope.arguments)'/>");

		var map = new SimpleMap({
			obj: new SimpleMap({
				prop: "Mercury"
			})
		});
		map.someMethod = function(args){
			start();
			equal(args[0], "Venus", "method called");
		};

		template(map);
		map.get("obj").set("prop" , "Venus");
	});

	test('can bind to entire scope using :by:this', function(){
		stop();
		expect(1);

		MockComponent.extend({
			tag: "view-model-able"
		});

		var template = stache("<view-model-able on:prop:by:this='someMethod(scope.arguments[0])'/>");

		var map = new SimpleMap({
			prop: "Mercury"
		});

		map.someMethod = function(newVal){
			start();
			equal(newVal, "Venus", "method called");
		};

		template(map);
		map.set("prop","Venus");
	});

	test('can bind to viewModel using on:vm:prop', function() {
		stop();
		expect(1);

		var map = new SimpleMap({
			prop: "Mercury"
		});

		var MySimpleMap = SimpleMap.extend({
			someMethod: function(newVal){
				start();
				equal(newVal, "Venus", "method called");
			}
		});
		var parent = new MySimpleMap();

		MockComponent.extend({
			tag: "view-model-able",
			viewModel: map
		});

		var template = stache("<view-model-able on:vm:prop='someMethod(scope.arguments[0])'/>");

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

		var template = stache("<view-model-able on:el:prop='someMethod()'/>");

		var frag = template(parent);
		var element = frag.firstChild;

		domEvents.dispatch.call(element, "prop");
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


	QUnit.test("scope.arguments gives the event arguments", function(){
		var template = stache("<button on:click='doSomething(scope.event, scope.arguments)'>Default Args</button>");

		var MyMap = SimpleMap.extend({
			doSomething: function(ev, args){
				equal(args[0], ev, 'default arg is ev');
			}
		});

		var frag = template(new MyMap());
		var button = frag.firstChild;

		domEvents.dispatch.call(button, "click");
	});

	test("special values get called", function(assert) {
		assert.expect(2);
		var done = assert.async(1);

		MockComponent.extend({
			tag: 'ref-syntax',
			template: stache("<input on:change=\"scope.set('*foo', scope.element.value)\">"),
			viewModel: new ( SimpleMap.extend({
				method: function() {
					assert.ok(true, "method called");

					done();
				}
			}) )()
		});

		var template = stache("<ref-syntax on:el:inserted=\"scope.viewModel.method()\"></ref-syntax>");
		var frag = template({});
		domMutate.appendChild.call(this.fixture, frag);
		QUnit.stop();

		testHelpers.afterMutation(function() {
			var input = doc.getElementsByTagName("input")[0];
			input.value = "bar";
			domEvents.dispatch.call(input, "change");

			// Read from mock component's shadow scope for refs.
			var scope = domData.get.call(this.fixture.firstChild).shadowScope;
			assert.equal(scope.get("*foo"), "bar", "Reference attribute set");
			start();
		}.bind(this));
	});


	QUnit.test("viewModel binding", function(){
		MockComponent.extend({
			tag: "viewmodel-binding",
			viewModel: {
				makeMyEvent: function(){
					this.dispatch("myevent");
				}
			}
		});
		var frag = stache("<viewmodel-binding on:myevent='doSomething()'/>")({
			doSomething: function(){
				ok(true, "called!");
			}
		});
		canViewModel(frag.firstChild).makeMyEvent();
	});
});
