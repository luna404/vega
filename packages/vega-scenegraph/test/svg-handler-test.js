var fs = require('fs');
var vega = require('../');
var Renderer = vega.SVGRenderer;
var Handler = vega.SVGHandler;

var res = __dirname + '/resources/';

var marks = JSON.parse(load('marks.json'));
for (var name in marks) { vega.sceneFromJSON(marks[name]); }

var events = [
  'keydown',
  'keypress',
  'keyup',
  'mousedown',
  'mouseup',
  'mousemove',
  'mouseout',
  'mouseover',
  'dragover',
  'dragenter',
  'dragleave',
  'click',
  'dblclick',
  'wheel',
  'mousewheel',
  'touchstart',
  'touchmove',
  'touchend'
];

function load(file) {
  return fs.readFileSync(res + file, 'utf8');
}

function loadScene(file) {
  return vega.sceneFromJSON(load(file));
}

function render(scene, w, h) {
  global.document = document;
  var r = new Renderer()
    .initialize(document.body, w, h)
    .render(scene);
  delete global.document;
  return r.element();
}

function event(name, x, y) {
  var evt = document.createEvent('MouseEvents');
  evt.initEvent(name, false, true);
  evt.clientX = x || 0;
  evt.clientY = y || 0;
  return evt;
}

test('SVGHandler should add/remove event callbacks', function() {
  var array = function(_) { return _ || []; },
      object = function(_) { return _ || {}; },
      handler = new Handler(),
      h = handler._handlers,
      f = function() {},
      atype = 'click',
      btype = 'click.foo',
      ctype = 'mouseover';

  // add event callbacks
  handler.on(atype, f);
  handler.on(btype, f);
  handler.on(ctype, f);

  expect(Object.keys(h).length).toBe(2);
  expect(array(h[atype]).length).toBe(2);
  expect(array(h[ctype]).length).toBe(1);

  expect(object(h[atype][0]).type).toBe(atype);
  expect(object(h[atype][1]).type).toBe(btype);
  expect(object(h[ctype][0]).type).toBe(ctype);

  expect(object(h[atype][0]).handler).toBe(f);
  expect(object(h[atype][1]).handler).toBe(f);
  expect(object(h[ctype][0]).handler).toBe(f);

  // remove event callback by type
  handler.off(atype);

  expect(Object.keys(h).length).toBe(2);
  expect(array(h[atype]).length).toBe(1);
  expect(array(h[ctype]).length).toBe(1);

  expect(object(h[atype][0]).type).toBe(btype);
  expect(object(h[ctype][0]).type).toBe(ctype);

  expect(object(h[atype][0]).handler).toBe(f);
  expect(object(h[ctype][0]).handler).toBe(f);

  // remove all event callbacks
  handler.off(btype, f);
  handler.off(ctype, f);

  expect(array(h[atype]).length).toBe(0);
  expect(array(h[ctype]).length).toBe(0);
});

test('SVGHandler should handle input events', function() {
  var scene = loadScene('scenegraph-rect.json');
  var handler = new Handler()
    .initialize(render(scene, 400, 200))
    .scene(scene);

  expect(handler.scene()).toBe(scene);

  var svg = handler.canvas();
  var count = 0;
  var increment = function() { count++; };

  events.forEach(function(name) {
    handler.on(name, increment);
  });
  expect(handler.handlers().length).toBe(events.length);

  events.forEach(function(name) {
    svg.dispatchEvent(event(name));
  });

  svg.dispatchEvent(event('mousemove', 0, 0));
  svg.dispatchEvent(event('mousemove', 50, 150));
  svg.dispatchEvent(event('mousedown', 50, 150));
  svg.dispatchEvent(event('mouseup', 50, 150));
  svg.dispatchEvent(event('click', 50, 150));
  svg.dispatchEvent(event('mousemove', 50, 151));
  svg.dispatchEvent(event('mousemove', 50, 1));
  svg.dispatchEvent(event('mouseout', 1, 1));
  svg.dispatchEvent(event('dragover', 50, 151));
  svg.dispatchEvent(event('dragover', 50, 1));
  svg.dispatchEvent(event('dragleave', 1, 1));

  // 11 events above + no sub-events from JSDOM
  expect(count).toBe(events.length + 11);

  handler.off('mousemove', {});
  expect(handler.handlers().length).toBe(events.length);

  handler.off('nonevent');
  expect(handler.handlers().length).toBe(events.length);

  events.forEach(function(name) {
    handler.off(name, increment);
  });

  expect(handler.handlers().length).toBe(0);
});
