const config = require('/cfg/config');

const qs = require('querystring');
const request = require('request');

const express = require('express');
var app = express();

const mysql = require('mysql');
var connection = mysql.createConnection({
    host     : config.mysql.host,
    user     : config.mysql.user,
    password : config.mysql.password,
    database : config.mysql.database
});

const client_id = config.auth.client_id;
const client_secret = config.auth.client_secret;
const redirect_uri = config.auth.redirect_uri;
const scope =  config.auth.scopes;

var characterID, characterName, tokenType;
var code = undefined;
var access_token = undefined;
var refresh_token = undefined;
var json_body = undefined;


/*******************************************
** Redirect to EVE SSO
*******************************************/

function login (setup, res) {
    var query = qs.stringify(
        {
            response_type: "code",
            redirect_uri: setup.redirect_uri,
            client_id: setup.client_id,
            scope: setup.scope
        }
    );

    res.redirect('https://login.eveonline.com/oauth/authorize/?' + query);
}


/*******************************************
** Init auth process
*******************************************/

function authInit(code, callback) {
	// Configure the request
	var options = {
		url: 'https://login.eveonline.com/oauth/token',
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Authorization': 'Basic ' + new Buffer(client_id + ':' + client_secret).toString('base64')
		},
		form: {
			'grant_type': 'authorization_code',
			'code': code
		}
	}

	// Start the request
	request(options, function (error, response, body) {
		if (!error && response.statusCode == 200) {
			// Parse JSON
			json_body = JSON.parse(body);
			// Print out the response body
			//console.log(body);
			callback();
		}
	});
}


/*******************************************
** Get character id
*******************************************/

function authVerify(access_token, callback) {
	// Configure the request
	var options = {
		url: 'https://login.eveonline.com/oauth/verify',
		method: 'GET',
		headers: {
			'Authorization': 'Bearer ' + access_token
		}
	}

	// Start the request
	request(options, function (error, response, body) {
		if (!error && response.statusCode == 200) {
			// Parse JSON
			json_body = JSON.parse(body);
			// Print out the response body
			//console.log(body);
			callback();
		}
	});
}


/*******************************************
** Get access and refresh token
*******************************************/

function getTokens() {
	access_token = json_body.access_token;
	refresh_token = json_body.refresh_token;

	console.log('Access Token: ' + json_body.access_token);
	console.log('Refresh Token: ' + json_body.refresh_token);

	authVerify(access_token,getChar);
}

// Get access and refresh tokens
function getChar() {
	characterID = json_body.CharacterID;
	characterName = json_body.CharacterName;
	tokenType = json_body.TokenType;

	console.log('CharacterID: ' + json_body.CharacterID);
	console.log('Character: ' + json_body.CharacterName);
	console.log('Token Type: ' + json_body.TokenType);

	storeAuth(access_token, refresh_token, characterID, characterName, tokenType);
}

/*******************************************
** Store tokens into database
*******************************************/

function storeAuth(accessToken, refreshToken, characterID, characterName, tokenType) {
	var sql_query = 'INSERT INTO tokens (tokens.accessToken, tokens.refreshToken, tokens.characterID, tokens.characterName, tokens.tokenType) VALUES (?,?,?,?,?)';
	console.log(sql_query);
	connection.query(sql_query, [accessToken, refreshToken, characterID, characterName, tokenType], function (error, results, fields)
	{
		if (error) return console.log('ERROR: An unexpected SQL error occured.');
	});
}

/*******************************************
** Express
*******************************************/

app.get('/', (req, res) => {

    login({client_id, client_secret, redirect_uri, scope}, res);

});

app.get('/callback', (req, res) => {

	console.log(req.query.code);
	code = req.query.code;
	authInit(code,getTokens);
	res.send('Done');

});

app.listen(config.auth.port);
console.log('Server started! At http://localhost: ' + config.auth.port);
