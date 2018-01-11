'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _express = require('express');

var _express2 = _interopRequireDefault(_express);

var _cors = require('cors');

var _cors2 = _interopRequireDefault(_cors);

var _bodyParser = require('body-parser');

var _bodyParser2 = _interopRequireDefault(_bodyParser);

var _expoServerSdk = require('expo-server-sdk');

var _expoServerSdk2 = _interopRequireDefault(_expoServerSdk);

var _pouchdb = require('pouchdb');

var _pouchdb2 = _interopRequireDefault(_pouchdb);

var _http = require('http');

var _http2 = _interopRequireDefault(_http);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _objectWithoutProperties(obj, keys) { var target = {}; for (var i in obj) { if (keys.indexOf(i) >= 0) continue; if (!Object.prototype.hasOwnProperty.call(obj, i)) continue; target[i] = obj[i]; } return target; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

var db = new _pouchdb2.default('avpn');
var expo = new _expoServerSdk2.default();
var app = (0, _express2.default)();

app.use((0, _cors2.default)());
var jsonParser = _bodyParser2.default.json();

app.post('/registration', jsonParser, function () {
  var _ref = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee(req, res) {
    var body, userID, pushToken, user, oldPushToken;
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            body = req.body;
            userID = body.userID, pushToken = body.pushToken;

            if (userID) {
              _context.next = 7;
              break;
            }

            res.status(400).send('Please specify user ID');
            return _context.abrupt('return');

          case 7:
            if (pushToken) {
              _context.next = 12;
              break;
            }

            res.status(400).send('Please specify expo push token');
            return _context.abrupt('return');

          case 12:
            if (_expoServerSdk2.default.isExpoPushToken(pushToken)) {
              _context.next = 15;
              break;
            }

            res.status(400).send('Please specify a valid expo push token');
            return _context.abrupt('return');

          case 15:
            _context.prev = 15;
            _context.next = 18;
            return db.get(userID);

          case 18:
            user = _context.sent;

            if (!user) {
              _context.next = 24;
              break;
            }

            oldPushToken = user.pushToken;

            if (!(oldPushToken !== pushToken)) {
              _context.next = 24;
              break;
            }

            _context.next = 24;
            return db.put({
              _rev: user._rev,
              _id: userID,
              pushToken: pushToken
            });

          case 24:
            _context.next = 31;
            break;

          case 26:
            _context.prev = 26;
            _context.t0 = _context['catch'](15);

            if (!(_context.t0.name === 'not_found')) {
              _context.next = 31;
              break;
            }

            _context.next = 31;
            return db.put({
              _id: userID,
              pushToken: pushToken
            });

          case 31:
            res.send({ success: true });

          case 32:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, undefined, [[15, 26]]);
  }));

  return function (_x, _x2) {
    return _ref.apply(this, arguments);
  };
}());

app.post('/notify', jsonParser, function () {
  var _ref2 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee2(req, res) {
    var body, _body$pushMessage, recipientID, title, message, otherConfiguration, recipient, notification, receipts;

    return regeneratorRuntime.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            body = req.body;

            if (body.pushMessage) {
              _context2.next = 4;
              break;
            }

            res.status(404).send('Please specify push message');
            return _context2.abrupt('return');

          case 4:
            _body$pushMessage = body.pushMessage, recipientID = _body$pushMessage.recipientID, title = _body$pushMessage.title, message = _body$pushMessage.message, otherConfiguration = _objectWithoutProperties(_body$pushMessage, ['recipientID', 'title', 'message']);
            _context2.prev = 5;
            _context2.next = 8;
            return db.get(recipientID);

          case 8:
            recipient = _context2.sent;
            notification = _extends({
              to: recipient.pushToken,
              title: title,
              body: message
            }, otherConfiguration);
            _context2.next = 12;
            return expo.sendPushNotificationAsync(notification);

          case 12:
            receipts = _context2.sent;

            res.send({ success: true, receipts: receipts });
            _context2.next = 26;
            break;

          case 16:
            _context2.prev = 16;
            _context2.t0 = _context2['catch'](5);

            console.log('e', _context2.t0);

            if (!(_context2.t0.name === 'not_found')) {
              _context2.next = 24;
              break;
            }

            res.status(400).send('User Not found');
            return _context2.abrupt('return');

          case 24:
            res.status(500).send('Error', _context2.t0.message);
            return _context2.abrupt('return');

          case 26:
          case 'end':
            return _context2.stop();
        }
      }
    }, _callee2, undefined, [[5, 16]]);
  }));

  return function (_x3, _x4) {
    return _ref2.apply(this, arguments);
  };
}());

var server = _http2.default.createServer(app);
var port = process.env.PORT || 3000;

server.listen(port, function () {
  console.log('Express server running on *:' + port);
});