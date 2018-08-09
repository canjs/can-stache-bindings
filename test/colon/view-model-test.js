var QUnit = require('steal-qunit');
var testHelpers = require('../helpers');

require('can-stache-bindings');

var stache = require('can-stache');

var SimpleMap = require("can-simple-map");
var MockComponent = require("../mock-component-simple-map");
var domEvents = require('can-dom-events');
var domMutate = require('can-dom-mutate');
var domMutateNode = require('can-dom-mutate/node');
var DefineMap = require("can-define/map/map");

var viewCallbacks = require('can-view-callbacks');
var canViewModel = require('can-view-model');

var canSymbol = require('can-symbol');
var canReflect = require('can-reflect');
var queues = require("can-queues");

var canTestHelpers = require('can-test-helpers');
var stacheBindings = require('can-stache-bindings');
var Scope = require("can-view-scope");

testHelpers.makeTests("can-stache-bindings - colon - ViewModel", function(name, doc, enableMO){

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
		domEvents.dispatch(el, "click");
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

	canTestHelpers.dev.devOnlyTest("Warning happens when changing the map that a to-parent binding points to.", function() {
		var tagName = "merge-warn-test";

		// Delete previous tags, to avoid warnings from can-view-callbacks.
		delete viewCallbacks._tags[tagName];

		expect(2);

		var step1 = { "baz": "quux" };
		var overwrite = { "plonk": "waldo" };

		var teardown = canTestHelpers.dev.willWarn('can-stache-key: Merging data into "bar" because its parent is non-observable');

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
		deepEqual(data.bar.get(), { "plonk": "waldo" }, "sanity check: parent binding set (default map -> default map)");

		QUnit.equal(teardown(), 1, "warning shown");
	});

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

	test("backtrack path in to-parent bindings (#2132)", function(){
		MockComponent.extend({
			tag: "parent-export",
			viewModel: {
				value: "VALUE"
			}
		});

		var template = stache("{{#innerMap}}<parent-export value:to='../parentValue'/>{{/innerMap}}");

		var data = new SimpleMap({
			innerMap: new SimpleMap({})
		});

		template(data);

		equal(data.get("parentValue"), "VALUE", "set on correct context");
		equal(data.get("innerMap").get("parentValue"), undefined, "nothing on innerMap");

	});

	test("function reference to child binding (#2116)", function(){
		expect(2);
		var template = stache('<foo-bar vm:child:from="parent"></foo-bar>');
		MockComponent.extend({
			tag : 'foo-bar',
			viewModel: { }
		});

		var VM = SimpleMap.extend({ });
		var vm = new VM({});
		var frag = template(vm);

		vm.attr("parent", function(){ ok(false, "should not be called"); });
		equal( typeof canViewModel(frag.firstChild).attr("child"), "function", "to child binding");

		template = stache('<foo-bar vm:method:to="vmMethod"></foo-bar>');
		vm = new VM({});
		frag = template(vm);

		canViewModel(frag.firstChild).attr("method",function(){
			ok(false, "method should not be called");
		});
		equal(typeof vm.get("vmMethod"), "function", "parent export function");
	});


	test("setter only gets called once (#2117)", function(){
		expect(1);
		var VM = SimpleMap.extend({
			attr: function(prop, val){
				if(prop === "bar") {
					equal(val, "BAR");
				}
				return SimpleMap.prototype.attr.apply(this, arguments);
			}
		});

		MockComponent.extend({
			tag : 'foo-bar',
			viewModel : VM
		});

		var template = stache('<foo-bar vm:bar:from="bar"/>');

		template(new SimpleMap({bar: "BAR"}));

	});


	test("function reference to child (#2116)", function(){
		expect(2);
		var template = stache('<foo-bar vm:child:from="parent"></foo-bar>');
		MockComponent.extend({
			tag : 'foo-bar',
			viewModel : {
				method: function(){
					ok(false, "should not be called");
				}
			}
		});

		var VM = SimpleMap.extend({
			parent : function() {
				ok(false, "should not be called");
			}
		});

		var vm = new VM({});
		var frag = template(vm);

		equal( typeof canViewModel(frag.firstChild).attr("child"), "function", "to child binding");


		template = stache('<foo-bar vm:method:to="vmMethod"></foo-bar>');
		vm = new VM({});
		template(vm);

		ok(typeof vm.attr("vmMethod") === "function", "parent export function");
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

		var template = stache("<foo-bar method:to='scope.vars.refKey'></foo-bar>{{scope.vars.refKey()}}");

		var frag = template({});
		equal( frag.lastChild.nodeValue, "5");

	});

	test('one way - child to parent - importing viewModel hyphenatedProp:to="test"', function(){
		MockComponent.extend({
			tag: 'import-prop-scope',
			template: stache('Hello {{userName}}'),
			viewModel: {
				userName: 'David',
				age: 7,
				updateName: function(){
					this.set('userName', 'Justin');
				}
			}
		});

		MockComponent.extend({
			tag: 'import-prop-parent',
			template: stache('<import-prop-scope vm:userName:to="test" vm:this:to="childComponent"></import-prop-scope>' +
				'<div>Imported: {{test}}</div>')
		});

		var template = stache('<import-prop-parent></import-prop-parent>');
		var frag = template({});
		var importPropParent = frag.firstChild;
		var importPropScope = importPropParent.getElementsByTagName("import-prop-scope")[0];

		canViewModel(importPropScope).updateName();

		var importPropParentViewModel = canViewModel(importPropParent);

		equal(importPropParentViewModel.get("test"), "Justin", "got hyphenated prop");

		equal(importPropParentViewModel.get("childComponent"), canViewModel(importPropScope), "got view model");

	});

	test('one way - child to parent - importing viewModel prop:to="test"', function() {
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
			template: stache('<import-prop-scope vm:name:to="test"></import-prop-scope>' +
				'<div>Imported: {{test}}</div>')
		});

		var template = stache('<import-prop-parent></import-prop-parent>');
		var frag = template({});

		equal(frag.childNodes.item(0).childNodes.item(1).innerHTML,
			'Imported: David',  '{name} component scope imported into variable');
	});

	test('one-way - child to parent - viewModel', function(){
		MockComponent.extend({
			tag: "view-model-able",
			viewModel: function(){
				return new SimpleMap({viewModelProp: "Mercury"});
			}
		});

		var template = stache("<view-model-able vm:viewModelProp:to='scopeProp'/>");

		var map = new SimpleMap({scopeProp: "Venus"});

		var frag = template(map);
		var viewModel = canViewModel(frag.firstChild);

		equal( viewModel.get("viewModelProp"), "Mercury", "initial value kept" );
		equal( map.get("scopeProp"), "Mercury", "initial value set on parent" );

		viewModel.set("viewModelProp", "Earth");
		equal(map.get("scopeProp"), "Earth", "binding from child to parent");

		map.set("scopeProp", "Mars");
		equal( viewModel.get("viewModelProp"), "Earth", "no binding from parent to child" );
	});

	test('one-way - child to parent - viewModel - with converters', function(){
		MockComponent.extend({
			tag: "view-model-able",
			viewModel: function(){
				return new SimpleMap({viewModelProp: "Mercury"});
			}
		});

		stache.addConverter("upper-case", {
			get: function( fooCompute ) {
				return (""+canReflect.getValue(fooCompute)).toUpperCase();
			},
			set: function( newVal, fooCompute ) {
				canReflect.setValue(fooCompute, (""+newVal).toUpperCase() );
			}
		});

		var template = stache("<view-model-able vm:viewModelProp:to='upper-case(scopeProp)'/>");

		var map = new SimpleMap({scopeProp: "Venus"});

		var frag = template(map);
		var viewModel = canViewModel(frag.firstChild);

		equal( viewModel.get("viewModelProp"), "Mercury", "initial value kept" );
		equal( map.get("scopeProp"), "MERCURY", "initial value set on parent, but upper cased" );

		viewModel.set("viewModelProp", "Earth");
		equal(map.get("scopeProp"), "EARTH", "binding from child to parent updated");

		map.set("scopeProp", "Mars");
		equal( viewModel.get("viewModelProp"), "Earth", "no binding from parent to child" );
	});

	test('one-way - parent to child - viewModel', function(){


		var template = stache("<div vm:viewModelProp:from='scopeProp'/>");


		var map = new SimpleMap({scopeProp: "Venus"});

		var frag = template(map);
		var viewModel = canViewModel(frag.firstChild);

		equal( viewModel.attr("viewModelProp"), "Venus", "initial value set" );

		viewModel.attr("viewModelProp", "Earth");
		equal(map.attr("scopeProp"), "Venus", "no binding from child to parent");

		map.attr("scopeProp", "Mars");
		equal( viewModel.attr("viewModelProp"), "Mars", "binding from parent to child" );
	});


	test('two-way - reference - child:bind="scope.vars.ref" (#1700)', function(){
		var data = new SimpleMap({person: new SimpleMap({name: new SimpleMap({})}) });
		MockComponent.extend({
			tag: 'reference-export',
			viewModel: function(){
				return new SimpleMap({tag: 'reference-export'});
			}
		});
		MockComponent.extend({
			tag: 'ref-import',
			viewModel: function(){
				return new SimpleMap({tag: 'ref-import'});
			}
		});

		var template = stache("<reference-export name:bind='scope.vars.refName'/>"+
			"<ref-import name:bind='scope.vars.refName'/> {{helperToGetScope()}}");

		var scope;
		var frag = template(data,{
			helperToGetScope: function(options){
				scope = options.scope;
			}
		});

		var refExport = canViewModel(frag.firstChild);
		var refImport = canViewModel(frag.firstChild.nextSibling);

		refExport.set("name", "v1");

		equal( scope.peek("scope.vars.refName"), "v1", "reference scope updated");

		equal(refImport.get("name"), "v1", "updated ref-import");

		refImport.set("name", "v2");

		equal(refExport.get("name"), "v2", "updated ref-export");

		equal( scope.peek("scope.vars.refName"), "v2", "actually put in refs scope");

	});

	test('one-way - DOM - parent value undefined (#189)', function() {
		/* WHAT: We are testing whether, given the parent's passed property is
		   undefined, the child template's value is always set to undefined
		   or if the child template is free to update its value.
		 **The child should be free to update its value.**
		 */
		/* HOW: We test a <toggle-button>, in this case the parent prop is undefined
		   so we should be able to toggle true/false on each click.
		   */
		MockComponent.extend({
			tag: 'toggle-button',
			viewModel: function(){
				var vm = new SimpleMap({
					value: false
				});
				vm.toggle = function() {
					this.set( "value", !this.get( "value" ));
				};

				return vm;
			},
			template: stache('<button type="button" on:el:click="toggle()">{{value}}</button>')
		});
		var template = stache('<toggle-button vm:value:bind="./does-not-exist" />');

		var fragment = template({});

		domMutateNode.appendChild.call(this.fixture, fragment);
		var button = this.fixture.getElementsByTagName('button')[0];

		// Get first text for DOM and VDOM
		function text (node) {
			while (node && node.nodeType !== 3) {
				node = node.firstChild;
			}
			return node && node.nodeValue;
		}

		equal(text(button), 'false', 'Initial value is "false"');
		domEvents.dispatch(button, 'click');
		equal(text(button), 'true', 'Value is "true" after first click');
		domEvents.dispatch(button, 'click');
		equal(text(button), 'false', 'Value is "false" after second click');
	});

	test("two way - viewModel (#1700)", function(){

		var template = stache("<div vm:viewModelProp:bind='scopeProp'/>");
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

		// RENDER
		var frag = template(map);
		var viewModel = canViewModel(frag.firstChild);

		equal(scopeMapSetCalled, 0, "set is not called on scope map");
		equal(viewModel.get("viewModelProp"), "Hello", "initial value set" );

		viewModel = canViewModel(frag.firstChild);

		var viewModelSetCalled = 1; // set once already - on "initial value set"
		var origViewModelSet = viewModel[canSymbol.for("can.setKeyValue")];
		viewModel[canSymbol.for("can.setKeyValue")] = function(attrName){
			if(typeof attrName === "string" && arguments.length > 1) {
				viewModelSetCalled++;
			}

			return origViewModelSet.apply(this, arguments);
		};
		viewModel.set("viewModelProp", "HELLO");
		equal(map.get("scopeProp"), "HELLO", "binding from child to parent");
		equal(scopeMapSetCalled, 1, "set is called on scope map");
		equal(viewModelSetCalled, 2, "set is called viewModel");

		map.set("scopeProp", "WORLD");
		equal(viewModel.get("viewModelProp"), "WORLD", "binding from parent to child" );
		equal(scopeMapSetCalled, 1, "can.setKey is not called again on scope map");
		equal(viewModelSetCalled, 3, "set is called again on viewModel");
	});

	test("standard attributes should not set viewModel props", function(){
		MockComponent.extend({
			tag: "test-elem",
			viewModel: SimpleMap
		});

		var template = stache("<test-elem foo=\"bar\"/>");

		var frag = template(new SimpleMap({
			bar: true
		}));

		var vm = canViewModel(frag.firstChild);

		equal(vm.get('foo'), undefined);
	});

	test("set string on the viewModel", function(){
		expect(2);
		var ViewModel = DefineMap.extend({
			foo: {
				type: "string",
				set: function(val){
					equal(val, "bar");
				}
			},
			baz: {
				type: "string",
				set: function(val){
					equal(val, "qux");
				}
			}
		});

		MockComponent.extend({
			tag: "test-elem",
			viewModel: ViewModel
		});

		var template = stache("<test-elem foo:from=\"'bar'\" baz:from=\"'qux'\"/>");
		template();
	});

	test('viewModel behavior event bindings should be removed when the bound element is', function (assert) {
		MockComponent.extend({
			tag: "view-model-binder",
			viewModel: {},
			template: stache('<span />')
		});

		var done = assert.async();
		var onNodeAttributeChange = domMutate.onNodeAttributeChange;

		var attributeChangeCount = 0;
		var isAttributeChangeTracked = false;
		var isTarget = function (target) {
			return target.nodeName === 'VIEW-MODEL-BINDER';
		};

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

		var viewModel = new SimpleMap({
			isShowing: true,
			bar: 'baz'
		});
		var template = stache('<div>{{#if isShowing}}<view-model-binder foo:bind="bar"/><hr/>{{/if}}</div>');
		var fragment = template(viewModel);
		domMutateNode.appendChild.call(this.fixture, fragment);
		// We use the also effected hr so we
		// can test the span handlers in isolation.
		var hr = this.fixture.firstChild.lastChild;
		var removalDisposal = domMutate.onNodeRemoval(hr, function () {
			removalDisposal();
			domMutate.onNodeAttributeChange = onNodeAttributeChange;

			assert.ok(isAttributeChangeTracked, 'Attribute foo:bind="bar" should be tracked');
			assert.equal(attributeChangeCount, 0, 'all attribute listeners should be disposed');
			done();
		});
		viewModel.attr('isShowing', false);
	});

	canTestHelpers.dev.devOnlyTest("warning displayed when using @", function(){
		expect(3);
		var teardown = canTestHelpers.dev.willWarn("myTemplate.stache:1: functions are no longer called by default so @ is unnecessary in '@scope.vars.refKey'.");

		MockComponent.extend({
			tag : 'foo-bar',
			viewModel : {
				method : function() {
					ok(true, "foo called");
					return 5;
				}
			}
		});

		var template = stache("myTemplate.stache",
			"<foo-bar method:to='@scope.vars.refKey'></foo-bar>{{scope.vars.refKey()}}");

		var frag = template({});
		equal( frag.lastChild.nodeValue, "5");
		equal(teardown(), 2, "warnings displayed for read and write");

	});

	QUnit.test("bindings.viewModel makeViewModel gets passed the binding state", function(){

		var element = document.createElement("bindings-viewmodel");
		element.setAttribute("age:from","years");

		stacheBindings.behaviors.viewModel(element, {
			scope: new Scope({years: 22})
		}, function(data, hasDataBinding, bindingState){
			QUnit.equal(bindingState.isSettingOnViewModel,true, "isSettingOnViewModel called with correct value");
			QUnit.ok(!bindingState.isSettingViewModel, "isSettingOnViewModel called with correct value");
		}, {});

		var element2 = document.createElement("bindings-viewmodel");
		element2.setAttribute("this:from","user");

		stacheBindings.behaviors.viewModel(element2, {
			scope: new Scope({user: {name: "me"}})
		}, function(data, hasDataBinding, bindingState){
			QUnit.ok(!bindingState.isSettingOnViewModel, "isSettingOnViewModel called with correct value");
			QUnit.ok(bindingState.isSettingViewModel, "isSettingOnViewModel called with correct value");
		}, {});

	});
});
