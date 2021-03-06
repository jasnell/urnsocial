 var module = module || undefined;
 var define = define || undefined;
(function( global, factory ) {
  // loader logic following jquery's lead... ensures that we load properly into 
  // node as well as normal browser environments...
  if ( typeof module === 'object' && typeof module.exports === 'object' ) {
    module.exports = global.document ?
      factory(global) :
      factory();
  } else {
    factory(global);
  }
}(typeof window !== 'undefined' ? window : this, function(_$) {
  'use strict';
  function to_ary(v) {
    return v !== undefined ?
      (Array.isArray(v) ? v : [v]) : 
      undefined;
  }
  function bound(a,min,max,pad) {
    a = Math.max(min, Math.min(max, a));
    if (pad) a = (a<10?'0':'') + a;
    return a;
  }
  function confidence_handler(t,n,d,z) {
    var base = ['urn:social',t];
    if (d) base.push(to_ary(d).join(';'));
    if (n) base.push(bound(n,0,99,true));
    if (z) base.push(bound(z,1,9));
    return base.join(':');
  }
  var urn_social = {
    everyone : 'urn:social:everyone',
    public : 'urn:social:public',
    private : 'urn:social:private',
    direct : 'urn:social:direct',
    self : 'urn:social:self',
    common : function(dimensions,n) {
      return confidence_handler(
        'common', n,
        dimensions);
    },
    interested: function(n) {
      return confidence_handler(
        'interested', n);
    },
    role: function(roles) {
      return confidence_handler(
        'role',
        undefined,
        roles);
    },
    familial : function(roles, distance) {
      return confidence_handler(
        'familial',
        undefined,
        roles,
        distance);
    }
  };
  ['extended','peer','subordinate','superior'].forEach(
    function(name) {
      for (var n = 1; n <= 9; n++)
        urn_social[ name + n ] = 
          ['urn:social',name,n].join(':');
    });

  Object.freeze(urn_social);
  for (var n in urn_social) {
    try { Object.freeze(urn_social[n]); } catch (t) {}
  }

  if ( typeof define === 'function' && define.amd ) {
    define( 'urn_social', [], function() {
      return urn_social;
    });
  }

  if (_$ !== undefined)
    _$.urn_social = urn_social;

  return urn_social;
}));