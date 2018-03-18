
/**
 * Module dependencies.
 */

var cheerio = require('cheerio');
var thunkify = require('thunkify-wrap');
var request = thunkify(require('request'));
var write = require('./debug').write;
var req = require('request');
var fs = require('fs');
var path = require('path');
var ask = require('./prompt').prompt_ask;
var isPassword = require('./valid').password;

/**
 * Expose `Mattermost`.
 */

module.exports = Mattermost;

/**
 * Static variables
 */

var loginFormPath = '/api/v4/users/login';
var emojiUploadImagePath = '/api/v4/emoji';

/**
 * Initialize a new `Mattermost`.
 */

function Mattermost(opts, debug) {
  if (!(this instanceof Mattermost)) return new Mattermost(opts);
  this.opts = opts;
  this.debug = debug;

  /**
   * Do everything.
   */

  this.import = function *() {
    try {
      console.log('Starting import');
      yield this.login();
      console.log('Logged in');
    } catch (e) {
      console.log('Uh oh! ' + e);
      throw e;
    }
    var emojiList = '';
    var aliasList = '';
    for (var i = 0; i < Object.keys(this.opts.emojis).length; i++) {
      var e = this.opts.emojis[i];
      if (e.src) {
        var uploadRes = yield this.upload(e.name, e.src);
        emojiList += ' :' + e.name + ':';
      }
      if (e.aliases) {
        for (var n = 0; n < e.aliases.length; n++) {
          yield this.alias(e.name, e.aliases[n]);
          aliasList += ' :' + e.aliases[n] + ':';
        }
      }
    }
    console.log('Uploaded emojis:' + emojiList);
    console.log('Uploaded emoji aliases:' + aliasList);
    return 'Success';
  };

  /**
   * Log into Mattermost and populate cookies.
   */

  this.login = function *() {
    var opts = this.opts;
    var load = {
      url: opts.url + loginFormPath,
      method: 'POST',
      json: true,
      followAllRedirects: true,
      body: {
        login_id: opts.email,
        password: opts.password
      }
    };
    var res = yield request(load);
    //console.log(res.length)
    opts.token = res[0].headers.token
    opts.userId = res[1].id
    return this.opts = opts;
  };

  /**
   * Upload the emoji.
   */

  this.upload = function *(name, emoji) {
    console.log('Uploading %s with %s', name, emoji);
    return new Promise(function(resolve, reject, notify) {
      var opts = this.opts;
      var r = req({
        url: opts.url + emojiUploadImagePath,
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
          authorization: 'BEARER ' + opts.token
        },
        formData: {
          'emoji': JSON.stringify({ name: name, creator_id: opts.userId }),
          'image': fs.createReadStream(path.join(__dirname, '..', '/metacodes/' + emoji))
        },
        followAllRedirects: true
      }, function(err, res, body) {
        if (err || !body) {
          console.log(err)
          return reject(err);
        }
        console.log(body)
        resolve(body);
      });
      console.log(r)
    }.bind(this));
  };

  this.alias = function *(name, alias) {
    console.log('Aliasing %s to %s', alias, name);
    return new Promise(function(resolve, reject, notify) {
      var opts = this.opts;
      var r = req({
        url: opts.url + emojiUploadImagePath,
        method: 'POST',
        jar: opts.jar,
        followAllRedirects: true
      }, function(err, res, body) {
        if (err || !body) return reject(err);
        resolve(body);
      });
      var form = r.form();
      form.append('add', '1');
      form.append('crumb', opts.uploadCrumb);
      form.append('name', alias);
      form.append('mode', 'alias');
      form.append('alias', name);
    }.bind(this));
  };
}
