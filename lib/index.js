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

var _http = require('http');

var _http2 = _interopRequireDefault(_http);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _objectWithoutProperties(obj, keys) { var target = {}; for (var i in obj) { if (keys.indexOf(i) >= 0) continue; if (!Object.prototype.hasOwnProperty.call(obj, i)) continue; target[i] = obj[i]; } return target; }

const db = {};
const groupDB = {
  group1: {
    id: 'group1',
    name: 'Kodefox Admin',
    memberList: ['2', '3']
  }
};
const expo = new _expoServerSdk2.default();
const app = (0, _express2.default)();

app.use((0, _cors2.default)());
let jsonParser = _bodyParser2.default.json();

app.get('/', (req, res) => {
  res.send('hi');
});

app.post('/registration', jsonParser, async (req, res) => {
  let { body } = req;

  let { userID, pushToken } = body;
  if (!userID) {
    res.status(400).send('Please specify user ID');
    return;
  } else if (!pushToken) {
    res.status(400).send('Please specify expo push token');
    return;
  } else if (!_expoServerSdk2.default.isExpoPushToken(pushToken)) {
    res.status(400).send('Please specify a valid expo push token');
    return;
  }

  let user = db[userID];
  if (user) {
    let oldPushToken = user.pushToken;
    if (oldPushToken !== pushToken) {
      db[userID] = {
        id: userID,
        pushToken
      };
    }
  } else {
    db[userID] = {
      id: userID,
      pushToken
    };
  }
  res.send({ success: true });
});

app.post('/notify', jsonParser, async (req, res) => {
  let { body } = req;
  if (!body.pushMessage) {
    res.status(404).send('Please specify push message');
    return;
  }
  if (!body.type) {
    res.status(404).send('Please specify push message type');
    return;
  }
  if (body.type !== 'private' && body.type !== 'group') {
    res.status(404).send('Type not supported');
    return;
  }
  let {
    type,
    pushMessage: {
      recipientID,
      title,
      message,
      senderID,
      data
    }
  } = body,
      otherConfiguration = _objectWithoutProperties(body.pushMessage, ['recipientID', 'title', 'message', 'senderID', 'data']);

  try {
    let receipts;
    if (type === 'group') {
      let group = groupDB[recipientID];
      if (!group) {
        res.status(404).send('Group not found');
        return;
      }
      let notifications = [];
      for (let memberID of group.memberList) {
        let recipient = db[memberID];
        if (!recipient) {
          continue;
        } else if (recipient.id === senderID) {
          continue;
        }
        notifications.push(_extends({
          to: recipient.pushToken,
          title,
          body: message,
          data: _extends({}, data, {
            message,
            title
          })
        }, otherConfiguration));
      }

      receipts = await expo.sendPushNotificationsAsync(notifications);
    } else {
      let recipient = db[recipientID];
      if (!recipient) {
        res.status(404).send('User not found');
        return;
      }

      let notification = _extends({
        to: recipient.pushToken,
        title,
        body: message,
        data: _extends({}, data, {
          message,
          title
        })
      }, otherConfiguration);

      receipts = await expo.sendPushNotificationAsync(notification);
    }

    res.send({ success: true, receipts });
  } catch (e) {
    console.log(e);
    res.send({ success: false, error: JSON.stringify(e) });
  }
});

const server = _http2.default.createServer(app);
const port = 3000;

server.listen(port, () => {
  console.log('Express server running on *:' + port);
});