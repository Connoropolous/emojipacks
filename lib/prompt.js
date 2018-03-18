/**
 * Module dependencies.
 */

var isDomain = require('./valid').domain;
var isPassword = require('./valid').password;
var isEmail = require('./valid').email;
var isUri = require('valid-url').isUri;
var resolve = require('path').resolve;
var exists = require('fs').existsSync;
var prompt = require('co-prompt');
var chalk = require('chalk');

/**
 * Start.
 */

exports.start = function* (mattermost, email, password, pack) {
  var load, valid;
  if (!mattermost) {
    mattermost = yield ask('Mattermost domain: ', isDomain, 'Uh oh! The domain should be at least one letter!');
  }
  if (!email) {
    email = yield ask('Email address login: ', isEmail, 'Are you sure that is an email address? :)');
  }
  if (!password) {
    password = yield ask('Password: ', isPassword, 'A password (as defined by this script) needs to have at least one character (not including you).');
  }
  if (!pack) {
    pack = yield ask('Path or URL of Emoji yaml file: ', isPath, 'Does the path to the yaml file look right? :)');
  }
  load = {
    url: mattermost,
    email: email,
    password: password,
    pack: pack
  };
  return load;
}

/**
 * Prompt with validation.
 */

function *ask(message, valid, error) {
  var res;
  do {
    if (message.toLowerCase().indexOf('password') >= 0) res = yield prompt.password(message);
    else res = yield prompt(message);
    if (!valid(res)) err(error);
  } while (!(valid(res)));
  return res;
}

exports.prompt_ask = ask;

/**
 * is path
 */

function isPath(path) {
  return isUri(path) || exists(resolve(process.cwd(), path));
}

/**
 * Show error message.
 */

function err(message) {
  console.log(chalk.red(message));
}
