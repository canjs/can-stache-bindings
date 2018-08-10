"use strict";
// # can-stache-bindings.js
//
// This module provides CanJS's default data and event bindings.
// It's broken up into several parts:
//
// - Behaviors - Binding behaviors that run given an attribute or element.
// - Attribute Syntaxes - Hooks up custom attributes to their behaviors.
// - getObservableFrom - Methods that return a observable cross bound to the scope, viewModel, or element.
// - bind - Methods for setting up cross binding
// - getBindingInfo - A helper that returns the details of a data binding given an attribute.
// - makeDataBinding - A helper method for setting up a data binding.
// - initializeValues - A helper that initializes a data binding.
var Bind = require('can-bind');
var expression = require('can-stache/src/expression');
var viewCallbacks = require('can-view-callbacks');
var canViewModel = require('can-view-model');
var observeReader = require('can-stache-key');
var ObservationRecorder = require('can-observation-recorder');
var SimpleObservable = require('can-simple-observable');

var assign = require('can-assign');
var dev = require('can-log/dev/dev');
var domMutate = require('can-dom-mutate');
var domData = require('can-dom-data-state');
var canSymbol = require("can-symbol");
var canReflect = require("can-reflect");
var canReflectDeps = require("can-reflect-dependencies");
var encoder = require("can-attribute-encoder");
var queues = require("can-queues");
var SettableObservable = require("can-simple-observable/setter/setter");
var AttributeObservable = require("can-attribute-observable");
var makeCompute = require("can-view-scope/make-compute-like");
var ViewNodeList = require("can-view-nodelist");

var canEvent = require("can-attribute-observable/event");

// Contains all of the stache bindings that will be exported.
var bindings = new Map();

var onMatchStr = "on:",
	vmMatchStr = "vm:",
	elMatchStr = "el:",
	byMatchStr = ":by:",
	toMatchStr = ":to",
	fromMatchStr = ":from",
	bindMatchStr = ":bind",
	viewModelBindingStr = "viewModel",
	attributeBindingStr = "attribute",
	scopeBindingStr = "scope",
	viewModelOrAttributeBindingStr = "viewModelOrAttribute";

var throwOnlyOneTypeOfBindingError = function() {
	throw new Error("can-stache-bindings - you can not have contextual bindings ( this:from='value' ) and key bindings ( prop:from='value' ) on one element.");
};

// This function checks if there bindings that are trying
// to set a property ON the viewModel _conflicting_ with bindings trying to
// set THE viewModel ITSELF.
// If there is a conflict, an error is thrown.
var checkBindingState = function(bindingState, bindingInfo) {
	var isSettingOnViewModel = bindingInfo.parentToChild && bindingInfo.child === viewModelBindingStr;
	if (isSettingOnViewModel) {
		var bindingName = bindingInfo.childName;
		var isSettingViewModel = isSettingOnViewModel && ( bindingName === 'this' || bindingName === '.' );

		if (isSettingViewModel) {
			if (bindingState.isSettingViewModel || bindingState.isSettingOnViewModel) {
				throwOnlyOneTypeOfBindingError();
			} else {
				return {
					isSettingViewModel: true,
					initialViewModelData: undefined
				};
			}
		} else {
			// just setting on viewModel
			if (bindingState.isSettingViewModel) {
				throwOnlyOneTypeOfBindingError();
			} else {
				return {
					isSettingOnViewModel: true,
					initialViewModelData: bindingState.initialViewModelData
				};
			}
		}
	} else {
		return bindingState;
	}
};

// ## Behaviors
var behaviors = {
	// ### bindings.behaviors.viewModel
	// Sets up all of an element's data binding attributes to a "soon-to-be-created"
	// `viewModel`.
	// This is primarily used by `can.Component` to ensure that its
	// `viewModel` is initialized with values from the data bindings as quickly as possible.
	// Component could look up the data binding values itself.  However, that lookup
	// would have to be duplicated when the bindings are established.
	// Instead, this uses the `makeDataBinding` helper, which allows creation of the `viewModel`
	// after scope values have been looked up.
	//
	// - `makeViewModel(initialViewModelData)` - a function that returns the `viewModel`.
	// - `initialViewModelData` any initial data that should already be added to the `viewModel`.
	//
	// Returns:
	// - `function` - a function that tears all the bindings down. Component
	// wants all the bindings active so cleanup can be done during a component being removed.
	viewModel: function(el, tagData, makeViewModel, initialViewModelData, staticDataBindingsOnly) {

		var viewModel,
			// Stores callbacks for when the viewModel is created.
			onCompleteBindings = [],
			// Stores what needs to be called when the element is removed
			// to prevent memory leaks.
			onTeardowns = {},
			// Track info about each binding, we need this for binding attributes correctly.
			bindingInfos = {},
			attributeViewModelBindings = assign({}, initialViewModelData),
			bindingsState = {
				// if we have a binding like {something}="foo"
				isSettingOnViewModel: false,
				// if we have binding like {this}="bar"
				isSettingViewModel: false,
				initialViewModelData: initialViewModelData || {}
			},
			hasDataBinding = false;

		// For each attribute, we start the binding process,
		// and save what's returned to be used when the `viewModel` is created,
		// the element is removed, or the attribute changes values.
		canReflect.each(el.attributes || [], function(node) {
			var dataBinding = makeDataBinding(node, el, {
				templateType: tagData.templateType,
				scope: tagData.scope,
				getViewModel: function() {
					return viewModel;
				},
				attributeViewModelBindings: attributeViewModelBindings,
				alreadyUpdatedChild: true,
				nodeList: tagData.parentNodeList,
				// force viewModel bindings in cases when it is ambiguous whether you are binding
				// on viewModel or an attribute (:to, :from, :bind)
				favorViewModel: true
			});

			if (dataBinding) {
				var bindingInfo = dataBinding.bindingInfo;
				bindingsState = checkBindingState(bindingsState, bindingInfo);
				hasDataBinding = true;

				// For bindings that change the viewModel,
				// save the initial value on the viewModel.
				if (bindingInfo.parentToChild) {
					var parentValue = bindingInfo.stickyParentToChild ? makeCompute(dataBinding.parent) : dataBinding.canBinding.parentValue;

					if (parentValue !== undefined) {

						if (bindingsState.isSettingViewModel) {
							// the initial data is the context
							// TODO: this is covered by can-component’s tests but not can-stache-bindings’ tests
							bindingsState.initialViewModelData = parentValue;
						} else {
							bindingsState.initialViewModelData[cleanVMName(bindingInfo.childName, tagData.scope)] = parentValue;
						}

					}
				}

				// Save what needs to happen after the `viewModel` is created.
				onCompleteBindings.push(dataBinding.canBinding.start.bind(dataBinding.canBinding));

				onTeardowns[node.name] = dataBinding.canBinding.stop.bind(dataBinding.canBinding);
			}
		});
		if (staticDataBindingsOnly && !hasDataBinding) {
			return;
		}
		// Create the `viewModel` and call what needs to happen after `viewModel` is created.
		viewModel = makeViewModel(bindingsState.initialViewModelData, hasDataBinding, bindingsState);

		for (var i = 0, len = onCompleteBindings.length; i < len; i++) {
			onCompleteBindings[i]();
		}

		// Listen to attribute changes and re-initialize
		// the bindings.
		var attributeDisposal;
		if (!bindingsState.isSettingViewModel) {
			attributeDisposal = domMutate.onNodeAttributeChange(el, function(ev) {
				var attrName = ev.attributeName,
					value = el.getAttribute(attrName);

				if (onTeardowns[attrName]) {
					onTeardowns[attrName]();
				}
				// Parent attribute bindings we always re-setup.
				var parentBindingWasAttribute = bindingInfos[attrName] && bindingInfos[attrName].parent === attributeBindingStr;

				if (value !== null || parentBindingWasAttribute) {
					var dataBinding = makeDataBinding({
						name: attrName,
						value: value
					}, el, {
						templateType: tagData.templateType,
						scope: tagData.scope,
						getViewModel: function() {
							return viewModel;
						},
						attributeViewModelBindings: attributeViewModelBindings,
						// always update the viewModel accordingly.
						initializeValues: true,
						nodeList: tagData.parentNodeList
					});
					if (dataBinding) {
						// The viewModel is created, so call callback immediately.
						dataBinding.canBinding.start();
						bindingInfos[attrName] = dataBinding.bindingInfo;
						onTeardowns[attrName] = dataBinding.canBinding.stop.bind(dataBinding.canBinding);
					}
				}
			});
		}

		return function() {
			if (attributeDisposal) {
				attributeDisposal();
				attributeDisposal = undefined;
			}
			for (var attrName in onTeardowns) {
				onTeardowns[attrName]();
			}
		};
	},
	// ### bindings.behaviors.data
	// This is called when an individual data binding attribute is placed on an element.
	// For example `{^value}="name"`.
	data: function(el, attrData) {
		if (domData.get.call(el, "preventDataBindings")) {
			return;
		}
		var viewModel,
			getViewModel = ObservationRecorder.ignore(function() {
				return viewModel || (viewModel = canViewModel(el));
			}),
			teardown,
			attributeDisposal,
			removedDisposal;

		// Setup binding
		var dataBinding = makeDataBinding({
			name: attrData.attributeName,
			value: el.getAttribute(attrData.attributeName),
			nodeList: attrData.nodeList
		}, el, {
			templateType: attrData.templateType,
			scope: attrData.scope,
			getViewModel: getViewModel,
			syncChildWithParent: false
		});

		//!steal-remove-start
		if (process.env.NODE_ENV !== 'production') {
			if (dataBinding.bindingInfo.child === "viewModel" && !domData.get(el, "viewModel")) {
				dev.warn('This element does not have a viewModel. (Attempting to bind `' + dataBinding.bindingInfo.bindingAttributeName + '="' + dataBinding.bindingInfo.parentName + '"`)');
			}
		}
		//!steal-remove-end

		dataBinding.canBinding.start();

		var attributeListener = function(ev) {
			var attrName = ev.attributeName,
				value = el.getAttribute(attrName);

			if (attrName === attrData.attributeName) {
				if (teardown) {
					teardown();
				}

				if(value !== null  ) {
					var dataBinding = makeDataBinding({name: attrName, value: value}, el, {
						templateType: attrData.templateType,
						scope: attrData.scope,
						getViewModel: getViewModel,
						// always update the viewModel accordingly.
						initializeValues: true,
						nodeList: attrData.nodeList,
						syncChildWithParent: false
					});
					if(dataBinding) {
						// The viewModel is created, so call callback immediately.
						dataBinding.canBinding.start();
						teardown = dataBinding.canBinding.stop.bind(dataBinding.canBinding);
					}
					teardown = dataBinding.onTeardown;
				}
			}
		};


		var tearItAllDown = function() {
			if (teardown) {
				teardown();
				teardown = undefined;
			}

			if (removedDisposal) {
				removedDisposal();
				removedDisposal = undefined;
			}
			if (attributeDisposal) {
				attributeDisposal();
				attributeDisposal = undefined;
			}
		};
		if (attrData.nodeList) {
			ViewNodeList.register([], tearItAllDown, attrData.nodeList, false);
		}


		// Listen for changes
		teardown = dataBinding.canBinding.stop.bind(dataBinding.canBinding);

		attributeDisposal = domMutate.onNodeAttributeChange(el, attributeListener);
		removedDisposal = domMutate.onNodeRemoval(el, function() {
			if (el.ownerDocument.contains(el) === false) {
				tearItAllDown();
			}
		});
	},
	// ### bindings.behaviors.event
	// The following section contains code for implementing the can-EVENT attribute.
	// This binds on a wildcard attribute name. Whenever a view is being processed
	// and can-xxx (anything starting with can-), this callback will be run.  Inside, its setting up an event handler
	// that calls a method identified by the value of this attribute.
	event: function(el, data) {

		// Get the `event` name and if we are listening to the element or viewModel.
		// The attribute name is the name of the event.
		var attributeName = encoder.decode(data.attributeName),
			// the name of the event we are binding
			event,
			// if we are binding on the element or the VM
			bindingContext;

		// check for `on:event:value:to` type things and call data bindings
		if (attributeName.indexOf(toMatchStr + ":") !== -1 ||
			attributeName.indexOf(fromMatchStr + ":") !== -1 ||
			attributeName.indexOf(bindMatchStr + ":") !== -1
		) {
			return this.data(el, data);
		}

		if (startsWith.call(attributeName, onMatchStr)) {
			event = attributeName.substr(onMatchStr.length);
			var viewModel = el[canSymbol.for('can.viewModel')];

			// when using on:prop:by:obj
			// bindingContext should be scope.obj
			var byParent = data.scope;

			// get the bindingContext
			// on:el:prop -> bindingContext = element
			// on:vm:prop -> bindingContext = viewModel
			// otherwise,
			// bind on the element if there is not a viewModel
			if (startsWith.call(event, elMatchStr)) {
				event = event.substr(elMatchStr.length);
				bindingContext = el;
			} else {
				if (startsWith.call(event, vmMatchStr)) {
					event = event.substr(vmMatchStr.length);
					bindingContext = viewModel;

					// when using on:vm:prop:by:obj
					// bindingContext should be viewModel.obj
					byParent = viewModel;
				} else {
					bindingContext = viewModel || el;
				}

				// update the bindingContext and event if using :by:
				// on:prop:by:obj
				//   -> bindingContext = byParent.get('obj')
				//   -> event = 'prop'
				var byIndex = event.indexOf(byMatchStr);
				if (byIndex >= 0) {
					bindingContext = byParent.get(event.substr(byIndex + byMatchStr.length));
					event = event.substr(0, byIndex);
				}
			}
		} else {
			throw new Error("can-stache-bindings - unsupported event bindings " + attributeName);
		}

		// This is the method that the event will initially trigger. It will look up the method by the string name
		// passed in the attribute and call it.
		var handler = function(ev) {
			var attrVal = el.getAttribute(encoder.encode(attributeName));
			if (!attrVal) {
				return;
			}

			var viewModel = canViewModel(el);

			// expression.parse will read the attribute
			// value and parse it identically to how mustache helpers
			// get parsed.
			var expr = expression.parse(attrVal, {
				lookupRule: function() {
					return expression.Lookup;
				},
				methodRule: "call"
			});


			if (!(expr instanceof expression.Call)) {
				throw new Error("can-stache-bindings: Event bindings must be a call expression. Make sure you have a () in " + data.attributeName + "=" + JSON.stringify(attrVal));
			}

			// create "special" values that can be looked up using
			// {{scope.element}}, etc
			var specialValues = {
				element: el,
				event: ev,
				viewModel: viewModel,
				arguments: arguments
			};

			// make a scope with these things just under
			var localScope = data.scope
				.add(specialValues, {
					special: true
				});

			var updateFn = function() {
				var value = expr.value(localScope, {
					doNotWrapInObservation: true
				});

				value = canReflect.isValueLike(value) ?
					canReflect.getValue(value) :
					value;

				return typeof value === 'function' ?
					value(el) :
					value;
			};
			//!steal-remove-start
			if (process.env.NODE_ENV !== 'production') {
				Object.defineProperty(updateFn, "name", {
					value: attributeName + '="' + attrVal + '"'
				});
			}
			//!steal-remove-end

			queues.batch.start();
			var mutateQueueArgs = [];
			mutateQueueArgs = [
				updateFn,
				null,
				null,
				{}
			];
			//!steal-remove-start
			if (process.env.NODE_ENV !== 'production') {
				mutateQueueArgs = [
					updateFn,
					null,
					null, {
						reasonLog: [el, ev, attributeName+"="+attrVal]
					}
				];
			}
			//!steal-remove-end
			queues.mutateQueue.enqueue.apply(queues.mutateQueue, mutateQueueArgs);
			queues.batch.stop();

		};

		var attributesDisposal,
			removalDisposal;

		// Unbind the event when the attribute is removed from the DOM
		var attributesHandler = function(ev) {
			var isEventAttribute = ev.attributeName === attributeName;
			var isRemoved = !el.getAttribute(attributeName);
			var isEventAttributeRemoved = isEventAttribute && isRemoved;
			if (isEventAttributeRemoved) {
				unbindEvent();
			}
		};
		var removalHandler = function() {
			if (!el.ownerDocument.contains(el)) {
				unbindEvent();
			}
		};
		var unbindEvent = function() {
			canEvent.off.call(bindingContext, event, handler);
			if (attributesDisposal) {
				attributesDisposal();
				attributesDisposal = undefined;
			}
			if (removalDisposal) {
				removalDisposal();
				removalDisposal = undefined;
			}
		};

		// Bind the handler defined above to the element we're currently processing and the event name provided in this
		// attribute name (can-click="foo")
		canEvent.on.call(bindingContext, event, handler);
		attributesDisposal = domMutate.onNodeAttributeChange(el, attributesHandler);
		removalDisposal = domMutate.onNodeRemoval(el, removalHandler);
	}
};


// ## Attribute Syntaxes
// The following sets up the bindings functions to be called
// when called in a template.


// value:to="bar" data bindings
// these are separate so that they only capture at the end
// to avoid (toggle)="bar" which is encoded as :lp:toggle:rp:="bar"
bindings.set(/[\w\.:]+:to$/, behaviors.data);
bindings.set(/[\w\.:]+:from$/, behaviors.data);
bindings.set(/[\w\.:]+:bind$/, behaviors.data);
bindings.set(/[\w\.:]+:raw$/, behaviors.data);
// value:to:on:input="bar" data bindings
bindings.set(/[\w\.:]+:to:on:[\w\.:]+/, behaviors.data);
bindings.set(/[\w\.:]+:from:on:[\w\.:]+/, behaviors.data);
bindings.set(/[\w\.:]+:bind:on:[\w\.:]+/, behaviors.data);


// `(EVENT)` event bindings.
bindings.set(/on:[\w\.:]+/, behaviors.event);

// ## getObservableFrom
// An object of helper functions that make a getter/setter observable
// on different types of objects.
var getObservableFrom = {
	// ### getObservableFrom.viewModelOrAttribute
	viewModelOrAttribute: function(el, scope, vmNameOrProp, bindingData, mustBeGettable, stickyCompute, event) {
		var viewModel = el[canSymbol.for('can.viewModel')];

		// if we have a viewModel, use it; otherwise, setup attribute binding
		if (viewModel) {
			return this.viewModel.apply(this, arguments);
		} else {
			return this.attribute.apply(this, arguments);
		}
	},
	// ### getObservableFrom.scope
	// Returns a compute from the scope.  This handles expressions like `someMethod(.,1)`.
	scope: function(el, scope, scopeProp, bindingData, mustBeGettable, stickyCompute) {
		if (!scopeProp) {
			return new SimpleObservable();
		} else {
			// Check if we need to spend time building a scope-key-data
			// If we have a '(', it likely means a call expression.
			if (mustBeGettable || scopeProp.indexOf("(") >= 0 ) {
				var parentExpression = expression.parse(scopeProp,{baseMethodType: "Call"});
				return parentExpression.value(scope);
			} else {
				var observation = {};
				canReflect.assignSymbols(observation, {
					"can.getValue": function getValue() {},

					"can.valueHasDependencies": function hasValueDependencies() {
						return false;
					},

					"can.setValue": function setValue(newVal) {
						scope.set(cleanVMName(scopeProp, scope), newVal);
					},

					// Register what the custom observation changes
					"can.getWhatIChange": function getWhatIChange() {
						var data = scope.getDataForScopeSet(cleanVMName(scopeProp, scope));

						return {
							mutate: {
								keyDependencies: new Map([
									[data.parent, new Set([data.key])]
								])
							}
						};
					},

					"can.getName": function getName() {
						//!steal-remove-start
						if (process.env.NODE_ENV !== 'production') {
							var result = "ObservableFromScope<>";
							var data = scope.getDataForScopeSet(cleanVMName(scopeProp, scope));

							if (data.parent && data.key) {
								result = "ObservableFromScope<" +
									canReflect.getName(data.parent) +
									"." +
									data.key +
									">";
							}

							return result;
						}
						//!steal-remove-end
					},
				});

				var data = scope.getDataForScopeSet(cleanVMName(scopeProp, scope));
				if (data.parent && data.key) {
					// Register what changes the Scope's parent key
					canReflectDeps.addMutatedBy(data.parent, data.key, observation);
				}

				return observation;
			}
		}
	},
	// ### getObservableFrom.viewModel
	// Returns a compute that's two-way bound to the `viewModel` returned by
	// `options.getViewModel()`.
	viewModel: function(el, scope, vmName, bindingData, mustBeGettable, stickyCompute, childEvent) {
		var setName = cleanVMName(vmName, scope);
		var isBoundToContext = vmName === "." || vmName === "this";
		var keysToRead = isBoundToContext ? [] : observeReader.reads(vmName);

		function getViewModelProperty() {
			var viewModel = bindingData.getViewModel();
			return observeReader.read(viewModel, keysToRead, {}).value;
		}
		//!steal-remove-start
		if (process.env.NODE_ENV !== 'production') {
			Object.defineProperty(getViewModelProperty, "name", {
				value: "viewModel." + vmName
			});
		}
		//!steal-remove-end

		var observation = new SettableObservable(
			getViewModelProperty,

			function setViewModelProperty(newVal) {
				var viewModel = bindingData.getViewModel();

				if (stickyCompute) {
					// TODO: Review what this is used for.
					var oldValue = canReflect.getKeyValue(viewModel, setName);
					if (canReflect.isObservableLike(oldValue)) {
						canReflect.setValue(oldValue, newVal);
					} else {
						canReflect.setKeyValue(
							viewModel,
							setName,
							new SimpleObservable(canReflect.getValue(stickyCompute))
						);
					}
				} else {
					if (isBoundToContext) {
						canReflect.setValue(viewModel, newVal);
					} else {
						canReflect.setKeyValue(viewModel, setName, newVal);
					}
				}
			}
		);

		//!steal-remove-start
		if (process.env.NODE_ENV !== 'production') {
			var viewModel = bindingData.getViewModel();
			if (viewModel && setName) {
				canReflectDeps.addMutatedBy(viewModel, setName, observation);
			}
		}
		//!steal-remove-end

		return observation;
	},
	// ### getObservableFrom.attribute
	// Returns a compute that is two-way bound to an attribute or property on the element.
	attribute: function(el, scope, prop, bindingData, mustBeGettable, stickyCompute, event, bindingInfo) {
		return new AttributeObservable(el, prop, bindingData, event);
	}
};

var startsWith = String.prototype.startsWith || function(text){
	return this.indexOf(text) === 0;
};

// Gets an event name in the after part.
function getEventName(result) {
	if (result.special.on !== undefined) {
		return result.tokens[result.special.on + 1];
	}
}

var bindingRules = {
	to: {
		childToParent: true,
		parentToChild: false,
		syncChildWithParent: false
	},
	from: {
		childToParent: false,
		parentToChild: true,
		syncChildWithParent: false,
	},
	bind: {
		childToParent: true,
		parentToChild: true,
		syncChildWithParent: true,
	},
	raw: {
		childToParent: false,
		parentToChild: true,
		syncChildWithParent: false
	}
};
var bindingNames = [];
var special = {
	vm: true,
	on: true
};
canReflect.each(bindingRules, function(value, key) {
	bindingNames.push(key);
	special[key] = true;
});

// "on:click:value:to" //-> {tokens: [...], special: {on: 0, to: 3}}
function tokenize(source) {
	var splitByColon = source.split(":");
	// combine tokens that are not to, from, vm,
	var result = {
		tokens: [],
		special: {}
	};
	splitByColon.forEach(function(token) {
		if (special[token]) {
			result.special[token] = result.tokens.push(token) - 1;
		} else {
			result.tokens.push(token);
		}
	});

	return result;
}

// ## getChildBindingStr
var getChildBindingStr = function(tokens, favorViewModel) {
	if (tokens.indexOf('vm') >= 0) {
		return viewModelBindingStr;
	} else if (tokens.indexOf('el') >= 0) {
		return attributeBindingStr;
	} else {
		return favorViewModel ? viewModelBindingStr : viewModelOrAttributeBindingStr;
	}
};

// ## getBindingInfo
// takes a node object like {name, value} and returns
// an object with information about that binding.
// Properties:
// - `parent` - where is the parentName read from: "scope", "attribute", "viewModel".
// - `parentName` - what is the parent property that should be read.
// - `child` - where is the childName read from: "scope", "attribute", "viewModel".
//  - `childName` - what is the child property that should be read.
// - `parentToChild` - should changes in the parent update the child.
// - `childToParent` - should changes in the child update the parent.
// - `bindingAttributeName` - the attribute name that created this binding.
// - `initializeValues` - should parent and child be initialized to their counterpart.
// If undefined is return, there is no binding.
var getBindingInfo = function(node, attributeViewModelBindings, templateType, tagName, favorViewModel) {
	var bindingInfo,
		attributeName = encoder.decode(node.name),
		attributeValue = node.value || "";

	// START: check new binding syntaxes ======
	var result = tokenize(attributeName),
		dataBindingName,
		specialIndex;



	// check if there's a match of a binding name with at least a value before it
	bindingNames.forEach(function(name) {
		if (result.special[name] !== undefined && result.special[name] > 0) {
			dataBindingName = name;
			specialIndex = result.special[name];
			return false;
		}
	});

	if (dataBindingName) {
		var childEventName = getEventName(result);
		var initializeValues = childEventName && dataBindingName !== "bind" ? false : true;
		bindingInfo = assign({
			parent: scopeBindingStr,
			child: getChildBindingStr(result.tokens, favorViewModel),
			// the child is going to be the token before the special location
			childName: result.tokens[specialIndex - 1],
			childEvent: childEventName,
			bindingAttributeName: attributeName,
			parentName: result.special.raw ? ('"' + attributeValue + '"') : attributeValue,
			initializeValues: initializeValues,
		}, bindingRules[dataBindingName]);
		if (attributeValue.trim().charAt(0) === "~") {
			bindingInfo.stickyParentToChild = true;
		}
		return bindingInfo;
	}
	// END: check new binding syntaxes ======

};



// ## makeDataBinding
// Makes a data binding for an attribute `node`.  Returns an object with information
// about the binding, including an `onTeardown` method that undoes the binding.
// If the data binding involves a `viewModel`, an `onCompleteBinding` method is returned on
// the object.  This method must be called after the element has a `viewModel` with the
// `viewModel` to complete the binding.
//
// - `node` - an attribute node or an object with a `name` and `value` property.
// - `el` - the element this binding belongs on.
// - `bindingData` - an object with:
//   - `templateType` - the type of template.
//   - `scope` - the `Scope`,
//   - `getViewModel`  - a function that returns the `viewModel` when called.  This function can be passed around (not called) even if the
//      `viewModel` doesn't exist yet.
//   - `attributeViewModelBindings` - properties already specified as being a viewModel<->attribute (as opposed to viewModel<->scope) binding.
//
// Returns:
// - `undefined` - If this isn't a data binding.
// - `object` - An object with information about the binding.
var makeDataBinding = function(node, el, bindingData) {
	// Get information about the binding.
	var bindingInfo = getBindingInfo(node, bindingData.attributeViewModelBindings,
		bindingData.templateType, el.nodeName.toLowerCase(), bindingData.favorViewModel);
	if (!bindingInfo) {
		return;
	}

	// Get computes for the parent and child binding
	var parentObservable = getObservableFrom[bindingInfo.parent](
		el,
		bindingData.scope,
		bindingInfo.parentName,
		bindingData,
		bindingInfo.parentToChild,
		undefined,
		undefined,
		bindingInfo
	),
	childObservable = getObservableFrom[bindingInfo.child](
		el,
		bindingData.scope,
		bindingInfo.childName,
		bindingData,
		bindingInfo.childToParent,
		bindingInfo.stickyParentToChild && parentObservable,
		bindingInfo.childEvent,
		bindingInfo
	);

	// Check for child:bind="~parent" (it’s not supported because it’s unclear
	// what the “right” behavior should be)
	var childToParent = !!bindingInfo.childToParent;
	var parentToChild = !!bindingInfo.parentToChild;
	//!steal-remove-start
	if (process.env.NODE_ENV !== 'production') {
		if (bindingInfo.stickyParentToChild && childToParent && parentToChild) {
			dev.warn("Two-way binding computes is not supported.");
		}
	}
	//!steal-remove-end

	var bindingOptions = {
		child: childObservable,
		childToParent: childToParent,
		cycles: 0,
		onInitDoNotUpdateChild: bindingData.alreadyUpdatedChild,
		onInitSetUndefinedParentIfChildIsDefined: true,
		parent: parentObservable,
		parentToChild: parentToChild,
		priority: bindingData.nodeList ? bindingData.nodeList.nesting + 1 : undefined,
		queue: "domUI",
		sticky: bindingInfo.syncChildWithParent ? "childSticksToParent" : undefined
	};

	//!steal-remove-start
	if (process.env.NODE_ENV !== 'production') {
		bindingOptions.updateChildName = "update "+bindingInfo.child+"."+bindingInfo.childName+" of <"+el.nodeName.toLowerCase()+">";
		bindingOptions.updateParentName = "update "+bindingInfo.parent+"."+bindingInfo.parentName+" of <"+el.nodeName.toLowerCase()+">";
	}
	//!steal-remove-end

	// Create the binding
	var canBinding = new Bind(bindingOptions);

	// Immediately bind to the parent
	// TODO: it doesn’t appear that there are any tests that cover this behavior
	canBinding.startParent();

	return {
		bindingInfo: bindingInfo,
		canBinding: canBinding,
		parent: parentObservable
	};
};

var cleanVMName = function(name, scope) {
	//!steal-remove-start
	if (process.env.NODE_ENV !== 'production') {
		if (name.indexOf("@") >= 0) {
			var filename = scope.peek('scope.filename');
			var lineNumber = scope.peek('scope.lineNumber');

			dev.warn(
				(filename ? filename + ':' : '') +
				(lineNumber ? lineNumber + ': ' : '') +
				'functions are no longer called by default so @ is unnecessary in \'' + name + '\'.');
		}
	}
	//!steal-remove-end
	return name.replace(/@/g, "");
};

var canStacheBindings = {
	behaviors: behaviors,
	getBindingInfo: getBindingInfo,
	bindings: bindings
};

canStacheBindings[canSymbol.for("can.callbackMap")] = bindings;
viewCallbacks.attrs(canStacheBindings);

module.exports = canStacheBindings;
