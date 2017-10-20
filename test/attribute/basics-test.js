var QUnit = require('steal-qunit');
var testHelpers = require('../helpers');

var stacheBindings = require('can-stache-bindings');

var stache = require('can-stache');

var SimpleMap = require("can-simple-map");
var MockComponent = require("../mock-component-simple-map");
var dev = require('can-util/js/dev/dev');

testHelpers.makeTests("can-stache-bindings - attribute - basics", function(name, doc, enableMO){

    test("basics", 1, function(){

    	var viewModel = new SimpleMap({
    		attrName: "value"
    	});

    	MockComponent.extend({
    		tag: "basic-attribute",
    		viewModel: viewModel
    	});
    	var template = stache("<basic-attribute attrName='valueA'/>");

    	template({});

    	QUnit.deepEqual(viewModel.get(), {
    		attrName: "valueA"
    	}, "initial scope values correct");

    });
    return;
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

    });



});
