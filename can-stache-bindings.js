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
var expression = require('can-stache/src/expression');
var viewCallbacks = require('can-view-callbacks');
var live = require('can-view-live');
var Scope = require('can-view-scope');
var canViewModel = require('can-view-model');
var canEvent = require('can-event');
var compute = require('can-compute');
var observeReader = require('can-stache-key');
var Observation = require('can-observation');
var observable = require('can-simple-observable');

var assign = require('can-util/js/assign/assign');
var makeArray  = require('can-util/js/make-array/make-array');
var each  = require('can-util/js/each/each');
var string = require('can-util/js/string/string');
var dev = require('can-log/dev/dev');
var types = require('can-types');
var last = require('can-util/js/last/last');

var getMutationObserver = require('can-globals/mutation-observer/mutation-observer');
var domEvents = require('can-util/dom/events/events');
require('can-util/dom/events/removed/removed');
var domData = require('can-util/dom/data/data');
var attr = require('can-util/dom/attr/attr');
var canLog = require('can-log');
var stacheHelperCore = require("can-stache/helpers/core");
var canSymbol = require("can-symbol");
var canReflect = require("can-reflect");
var singleReference = require("can-util/js/single-reference/single-reference");
var encoder = require("can-attribute-encoder");

var addEnterEvent = require('can-event-dom-enter/compat');
addEnterEvent(domEvents);

var addRadioChange = require('can-event-dom-radiochange/compat');
addRadioChange(domEvents);

var noop = function() {};

var onMatchStr = "on:",
	vmMatchStr = "vm:",
	elMatchStr = "el:",
	byMatchStr = ":by:",
	toMatchStr = ":to",
	fromMatchStr = ":from",
	bindMatchStr = ":bind",
	attributesEventStr = "attributes",
	removedStr = "removed",
	viewModelBindingStr = "viewModel",
	attributeBindingStr = "attribute",
	scopeBindingStr = "scope",
	viewModelOrAttributeBindingStr = "viewModelOrAttribute",
	getValueSymbol = "can.getValue",
	setValueSymbol = "can.setValue",
	onValueSymbol = "can.onValue",
	offValueSymbol = "can.offValue";

function setPriority(observable, priority){
	if(observable instanceof Observation) {
	    observable.compute._primaryDepth = priority;
	} else if(observable.computeInstance) {
	    observable.computeInstance.setPrimaryDepth(priority);
	} else if(observable.observation) {
	    observable.observation.compute._primaryDepth = priority;
	}
}

var throwOnlyOneTypeOfBindingError = function(){
	throw new Error("can-stache-bindings - you can not have contextual bindings ( this:from='value' ) and key bindings ( prop:from='value' ) on one element.");
};

// This function checks if there bindings that are trying
// to set a property ON the viewModel _conflicting_ with bindings trying to
// set THE viewModel ITSELF.
// If there is a conflict, an error is thrown.
var checkBindingState = function(bindingState, dataBinding) {
	var isSettingOnViewModel = dataBinding.bindingInfo.parentToChild && dataBinding.bindingInfo.child === viewModelBindingStr;
	if(isSettingOnViewModel) {
		var bindingName = dataBinding.bindingInfo.childName;
		var isSettingViewModel = isSettingOnViewModel && ( bindingName === 'this' || bindingName === '.' );

		if( isSettingViewModel ) {
			if(bindingState.isSettingViewModel || bindingState.isSettingOnViewModel) {
				throwOnlyOneTypeOfBindingError();
			} else {
				return {isSettingViewModel: true, initialViewModelData: undefined};
			}
		} else {
			// just setting on viewModel
			if(bindingState.isSettingViewModel) {
				throwOnlyOneTypeOfBindingError();
			} else {
				return {isSettingOnViewModel: true, initialViewModelData: bindingState.initialViewModelData};
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

			var bindingsSemaphore = {},
				viewModel,
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
			each(makeArray(el.attributes), function(node) {
				var dataBinding = makeDataBinding(node, el, {
					templateType: tagData.templateType,
					scope: tagData.scope,
					semaphore: bindingsSemaphore,
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

				if(dataBinding) {
					bindingsState = checkBindingState(bindingsState, dataBinding);
					hasDataBinding = true;


					// For bindings that change the viewModel,
					if(dataBinding.onCompleteBinding) {
						// save the initial value on the viewModel.
						if(dataBinding.bindingInfo.parentToChild && dataBinding.value !== undefined) {

							if(bindingsState.isSettingViewModel) {
								// the initial data is the context
								bindingsState.initialViewModelData = dataBinding.value;
							} else {
								bindingsState.initialViewModelData[cleanVMName(dataBinding.bindingInfo.childName)] = dataBinding.value;
							}

						}
						// Save what needs to happen after the `viewModel` is created.
						onCompleteBindings.push(dataBinding.onCompleteBinding);
					}
					onTeardowns[node.name] = dataBinding.onTeardown;
				}
			});
			if(staticDataBindingsOnly && !hasDataBinding) {
				return;
			}
			// Create the `viewModel` and call what needs to happen after `viewModel` is created.
			viewModel = makeViewModel(bindingsState.initialViewModelData, hasDataBinding);

			for(var i = 0, len = onCompleteBindings.length; i < len; i++) {
				onCompleteBindings[i]();
			}

			// Listen to attribute changes and re-initialize
			// the bindings.
			if(!bindingsState.isSettingViewModel) {
				domEvents.addEventListener.call(el, attributesEventStr, function (ev) {
					var attrName = ev.attributeName,
						value = el.getAttribute(attrName);

					if( onTeardowns[attrName] ) {
						onTeardowns[attrName]();
					}
					// Parent attribute bindings we always re-setup.
					var parentBindingWasAttribute = bindingInfos[attrName] && bindingInfos[attrName].parent === attributeBindingStr;

					if(value !== null || parentBindingWasAttribute ) {
						var dataBinding = makeDataBinding({name: attrName, value: value}, el, {
							templateType: tagData.templateType,
							scope: tagData.scope,
							semaphore: {},
							getViewModel: function() {
								return viewModel;
							},
							attributeViewModelBindings: attributeViewModelBindings,
							// always update the viewModel accordingly.
							initializeValues: true,
							nodeList: tagData.parentNodeList
						});
						if(dataBinding) {
							// The viewModel is created, so call callback immediately.
							if(dataBinding.onCompleteBinding) {
								dataBinding.onCompleteBinding();
							}
							bindingInfos[attrName] = dataBinding.bindingInfo;
							onTeardowns[attrName] = dataBinding.onTeardown;
						}
					}
				});
			}

			return function() {
				for(var attrName in onTeardowns) {
					onTeardowns[attrName]();
				}
			};
		},
		// ### bindings.behaviors.data
		// This is called when an individual data binding attribute is placed on an element.
		// For example `{^value}="name"`.
		data: function(el, attrData) {
			if(domData.get.call(el, "preventDataBindings")) {
				return;
			}
			var viewModel,
				getViewModel = function() {
					return viewModel || (viewModel = canViewModel(el));
				},
				semaphore = {},
				teardown;

			// If a two-way binding, take extra measure to ensure
			//  that parent and child sync values properly.
			var legacyBindings = bindingsRegExp.exec(attrData.attributeName);
			var twoWay = legacyBindings && legacyBindings[1];

			// Setup binding
			var dataBinding = makeDataBinding({
				name: attrData.attributeName,
				value: el.getAttribute(attrData.attributeName),
				nodeList: attrData.nodeList
			}, el, {
				templateType: attrData.templateType,
				scope: attrData.scope,
				semaphore: semaphore,
				getViewModel: getViewModel,
				syncChildWithParent: twoWay
			});

			//!steal-remove-start
			if(dataBinding.bindingInfo.child === "viewModel" && !domData.get(el, "viewModel")) {
				dev.warn('This element does not have a viewModel. (Attempting to bind `' + dataBinding.bindingInfo.bindingAttributeName + '="' + dataBinding.bindingInfo.parentName + '"`)');
			}
			//!steal-remove-end

			if(dataBinding.onCompleteBinding) {
				dataBinding.onCompleteBinding();
			}

			teardown = dataBinding.onTeardown;
			canEvent.one.call(el, removedStr, function() {
				teardown();
			});

			// Listen for changes
			domEvents.addEventListener.call(el, attributesEventStr, function (ev) {
				var attrName = ev.attributeName,
					value = el.getAttribute(attrName);

				if( attrName === attrData.attributeName ) {
					if( teardown ) {
						teardown();
					}

					if(value !== null  ) {
						var dataBinding = makeDataBinding({name: attrName, value: value}, el, {
							templateType: attrData.templateType,
							scope: attrData.scope,
							semaphore: semaphore,
							getViewModel: getViewModel,
							// always update the viewModel accordingly.
							initializeValues: true,
							nodeList: attrData.nodeList,
							syncChildWithParent: twoWay
						});
						if(dataBinding) {
							// The viewModel is created, so call callback immediately.
							if(dataBinding.onCompleteBinding) {
								dataBinding.onCompleteBinding();
							}
							teardown = dataBinding.onTeardown;
						}
					}
				}
			});
		},
		// ### bindings.behaviors.reference
		// Provides the shorthand `*ref` behavior that exports the `viewModel`.
		// For example `{^value}="name"`.
		reference: function(el, attrData) {
			if(el.getAttribute(attrData.attributeName)) {
				canLog.warn("*reference attributes can only export the view model.");
			}


			var name = string.camelize( attrData.attributeName.substr(1).toLowerCase() );

			//!steal-remove-start
			dev.warn(attrData.attributeName + ' shorthand is deprecated. Use this:to="' + name + '" instead.');
			//!steal-remove-end

			var viewModel = canViewModel(el);
			var refs = attrData.scope.getRefs();
			canReflect.setKeyValue(refs._context, "scope.vars." + name, viewModel);
		},
		// ### bindings.behaviors.event
		// The following section contains code for implementing the can-EVENT attribute.
		// This binds on a wildcard attribute name. Whenever a view is being processed
		// and can-xxx (anything starting with can-), this callback will be run.  Inside, its setting up an event handler
		// that calls a method identified by the value of this attribute.
		event: function(el, data) {

			// Get the `event` name and if we are listening to the element or viewModel.
			// The attribute name is the name of the event.
			var attributeName = encoder.decode( data.attributeName ),
				// the name of the event we are binding
				event,
				// if we are binding on the element or the VM
				bindingContext;

			// check for `on:event:value:to` type things and call data bindings
			if(attributeName.indexOf(toMatchStr+":") !== -1 ||
				attributeName.indexOf(fromMatchStr+":") !== -1 ||
				attributeName.indexOf(bindMatchStr+":") !== -1
				) {
				return this.data(el, data);
			}

			// legacy binding
			if(startsWith.call(attributeName, 'can-')) {
				event = attributeName.substr("can-".length);
				bindingContext = el;
			} else if(startsWith.call(attributeName, onMatchStr)) {
				event = attributeName.substr(onMatchStr.length);
				var viewModel = domData.get.call(el, viewModelBindingStr);

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
					if( byIndex >= 0 ) {
						bindingContext = byParent.get(decodeAttrName(event.substr(byIndex + byMatchStr.length)));
						event = event.substr(0, byIndex);
					}
				}
			} else {
				event = removeBrackets(attributeName, '(', ')');

				//!steal-dev-start
				// Warn about using old style (paren-delimited) event binding syntax.  We've moved to using on:
				dev.warn(
					"can-stache-bindings: the event binding format (" +
					event +
					") is deprecated. Use on:" +
					string.camelize(
						event[0] === "$" ?
						event.slice(1) :
						event.split(" ").reverse().filter(function(s) { return s; }).join(":by:")
						) +
					" instead"
				);
				//!steal-dev-end

				if(event.charAt(0) === "$") {
					event = event.substr(1);
					bindingContext = el;
				} else {
					if(event.indexOf(" ") >= 0) {
						var eventSplit = event.split(" ");
						bindingContext = data.scope.get(decodeAttrName(eventSplit[0]));
						event = eventSplit[1];
					}else{
						bindingContext = canViewModel(el);
					}
				}
			}
			// The old way of binding is can-X
			event = decodeAttrName(event);


			// This is the method that the event will initially trigger. It will look up the method by the string name
			// passed in the attribute and call it.
			var handler = function (ev) {
				var attrVal = el.getAttribute( encoder.encode(attributeName) );
				if (!attrVal) { return; }

				var viewModel = canViewModel(el);

				// expression.parse will read the attribute
				// value and parse it identically to how mustache helpers
				// get parsed.
				var expr = expression.parse(removeBrackets(attrVal),{
					lookupRule: function() {
						return expression.Lookup;
					}, methodRule: "call"});

				if(!(expr instanceof expression.Call) && !(expr instanceof expression.Helper)) {

					var defaultArgs = [data.scope._context, el].concat(makeArray(arguments)).map(function(data) {
						return new expression.Arg(new expression.Literal(data));
					});
					expr = new expression.Call(expr, defaultArgs, {} );
				}

				var templateContext = data.scope.getTemplateContext()._context;

				//!steal-remove-start
				function makeWarning(prefix, property, value){
					return function(){
						var filename = canReflect.getKeyValue(templateContext, 'filename');
						var lineNumber = canReflect.getKeyValue(templateContext, 'lineNumber');
						dev.warn(
							(filename ? filename + ':' : '') +
							(lineNumber ? lineNumber + ': ' : '') +
							prefix + property + " is deprecated. Use scope." + property + " instead."
						);
						return value;
					};
				}
				//!steal-remove-end

				canReflect.setKeyValue(templateContext, 'scope.element', el);
				canReflect.setKeyValue(templateContext, 'scope.event', ev);
				canReflect.setKeyValue(templateContext, 'scope.viewModel', viewModel);
				canReflect.setKeyValue(templateContext, 'scope.arguments', arguments);

				var specialValues = {
					"@element": el,
					"@event": ev,
					"@viewModel": viewModel,
					"@scope": data.scope,
					"@context": data.scope._context,

					"%element": this,
					"$element": types.wrapElement(el),
					"%event": ev,
					"%viewModel": viewModel,
					"%scope": data.scope,
					"%context": data.scope._context,
					"%arguments": arguments
				};

				//!steal-remove-start
				Object.defineProperties(specialValues, {
					"%element": {
						get: makeWarning("%", "element", this)
					},
					"%event": {
						get: makeWarning("%", "event", ev)
					},
					"%viewModel": {
						get: makeWarning("%", "viewModel", viewModel)
					},
					"%arguments": {
						get: makeWarning("%", "arguments", arguments)
					},

					"@element": {
						get: makeWarning("@", "element", this)
					},
					"@event": {
						get: makeWarning("@", "event", ev)
					},
					"@viewModel": {
						get: makeWarning("@", "viewModel", viewModel)
					}
				});
				//!steal-remove-end

				// make a scope with these things just under
				var localScope = data.scope.add(specialValues, {
					notContext: true
				});

				// We grab the first item and treat it as a method that
				// we'll call.
				var scopeData = localScope.read(expr.methodExpr.key, {
					isArgument: true
				}), args, stacheHelper, stacheHelperResult;

				if (!scopeData.value) {
					// nothing found yet, look for a stache helper
					var name = observeReader.reads(expr.methodExpr.key).map(function(part) {
						return part.key;
					}).join(".");

					stacheHelper = stacheHelperCore.getHelper(name);
					if(stacheHelper) {
						args = expr.args(localScope, null)();
						stacheHelperResult = stacheHelper.fn.apply(localScope.peek("."), args);
						if(typeof stacheHelperResult === "function") {
							stacheHelperResult(el);
						}
						return stacheHelperResult;
					}

					//!steal-remove-start
					dev.warn("can-stache-bindings: " + attributeName + " couldn't find method named " + expr.methodExpr.key, {
						element: el,
						scope: data.scope
					});
					//!steal-remove-end

					return null;
				}

				args = expr.args(localScope, null)();
				return scopeData.value.apply(scopeData.parent, args);
			};

			// Unbind the event when the attribute is removed from the DOM
			var attributesHandler = function(ev) {
				var isEventAttribute = ev.attributeName === attributeName;
				var isRemoved = !this.getAttribute(attributeName);
				var isEventAttributeRemoved = isEventAttribute && isRemoved;
				if (isEventAttributeRemoved) {
					unbindEvent();
				}
			};
			// Unbind the event when the target is removed from the DOM
			var removedHandler = function(ev) {
				unbindEvent();
			};
			var unbindEvent = function() {
				canEvent.off.call(bindingContext, event, handler);
				canEvent.off.call(el, attributesEventStr, attributesHandler);
				canEvent.off.call(el, removedStr, removedHandler);
			};

			// Bind the handler defined above to the element we're currently processing and the event name provided in this
			// attribute name (can-click="foo")
			canEvent.on.call(bindingContext, event, handler);
			canEvent.on.call(el, attributesEventStr, attributesHandler);
			canEvent.on.call(el, removedStr, removedHandler);
		},
		// ### bindings.behaviors.value
		// Behavior for the deprecated can-value
		value: function(el, data) {
			var propName = "$value",
				attrValue = removeBrackets(el.getAttribute("can-value")).trim(),
				nodeName = el.nodeName.toLowerCase(),
				elType = nodeName === "input" && (el.type || el.getAttribute("type")),
				getterSetter;

			if (nodeName === "input" && (elType === "checkbox" || elType === "radio")) {
				var property = getObservableFrom.scope(el, data.scope, attrValue, {}, true);
				if (el.type === "checkbox") {

					var trueValue = attr.has(el, "can-true-value") ? el.getAttribute("can-true-value") : true,
						falseValue = attr.has(el, "can-false-value") ? el.getAttribute("can-false-value") : false;

					getterSetter = compute(function (newValue) {
						// jshint eqeqeq: false
						var isSet = arguments.length !== 0;
						if (property && property[canSymbol.for(getValueSymbol)]) {
							if (isSet) {
								canReflect.setValue(property, newValue ? trueValue : falseValue);
							} else {
								return canReflect.getValue(property) == trueValue;
							}
						} else {
							if (isSet) {
								// TODO: https://github.com/canjs/can-stache-bindings/issues/180
							} else {
								return property == trueValue;
							}
						}
					});
			}	else if(elType === "radio") {
					// radio is two-way bound to if the property value
					// equals the element value
					getterSetter = compute(function (newValue) {
						// jshint eqeqeq: false
						var isSet = arguments.length !== 0 && newValue;
					if (property && property[canSymbol.for(getValueSymbol)]) {
							if (isSet) {
							canReflect.setValue(property, el.value);
							} else {
							return canReflect.getValue(property) == el.value;
							}
						} else {
							if (isSet) {
								// TODO: https://github.com/canjs/can-stache-bindings/issues/180
							} else {
								return property == el.value;
							}
						}
					});
				}
				propName = "$checked";
				attrValue = "getterSetter";
				data.scope = new Scope({
					getterSetter: getterSetter
				});
			}
			// For contenteditable elements, we instantiate a Content control.
			else if (isContentEditable(el)) {
				propName = "$innerHTML";
			}

			var dataBinding = makeDataBinding({
				name: "{(" + propName + ")}",
				value: attrValue
			}, el, {
				templateType: data.templateType,
				scope: data.scope,
				semaphore: {},
				initializeValues: true,
				legacyBindings: true
			});

			canEvent.one.call(el, removedStr, function() {
				dataBinding.onTeardown();
			});
		}
};


// ## Attribute Syntaxes
// The following sets up the bindings functions to be called
// when called in a template.

//!steal-remove-start
function syntaxWarning(el, attrData) {
	dev.warn('can-stache-bindings: mismatched binding syntax - ' + encoder.decode(attrData.attributeName));
}
viewCallbacks.attr(/^(:lp:).+(:rb:)$/, syntaxWarning);
viewCallbacks.attr(/^(:lb:).+(:rp:)$/, syntaxWarning);
viewCallbacks.attr(/^(:lp:)(:lb:).+(:rb:)(:rp:)$/, syntaxWarning);
//!steal-remove-end

// `{}="bar"` data bindings.
viewCallbacks.attr(/^(:lb:)[(:c:)\w-]+(:rb:)$/, behaviors.data);
// value:to="bar" data bindings
// these are separate so that they only capture at the end
// to avoid (toggle)="bar" which is encoded as :lp:toggle:rp:="bar"
viewCallbacks.attr(/[\w\.:]+:to$/, behaviors.data);
viewCallbacks.attr(/[\w\.:]+:from$/, behaviors.data);
viewCallbacks.attr(/[\w\.:]+:bind$/, behaviors.data);
// value:to:on:input="bar" data bindings
viewCallbacks.attr(/[\w\.:]+:to:on:[\w\.:]+/, behaviors.data);
viewCallbacks.attr(/[\w\.:]+:from:on:[\w\.:]+/, behaviors.data);
viewCallbacks.attr(/[\w\.:]+:bind:on:[\w\.:]+/, behaviors.data);

// `*ref-export` shorthand.
viewCallbacks.attr(/\*[\w\.\-_]+/, behaviors.reference);

// `(EVENT)` event bindings.
viewCallbacks.attr(/on:[\w\.:]+/, behaviors.event);
viewCallbacks.attr(/^(:lp:)[(:d:)?\w\.\\]+(:rp:)$/, behaviors.event);

// Legacy bindings.
viewCallbacks.attr(/can-[\w\.]+/, behaviors.event);
viewCallbacks.attr("can-value", behaviors.value);

// ## getObservableFrom
// An object of helper functions that make a getter/setter observable
// on different types of objects.
var getObservableFrom = {
	// ### getObservableFrom.viewModelOrAttribute
	viewModelOrAttribute: function(el, scope, vmNameOrProp, bindingData, mustBeSettable, stickyCompute, event) {
		var viewModel = domData.get.call(el, viewModelBindingStr);

		// if we have a viewModel, use it; otherwise, setup attribute binding
		if (viewModel) {
			return this.viewModel.apply(this, arguments);
		} else {
			return this.attribute.apply(this, arguments);
		}
	},
	// ### getObservableFrom.scope
	// Returns a compute from the scope.  This handles expressions like `someMethod(.,1)`.
	scope: function(el, scope, scopeProp, bindingData, mustBeSettable, stickyCompute) {
		if(!scopeProp) {
			return observable();
		} else {
			if(mustBeSettable) {
				var parentExpression = expression.parse(scopeProp,{baseMethodType: "Call"});
				return parentExpression.value(scope, new Scope.Options({}));
			} else {
				var observation = new Observation(function() {});

				observation[canSymbol.for(setValueSymbol)] = function(newVal) {
					scope.set(cleanVMName(scopeProp), newVal);
				};

				return observation;
			}
		}
	},
	// ### getObservableFrom.viewModel
	// Returns a compute that's two-way bound to the `viewModel` returned by
	// `options.getViewModel()`.
	viewModel: function(el, scope, vmName, bindingData, mustBeSettable, stickyCompute) {
		var setName = cleanVMName(vmName);
		var isBoundToContext = vmName === "." || vmName === "this";
		var keysToRead = isBoundToContext ? [] : observeReader.reads(vmName);

		var observation = new Observation(function() {
			var viewModel = bindingData.getViewModel();
			return observeReader.read(viewModel, keysToRead, {}).value;
		});

		observation[canSymbol.for(setValueSymbol)] = function(newVal) {
			var viewModel = bindingData.getViewModel();

			if(arguments.length) { // should this check if mustBeSettable is true ???
				if(stickyCompute) {
					// TODO: Review what this is used for.
					var oldValue = canReflect.getKeyValue(viewModel, setName);
					if (canReflect.isObservableLike(oldValue)) {
						canReflect.setValue(oldValue, newVal);
					} else {
						canReflect.setKeyValue(viewModel, setName, observable(canReflect.getValue(stickyCompute)));
					}
				} else {
					if(isBoundToContext) {
						canReflect.setValue(viewModel, newVal);
					} else {
						canReflect.setKeyValue(viewModel, setName, newVal);
					}

				}
			}
		};

		return observation;
	},
	// ### getObservableFrom.attribute
	// Returns a compute that is two-way bound to an attribute or property on the element.
	attribute: function(el, scope, prop, bindingData, mustBeSettable, stickyCompute, event) {
		// Determine the event or events we need to listen to
		// when this value changes.
		if(!event) {
			event = "change";
			var isRadioInput = el.nodeName === 'INPUT' && el.type === 'radio';
			var isValidProp = prop === 'checked' && !bindingData.legacyBindings;
			if (isRadioInput && isValidProp) {
				event = 'radiochange';
			}

			var isSpecialProp = attr.special[prop] && attr.special[prop].addEventListener;
			if (isSpecialProp) {
				event = prop;
			}
		}

		var hasChildren = el.nodeName.toLowerCase() === "select",
			isMultiselectValue = prop === "value" && hasChildren && el.multiple,
			// Sets the element property or attribute.
			set = function(newVal) {
				if(bindingData.legacyBindings && hasChildren &&
					("selectedIndex" in el) && prop === "value") {
					attr.setAttrOrProp(el, prop, newVal == null ? "" : newVal);
				} else {
					attr.setAttrOrProp(el, prop, newVal);
				}

				return newVal;
			},
			get = function() {
				return attr.get(el, prop);
			};

		if(isMultiselectValue) {
			prop = "values";
		}

		var observation = new Observation(get);

		observation[canSymbol.for(setValueSymbol)] = set;
		observation[canSymbol.for(getValueSymbol)] = get;

		observation[canSymbol.for(onValueSymbol)] = function(updater) {
			var translationHandler = function() {
				updater(get());
			};
			singleReference.set(updater, this, translationHandler);

			if (event === "radiochange") {
				canEvent.on.call(el, "change", translationHandler);
			}

			canEvent.on.call(el, event, translationHandler);
		};

		observation[canSymbol.for(offValueSymbol)] = function(updater) {
			var translationHandler = singleReference.getAndDelete(updater, this);

			if (event === "radiochange") {
				canEvent.off.call(el, "change", translationHandler);
			}

			canEvent.off.call(el, event, translationHandler);
		};

		return observation;
	}
};

// ## bind
// An object with helpers that perform bindings in a certain direction.
// These use the semaphore to prevent cycles.
var bind = {
	// ## bind.childToParent
	// Listens to the child and updates the parent when it changes.
	// - `syncChild` - Makes sure the child is equal to the parent after the parent is set.
	childToParent: function(el, parentObservable, childObservable, bindingsSemaphore, attrName, syncChild) {
		// Updates the parent if
		var updateParent = function(newVal) {
			if (!bindingsSemaphore[attrName]) {
				if (parentObservable && parentObservable[canSymbol.for(getValueSymbol)]) {
					if (canReflect.getValue(parentObservable) !== newVal) {
						canReflect.setValue(parentObservable, newVal);
					}

					if( syncChild ) {
						// If, after setting the parent, it's value is not the same as the child,
						// update the child with the value of the parent.
						// This is used by `can-value`.
						if(canReflect.getValue(parentObservable) !== canReflect.getValue(childObservable)) {
							bindingsSemaphore[attrName] = (bindingsSemaphore[attrName] || 0) + 1;
							canReflect.setValue(childObservable, canReflect.getValue(parentObservable));

							Observation.afterUpdateAndNotify(function() {
								--bindingsSemaphore[attrName];
							});
						}
					}
				}
				// The parentObservable can sometimes be just an observable if the observable
				// is on a plain JS object. This updates the observable to match whatever the
				// new value is.
				else if(canReflect.isMapLike(parentObservable)) {
					// !steal-dev-start
					var attrValue = el.getAttribute(attrName);
					dev.warn("can-stache-bindings: Merging " + attrName + " into " + attrValue + " because its parent is non-observable");
					// !steal-dev-end
					canReflect.eachKey(parentObservable, function(prop) {
						canReflect.deleteKeyValue(parentObservable, prop);
					});
					canReflect.setValue(
						parentObservable,
						(newVal && newVal.serialize) ? newVal.serialize() : newVal,
						true
					);
				}
			}
		};

		if(childObservable && childObservable[canSymbol.for(getValueSymbol)]) {
			canReflect.onValue(childObservable, updateParent);
		}

		return updateParent;
	},
	// parent -> child binding
	parentToChild: function(el, parentObservable, childUpdate, bindingsSemaphore, attrName) {
		// setup listening on parent and forwarding to viewModel
		var updateChild = function(newValue) {
			// Save the viewModel property name so it is not updated multiple times.
			// We listen for when the batch has ended, and all observation updates have ended.
			bindingsSemaphore[attrName] = (bindingsSemaphore[attrName] || 0) + 1;
			canReflect.setValue(childUpdate, newValue);

			// only after computes have been updated, reduce the update counter
			Observation.afterUpdateAndNotify(function() {
				--bindingsSemaphore[attrName];
			});
		};

		if(parentObservable && parentObservable[canSymbol.for(getValueSymbol)]) {
			canReflect.onValue(parentObservable, updateChild);
		}

		return updateChild;
	}
};
var startsWith = String.prototype.startsWith || function(text){
	return this.indexOf(text) === 0;
};

// Gets an event name in the after part.
function getEventName(result) {
	if(result.special.on !== undefined) {
		return result.tokens[result.special.on+1];
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
	}
};
var bindingNames = [];
var special = {
	vm: true,
	on: true
};
each(bindingRules, function(value, key){
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
	splitByColon.forEach(function(token){
		if(special[token]) {
			result.special[token] = result.tokens.push(token) - 1;
		} else {
			result.tokens.push(token);
		}
	});

	return result;
}

// Regular expressions for getBindingInfo
var bindingsRegExp = /\{(\()?(\^)?([^\}\)]+)\)?\}/,
		ignoreAttributesRegExp = /^(data-view-id|class|name|id|\[[\w\.-]+\]|#[\w\.-])$/i,
		DOUBLE_CURLY_BRACE_REGEX = /\{\{/g,
		encodedSpacesRegExp = /\\s/g,
		encodedForwardSlashRegExp = /\\f/g;

// ## getChildBindingStr
var getChildBindingStr = function(tokens, favorViewModel) {
	if (tokens.indexOf('vm') >= 0) {
		return viewModelBindingStr;
	} else if (tokens.indexOf('el') >= 0) {
		return attributeBindingStr;
	} else {
		return favorViewModel ?  viewModelBindingStr: viewModelOrAttributeBindingStr;
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
			attributeName = encoder.decode( node.name ),
			attributeValue = node.value || "",
			childName;

		// START: check new binding syntaxes ======
		var result = tokenize(attributeName),
			dataBindingName,
			specialIndex;



		// check if there's a match of a binding name with at least a value before it
		bindingNames.forEach(function(name){
			if(result.special[name] !== undefined && result.special[name] > 0) {
				dataBindingName = name;
				specialIndex = result.special[name];
				return false;
			}
		});

		if(dataBindingName) {
			var childEventName = getEventName(result);
			var initializeValues = childEventName ? false : true;
			return assign({
				parent: scopeBindingStr,
				child: getChildBindingStr(result.tokens, favorViewModel),
				// the child is going to be the token before the special location
				childName: result.tokens[specialIndex-1],
				childEvent: childEventName,
				bindingAttributeName: attributeName,
				parentName: attributeValue,
				initializeValues: initializeValues
			}, bindingRules[dataBindingName]);
		}
		// END: check new binding syntaxes ======


		// Does this match the new binding syntax?
		var matches = attributeName.match(bindingsRegExp);
		if(!matches) {
			var ignoreAttribute = ignoreAttributesRegExp.test(attributeName);
			var vmName = string.camelize(attributeName);

			//!steal-remove-start
			// user tried to pass something like id="{foo}", so give them a good warning
			// Something like id="{{foo}}" is ok, though. (not a binding)
			if(ignoreAttribute && node.value.replace(DOUBLE_CURLY_BRACE_REGEX, "").indexOf("{") > -1) {
				dev.warn("can-component: looks like you're trying to pass "+attributeName+" as an attribute into a component, "+
				"but it is not a supported attribute");
			}
			//!steal-remove-end

			// if this is handled by another binding or a attribute like `id`.
			if ( ignoreAttribute || viewCallbacks.attr( encoder.encode(attributeName) ) ) {
				return;
			}
			var syntaxRight = attributeValue[0] === "{" && last(attributeValue) === "}";
			var isAttributeToChild = templateType === "legacy" ? attributeViewModelBindings[vmName] : !syntaxRight;
			var scopeName = syntaxRight ? attributeValue.substr(1, attributeValue.length - 2 ) : attributeValue;
			if(isAttributeToChild) {
				return {
					bindingAttributeName: attributeName,
					parent: attributeBindingStr,
					parentName: attributeName,
					child: viewModelBindingStr,
					childName: vmName,
					parentToChild: true,
					childToParent: true,
					syncChildWithParent: true
				};
			} else {
				return {
					bindingAttributeName: attributeName,
					parent: scopeBindingStr,
					parentName: scopeName,
					child: viewModelBindingStr,
					childName: vmName,
					parentToChild: true,
					childToParent: true,
					syncChildWithParent: true
				};
			}
		}

		var twoWay = !!matches[1],
			childToParent = twoWay || !!matches[2],
			parentToChild = twoWay || !childToParent;

		childName = matches[3];
		//!steal-dev-start
		// Warn about using old style (brace-delimited) binding syntax.  We've moved to using
		// :bind, :from, and :to instead.
		var newLookup = {
			"^": ":to",
			"(": ":bind"
		};
		dev.warn(
			"can-stache-bindings: the data binding format " +
			attributeName +
			" is deprecated. Use " +
			string.camelize(matches[3][0] === "$" ? matches[3].slice(1) : matches[3]) +
			(newLookup[attributeName.charAt(1)] || ":from") +
			" instead"
		);
		//!steal-dev-end
		var isDOM = childName.charAt(0) === "$";
		if(isDOM) {
			bindingInfo = {
				parent: scopeBindingStr,
				child: attributeBindingStr,
				childToParent: childToParent,
				parentToChild: parentToChild,
				bindingAttributeName: attributeName,
				childName: childName.substr(1),
				parentName: attributeValue,
				initializeValues: true,
				syncChildWithParent: twoWay
			};
			if(tagName === "select") {
				bindingInfo.stickyParentToChild = true;
			}
			return bindingInfo;
		} else {
			bindingInfo = {
				parent: scopeBindingStr,
				child: viewModelBindingStr,
				childToParent: childToParent,
				parentToChild: parentToChild,
				bindingAttributeName: attributeName,
				childName: decodeAttrName(string.camelize(childName)),
				parentName: attributeValue,
				initializeValues: true,
				syncChildWithParent: twoWay
			};
			if(attributeValue.trim().charAt(0) === "~") {
				bindingInfo.stickyParentToChild = true;
			}
			return bindingInfo;
		}
};
var decodeAttrName = function(name){
	return name
		.replace(encodedSpacesRegExp, " ")
		.replace(encodedForwardSlashRegExp, "/");
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
//   - `semaphore` - an object that keeps track of changes in different properties to prevent cycles,
//   - `getViewModel`  - a function that returns the `viewModel` when called.  This function can be passed around (not called) even if the
//      `viewModel` doesn't exist yet.
//   - `attributeViewModelBindings` - properties already specified as being a viewModel<->attribute (as opposed to viewModel<->scope) binding.
//
// Returns:
// - `undefined` - If this isn't a data binding.
// - `object` - An object with information about the binding.
var makeDataBinding = function(node, el, bindingData) {
	// Get information about the binding.
	var bindingInfo = getBindingInfo(node, bindingData.attributeViewModelBindings, bindingData.templateType, el.nodeName.toLowerCase(), bindingData.favorViewModel);
	if(!bindingInfo) {
		return;
	}
	// assign some bindingData props to the bindingInfo
	bindingInfo.alreadyUpdatedChild = bindingData.alreadyUpdatedChild;
	if( bindingData.initializeValues) {
		bindingInfo.initializeValues = true;
	}

	// Get computes for the parent and child binding
	var parentObservable = getObservableFrom[bindingInfo.parent](
		el,
		bindingData.scope,
		bindingInfo.parentName,
		bindingData,
		bindingInfo.parentToChild
	),
	childObservable = getObservableFrom[bindingInfo.child](
		el,
		bindingData.scope,
		bindingInfo.childName,
		bindingData,
		bindingInfo.childToParent,
		bindingInfo.stickyParentToChild && parentObservable,
		bindingInfo.childEvent
	),
	// these are the functions bound to one compute that update the other.
	updateParent,
	updateChild;

	if(bindingData.nodeList) {
		if(parentObservable) {
			setPriority(parentObservable, bindingData.nodeList.nesting+1);
		}

		if(childObservable) {
			setPriority(childObservable, bindingData.nodeList.nesting+1);
		}
	}

	// Only bind to the parent if it will update the child.
	if(bindingInfo.parentToChild) {
		updateChild = bind.parentToChild(el, parentObservable, childObservable, bindingData.semaphore, bindingInfo.bindingAttributeName);
	}

	// This completes the binding.  We can't call it right away because
	// the `viewModel` might not have been created yet.
	var completeBinding = function() {
		if(bindingInfo.childToParent) {
			// setup listening on parent and forwarding to viewModel
			updateParent = bind.childToParent(el, parentObservable, childObservable, bindingData.semaphore, bindingInfo.bindingAttributeName,
				bindingInfo.syncChildWithParent);
		}
		// the child needs to be bound even if
		else if(bindingInfo.stickyParentToChild && childObservable[canSymbol.for(onValueSymbol)])  {
			canReflect.onValue(childObservable, noop);
		}

		if(bindingInfo.initializeValues) {
			initializeValues(bindingInfo, childObservable, parentObservable, updateChild, updateParent);
		}
	};

	// This tears down the binding.
	var onTeardown = function() {
		unbindUpdate(parentObservable, updateChild);
		unbindUpdate(childObservable, updateParent);
		unbindUpdate(childObservable, noop);
	};

	// If this binding depends on the viewModel, which might not have been created,
	// return the function to complete the binding as `onCompleteBinding`.
	if(bindingInfo.child === viewModelBindingStr) {
		return {
			value: bindingInfo.stickyParentToChild ? observable(getValue(parentObservable)) : getValue(parentObservable),
			onCompleteBinding: completeBinding,
			bindingInfo: bindingInfo,
			onTeardown: onTeardown
		};
	} else {
		completeBinding();
		return {
			bindingInfo: bindingInfo,
			onTeardown: onTeardown
		};
	}
};

// ## initializeValues
// Updates the parent or child value depending on the direction of the binding
// or if the child or parent is `undefined`.
var initializeValues = function(bindingInfo, childObservable, parentObservable, updateChild, updateParent) {
	var doUpdateParent = false;

	if(bindingInfo.parentToChild && !bindingInfo.childToParent) {
		// updateChild
	}
	else if(!bindingInfo.parentToChild && bindingInfo.childToParent) {
		doUpdateParent = true;
	}
	// Two way
	// Update child or parent depending on who has a value.
	// If both have a value, update the child.
	else if(getValue(childObservable) === undefined) {
		// updateChild
	} else if(getValue(parentObservable) === undefined) {
		doUpdateParent = true;
	}

	if(doUpdateParent) {
		updateParent( getValue(childObservable) );
	} else {
		if(!bindingInfo.alreadyUpdatedChild) {
			updateChild( getValue(parentObservable) );
		}
	}
};

// For "sticky" select values, we need to know when `<option>`s are
// added or removed to a `<select>`.  If we don't have
// MutationObserver, we need to setup can.view.live to
// callback when this happens.
if( !getMutationObserver() ) {
		var updateSelectValue = function(el) {
			var bindingCallback = domData.get.call(el, "canBindingCallback");
			if(bindingCallback) {
				bindingCallback.onMutation(el);
			}
		};
		live.registerChildMutationCallback("select",updateSelectValue);
		live.registerChildMutationCallback("optgroup",function(el) {
			updateSelectValue(el.parentNode);
		});
}


// ## isContentEditable
// Determines if an element is contenteditable.
// An element is contenteditable if it contains the `contenteditable`
// attribute set to either an empty string or "true".
// By default an element is also contenteditable if its immediate parent
// has a truthy version of the attribute, unless the element is explicitly
// set to "false".
var isContentEditable = (function() {
		// A contenteditable element has a value of an empty string or "true"
		var values = {
			"": true,
			"true": true,
			"false": false
		};

		// Tests if an element has the appropriate contenteditable attribute
		var editable = function(el) {
			// DocumentFragments do not have a getAttribute
			if(!el || !el.getAttribute) {
				return;
			}

			var attr = el.getAttribute("contenteditable");
			return values[attr];
		};

		return function (el) {
			// First check if the element is explicitly true or false
			var val = editable(el);
			if(typeof val === "boolean") {
				return val;
			} else {
				// Otherwise, check the parent
				return !!editable(el.parentNode);
			}
		};
})(),
removeBrackets = function(value, open, close) {
	open = open || "{";
	close = close || "}";

	if(value[0] === open && value[value.length-1] === close) {
		return value.substr(1, value.length - 2);
	}
	return value;
},
getValue = function(value) {
	return value && value[canSymbol.for(getValueSymbol)] ? canReflect.getValue(value) : value;
},
unbindUpdate = function(observable, updater) {
	if(observable && observable[canSymbol.for(getValueSymbol)] && typeof updater === "function") {
		canReflect.offValue(observable, updater);
	}
},
cleanVMName = function(name) {
	return name.replace(/@/g, "");
};

module.exports = {
	behaviors: behaviors,
	getBindingInfo: getBindingInfo
};
