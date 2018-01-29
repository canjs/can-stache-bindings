var stacheBindings = require('can-stache-bindings');
var CanSimpleMap = require("can-simple-map");
var viewCallbacks = require('can-view-callbacks');
var nodeLists = require('can-view-nodelist');
var canSymbol = require('can-symbol');

var domData = require('can-dom-data-state');
var domMutateNode = require('can-dom-mutate/node');
var MockComponent;
module.exports = MockComponent = {
	extend: function(proto){

		viewCallbacks.tag(proto.tag, function(el, componentTagData){
			var viewModel;
			var teardownBindings = stacheBindings.behaviors.viewModel(el, componentTagData, function(initialViewModelData) {
				if(typeof proto.viewModel === "function") {
					return viewModel = new proto.viewModel(initialViewModelData);
				} else if(proto.viewModel instanceof CanSimpleMap){
					proto.viewModel.set(initialViewModelData);
					return viewModel = proto.viewModel;
				} else {
					var VM = CanSimpleMap.extend(proto.viewModel);
					return viewModel = new VM(initialViewModelData);
				}

			}, {});
			el[canSymbol.for('can.viewModel')] = viewModel;
			domData.set.call(el, "preventDataBindings", true);

			if(proto.template) {
				var shadowScope = componentTagData.scope.add(viewModel);
				domData.set.call(el, "shadowScope", shadowScope);
				var nodeList = nodeLists.register([], function(){
					teardownBindings();
				}, componentTagData.parentNodeList || true, false);
				var frag = proto.template(shadowScope, componentTagData.options, nodeList);

				domMutateNode.appendChild.call(el, frag);
			}
		});
	}
};
