(function (global, factory) {
  if (typeof define === "function" && define.amd) {
    define(['exports'], factory);
  } else if (typeof exports !== "undefined") {
    factory(exports);
  } else {
    var mod = {
      exports: {}
    };
    factory(mod.exports);
    global.development = mod.exports;
  }
})(this, function (exports) {
  'use strict';

  Object.defineProperty(exports, "__esModule", {
    value: true
  });

  var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
    return typeof obj;
  } : function (obj) {
    return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
  };

  var invariant = function invariant(condition, format, a, b, c, d, e, f) {
    if (!condition) {
      var args = [a, b, c, d, e, f];
      var argIndex = 0;
      var error = new Error(format.replace(/%s/g, function () {
        return args[argIndex++];
      }));
      error.name = 'Invariant Violation';
      //    console.log(error.message);
      error.framesToPop = 1; // we don't care about invariant's own frame
      throw error;
    }
  };

  var defaultCommands = {
    $push: function $push(value, nextObject, spec) {
      invariantPushAndUnshift(nextObject, spec, '$push');
      return value.length ? nextObject.concat(value) : nextObject;
    },
    $unshift: function $unshift(value, nextObject, spec) {
      invariantPushAndUnshift(nextObject, spec, '$unshift');
      return value.length ? value.concat(nextObject) : nextObject;
    },
    $splice: function $splice(value, nextObject, spec, originalObject) {
      invariantSplices(nextObject, spec);
      value.forEach(function (args) {
        invariantSplice(args);
        if (nextObject === originalObject && args.length) nextObject = copy(originalObject);
        splice.apply(nextObject, args);
      });
      return nextObject;
    },
    $set: function $set(value, nextObject, spec) {
      invariantSet(spec);
      return value;
    },
    $toggle: function $toggle(targets, nextObject) {
      invariantSpecArray(targets, '$toggle');
      var nextObjectCopy = targets.length ? copy(nextObject) : nextObject;

      targets.forEach(function (target) {
        nextObjectCopy[target] = !nextObject[target];
      });

      return nextObjectCopy;
    },
    $unset: function $unset(value, nextObject, spec, originalObject) {
      invariantSpecArray(value, '$unset');
      value.forEach(function (key) {
        if (Object.hasOwnProperty.call(nextObject, key)) {
          if (nextObject === originalObject) nextObject = copy(originalObject);
          delete nextObject[key];
        }
      });
      return nextObject;
    },
    $add: function $add(value, nextObject, spec, originalObject) {
      invariantMapOrSet(nextObject, '$add');
      invariantSpecArray(value, '$add');
      if (type(nextObject) === 'Map') {
        value.forEach(function (pair) {
          var key = pair[0];
          var value = pair[1];
          if (nextObject === originalObject && nextObject.get(key) !== value) nextObject = copy(originalObject);
          nextObject.set(key, value);
        });
      } else {
        value.forEach(function (value) {
          if (nextObject === originalObject && !nextObject.has(value)) nextObject = copy(originalObject);
          nextObject.add(value);
        });
      }
      return nextObject;
    },
    $remove: function $remove(value, nextObject, spec, originalObject) {
      invariantMapOrSet(nextObject, '$remove');
      invariantSpecArray(value, '$remove');
      value.forEach(function (key) {
        if (nextObject === originalObject && nextObject.has(key)) nextObject = copy(originalObject);
        nextObject.delete(key);
      });
      return nextObject;
    },
    $merge: function $merge(value, nextObject, spec, originalObject) {
      invariantMerge(nextObject, value);
      getAllKeys(value).forEach(function (key) {
        if (value[key] !== nextObject[key]) {
          if (nextObject === originalObject) nextObject = copy(originalObject);
          nextObject[key] = value[key];
        }
      });
      return nextObject;
    },
    $apply: function $apply(value, original) {
      invariantApply(value);
      return value(original);
    }
  };

  var hasOwnProperty = Object.prototype.hasOwnProperty;
  var splice = Array.prototype.splice;
  var toString = Object.prototype.toString;
  var type = function type(obj) {
    return toString.call(obj).slice(8, -1);
  };
  var assign = Object.assign;
  var getAllKeys = function getAllKeys(obj) {
    return Object.keys(obj);
  };

  /* istanbul ignore next */
  var copy = function copy(object) {
    if (Array.isArray(object)) {
      return assign(object.constructor(object.length), object);
    } else if (type(object) === 'Map') {
      return new Map(object);
    } else if (type(object) === 'Set') {
      return new Set(object);
    } else if (object && (typeof object === 'undefined' ? 'undefined' : _typeof(object)) === 'object') {
      var prototype = object.constructor && object.constructor.prototype;
      return assign(Object.create(prototype || null), object);
    } else {
      return object;
    }
  };

  var commands = assign({}, defaultCommands);
  var update = function update(object, spec) {

    if (typeof spec === 'function') {
      return spec(object);
    }

    if (!(Array.isArray(object) && Array.isArray(spec))) {
      invariant(!Array.isArray(spec), 'update(): You provided an invalid spec to update(). The spec may ' + 'not contain an array except as the value of $set, $push, $unshift, ' + '$splice or any custom command allowing an array value.');
    }

    invariant((typeof spec === 'undefined' ? 'undefined' : _typeof(spec)) === 'object' && spec !== null, 'update(): You provided an invalid spec to update(). The spec and ' + 'every included key path must be plain objects containing one of the ' + 'following commands: %s.', Object.keys(commands).join(', '));

    var nextObject = object;
    var index = void 0,
        key = void 0;

    getAllKeys(spec).forEach(function (key) {
      if (hasOwnProperty.call(commands, key)) {
        var objectWasNextObject = object === nextObject;
        nextObject = commands[key](spec[key], nextObject, spec, object);
        if (objectWasNextObject && update.isEquals(nextObject, object)) {
          nextObject = object;
        }
      } else {
        var nextValueForKey = update(object[key], spec[key]);
        if (!update.isEquals(nextValueForKey, nextObject[key]) || typeof nextValueForKey === 'undefined' && !hasOwnProperty.call(object, key)) {
          if (nextObject === object) {
            nextObject = copy(object);
          }
          if (type(nextObject) === 'Map') {
            nextObject.set(key, nextValueForKey);
          } else {
            nextObject[key] = nextValueForKey;
          }
        }
      }
    });

    return nextObject;
  };

  update.isEquals = function (a, b) {
    return a === b;
  };

  update.extend = function (directive, fn) {
    commands[directive] = fn;
  };

  function invariantPushAndUnshift(value, spec, command) {
    invariant(Array.isArray(value), 'update(): expected target of %s to be an array; got %s.', command, value);
    invariantSpecArray(spec[command], command);
  }

  function invariantSpecArray(spec, command) {
    invariant(Array.isArray(spec), 'update(): expected spec of %s to be an array; got %s. ' + 'Did you forget to wrap your parameter in an array?', command, spec);
  }

  function invariantSplices(value, spec) {
    invariant(Array.isArray(value), 'Expected $splice target to be an array; got %s', value);
    invariantSplice(spec['$splice']);
  }

  function invariantSplice(value) {
    invariant(Array.isArray(value), 'update(): expected spec of $splice to be an array of arrays; got %s. ' + 'Did you forget to wrap your parameters in an array?', value);
  }

  function invariantApply(fn) {
    invariant(typeof fn === 'function', 'update(): expected spec of $apply to be a function; got %s.', fn);
  }

  function invariantSet(spec) {
    invariant(Object.keys(spec).length === 1, 'Cannot have more than one key in an object with $set');
  }

  function invariantMerge(target, specValue) {
    invariant(specValue && (typeof specValue === 'undefined' ? 'undefined' : _typeof(specValue)) === 'object', 'update(): $merge expects a spec of type \'object\'; got %s', specValue);
    invariant(target && (typeof target === 'undefined' ? 'undefined' : _typeof(target)) === 'object', 'update(): $merge expects a target of type \'object\'; got %s', target);
  }

  function invariantMapOrSet(target, command) {
    var typeOfTarget = type(target);
    invariant(typeOfTarget === 'Map' || typeOfTarget === 'Set', 'update(): %s expects a target of type Set or Map; got %s', command, typeOfTarget);
  }

  exports.update = update;
});

//# sourceMappingURL=development.js.map