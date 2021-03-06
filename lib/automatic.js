var _ = require('underscore');
var request = require('request');

var config = {
  api: {
    host: 'https://api.automatic.com',
    version: '/v1'
  },
  oauth: {
    authorizeUrl: 'https://www.automatic.com/oauth/authorize',
    tokenUrl: 'https://www.automatic.com/oauth/access_token'
  }
};

function AutomaticClient(client_id, client_secret) {
  this.client_id = client_id;
  this.client_secret = client_secret;

  return this;
}
exports.AutomaticClient = AutomaticClient;

AutomaticClient.prototype.authorizeUrl = function(scopes, state) {
  this.state = state;

  return config.oauth.authorizeUrl +
          '?client_id=' + this.client_id +
          '&scope=' + encodeURIComponent(scopes.join(' ')) +
          '&state=' + state +
          '&response_type=code';
};

AutomaticClient.prototype.validateAuthorization = function(code, state) {
  if(this.state === state) {
    this.code = code;
  } else {
    throw new Error('Unexpected state string.');
  }
};

AutomaticClient.prototype.requestToken = function(callback) {
  var self = this;
  
  request({
    method: 'POST',
    url: config.oauth.tokenUrl,
    form: {
      client_id: this.client_id,
      client_secret: this.client_secret,
      code: this.code,
      grant_type: 'authorization_code'
    } 
  }, function(error, response, body) {
    self.token = JSON.parse(body);
    
    return callback(error, response, body);
  });
};

AutomaticClient.prototype.refreshToken = function(callback) {
  var self = this;

  request({
    method: 'POST',
    url: config.oauth.tokenUrl,
    form: {
      refresh_token: this.token.refresh_token,
      grant_type: 'refresh_token'
    } 
  }, function(error, response, body) {
    self.token = JSON.parse(body);

    return callback(error, response, body);
  });
};

AutomaticClient.prototype.isTokenValid = function() {
  return (this.token.expires_in > new Date().getTime());
};

AutomaticClient.prototype.trips = function(options, callback) {
  if(typeof options === 'function') {
    callback = options;
    options = {};
  }

  var endpoint = config.api.host + config.api.version + '/trip';
  
  var page = options.page || 1;
  var per_page = options.per_page || 100;

  if(!_.isUndefined(options.id)) {
    endpoint += '/' + options.id;
  } else {
    endpoint += 's?page=' + page + '&per_page=' + per_page;
  }

  request({
    method: 'GET',
    url: endpoint,
    headers: {
      Authorization: 'token ' + this.token.access_token
    }
  },
  callback);
};

exports.createClient = function(client_id, client_secret) {
  var client = new AutomaticClient(client_id, client_secret);

  return client;
};