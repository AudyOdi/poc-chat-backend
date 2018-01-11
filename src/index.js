import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import Expo from 'expo-server-sdk';
import http from 'http';

const db = {};
const groupDB = {
  group1: {
    id: 'group1',
    name: 'Kodefox Admin',
    memberList: ['2', '3'],
  },
};
const expo = new Expo();
const app = express();

app.use(cors());
let jsonParser = bodyParser.json();

app.get('/', (req, res) => {
  res.send('hi');
});

app.post('/registration', jsonParser, async(req, res) => {
  let {body} = req;

  let {userID, pushToken} = body;
  if (!userID) {
    res.status(400).send('Please specify user ID');
    return;
  } else if (!pushToken) {
    res.status(400).send('Please specify expo push token');
    return;
  } else if (!Expo.isExpoPushToken(pushToken)) {
    res.status(400).send('Please specify a valid expo push token');
    return;
  }

  let user = db[userID];
  if (user) {
    let oldPushToken = user.pushToken;
    if (oldPushToken !== pushToken) {
      db[userID] = {
        id: userID,
        pushToken,
      };
    }
  } else {
    db[userID] = {
      id: userID,
      pushToken,
    };
  }
  res.send({success: true});
});

app.post('/notify', jsonParser, async(req, res) => {
  let {body} = req;
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
      data,
      ...otherConfiguration
    },
  } = body;

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
          // dont send push notif to sender
          continue;
        }
        notifications.push({
          to: recipient.pushToken,
          title,
          body: message,
          data: {
            ...data,
            message,
            title,
          },
          ...otherConfiguration,
        });
      }

      receipts = await expo.sendPushNotificationsAsync(notifications);
    } else {
      let recipient = db[recipientID];
      if (!recipient) {
        res.status(404).send('User not found');
        return;
      }

      let notification = {
        to: recipient.pushToken,
        title,
        body: message,
        data: {
          ...data,
          message,
          title,
        },
        ...otherConfiguration,
      };

      receipts = await expo.sendPushNotificationAsync(notification);
    }

    res.send({success: true, receipts});
  } catch (e) {
    console.log(e);
    res.send({success: false, error: JSON.stringify(e)});
  }
});

const server = http.createServer(app);
const port = 3000;

server.listen(port, () => {
  console.log('Express server running on *:' + port);
});
