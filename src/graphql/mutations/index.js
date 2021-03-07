const fs = require('fs');
const path = require('path');

module.exports.sendMessage = fs.readFileSync(path.join(__dirname, 'sendMessage.gql'), 'utf8');
module.exports.createGroupConversation = fs.readFileSync(path.join(__dirname, 'createGroupConversation.gql'), 'utf8');
module.exports.login = fs.readFileSync(path.join(__dirname, 'login.gql'), 'utf8');
module.exports.logout = fs.readFileSync(path.join(__dirname, 'logout.gql'), 'utf8');
module.exports.register = fs.readFileSync(path.join(__dirname, 'register.gql'), 'utf8');
