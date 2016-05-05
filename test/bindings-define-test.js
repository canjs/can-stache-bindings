var stacheBindings = require('can-stache-bindings');

var QUnit = require('steal-qunit');
var DefineList = require('can-define/list/list');
var DefineMap = require("can-define/map/map");
var stache = require('can-stache');
var canViewModel = require('can-view-model');
var define = require("can-define");
var canEvent = require('can-event');
var viewCallbacks = require('can-view-callbacks');

var domData = require('can-util/dom/data/data');
var domMutate = require('can-util/dom/mutate/mutate');

var dev = require('can-util/js/dev/dev');
var canEach = require('can-util/js/each/each');

var viewModelFor = function(tag, viewModel) {
	viewCallbacks.tag(tag, function(el){
		domData.set.call(el, "viewModel", viewModel);
	});
}

var MockComponent = {
	extend: function(proto){
		viewCallbacks.tag(proto.tag, function(el, componentTagData){
			var viewModel;
			var teardownBindings = stacheBindings.behaviors.viewModel(el, componentTagData, function(initialViewModelData) {
				if(typeof proto.viewModel === "function") {
					return viewModel = new proto.viewModel(initialViewModelData);
				} else if(proto.viewModel instanceof DefineMap){
					return viewModel = proto.viewModel;
				} else {
					var VM = DefineMap.extend(proto.viewModel);
					return viewModel = new VM(initialViewModelData);
				}

			}, {});
			domData.set.call(el, "viewModel", viewModel);
			domData.set.call(el, "preventDataBindings", true);

			if(proto.template) {
				var shadowScope = componentTagData.scope.add(new Scope.Refs())
					.add(viewModel, {
						viewModel: true
					});
				var nodeList = nodeLists.register([], function(){
					teardownBindings();
				}, componentTagData.parentNodeList || true, false);
				var frag = proto.template(shadowScope, componentTagData.options, nodeList);

				domMutate.appendChild.call(el, frag);
			}
		})
	}
};

QUnit.module("can-stache-bindings (can-define)")


test("two way - viewModel", 7, function () {

	var ViewModel = define.Constructor({
		vmProp: {}
	});

	MockComponent.extend({
		tag: 'two-way-viewmodel',
		viewModel: ViewModel
	});

	var template = stache('<two-way-viewmodel {(vm-prop)}="scopeProp" />');

	var Context = define.Constructor({
		scopeProp: {
			value: 'Bing!'
		}
	});

	var context = new Context();
	var frag = template(context);
	var viewModel = canViewModel(frag.firstChild);

	ok(viewModel instanceof ViewModel, 'ViewModel is a can-define object');

	equal(viewModel.vmProp, 'Bing!', 'ViewModel property set via scope property set');
	equal(context.scopeProp, 'Bing!', 'Scope property is correct');

	viewModel.vmProp = 'Bang!';

	equal(viewModel.vmProp, 'Bang!', 'ViewModel property was set');
	equal(context.scopeProp, 'Bang!', 'Scope property set via viewModel property set');

	context.scopeProp = 'BOOM!';

	equal(context.scopeProp, 'BOOM!', 'Scope property was set');
	equal(viewModel.vmProp, 'BOOM!', 'ViewModel property set via scope property set');

});

test('one-way - parent to child - viewModel', function(){
	var VM = DefineMap.extend({
		viewModelProp: "*"
	});

	viewModelFor("parent-to-child", new VM());

	var template = stache('<parent-to-child {view-model-prop}="scopeProp" />');
	var Context = define.Constructor({
		scopeProp: {
			value: 'Venus'
		}
	});
	var context = new Context();
	var frag = template(context);
	var viewModel = canViewModel(frag.firstChild);

	equal(viewModel.viewModelProp, 'Venus', 'ViewModel property initially set from scope');

	viewModel.viewModelProp = 'Earth';

	equal(context.scopeProp, 'Venus', 'Scope property unchanged by viewModel set');

	context.scopeProp = 'Mars';

	equal(viewModel.viewModelProp, 'Mars', 'ViewModel property was set via scope set');
});


test('one-way - child to parent - viewModel', function(){

	var ViewModel = define.Constructor({
		viewModelProp: {
			value: 'Mercury'
		}
	});

	MockComponent.extend({
		tag: 'view-model-able',
		viewModel: ViewModel
	});

	var template = stache('<view-model-able {^view-model-prop}="scopeProp" />');

	var Context = define.Constructor({
		scopeProp: {
			value: 'Venus'
		}
	});

	var context = new Context();

	var frag = template(context);
	var viewModel = canViewModel(frag.firstChild);

	equal(viewModel.viewModelProp, 'Mercury', 'ViewModel property unchanged by scope property');
	equal(context.scopeProp, 'Mercury', 'Scope property initially set from viewModel');

	viewModel.viewModelProp = 'Earth';

	equal(context.scopeProp, 'Earth', 'Scope property set via viewModel set');

	context.scopeProp = 'Mars';

	equal(viewModel.viewModelProp, 'Earth', 'ViewModel property unchanged by scope set');
});

test("two-way - DOM - input text (#1700)", function () {

	var template = stache("<input {($value)}='age'/>");
	var MyMap = define.Constructor({
		age: {
			type: "string"
		}
	});
	var map = new MyMap();

	var frag = template(map);

	var ta = document.getElementById("qunit-fixture");
	ta.appendChild(frag);

	var input = ta.getElementsByTagName("input")[0];
	equal(input.value, "", "input value set correctly if key does not exist in map");

	map.age = 30;

	equal(input.value, "30", "input value set correctly");

	map.age = "31";

	equal(input.value, "31", "input value update correctly");

	input.value = "32";

	canEvent.trigger.call(input, "change");

	equal(map.age, "32", "updated from input");

});
