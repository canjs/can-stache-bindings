var QUnit = require('steal-qunit');
var testHelpers = require('../helpers');

var stache = require('can-stache');

var SimpleMap = require("can-simple-map");
var MockComponent = require("../mock-component-simple-map");

var queues = require("can-queues");

testHelpers.makeTests("can-stache-bindings - colon - variable", function(name, doc, enableMO){

	test("basics", 1, function(){

		var driversListVM = new SimpleMap({
		});

		MockComponent.extend({
			tag: "mock-drivers-list",
			viewModel: driversListVM
		});

		var driverEditVM = new SimpleMap({
		});

		MockComponent.extend({
			tag: "mock-driver-edit",
			viewModel: driverEditVM
		});

		var template = stache(
			'{{let selectedDriver=undefined}}'+
			'<mock-drivers-list selected:to="selectedDriver"/>'+
  			'<mock-driver-edit driver:from="selectedDriver"/>');

		template();
		var driver = {};
		queues.log("flush");
		driversListVM.set("selected",driver);

		QUnit.equal(driverEditVM.get("driver"), driver, "updated value");

	});

});
