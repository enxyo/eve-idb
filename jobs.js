const config = require('/cfg/config');
const qs = require('querystring');
const request = require('request');
const schedule = require('node-schedule');

var taskSchedule = new schedule.RecurrenceRule();
taskSchedule.minute = 50; //run every hour @:50

/*******************************************
** EVE setup
*******************************************/

const client_id = config.eve.client_id;
const client_secret = config.eve.client_secret;
const ESI_URL = config.eve.url;
const DATASOURCE = config.eve.datasource;
const CHARID = config.eve.char_id;
const CORPID = config.eve.corp_id;
const TYPE = 'corporations';
const CONTENT = 'industry/jobs';
const ATTRIBUTES = '&include_completed=true';

/*******************************************
** MYSQL setup
*******************************************/
const mysql = require('mysql');
var connection = mysql.createConnection({
    host     : config.mysql.host,
    user     : config.mysql.user,
    password : config.mysql.password,
    database : config.mysql.database
});

/*******************************************
** Functions for token refresh
*******************************************/
//Get refresh_token
function getToken(characterID, callback) {
	var sql_query = 'SELECT tokens.characterID, tokens.refreshToken FROM tokens WHERE tokens.characterID = ?';
	connection.query(sql_query, [characterID], function (error, results, fields)
	{
		if (error) return console.log('ERROR: An unexpected SQL error occured.');

		refresh_token = results[0].refreshToken;
		callback(refresh_token, getData);
	});
	//console.log(query.sql);
}

//Get new access token
function tokenRefresh(refresh_token, callback) {

	// Configure the request
	var options = {
		url: 'https://login.eveonline.com/oauth/token',
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Authorization': 'Basic ' + new Buffer(client_id + ':' + client_secret).toString('base64')
		},
		form: {
			'grant_type': 'refresh_token',
			'refresh_token': refresh_token
		}
	}

	// Start the request
	request(options, function (error, response, body) {
		if (!error && response.statusCode == 200) {
			json_body = JSON.parse(body);
			//console.log(body);
			access_token = json_body.access_token;

			callback(access_token, printData);
		}
	});
}

/*******************************************
** Functions for getting Data
*******************************************/
function getData(access_token, callback) {

	// Configure the request
	var options = {
		url: ESI_URL + '/' + TYPE + '/' + CORPID + '/' + CONTENT + '/' + DATASOURCE + ATTRIBUTES,
		method: 'GET',
		headers: {
			'User-Agent': 'IDB_INDUSTRY_DISCORD_BOT',
			'Accept': 'application/json',
			'Authorization': 'Bearer ' + access_token
		}
	}

	// Start the request
	request(options, function (error, response, body) {
		if (!error && response.statusCode == 200) {
			// Parse JSON
			json_body = JSON.parse(body);

			callback(doneData);
		}
	});
}

function printData(callback) {

	var pending = json_body.length;
	var completed_date = 'NULL';
	var completed_character_id = 'NULL';
	var successful_runs = 'NULL';
	if(json_body.hasOwnProperty('completed_date'))	var completed_date = json_body[i].completed_date;
	if(json_body.hasOwnProperty('completed_character_id'))	var completed_character_id = json_body[i].completed_character_id;
	if(json_body.hasOwnProperty('successful_runs'))	var successful_runs = json_body[i].successful_runs;

	for (var i=0; i<json_body.length; i++) {
		var sql_query = 'INSERT INTO jobs (jobs.job_id, jobs.installer_id, jobs.facility_id, jobs.location_id, jobs.activity_id, jobs.blueprint_id, jobs.blueprint_type_id, jobs.blueprint_location_id, jobs.output_location_id, jobs.runs, jobs.status, jobs.duration, jobs.start_date, jobs.end_date, jobs.cost, jobs.licensed_runs, jobs.probability, jobs.product_type_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE jobs.status=?, jobs.completed_date=?, jobs.completed_character_id=?, jobs.successful_runs=?';
		var query = connection.query(sql_query, [json_body[i].job_id, json_body[i].installer_id, json_body[i].facility_id, json_body[i].location_id, json_body[i].activity_id, json_body[i].blueprint_id, json_body[i].blueprint_type_id, json_body[i].blueprint_location_id, json_body[i].output_location_id, json_body[i].runs, json_body[i].status, json_body[i].duration, json_body[i].start_date, json_body[i].end_date, json_body[i].cost, json_body[i].licensed_runs, json_body[i].probability, json_body[i].product_type_id, json_body[i].status, completed_date, completed_character_id, successful_runs], function (error, results, fields)
		{
			if (error) return console.log('ERROR: An unexpected SQL error occured.');
			if( 0 === --pending ) {
                callback(); //callback if all queries are processed
            }
		});
		console.log(query.sql);
	}

}

function doneData() {
	//console.log('done');
}

function start() {
	getToken(CHARID,tokenRefresh);
	console.log('executed scheduled job');
}

schedule.scheduleJob(taskSchedule, start);

console.log('The schdule has been initialzed');
