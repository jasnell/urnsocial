/************************************************************
 * Activity Streams 2.0 JavaScript Reference Implementation *
 * Copyright (c) 2014 International Business Machines       *
 * Author: James M Snell (jasnell)                          *
 ************************************************************/
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

  var navigator = typeof navigator !== 'undefined' ? navigator : {};

  function invalidType() {
    return new Error('Invalid Type');
  }
  
  /**
   * Call Object.freeze on obj and all of it's Own properties (recursively). 
   * The excludes argument specifies a list of Own property names to skip
   **/
  function deep_freeze(obj,excludes) {
    if (obj === undefined || typeof obj !== 'object') return;
    Object.freeze(obj);
    Object.getOwnPropertyNames(obj).forEach(
      function(n) {
        if (excludes === undefined || (Array.isArray(excludes) && excludes.indexOf(n) === -1)) {
          deep_freeze(obj[n]);
        }
      }
    );
  }

  /**
   * Array.isArray polyfill
   **/
  if (Array.isArray === undefined)
    Array.isArray = function(obj) {
      return Object.prototype.toString.call(obj) == '[object Array]';
    };
  if (Object.prototype.isArray === undefined) {
    Object.prototype.isArray = function() {
      return Array.isArray(this);
    };
    Object.defineProperty(Object.prototype, 'isArray', {
      enumerable: false,
      configurable: false
    });
  }
  
  /**
   * Basic type checking
   **/
  function checkType(obj, type) {
    if (obj === undefined || obj === null)
      return obj;
    switch(typeof type) {
    case 'string':
      if (typeof obj == type)
        return obj;
      break;
    case 'object':
      if (type.isArray()) {
        for (var n in type) {
          if (typeof obj == type[n])
            return obj;
        }
      }
      break;
    case 'function':
      if (obj instanceof type)
        return obj;
      break;
    }
    throw invalidType();
  }
  
  function checkTypeIsNumber(obj) {
    if (obj === undefined)
      return;
    checkType(obj,'number');
  }
  
  /**
   * Array.prototype.forEach Polyfill
   **/
  if (Array.prototype.forEach === undefined) {
    Array.prototype.forEach = function(f,s) {
      for (var n = 0; n < this.length; n++)
        f.call(s||this,this[n]);
    };
    Object.defineProperty(Array.prototype, 'forEach', {
      enumerable: false,
      configurable: false
    });
  }

  /**
   * Object.extend Polyfill
   **/
  if (Object.extend === undefined)
    Object.extend = function(to,from) {
      var props = Object.getOwnPropertyNames(from);
      for (var n in props) {
        // don't copy if the property is defined by (and has the 
        // same value as) Object.prototype or Array.prototype
        if ((n in Object.prototype && props[n] == Object.prototype[n]) ||
            (n in Array.prototype && props[n] == Array.prototype[n]))
          continue;
        to[props[n]] = from[props[n]];
      }
      return to;
    };

  /**
   * For backwards compatible downstreamDuplicates and upstreamDuplicates
   * handling... merges LinkValue's from the source into the target and
   * returns an Array LinkValue.
   **/
  function mergeLinkValues(target,source,rel) {
    if (source === undefined || source === undefined)
      return target;
    var ret = [].concat(target);
    switch(source.__type__) {
      case '__simple__':
      case '__object__':
        ret.push(source);
        break;
      case '__array__':
        ret = ret.concat(source);
        break;
    }
    Object.defineProperty(ret,'__type__',hidden(AS.Constants.__array__));
    Object.defineProperty(ret,'__rel__',hidden(rel));
    Object.freeze(ret);
    return ret;
  }
  
  /**
   * Defines Own Properties on "to" based on Own Property Descriptors
   * provided by "from". An internal __model__ property on "to" is 
   * used to track the full current set of properties defined on "to"
   **/
  function defineAllProperties(to, from) {
    to.__model__ = to.__model__ || from;
    for (var m in from) {
      if (typeof from[m] == 'object')
        try {
          to.__model__[m] = from[m];
          Object.defineProperty(to,m,from[m]);
        } catch (t) {}
    }
  }
  
  /**
   * A Model is an object with zero or more OwnPropertyDescriptors. They are
   * used to dynamically define the properties of the various Activity Stream 
   * objects. This allows us to easily mutate the properties of things like
   * ActivityObject, Activity, Collection, etc based on properties such as 
   * objectType, extensions, etc. 
   **/
  var Model = function(a) {
    // if a is an object, assume it's another model (or set of property descriptors)
    // and initialize this new model by copying those property descriptors to here
    if (typeof a == 'object' && !a.isArray())
      Object.extend(this,a);
  };
  Model.prototype = {
    /** Extend this model with a, return the new Model **/
    extend: function(a) {
      return Object.extend(Object.create(this),a||{});
    },
    /** Add a new hidden (non-enumerable) property to the model **/
    hidden: function(name,value,fisget) {
      this[name] = hidden(value,fisget);
      return this;
    },
    /** Add a new property descriptor to this model **/
    property: function(name,accessor,key) {
      this[key||name] = Models.property(accessor||name);
      return this;
    },
    /** Add a new link property descriptor to this model **/
    link : function(name,key) {
      this[key||name] = Models.link(name);
      return this;
    },
    /** Add a new bound number property descriptor to this model **/
    boundNumber : function(name,low,high,defaultValue,fixed,key) {
      this[key||name] = Models.boundNumber(name,low,high,defaultValue,fixed);
      return this;
    },
    /** Add a new number property descriptor to this model **/
    number : function(name,fixed,key) {
      this[key||name] = Models.number(name,fixed);
      return this;
    },
    /** Add a new non-negative number property descriptor to this model **/
    nonNegativeNumber: function(name,key) {
      this[key||name] = Models.nonNegativeNumber(name);
      return this;
    },
    /** Add a new naturval language value property descriptor to this model **/
    nlv : function(name,key) {
      this[key||name] = Models.nlv(name);
      return this;
    },
    /** Add a new typevalue property descriptor to this model **/
    type : function(name,ignoreUndefined,key) {
      this[key||name] = Models.type(name,ignoreUndefined);
      return this;
    },
    /** Add a new collection property descriptor to this model **/
    collection : function(name,key) {
      this[key||name] = Models.collection(name);
      return this;
    },
    /** Add a new date-time property descriptor to this model **/
    dateTime : function(name,key) {
      this[key||name] = Models.dateTime(name);
      return this;
    },
    /** Add a new boolean property descriptor to this model **/
    bool : function(name,key,defaultValue) {
      this[key||name] = Models.boolean(name,defaultValue);
      return this;
    },
    /** Add a new parameters value property descriptor to this model **/
    parameters : function(name,key) {
      this[key||name] = Models.parameters(name);
      return this;
    },
    /** Add a new generic object property descriptor to this model (the model argument defines the model for the object) **/
    genericObject : function(name,model,key) {
      this[key||name] = Models.genericObject(name,model);
      return this;
    },
    toString : function() {
      var desc = [];
      for (var p in this) {
        if (this[p] !== Model.prototype[p] && 
            typeof[p] !== 'function' &&
            this[p].enumerable) {
          desc.push(p);
        }
      }
      return 'Model: ' + desc.join(', ');
    }
  };
  Object.freeze(Model.prototype);
  
  function _def_linkval(ret,n,item,_t,name) {
    Object.defineProperty(ret,n,{
      get: function() {
        return linkValue(item,_t,name);
      }
    });
  }

  /**
   * Our collection of Models... think of these like Object.prototypes
   * that can be applied after an object is created, allows us to 
   * have dynamic, pseudo multiple inheritance
   **/
  var Models = {
    property : function(accessor) {
      if (typeof accessor !== 'function') {
        var name = accessor;
        accessor = function() {
          return this.__wrapped__[name];
        };
      }
      return {
        enumerable: true,
        configurable: false,
        get: accessor
      };
    },
    boolean : function(name,defaultValue) {
      return Models.property(function() {
        if (typeof this.__wrapped__ === 'object') {
          if (name in this.__wrapped__)
            return Boolean(this.__wrapped__[name]);
        }
        return typeof defaultValue == 'boolean' ?
          defaultValue : false;
      });
    },
    link : function(name) {
      return Models.property(
        function() {
          return AS.Transforms.toLink(
            this.__wrapped__[name],
            this,
            name);
      });
    },
    boundNumber : function(name,low,high,defaultValue,fixed) {
      checkTypeIsNumber(defaultValue);
      checkTypeIsNumber(low);
      checkTypeIsNumber(high);
      return Models.property(
        function() {
          var ret = this.__wrapped__[name] || defaultValue;
          checkTypeIsNumber(ret);
          if (ret !== undefined && ret !== null) {
            ret = Math.max(Math.min(ret,high),low);
            if (fixed !== undefined && ret.toFixed)
              ret = ret.toFixed(fixed);
          }
          return ret;
        });
    },
    nonNegativeNumber : function(name) {
      return Models.property(
        function() {
          var ret = this.__wrapped__[name];
          if (ret !== undefined && ret !== null) {
            checkTypeIsNumber(ret);
            ret = Math.max(0,ret);
          }
          return ret;
        });
    },
    number: function(name,fixed) {
      return Models.property(
        function() {
          var ret = this.__wrapped__[name];
          if (ret !== undefined && ret !== null) {
            checkTypeIsNumber(ret);
            ret = fixed !== undefined && ret.toFixed ?
              ret.toFixed(fixed) : ret;
          }
          return ret;
        }
      );
    },
    nlv : function(name) {
      return Models.property(
        function() {
          return naturalLanguageValue(
            this.__wrapped__[name],
            this);
        }
      );
    },
    type : function(name,ignoreUndefined) {
      return Models.property(
        function() {
          return typeValue(
            this.__wrapped__[name],
            this,
            undefined,
            ignoreUndefined
          );
        }
      );
    },
    collection : function(name) {
      return Models.property(
        function() {
          return activityObject(
            this.__wrapped__[name],
            this,
            Models.Collection);
        }
      );
    },
    dateTime : function(name) {
      return Models.property(
        function() {
          var ret = this.__wrapped__[name];
          if (name !== undefined && name !== null)
            ret = AS.Transforms.toDateTime(
              this.__wrapped__[name]);
          return ret;
        }
      );
    },
    parameters : function(name) {
      return Models.property(
        function() {
          function defprop(ret,n,val,context) {
            Object.defineProperty(ret,n,{
              enumerable: true,
              configurable: false,
              get: function() {
                return typeValue(val,context);
              }
            });
          }
          var ret = this.__wrapped__[name];
          if (ret === undefined || ret === null)
            return undefined;
          checkType(ret, ['object']);
          checkNotArray(ret);
          if (!ret.__wrapped__) {
            for (var n in ret) {
              defprop(ret,n,ret[n],this);
            }
            Object.defineProperty(ret,'__wrapped__',hidden(true));
          }
          return ret;
        }
      );
    },
    genericObject : function(name,model) {
      return Models.property(
        function() {
          return activityObject(
            this.__wrapped__[name],
            this,
            model);
        }
      );
    }
  };
  
  /**
   * Create an OwnPropertyDescriptor describing a hidden (non-enumerable, non-configurable)
   * property. If the value argument is undefined, the property is marked non-writable 
   * (assumes that the value for the property has already been set). If fisget is true,
   * value is assumed to be a getter function.
   **/
  function hidden(value,fisget) {
    var ret = {
      enumerable: false,
      configurable: false
    };
    if (value === undefined)
      ret.writable = false;
    else if (!fisget)
      ret.value = value;
    else if (fisget)
      ret.get = value;
    return ret;
  }

  Models.Base = new Model({
    /** the hidden() properties are non-enumerable, immutable properties
        used internally. The __wrapped__ property is the vanilla js object
        being wrapped by the Activity Stream object. While the __wrapped__
        property itself cannot be changed, the properties of the __wrapped__
        object can be mutated. **/
    __wrapped__: hidden(),
    /** the __context__ property is the parent Activity Stream object for
        this object... it is used, primarily, for inheritance of the language
        context **/
    __context__ : hidden(),
    __model__ : hidden(),
    /** return this object re-projected as an Activity object **/
    __asActivity : hidden(function() {
      return activityObject(
        this.__wrapped__,
        this.__context__,
        Models.Activity,
        this.__model__);
    },true),
    /** return this object re-projected as an ActivityCollection object **/
    __asCollection : hidden(function() {
      return activityObject(
        this.__wrapped__,
        this.__context__,
        Models.Collection,
        this.__model__
      );
    },true),
    /** return this object re-projected as an ActivityObject object **/
    __asObject : hidden(function() {
      return activityObject(
          this.__wrapped__,
          this.__context__,
          this.__model__
        );
    },true),
    /** Return a new instance of this object extended using the specified model **/
    extended : hidden(function() {
      var _this = this;
      return function(model) {
          if (_this.__rel__ !== undefined)
            return linkValue(
              _this.__wrapped__,
              _this.__context__,
              _this.__rel__,
              model);
          else {
            return new (Object.getPrototypeOf(_this)).constructor(
              _this.__wrapped__,
              _this.__context__,
              model);
          }
        };
    },true),
    /** Get properties on __wrapped__ that are not defined on the Model.
        If transform is provided and is a function, it is used to transform
        the result before returning. If transform is provided and is not 
        a function, it is used as the default if the property is undefined. **/
    get: hidden(function() {
      var __wrapped__ = this.__wrapped__;
      return function(key,transform) {
        // transform can either be a default value or a transform function
        var ret = __wrapped__[key];
        if (transform !== undefined) {
          if (typeof transform == 'function') {
            if (ret !== undefined)
              ret = transform(ret,this,key);
          } else if (ret === undefined || ret === null)
            ret = transform;
        }
        return ret;
      };
    },true),
    /** Returns true if the named property exists on __wrapped__ **/
    has : hidden(function() {
      var __wrapped__ = this.__wrapped__;
      return function(key) {
        return key in __wrapped__;
      };
    },true),
    /** Turns this into a JSON string **/
    toString: hidden(function() {
      return JSON.stringify(this.__wrapped__);
    })
  });
  Models.TypeValue = Models.Base.extend().
    hidden('__type__').
    hidden('__anonymous__', function() {return !this.id;}, true);
  Models.SimpleTypeValue =
    Models.TypeValue.extend()
      .property('id', function() { return this.__wrapped__; });

  Models.Object = Models.Base.extend().
    property('id', function() {
      return this.__wrapped__.id || this.__wrapped__['@id'];
    }).
    property('objectType', function() {
      var type = this.__wrapped__.objectType || this.__wrapped__['@type'];
      return typeValue(type,this);
    }).
    property('@type', function() {
      return this.__wrapped__['@type'] || this.objectType;
    }).
    property('@id', function() {
      return this.__wrapped__['@id'] || this.id;
    }).
    property('@language', function() {
      return this.__wrapped__['@language'] || this.language;
    }).
    property('@value').
    property('@context').
    property('language', function() {
      var lang = this.__wrapped__.language || this.__wrapped__['@language'];
      return lang ||
        (this.__context__  ?
          this.__context__.language :
            navigator.language) || 'en';
    }).
    property('rel', function() {
      return this.__wrapped__.rel || this.__rel__;
    }).
    property('mediaType').
    property('alias').
    property('duplicates', function() {
      var ret;
      if ('duplicates' in this.__wrapped__)
        ret = linkValue(this.__wrapped__.duplicates,this);
      else ret = AS.Transforms.toLink([]);
      ret = mergeLinkValues(ret,this.downstreamDuplicates,'duplicates');
      ret = mergeLinkValues(ret,this.upstreamDuplicates,'duplicates');
      return ret;
    }).
    nlv('displayName').
    nlv('summary').
    nlv('title').
    nlv('content').
    link('url').
    link('attachments').
    link('author').
    link('downstreamDuplicates').
    link('upstreamDuplicates').
    link('icon').
    link('image').
    link('location').
    link('generator').
    link('provider').
    link('tags').
    link('inReplyTo').
    link('scope').
    dateTime('published').
    dateTime('updated').
    dateTime('startTime').
    dateTime('endTime').
    boundNumber('rating',0.0,5.0,0.0).
    property('duration').
    nonNegativeNumber('height').
    nonNegativeNumber('width').
    collection('replies').
    property('actions', function() {
      return actionsValue(
        this.__wrapped__.actions,this);
    }).
    hidden('isA', function(ot) {
      // This 'isA' method will return true if the objectType (or verb)
      // matches the given objectType id. If ot is an object, the code
      // checks to see if it has it's own objectType property. If 
      // ot.objectType is 'verb', then only the verb is checked, if
      // ot.objectType is 'objectType', then only the objectType is 
      // checked. ot can be a string, a regular javascript object, or
      // a wrapped Activity Stream object.
      function check(a,b) {
        for (var n in b)
          if (b[n] !== undefined && b[n].id == a)
            return true;
        return false;
      }
      function allanon(a) {
        for (var n in a)
          if (a[n] !== undefined && !a[n].__anonymous__)
            return false;
        return true;
      }
      switch(typeof ot) {
        case 'string':
          return check(ot, [this.objectType, this.verb]);
        case 'object':
          if (ot.objectType !== undefined) {
            switch(ot.objectType.id || ot.objectType) {
              case 'verb':
                return check(ot.id,[this.verb]);
              case 'objectType':
                return check(ot.id,[this.objectType]);
            }
          } else if (ot.id !== undefined) {
            return check(ot.id, [this.objectType,this.verb]);
          }
          break;
        case 'undefined':
          return allanon([this.objectType,this.verb]);
      }
      return false;
    });

  Models.Activity = Models.Object.extend().
    type('verb',false).
    link('actor').
    link('object').
    link('target').
    link('result').
    link('instrument').
    link('participant').
    link('to').
    link('bto').
    link('cc').
    link('bcc').
    link('from').
    link('bfrom').
    property('status', function() {
      var status = this.__wrapped__.status;
      return status !== undefined && 
        AS.Constants.status.indexOf(status) > -1 ?
          status : 'other';
    }).
    boundNumber('priority',0.0,1.0,0.0);
  Models.LinkValue = Models.Base.extend().
    hidden('__type__').
    hidden('__rel__');
  Models.SimpleLinkValue = Models.Base.extend().
    property('href', function() {return this.__wrapped__;}).
    property('rel', function() {return this.__rel__;});

  Models.Collection = Models.Object.extend().
    nonNegativeNumber('totalItems').
    property('items', function() {
      var ret = this.__wrapped__.items;
        if (ret !== undefined && ret !== null) {
          if (Array.isArray(ret)) {
            var _this = this;
            ret = ret.map(
              function(i) {
                return activityObject(i,_this);
              }
            );
          } else throw invalidType();
        }
        return ret;
      }).
    dateTime('itemsAfter').
    dateTime('itemsBefore').
    nonNegativeNumber('itemsPerPage').
    nonNegativeNumber('startIndex').
    link('first').
    link('last').
    link('prev').
    link('next').
    link('current').
    link('self');

  Models.ActionHandler = Models.Object.extend().
    property('context','context').
    property('auth','auth').
    bool('confirm').
    link('expects').
    link('returns').
    link('requires').
    link('prefers');

  Models.HttpActionHandler = Models.ActionHandler.extend().
    property('method').
    property('target');

  Models.EmbedActionHandler = Models.ActionHandler.extend().
    property('style').
    property('target').
    link('preview');

  Models.IntentActionHandler = Models.ActionHandler.extend();
  
  Models.Parameter = Models.Object.extend().
    bool('required',true).
    bool('repeated',false).
    property('value').
    property('default').
    property('enum').
    property('maximum').
    property('minumum').
    property('format').
    property('pattern').
    nonNegativeNumber('step').
    nlv('placeholder');

  Models.UrlTemplate = Models.Object.extend().
    property('template').
    parameters('parameters','params');

  Models.TypedPayload = Models.Object.extend().
    type('type',false,'semanticType').
    link('schema');

  Models.HtmlForm = Models.Object.extend().
    parameters('parameters','params');

  // Optional Extension Models... These are intended
  // to be used a Mixins using the "extended" method
  // on existing objects. For instance, 
  // var m = asms.Activity({...}).extended(asms.Models.Ext.Replies)
  Models.Ext = {};
  Models.Ext.Replies = new Model({}).
    collection('attending').
    collection('followers').
    collection('following').
    collection('friends').
    collection('friend-requests', 'friendRequests').
    collection('likes').
    collection('notAttending').
    collection('maybeAttending').
    collection('members').
    collection('reviews').
    collection('saves').
    collection('shares');
  Models.Ext.Position = Models.Base.extend().
    number('altitude',2).
    boundNumber('latitude',-90.00,90.00,undefined,2).
    boundNumber('longitude',-180.00,180.00,undefined,2);
  Models.Ext.Address = Models.Base.extend().
    property('formated').
    property('streetAddress').
    property('locality').
    property('region').
    property('postalCode').
    property('country');
  Models.Ext.Place = Models.Base.extend().
    genericObject('position',Models.Ext.Position).
    genericObject('address',Models.Ext.Address);
  Models.Ext.Mood = Models.Base.extend().
    type('mood',false);
  
  // the objects...
  
  function checkNotArray(obj) {
    if (Array.isArray(obj))
      throw invalidType();
    return obj;
  }
  
  function defmodel(_t,model,extmodel,ignoreObjectType) {
    defineAllProperties(_t,model);
    if(!ignoreObjectType && _t.objectType !== undefined) {
      if (_t.objectType.id in Models.forObjectType) {
        var otmodel = Models.forObjectType[_t.objectType.id];
        if (otmodel !== model &&
            otmodel !== extmodel)
          defineAllProperties(_t,otmodel);
      }
    }
    if(extmodel !== undefined)
      defineAllProperties(_t,extmodel);
  }
  
  function def_actions(actions,n,val,context) {
    Object.defineProperty(actions,n,{
      enumerable: true,
      configurable: false,
      get: function() {
        return AS.Transforms.toLink(val,context,n, Models.ActionHandler);
      }
    });
  }

  function actionsValue(actions, context) {
    if (actions === undefined || actions === null) return undefined;
    checkNotArray(actions);
    if (actions.__wrapped__ === undefined) {
      for (var n in actions) {
        var val = actions[n];
        def_actions(actions,n,val,context);
      }
      Object.defineProperty(actions,'__wrapped__',
        hidden(true));
    }
    return actions;
  }

  function naturalLanguageValue(nlv, context) {
    if (nlv === undefined || nlv === null) return undefined;
    if (!nlv.__wrapped__) {
      var ret;
      var deflang = context.language || navigator.language  || 'en';
      if (deflang.indexOf('*') != -1)
        throw new Error('Default language context cannot be a wildcard');
      switch(typeof nlv) {
        case 'string':
          ret = {};
          ret[deflang] = nlv;
          break;
        case 'object':
          ret = nlv;
          break;
        default:
          throw invalidType();
      }
      Object.defineProperty(ret, '__wrapped__', hidden(true));
      Object.defineProperty(ret, 'toString', hidden(
        function() {
          return ret[deflang];
        }, false
      ));
      return ret;
    } else return nlv;
  }
   
  function linkValue(lv, context, rel, extmodel) {
    checkType(lv,['string','object']);
    if (lv.__wrapped__)
      return lv;
    var ret = {
      __wrapped__: lv,
      __context__: context,
      __rel__: rel
    };
    var model = Models.SimpleLinkValue;
    switch(typeof lv) {
    case 'string':
      model = Models.SimpleLinkValue;
      ret.__type__ = AS.Constants.__simple__;
      break;
    case 'object':
      checkNotArray(lv);
      model = Models.Object;
      ret.__type__ = AS.Constants.__object__;
      break;
    default:
      throw invalidType();
    }
    defmodel(ret,model,extmodel);
    Object.freeze(ret);
    return ret;
  }
  
  function typeValue(tv, context, extmodel, ignoreUndefined) {
    if (!ignoreUndefined && (tv === undefined || tv === null))
      return undefined;
    if (tv.__wrapped__)
      return tv;
    checkType(tv,['string','object']);
    checkNotArray(tv);
    if (typeof tv === 'string')
      tv = AS.typeValueResolver(tv);
    var ret = {
      __wrapped__ : tv,
      __context__ : context
    };
    var model = Models.SimpleTypeValue;
    switch(typeof tv) {
    case 'object':
      ret.__type__ = AS.Constants.__object__;
      model = Models.Object;
      break;
    case 'string':
      ret.__type__ = AS.Constants.__simple__;
      break;
    case 'undefined':
      ret.__type__ = AS.Constants.__anonymous__;
      break;
    default:
      throw invalidType();
    }
    defmodel(ret,model,extmodel);
    Object.freeze(ret);
    return ret;
  }

  function activityObject(inner,context,model,extmodel) {
    if (inner === undefined || inner === null)
      return undefined;
    if (inner.__wrapped__) 
      return inner;
    checkType(inner,'object');
    checkNotArray(inner);
    model = model || Models.Object;
    var ret = {
      __wrapped__: inner,
      __context__: context
    };
    defmodel(ret,model,extmodel);
    Object.freeze(ret);
    return ret;
  }
  
  Models.forObjectType = {
    activity: Models.Activity,
    collection: Models.Collection,
    verb: Models.Object,
    objectType: Models.Object,
    HttpActionHandler: Models.HttpActionHandler,
    EmbedActionHandler: Models.EmbedActionHandler,
    IntentActionHandler: Models.IntentActionHandler,
    HtmlForm: Models.HtmlForm,
    UrlTemplate: Models.UrlTemplate,
    typedPayload: Models.TypedPayload,
    parameter: Models.Parameter,
    place: Models.Ext.Place,
    address: Models.Ext.Address,
    position: Models.Ext.Position,
    mood: Models.Ext.Mood
  };
  
  /**
   * The typevalue resolver allows a developer to swap in their own
   * TypeValue's when a simple (string) type value is encountered. 
   * This is useful when dealing with extension objecttypes and verbs.
   * For instance, a developer may want to provide a library of
   * extension verb or objectType definitions and make it so that
   * those can be handled transparently
   **/
  function defaultTypeValueResolver(ot) {
    return ot;
  } 

  var __tvResolver = 
    defaultTypeValueResolver;

  var AS = {
    get typeValueResolver() {
      return function(id) {
        try {
          // if the resolver returns undefined, return the original id
          var ret = __tvResolver(id) || id;
          checkType(ret,['object','string']);
          return ret;
        } catch (t) {
          return id;
        }
      };
    },
    set typeValueResolver(ot) {
      if (typeof ot !== 'function')
        return;
      __tvResolver = ot;
    },
    indexTypeValuesFromCollection: function(collection) {
      var ret = {};
      var items = collection.items;
      if (items !== undefined && Array.isArray(items)) {
        for (var n in items) {
          var item = items[n];
          var id = item.objectType.id;
          if (['verb','objectType'].indexOf(id) != -1) {
            if (item.id !== undefined)
              ret[item.id] = item.__wrapped__;
          }
        }
      }
      return ret;
    },
    parse: function(input) {
      var inner = JSON.parse(input);
      if ('verb' in inner)
        return activityObject(inner,undefined,Models.Activity);
      else if ('items' in inner)
        return activityObject(inner,undefined,Models.Collection);
      else
        return activityObject(inner);
    },
    Object : activityObject,
    Collection : function(inner) {
      return activityObject(inner,undefined,Models.Collection);
    },
    Activity : function(inner) {
      return activityObject(inner,undefined,Models.Activity);
    },
    Transforms : {
      toLink : function(i,context,rel,extmodel) {
        if (i === undefined)
          return undefined;
        if (Array.isArray(i)) {
          if (i.__type__ === undefined) {
            for(var n in i)
              _def_linkval(i,n,i[n],this,rel);
            i.__type__ = AS.Constants.__array__;
            i.__rel__ = rel;
            Object.defineProperty(i,'__type__',hidden());
            Object.defineProperty(i,'__rel__',hidden());
            Object.freeze(i);
          }
          return i;
        } else
          return linkValue(i,context,rel,extmodel);
      },
      toType : function(i,context,ignoreUndefined) {
        return typeValue(i,context,undefined,ignoreUndefined);
      },
      toNaturalLanguageValue : function(i,context) {
        return naturalLanguageValue(i,context);
      },
      toCollection : function(i, context) {
        return activityObject(i, context, Models.Collection);
      },
      toObject : function(i, context) {
        return activityObject(i, context);
      },
      toActivity : function(i, context) {
        return activityObject(i, context, Models.Activity);
      },
      toDateTime : function(val) {
        var ret;
        if (val instanceof Date)
          ret = val;
        else if (typeof val == 'string')
          ret = new Date(val);
        else
          throw invalidType();
        return ret;
      }
    },
    Constants: {
      __anonymous__ : '__anonymous__',
      __object__ : '__object__',
      __simple__ : '__simple__',
      __type__ : '__type__',
      __array__ : '__array__',
      post : 'post',
      activity : 'activity',
      verb : 'verb',
      objectType : 'objectType',
      collection : 'collection',
      status : ['active','canceled','completed','pending','tentative','voided'],
      formats : {
        boolean: 'boolean',
        byte: 'byte',
        hex: 'hex',
        date: 'date',
        double: 'double',
        duration: 'duration',
        float: 'float',
        int32: 'int32',
        int64: 'int64',
        uint32: 'uint32',
        uint64: 'uint64',
        lang: 'lang',
        uri: 'uri',
        iri: 'iri'
      },
      verbs : {
        accept: 'accept',
        access: 'access',
        acknowledge: 'acknowledge',
        add: 'add',
        agree: 'agree',
        append: 'append',
        approve: 'approve',
        archive: 'archive',
        assign: 'assign',
        at: 'at',
        attach: 'attach',
        attend: 'attend',
        author: 'author',
        authorize: 'authorize',
        borrow: 'borrow',
        build: 'build',
        cancel: 'cancel',
        close: 'close',
        complete: 'complete',
        confirm: 'confirm',
        consume: 'consume',
        checkin: 'checkin',
        create: 'create',
        'delete': 'delete',
        deliver: 'deliver',
        deny: 'deny',
        disagree: 'disagree',
        dislike: 'dislike',
        experience: 'experience',
        favorite: 'favorite',
        find: 'find',
        flagAsInappropriate: 'flag-as-inappropriate',
        follow: 'follow',
        give: 'give',
        host: 'host',
        ignore: 'ignore',
        insert: 'insert',
        install: 'install',
        interact: 'interact',
        invite: 'invite',
        join: 'join',
        leave: 'leave',
        like: 'like',
        listen: 'listen',
        lose: 'lose',
        makeFriend: 'make-friend',
        open: 'open',
        play: 'play',
        present: 'present',
        purchase: 'purchase',
        qualify: 'qualify',
        read: 'read',
        receive: 'receive',
        reject: 'reject',
        remove: 'remove',
        removeFriend: 'removeFriend',
        replace: 'replace',
        request: 'request',
        requestFriend: 'requestFriend',
        resolve: 'resolve',
        _return: 'return',
        retract: 'retract',
        rsvpMaybe: 'rsvp-maybe',
        rsvpNo: 'rsvp-no',
        rsvpYes: 'rsvp-yes',
        satisfy: 'satisfy',
        save: 'save',
        schedule: 'schedule',
        search: 'search',
        sell: 'sell',
        send: 'send',
        share: 'share',
        sponsor: 'sponsor',
        start: 'start',
        stopFollowing: 'stop-following',
        submit: 'submit',
        tag: 'tag',
        terminate: 'terminate',
        tie: 'tie',
        unfavorite: 'unfavorite',
        unlike: 'unlike',
        unsatisfy: 'unsatisfy',
        unsave: 'unsave',
        unshare: 'unshare',
        update: 'update',
        use: 'use',
        watch: 'watch',
        win: 'win'
      },
      objectTypes: {
        alert: 'alert',
        application: 'application',
        article: 'article',
        audio: 'audio',
        badge: 'badge',
        binary: 'binary',
        bookmark: 'bookmark',
        collection: 'collection',
        comment: 'comment',
        device: 'device',
        event: 'event',
        file: 'file',
        game: 'game',
        group: 'group',
        image: 'image',
        issue: 'issue',
        job: 'job',
        note: 'note',
        offer: 'offer',
        organization: 'organization',
        page: 'page',
        permission: 'permission',
        person: 'person',
        place: 'place',
        process: 'process',
        product: 'product',
        question: 'question',
        review: 'review',
        role: 'role',
        service: 'service',
        task: 'task',
        team: 'team',
        video: 'video'
      }
    },
    Models : Models
  };
  deep_freeze(AS, ['Models']);

  if ( typeof define === 'function' && define.amd ) {
    define( 'asms', [], function() {
      return AS;
    });
  }

  if (_$ !== undefined)
    _$.asms = AS;

  return AS;
}));
