var config = {};

config.auth = {};
config.mysql = {};
config.eve = {};
config.discord = {};

const CLIENT_ID = ''; // client id from your app - get from https://developers.eveonline.com/applications
const CLIENT_SECRET = ''; // client secret of your app - get from https://developers.eveonline.com/applications

/*******************************************
** EVE APP AUTH setup
*******************************************/

config.auth.client_id = CLIENT_ID;
config.auth.client_secret = CLIENT_SECRET;
config.auth.redirect_uri = ''; // callback url of your app - get from https://developers.eveonline.com/applications
config.auth.scopes = ''; // list of scopes - get from https://developers.eveonline.com/applications
config.auth.port = 1337; // port you listen on with express for auth


/*******************************************
** MYSQL setup
*******************************************/

config.mysql.host = ''; // mysql database host
config.mysql.user = ''; // mysql database user
config.mysql.password = ''; // mysql database password
config.mysql.database = ''; // mysql database


/*******************************************
** EVE setup
*******************************************/

config.eve.client_id = CLIENT_ID;
config.eve.client_secret = CLIENT_SECRET;
config.eve.url = 'https://esi.tech.ccp.is/latest'; // eve api source
config.eve.datasource = '?datasource=tranquility'; // eve api datasource
config.eve.char_id = 123456789; // eve character id
config.eve.corp_id = 123456789; // eve corporation id


/*******************************************
** DISCORD setup
*******************************************/

config.discord.token = ''; // discord bot token


module.exports = config;
