import QUnit from 'steal-qunit';
import plugin from './can-stache-bindings';

QUnit.module('can-stache-bindings');

QUnit.test('Initialized the plugin', function(){
  QUnit.equal(typeof plugin, 'function');
  QUnit.equal(plugin(), 'This is the can-stache-bindings plugin');
});
