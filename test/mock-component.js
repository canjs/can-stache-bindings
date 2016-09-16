var stacheBindings = require('can-stache-bindings');
var CanMap = require("can-map");
var viewCallbacks = require('can-view-callbacks');
var Scope = require('can-view-scope');
var nodeLists = require('can-view-nodelist');

var domData = require('can-util/dom/data/data');
var domMutate = require('can-util/dom/mutate/mutate');

module.exports = MockComponent = {
	extend: function(proto){

		viewCallbacks.tag(proto.tag, function(el, componentTagData){
			var viewModel;
			var teardownBindings = stacheBindings.behaviors.viewModel(el, componentTagData, function(initialViewModelData) {
				if(typeof proto.viewModel === "function") {
					return viewModel = new proto.viewModel(initialViewModelData);
				} else if(proto.viewModel instanceof CanMap){
					return viewModel = proto.viewModel;
				} else {
					var VM = CanMap.extend(proto.viewModel);
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
				domData.set.call(el, "shadowScope", shadowScope);
				var nodeList = nodeLists.register([], function(){
					teardownBindings();
				}, componentTagData.parentNodeList || true, false);
				var frag = proto.template(shadowScope, componentTagData.options, nodeList);

				domMutate.appendChild.call(el, frag);
			}
		})
	}
};
