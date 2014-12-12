var HttpGateway = function(transport) {
  this.RequestObject = transport;
}

HttpGateway.prototype = {
  get: function(urlGenerator, path) {
    return function(params, callback) {
      if (typeof params === 'function') {
        callback = params;
        params = undefined;
      }

      var url = urlGenerator(path, params);
      return new this.RequestObject(url, callback);
    }.bind(this);
  }
}

var ResourceMapper = function(manifest, transport) {
  this.manifest = manifest;
  this.gateway = new HttpGateway(transport || Request);
  this.host = this.manifest.host;
}

ResourceMapper.prototype = {

  build: function() {
    return Object.keys(this.manifest.resources).
      map(function(name) { return this.buildResource(name) }.bind(this)).
      reduce(function(context, resource) {
        context[resource.name] = resource.methods;
        return context;
      }, {});
  },

  buildResource: function(resourceName) {
    var methods = this.manifest.resources[resourceName];
    return Object.keys(methods).reduce(function(context, methodName) {

      var descriptor = methods[methodName];
      var httpMethod = (descriptor.method || 'get').toLowerCase();

      context.methods[methodName] = this.gateway[httpMethod](
        this.urlFor.bind(this),
        descriptor.path
      );

      return context;

    }.bind(this), {name: resourceName, methods: {}});
  },

  urlFor: function(path, urlParams) {
    var params = urlParams || {};
    var normalizedPath = /^\//.test(path) ? path : '/' + path;

    Object.keys(params).forEach(function(key) {
      var value = params[key];
      var pattern = '\{' + key + '\}';

      if (new RegExp(pattern).test(normalizedPath)) {
        normalizedPath = normalizedPath.replace('\{' + key + '\}', value);
        delete params[key];
      }
    });

    var paramsString = Object.keys(params).
      filter(function(key) { return key !== undefined && key !== null}).
      map(function(key){ return key + '=' + params[key]}).
      join('&');

    if (paramsString.length !== 0)
      paramsString = '?' + paramsString;

    return this.host + normalizedPath + paramsString;
  }

}
