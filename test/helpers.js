var globals = require('can-globals');
var domEvents = require('can-util/dom/events/events');
var domMutate = require('can-util/dom/mutate/mutate');
var domData = require('can-util/dom/data/data');
var makeDocument = require('can-vdom/make-document/make-document');
require('can-util/dom/events/inserted/inserted');
var helpers = {
    makeQUnitModule: function(name, doc, enableMO){
        QUnit.module(name, {
        	setup: function() {

        		globals.setKeyValue('document', doc);
        		if(!enableMO){
        			globals.setKeyValue('MutationObserver', null);
        		}

        		if(doc === document) {
        			this.fixture = document.getElementById("qunit-fixture");
        		} else {
        			this.fixture = doc.createElement("qunit-fixture");
        			doc.body.appendChild(this.fixture);
        		}
        	},
        	teardown: function(){
        		if(doc !== document) {
        			doc.body.removeChild(this.fixture);
        		}

        		stop();
        		helpers.afterMutation(function() {

        			globals.deleteKeyValue('document');
        			globals.deleteKeyValue('MutationObserver');

        			var fixture = document.getElementById("qunit-fixture");
        			while (fixture && fixture.hasChildNodes()) {
        				domData.delete.call(fixture.lastChild);
        				fixture.removeChild(fixture.lastChild);
        			}

        			start();
        		});
        	}
        });
    },
    afterMutation: function(cb) {
    	var doc = globals.getKeyValue('document');
    	var div = doc.createElement("div");
    	domEvents.addEventListener.call(div, "inserted", function(){
    		doc.body.removeChild(div);
    		setTimeout(cb, 5);
    	});
        setTimeout(function(){
            domMutate.appendChild.call(doc.body, div);
        },10);

    },
    makeTests: function(name, makeTest) {

        helpers.makeQUnitModule(name+" - dom", document, true);
        makeTest(name+" - dom", document, true, QUnit.test);
        var doc = makeDocument();
        helpers.makeQUnitModule(name+" - vdom", doc, false);
        makeTest(name+" - vdom", doc, false, function(){});
    }
};

module.exports = helpers;
