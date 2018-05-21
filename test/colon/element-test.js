var QUnit = require('steal-qunit');
var testHelpers = require('../helpers');

var stache = require('can-stache');
require('can-stache-bindings');

var SimpleMap = require("can-simple-map");
var DefineList = require("can-define/list/list");
var MockComponent = require("../mock-component-simple-map");
var canViewModel = require('can-view-model');

var SimpleObservable = require("can-simple-observable");
var canSymbol = require('can-symbol');
var canReflect = require('can-reflect');

var domMutate = require('can-dom-mutate');
var domMutateNode = require('can-dom-mutate/node');
var domEvents = require('can-dom-events');

var DefineMap = require("can-define/map/map");

testHelpers.makeTests("can-stache-bindings - colon - element", function(name, doc, enableMO, testIfRealDocument){

	QUnit.test("<input text> value:bind input text", function() {
		var template = stache("<input value:bind='age'/>");

		var map = new SimpleMap();

		var frag = template(map);

		var ta = this.fixture;
		ta.appendChild(frag);

		var input = ta.getElementsByTagName("input")[0];
		equal(input.value, "", "input value set correctly if key does not exist in map");

		map.set("age", "30");

		equal(input.value, "30", "input value set correctly");

		map.set("age", "31");

		equal(input.value, "31", "input value update correctly");

		input.value = "32";

		domEvents.dispatch(input, "change");

		equal(map.get("age"), "32", "updated from input");
	});


	QUnit.test('<input text> el:prop:to/:from/:bind work (#280)', function() {
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
		domEvents.dispatch(inputTo, 'change');
		equal(scope.attr('scope1'), '4', 'el:value:to - scope updated when attribute changed');

		scope.attr('scope1', 'scope4');
		equal(inputTo.value, '4', 'el:value:to - attribute not updated when scope changed');

		// el:value:from
		equal(inputFrom.value, 'scope2', 'el:value:from - attribute set from scope');

		inputFrom.value = 'scope5';
		domEvents.dispatch(inputFrom, 'change');
		equal(scope.attr('scope2'), 'scope2', 'el:value:from - scope not updated when attribute changed');

		scope.attr('scope2', 'scope6');
		equal(inputFrom.value, 'scope6', 'el:value:from - attribute updated when scope changed');

		// el:value:bind
		equal(inputBind.value, 'scope3', 'el:value:bind - attribute set from scope prop (parent -> child wins)');

		inputBind.value = 'scope6';
		domEvents.dispatch(inputBind, 'change');
		equal(scope.attr('scope3'), 'scope6', 'el:value:bind - scope updated when attribute changed');

		scope.attr('scope3', 'scope7');
		equal(inputBind.value, 'scope7', 'el:value:bind - attribute updated when scope changed');
	});

	if (System.env !== 'canjs-test') {
		test("<input text> dynamic attribute bindings (#2016)", function(assert){
			var done = assert.async();
			var template = stache("<input value:bind='{{propName}}'/>");

			var map = new SimpleMap({propName: 'first', first: "Justin", last: "Meyer"});

			var frag = template(map);

			var ta = this.fixture;
			ta.appendChild(frag);

			var input = ta.getElementsByTagName("input")[0];
			testHelpers.afterMutation(function() {
				equal(input.value, "Justin", "input value set correctly if key does not exist in map");
				map.set('propName','last');
				testHelpers.afterMutation(function(){
					equal(input.value, "Meyer", "input value set correctly if key does not exist in map");

					input.value = "Lueke";
					domEvents.dispatch(input, "change");

					testHelpers.afterMutation(function() {
						equal(map.get("last"), "Lueke", "updated from input");
						done();
					});
				});
			});
		});
	}

	test("value:bind compute rejects new value (#887)", function() {
		var template = stache("<input value:bind='age'/>");

		// Compute only accepts numbers
		var compute = new SimpleObservable(30);
		canReflect.assignSymbols(compute,{
			"can.setValue": function(newVal){
				if(isNaN(+newVal)) {
					// do nothing
				} else {
					this.set( +newVal );
				}
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
		domEvents.dispatch(input, "change");

		equal(compute.get(), 30, "Still the old value");
		equal(input.value, "30", "Text input has also not changed");
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
		domEvents.dispatch(camelPropInput, "change");
		equal(map.attr("theProp"), "31", "camelCase prop NOT updated when input bound to camelCase prop changes");
		ok(!map.attr("the-prop"), "kebabCase prop NOT updated when input bound to camelCase prop changes");

		map.attr("the-prop", "33");
		equal(kebabPropInput.value, "33", "input bound to kebab-case prop value set correctly when kebab-case prop changes");
		equal(camelPropInput.value, "32", "input bound to camelCase prop value not updated when kebab-case prop changes");

		map.attr("the-prop", "34");
		equal(kebabPropInput.value, "34", "input bound to kebab-case prop value updated correctly when kebab-case prop changes");
		equal(camelPropInput.value, "32", "input bound to camelCase prop value not updated when kebab-case prop changes");

		kebabPropInput.value = "35";
		domEvents.dispatch(kebabPropInput, "change");
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
		domEvents.dispatch(camelPropInput, "change");
		equal(map.attr("theProp"), "32", "camelCaseProp updated from input bound to camelCase Prop");
		ok(!map.attr("the-prop"), "kebabCaseProp NOT updated from input bound to camelCase Prop");

		map.attr("theProp", "30");
		equal(camelPropInput.value, "32", "input bound to camelCase Prop value NOT updated when camelCase prop changes");
		ok(!kebabPropInput.value, "input bound to kebabCase Prop value NOT updated when camelCase prop changes");

		kebabPropInput.value = "33";
		domEvents.dispatch(kebabPropInput, "change");
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
		domEvents.dispatch(camelPropInput, "change");
		equal(map.attr("theProp"), "32", "camelCaseProp updated from input bound to camelCase Prop");
		ok(!map.attr("the-prop"), "kebabCaseProp NOT updated from input bound to camelCase Prop");

		map.attr("theProp", "30");
		equal(camelPropInput.value, "30", "input bound to camelCase Prop value updated when camelCase prop changes");
		ok(!kebabPropInput.value, "input bound to kebabCase Prop value NOT updated when camelCase prop changes");

		kebabPropInput.value = "33";
		domEvents.dispatch(kebabPropInput, "change");
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


		var data = new SimpleMap();
		// var data = new DefineMap({
		// 	"two.hops": ""
		// });

		var dom = template(data);
		div.appendChild(dom);
		var input = div.getElementsByTagName('input')[0];

		equal(input.value, "", "input value set correctly if key does not exist in map");

		data.set("two.hops", "slide to the left");

		equal(input.value, "slide to the left", "input value set correctly");

		data.set("two.hops", "slide to the right");

		equal(input.value, "slide to the right", "input value update correctly");

		input.value = "REVERSE REVERSE";

		domEvents.dispatch(input, "change");

		equal(data.get("two.hops"), "REVERSE REVERSE", "updated from input");
	});


	test("Bracket expression with colon and no explicit root and value:bind", function () {
		var template;
		var div = this.fixture;

		template = stache('<input value:bind="[\'two:hops\']" >');

		var data = new SimpleMap();
		// var data = new DefineMap({
		// 	"two.hops": ""
		// });

		var dom = template(data);
		div.appendChild(dom);
		var input = div.getElementsByTagName('input')[0];

		equal(input.value, "", "input value set correctly if key does not exist in map");

		data.set("two:hops", "slide to the left");

		equal(input.value, "slide to the left", "input value set correctly");

		data.set("two:hops", "slide to the right");

		equal(input.value, "slide to the right", "input value update correctly");

		input.value = "REVERSE REVERSE";

		domEvents.dispatch(input, "change");

		equal(data.get("two:hops"), "REVERSE REVERSE", "updated from input");
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
		domEvents.dispatch(inputTo, 'change');
		equal(scope.attr('scope1'), '4', 'el:value:to - scope updated when attribute changed');

		scope.attr('scope1', 'scope4');
		equal(inputTo.value, '4', 'el:value:to - attribute not updated when scope changed');

		// el:value:from
		equal(inputFrom.value, 'scope2', 'el:value:from - attribute set from scope');

		inputFrom.value = 'scope5';
		domEvents.dispatch(inputFrom, 'change');
		equal(scope.attr('scope2'), 'scope2', 'el:value:from - scope not updated when attribute changed');

		scope.attr('scope2', 'scope6');
		equal(inputFrom.value, 'scope6', 'el:value:from - attribute updated when scope changed');

		// el:value:bind
		equal(inputBind.value, 'scope3', 'el:value:bind - attribute set from scope prop (parent -> child wins)');

		inputBind.value = 'scope6';
		domEvents.dispatch(inputBind, 'change');
		equal(scope.attr('scope3'), 'scope6', 'el:value:bind - scope updated when attribute changed');

		scope.attr('scope3', 'scope7');
		equal(inputBind.value, 'scope7', 'el:value:bind - attribute updated when scope changed');
	});


	test("<input text> two-way - DOM - input text (#1700)", function() {

		var template = stache("<input value:bind='age'/>");

		var map = new SimpleMap();

		var frag = template(map);

		var ta = this.fixture;
		ta.appendChild(frag);

		var input = ta.getElementsByTagName("input")[0];
		equal(input.value, "", "input value set correctly if key does not exist in map");

		map.attr("age", "30");

		stop();
		testHelpers.afterMutation(function() {
			start();
			equal(input.value, "30", "input value set correctly");

			map.attr("age", "31");

			stop();
			testHelpers.afterMutation(function() {
				start();
				equal(input.value, "31", "input value update correctly");

				input.value = "32";

				domEvents.dispatch(input, "change");

				stop();
				testHelpers.afterMutation(function() {
					start();
					equal(map.attr("age"), "32", "updated from input");
				});
			});
		});
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

	test("updates happen on two-way even when one binding is satisfied", function(assert) {
		var done = assert.async();
		var template = stache('<input value:bind="firstName"/>');
		var viewModel = new SimpleMap({ firstName: "jeffrey" });
		canReflect.assignSymbols(viewModel,{
			"can.setKeyValue": function(key, val) {
				if(val) {
					this.set(key, val.toLowerCase());
				}
			}
		});

		var frag = template(viewModel);
		domMutateNode.appendChild.call(this.fixture, frag);

		var input = this.fixture.firstChild;
		assert.equal(input.value, "jeffrey", 'initial value should be "jeffrey"');

		input.value = "JEFFREY";
		domEvents.dispatch(input, "change");
		assert.equal(input.value, "jeffrey", 'updated value should be "jeffrey"');
		testHelpers.afterMutation(function () {
			done();
		});
	});

	QUnit.test("updates happen on changed two-way even when one binding is satisfied", function(assert) {
		var done = assert.async();
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
		domMutateNode.appendChild.call(this.fixture, frag);

		var input = this.fixture.firstChild;
		testHelpers.afterMutation(function() {
			assert.equal(input.value, "jeffrey");

			viewModel.bindValue = "lastName";
			var undo = domMutate.onNodeAttributeChange(input, function() {
				undo();
				assert.equal(input.value, "king");

				input.value = "KING";
				domEvents.dispatch(input, "change");
				assert.equal(input.value, "king");
				done();
			}.bind(this));
		}.bind(this));
	});

	test("value:bind memory leak (#2270)", function() {

		var template = stache('<div><input value:bind="foo"></div>');

		var vm = new SimpleMap({foo: ''});

		var frag = template(vm);

		var ta = this.fixture;
		domMutateNode.appendChild.call(ta,frag);

		QUnit.stop();

		testHelpers.afterMutation(function(){
			domMutateNode.removeChild.call(ta, ta.firstChild);
			// still 1 binding, should be 0
			testHelpers.afterMutation(function(){
				var checkLifecycleBindings = function(){
					var meta = vm[canSymbol.for("can.meta")];

					if( meta.handlers.get([]).length === 0 ) {
						QUnit.ok(true, "no bindings");
						start();
					} else {
						setTimeout(checkLifecycleBindings, 1000);
					}
				};
				checkLifecycleBindings();
			});
		});

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

		domEvents.dispatch(frag.firstChild, "change");

		stop();
		testHelpers.afterMutation(function() {
			start();
			equal(frag.firstChild.value, "1");
			equal(map.get("age"), 1);
		});

	});

	testIfRealDocument("<input radio> checked:bind should trigger a radiochange event for radio buttons", function() {
		// NOTE: `testIfRealDocument` is used because the vdom does not simulate document event dispatch
		var template = stache([
			'<input type="radio" name="baz" checked:bind="foo"/><span>{{foo}}</span>',
			'<input type="radio" name="baz" checked:bind="bar"/><span>{{bar}}</span>'
		].join(''));
		var data = new SimpleMap({
			foo: false,
			bar: false
		});
		var fragment = template(data);
		domMutateNode.appendChild.call(this.fixture, fragment);

		var self = this;
		function child (index) {
			return self.fixture.childNodes.item(index);
		}

		var fooRadio = child(0);
		var fooText = child(1);
		var barRadio = child(2);
		var barText = child(3);

		function text (node) {
			while (node && node.nodeType !== 3) {
				node = node.firstChild;
			}
			return node && node.nodeValue;
		}

		fooRadio.checked = true;
		domEvents.dispatch(fooRadio, 'change');

		barRadio.checked = true;
		domEvents.dispatch(barRadio, 'change');

		equal(text(fooText), 'false', 'foo text is false');
		equal(text(barText), 'true', 'bar text is true');

		equal(data.get("foo"), false);
		equal(data.get("bar"), true);
	});

	QUnit.test('<input radio> change event handler set up when binding on radiochange (#206)', function() {

		var template = stache('<input type="radio" checked:bind="attending" />');

		var map = new SimpleMap({
			attending: false
		});

		var frag = template(map);
		var input = frag.firstChild;

		input.checked = true;
		domEvents.dispatch(input, "change");

		QUnit.equal(map.get('attending'), true, "now it is true");
	});

	test('<input checkbox> one-way - DOM - with undefined (#135)', function() {
		var data = new SimpleMap({
			completed: undefined
		}),
		frag = stache('<input type="checkbox" el:checked:from="completed"/>')(data);

		domMutateNode.appendChild.call(this.fixture, frag);

		var input = this.fixture.getElementsByTagName('input')[0];
		equal(input.checked, false, 'checkbox value should be false for undefined');
	});

	test('<input checkbox> two-way - DOM - with truthy and falsy values binds to checkbox (#1700)', function() {
		var data = new SimpleMap({
			completed: 1
		}),
		frag = stache('<input type="checkbox" el:checked:bind="completed"/>')(data);

		domMutateNode.appendChild.call(this.fixture, frag);

		var input = this.fixture.getElementsByTagName('input')[0];
		equal(input.checked, true, 'checkbox value bound (via attr check)');
		data.attr('completed', 0);
		stop();

		testHelpers.afterMutation(function() {
			start();
			equal(input.checked, false, 'checkbox value bound (via attr check)');
		});
	});

	test("<input checkbox> checkboxes with checked:bind bind properly (#628)", function() {
		var data = new SimpleMap({
			completed: true
		}),
		frag = stache('<input type="checkbox" checked:bind="completed"/>')(data);

		domMutateNode.appendChild.call(this.fixture, frag);

		var input = this.fixture.getElementsByTagName('input')[0];
		equal(input.checked, data.get('completed'), 'checkbox value bound (via attr check)');

		data.attr('completed', false);
		equal(input.checked, data.get('completed'), 'checkbox value bound (via attr uncheck)');
		input.checked = true;
		domEvents.dispatch(input, 'change');
		equal(input.checked, true, 'checkbox value bound (via check)');
		equal(data.get('completed'), true, 'checkbox value bound (via check)');
		input.checked = false;
		domEvents.dispatch(input, 'change');
		equal(input.checked, false, 'checkbox value bound (via uncheck)');
		equal(data.get('completed'), false, 'checkbox value bound (via uncheck)');
	});

	testIfRealDocument("<select> keeps its value as <option>s change with {{#each}} (#1762)", function(){
		var template = stache("<select value:bind='id'>{{#each values}}<option value='{{this}}'>{{this}}</option>{{/each}}</select>");
		var values = new SimpleObservable( ["1","2","3","4"] );
		var id = new SimpleObservable("2");
		var frag = template({
			values: values,
			id: id
		});
		stop();
		var select = frag.firstChild;
		var options = select.getElementsByTagName("option");
		// the value is set asynchronously
		testHelpers.afterMutation(function(){
			ok(options[1].selected, "value is initially selected");
			values.set(["7","2","5","4"]);

			testHelpers.afterMutation(function(){
				ok(options[1].selected, "after changing options, value should still be selected");
				start();
			});
		});

	});

	testIfRealDocument("<select> with undefined value selects option without value", function() {

		var template = stache("<select value:bind='opt'><option>Loading...</option></select>");

		var map = new SimpleMap();

		var frag = template(map);

		var ta = this.fixture;
		ta.appendChild(frag);

		var select = ta.childNodes.item(0);
		QUnit.equal(select.selectedIndex, 0, 'Got selected index');
	});

	testIfRealDocument('<select> two-way bound values that do not match a select option set selectedIndex to -1 (#2027)', function() {
		var renderer = stache('<select el:value:bind="key"><option value="foo">foo</option><option value="bar">bar</option></select>');
		var map = new SimpleMap({ });
		var frag = renderer(map);

		equal(frag.firstChild.selectedIndex, 0, 'undefined <- {($first value)}: selectedIndex = 0');

		map.attr('key', 'notfoo');
		stop();

		testHelpers.afterMutation(function() {
			start();
			equal(frag.firstChild.selectedIndex, -1, 'notfoo: selectedIndex = -1');

			map.attr('key', 'foo');
			strictEqual(frag.firstChild.selectedIndex, 0, 'foo: selectedIndex = 0');

			map.attr('key', 'notbar');
			stop();

			testHelpers.afterMutation(function() {
				start();
				equal(frag.firstChild.selectedIndex, -1, 'notbar: selectedIndex = -1');

				map.attr('key', 'bar');
				strictEqual(frag.firstChild.selectedIndex, 1, 'bar: selectedIndex = 1');

				map.attr('key', 'bar');
				strictEqual(frag.firstChild.selectedIndex, 1, 'bar (no change): selectedIndex = 1');
			});
		});
	});

	test("<select multiple> Multi-select empty string works(#1263)", function(){

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

	testIfRealDocument("<select multiple> applies initial value, when options rendered from array (#1414)", function() {
		var template = stache(
			"<select values:bind='colors' multiple>" +
				"{{#each allColors}}<option value='{{value}}'>{{label}}</option>{{/each}}" +
				"</select>");

		var map = new SimpleMap({
			colors: new DefineList(["red", "green"]),
			allColors: new DefineList([
				{ value: "red", label: "Red"},
				{ value: "green", label: "Green"},
				{ value: "blue", label: "Blue"}
			])
		});

		stop();
		var frag = template(map);

		var ta = this.fixture;
		ta.appendChild(frag);

		var select = ta.getElementsByTagName("select")[0],
			options = select.getElementsByTagName("option");

		// Wait for Multiselect.set() to be called.
		testHelpers.afterMutation(function(){
			ok(options[0].selected, "red should be set initially");
			ok(options[1].selected, "green should be set initially");
			ok(!options[2].selected, "blue should not be set initially");
			start();
		});

	});



	test("<select> one-way bindings keep value if options are replaced - each (#1762)", function(){
		var countries = [{code: 'MX', countryName:'MEXICO'},
			{code: 'US', countryName:'USA'}
		];

		var data = new SimpleMap({
			countryCode: 'US',
			countries: new DefineList(countries)
		});

		var template = stache('<select el:value:from="countryCode">'+
			'{{#each countries}}'+
			'<option value="{{code}}">{{countryName}}</option>'+
			'{{/each}}'+
			'</select>');

		var frag = template(data);
		var select = frag.firstChild;
		stop();
		testHelpers.afterMutation(function(){

			data.get("countries").replace([]);

			testHelpers.afterMutation(function(){
				data.attr("countries").replace(countries);

				equal(data.attr("countryCode"), "US", "country kept as USA");

				testHelpers.afterMutation(function(){
					ok( select.getElementsByTagName("option")[1].selected, "USA still selected");
				});

				start();
			});

		});

	});

	testIfRealDocument("<select> value:bind select single", function() {

		var template = stache(
			"<select value:bind='color'>" +
				"<option value='red'>Red</option>" +
				"<option value='green'>Green</option>" +
				"</select>");

		var map = new SimpleMap({
			color: "red"
		});

		var frag = template(map);

		var ta = this.fixture;
		ta.appendChild(frag);

		var inputs = ta.getElementsByTagName("select");

		equal(inputs[0].value, 'red', "default value set");

		map.set("color", "green");
		equal(inputs[0].value, 'green', "alternate value set");


		canReflect.each(ta.getElementsByTagName('option'), function(opt) {
			if (opt.value === 'red') {
				opt.selected = 'selected';
			}
		});

		equal(map.get("color"), "green", "not yet updated from input");
		domEvents.dispatch(inputs[0], "change");
		equal(map.get("color"), "red", "updated from input");

		canReflect.each(ta.getElementsByTagName('option'), function(opt) {
			if (opt.value === 'green') {
				opt.selected = 'selected';
			}
		});
		equal(map.get("color"), "red", "not yet updated from input");
		domEvents.dispatch(inputs[0], "change");
		equal(map.get("color"), "green", "updated from input");
	});


	testIfRealDocument("<select> values:bind multiple select with a DefineList", function() {

		var template = stache(
			"<select values:bind='colors' multiple>" +
				"<option value='red'>Red</option>" +
				"<option value='green'>Green</option>" +
				"<option value='ultraviolet'>Ultraviolet</option>" +
				"</select>");

		var list = new DefineList();

		stop();
		var frag = template({
			colors: list
		});

		var ta = this.fixture;
		ta.appendChild(frag);

		var select = ta.getElementsByTagName("select")[0],
			options = select.getElementsByTagName('option');

		// Wait for Multiselect.set() to be called.
		setTimeout(function(){
			// Test updating the DOM changes observable values
			options[0].selected = true;
			domEvents.dispatch(select, "change");

			deepEqual(list.get(), ["red"], "A DefineList value is set even if none existed");

			options[1].selected = true;
			domEvents.dispatch(select, "change");

			deepEqual(list.get(), ["red", "green"], "Adds items to the list");

			options[0].selected = false;
			domEvents.dispatch(select, "change");

			deepEqual(list.get(), ["green"], "Removes items from the list");

			// Test changing observable values changes the DOM

			list.push("ultraviolet");
			options[0].selected = false;
			options[1].selected = true;
			options[2].selected = true;

			ta.removeChild(select);
			start();
		}, 1);
	});

	QUnit.test("<select> one-way bindings keep value if options are replaced (#1762)", function(){
		var countries = [{code: 'MX', countryName:'MEXICO'},
			{code: 'US', countryName:'USA'}
		];

		var data = new SimpleMap({
			countryCode: 'US',
			countries: new DefineList(countries)
		});

		var template = stache('<select el:value:from="countryCode">'+
			'{{#countries}}'+
			'<option value="{{code}}">{{countryName}}</option>'+
			'{{/countries}}'+
			'</select>');

		var frag = template(data);
		var select = frag.firstChild;
		stop();
		testHelpers.afterMutation(function(){

			data.get("countries").replace([]);

			testHelpers.afterMutation(function(){
				data.get("countries").replace(countries);

				equal(data.get("countryCode"), "US", "country kept as USA");

				testHelpers.afterMutation(function(){
					ok( select.getElementsByTagName("option")[1].selected, "USA still selected");
				});

				start();
			});

		});

	});

	testIfRealDocument("<select> two-way bindings update to `undefined` if options are replaced - each (#1762)", function(){
		var countries = [{code: 'MX', countryName:'MEXICO'},
			{code: 'US', countryName:'USA'}
		];

		var data = new SimpleMap({
			countryCode: 'US',
			countries: new DefineList(countries)
		});

		var template = stache('<select el:value:bind="countryCode">'+
			'{{#each countries}}'+
			'<option value="{{code}}">{{countryName}}</option>'+
			'{{/each}}'+
			'</select>');

		template(data);
		stop();
		testHelpers.afterMutation(function(){
			data.attr("countries").replace([]);


			testHelpers.afterMutation(function(){
				equal(data.get("countryCode"), undefined, "countryCode set to undefined");

				start();
			});

		});

	});

	testIfRealDocument('<select> - previously non-existing select value gets selected from a list when it is added (#1762)', function() {
		// this breaks with VDOM can-stache-bindings#258 because of selectedIndex
		var template = stache('<select el:value:bind="{person}">' +
			'<option></option>' +
			'{{#each people}}<option value="{{.}}">{{.}}</option>{{/each}}' +
			'</select>' +
			'<input type="text" size="5" el:value:bind="person">'
		);

		var people = new DefineList([
			"Justin",
			"Zed",
			"Tom",
			"Paula"
		]);

		var vm = new SimpleMap({
			person: 'Brian',
			people: people
		});

		stop();
		vm.on('person', function(ev, newVal, oldVal) {
			ok(false, 'person attribute should not change');
		});

		var frag = template(vm);

		equal(vm.attr('person'), 'Brian', 'Person is still set');

		testHelpers.afterMutation(function() {
			people.push('Brian');
			testHelpers.afterMutation(function() {
				var select = frag.firstChild;
				ok(select.lastChild.selected, 'New child should be selected');
				start();
			});
		});
	});

	test("<select> select bindings respond to changes immediately or during insert using bind (#2134)", function(){
		var countries = [{code: 'MX', countryName:'MEXICO'},
			{code: 'US', countryName:'USA'},
			{code: 'IND', countryName:'INDIA'},
			{code: 'RUS', countryName:'RUSSIA'}
		];

		var template = stache('<select value:bind="countryCode">'+
			'{{#each countries}}'+
			'<option value="{{code}}">{{countryName}}</option>'+
			'{{/each}}'+
			'</select>');

		var data = new SimpleMap({
			countryCode: 'US',
			countries: new DefineList(countries)
		});

		var frag = template(data);
		data.set('countryCode', 'IND');

		stop();
		testHelpers.afterMutation(function(){
			start();
			equal(frag.firstChild.value, "IND", "got last updated value");
		});

	});

	testIfRealDocument("<select> two way bound select empty string null or undefined value (#2027)", function() {

		var template = stache(
			"<select id='null-select' value:bind='color-1'>" +
				"<option value=''>Choose</option>" +
				"<option value='red'>Red</option>" +
				"<option value='green'>Green</option>" +
				"</select>" +
				"<select id='undefined-select' value:bind='color-2'>" +
				"<option value=''>Choose</option>" +
				"<option value='red'>Red</option>" +
				"<option value='green'>Green</option>" +
				"</select>"+
				"<select id='string-select' value:bind='color-3'>" +
				"<option value=''>Choose</option>" +
				"<option value='red'>Red</option>" +
				"<option value='green'>Green</option>" +
				"</select>");

		var map = new SimpleMap({
			'color-1': null,
			'color-2': undefined,
			'color-3': ""
		});
		stop();
		var frag = template(map);
		domMutateNode.appendChild.call(this.fixture, frag);

		var nullInput = doc.getElementById("null-select");
		var nullInputOptions = nullInput.getElementsByTagName('option');
		var undefinedInput = doc.getElementById("undefined-select");
		var undefinedInputOptions = undefinedInput.getElementsByTagName('option');
		var stringInput = doc.getElementById("string-select");
		var stringInputOptions = stringInput.getElementsByTagName('option');

		// wait for set to be called which will change the selects
		testHelpers.afterMutation(function(){
			ok(!nullInputOptions[0].selected, "default (null) value set");
			// the first item is selected because "" is the value.
			ok(undefinedInputOptions[0].selected, "default (undefined) value set");
			ok(stringInputOptions[0].selected, "default ('') value set");
			start();
		});
	});

	testIfRealDocument("<select> two way binding from a select's value to null has no selection (#2027)", function(){
		var template = stache("<select value:bind='key'><option value='One'>One</option></select>");
		var map = new SimpleMap({key: null});

		var frag = template(map);
		var select = frag.childNodes.item(0);

		testHelpers.afterMutation(function(){
			equal(select.selectedIndex, -1, "selectedIndex is 0 because no value exists on the map");
			equal(map.get("key"), null, "The map's value property is set to the select's value");
			start();
		});

		stop();

	});

	testIfRealDocument("<select> One way binding from a select's value to a parent compute updates the parent with the select's initial value (#2027)", function(){
		var template = stache("<select value:to='value'><option value='One'>One</option></select>");
		var map = new SimpleMap();

		var frag = template(map);
		var select = frag.childNodes.item(0);

		testHelpers.afterMutation(function(){
			equal(select.selectedIndex, 0, "selectedIndex is 0 because no value exists on the map");
			equal(map.attr("value"), "One", "The map's value property is set to the select's value");
			start();
		});

		stop();

	});

	testIfRealDocument("Bi-directional binding among sibling components, new syntax (#325)", function () {
		var demoContext = new DefineMap({
			person: ''
		});

		var SourceComponentVM = DefineMap.extend({
			defaultPerson: {
				value: 'John'
			},
			person: {
				set: function(val) {
					return val || this.defaultPerson;
				}
			}
		});

		var ClearComponentVM = DefineMap.extend({
			person: 'string',
			clearPerson: function() {
				this.set('person', '');
			}
		});

		MockComponent.extend({
			tag: "source-component",
			viewModel: SourceComponentVM,
			template: stache('<span>{{person}}</span><input type="text" value:bind="./person" />')
		});

		MockComponent.extend({
			tag: "clear-button",
			viewModel: ClearComponentVM,
			template: stache('<input type="button" value="Clear" on:click="./clearPerson()" /><span>{{./person}}</span>')
		});

		var demoRenderer = stache(
			'<span>{{./person}}</span>' +
			'<source-component person:bind="./person" />' +
			'<clear-button person:bind="./person" />'
		);

		var frag = demoRenderer(demoContext);

		var sourceComponentVM = canViewModel(frag.childNodes[1]);
		var clearButtonVM = canViewModel(frag.childNodes[2]);

		QUnit.equal(frag.childNodes[0].childNodes[0].nodeValue, '', "demoContext person is empty");
		QUnit.equal(frag.childNodes[1].childNodes[0].childNodes[0].nodeValue, 'John', "source-component person is default");
		QUnit.equal(frag.childNodes[2].childNodes[1].childNodes[0].nodeValue, '', "clear-button person is empty");

		sourceComponentVM.person = 'Bob';

		QUnit.equal(frag.childNodes[0].childNodes[0].nodeValue, 'Bob', "demoContext person set correctly");
		QUnit.equal(frag.childNodes[1].childNodes[0].childNodes[0].nodeValue, 'Bob', "source-component person set correctly");
		QUnit.equal(frag.childNodes[2].childNodes[1].childNodes[0].nodeValue, 'Bob', "clear-button person set correctly");

		clearButtonVM.clearPerson();

		// Note that 'John' will not be set on the parent or clear button because parent was already set
		// to an empty string and the bindingSemaphore will not allow another change to the parent
		// (giving the parent priority) to prevent cyclic dependencies.
		QUnit.equal(frag.childNodes[0].childNodes[0].nodeValue, '', "demoContext person set correctly");
		QUnit.equal(frag.childNodes[1].childNodes[0].childNodes[0].nodeValue, 'John', "source-component person set correctly");
		QUnit.equal(frag.childNodes[2].childNodes[1].childNodes[0].nodeValue, '', "clear-button person set correctly");
	});
});
