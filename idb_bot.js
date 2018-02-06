const config = require('/cfg/config');
const qs = require('querystring');
const request = require('request');
const schedule = require('node-schedule');


/*******************************************
** TASK SCHEDULE setup
*******************************************/

var taskSchedule = new schedule.RecurrenceRule();
taskSchedule.minute = 59;
taskSchedule.hour = 15;


/*******************************************
** DISCORD setup
*******************************************/

const Discord = require("discord.js");
const client = new Discord.Client();
const token = config.discord.token;

// Set the prefix
const prefix = ".";


/*******************************************
** EVE setup
*******************************************/

const client_id = config.eve.client_id;
const client_secret = config.eve.client_secret;
const ESI_URL = config.eve.url;
const DATASOURCE = config.eve.datasource;


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
**
*******************************************/

var active, ready;

function getJobs(status, callback) {
		var sql_query = 'SELECT * FROM eveJobs WHERE eveJobs.status=?';
		var query = connection.query(sql_query, [status], function (error, results, fields)
		{
			if (error) return console.log('ERROR: An unexpected SQL error occured.');
			res = results.length;
			callback();
		});
		//console.log(query.sql);
}

function getNextJob(callback) {
		var sql_query = 'SELECT * FROM eveJobs WHERE eveJobs.status = ? ORDER BY eveJobs.end_date';
		var query = connection.query(sql_query, ['active'], function (error, results, fields)
		{
			if (error) return console.log('ERROR: An unexpected SQL error occured.');
			characterName = results[0].characterName;
			typeName = results[0].typeName;
			endDate = results[0].end_date;
			callback();
		});
		//console.log(query.sql);
}

function activeJobs(){
	active = res;
}

function readyJobs(){
	ready = res;
}

function nextJob() {

	var currentDate = new Date();

	var difference = endDate.getTime() - currentDate.getTime();

    var daysDifference = Math.floor(difference/1000/60/60/24);
    difference -= daysDifference*1000*60*60*24;

    var hoursDifference = Math.floor(difference/1000/60/60);
    difference -= hoursDifference*1000*60*60;

    var minutesDifference = Math.floor(difference/1000/60);
    difference -= minutesDifference*1000*60;

    var secondsDifference = Math.floor(difference/1000);

	client.channels.get('122175912983658500').send('<@120982046817386499> **Daily Industry Report**\nThere are **' + active + '** active jobs and **' + ready + '** jobs ready.\n\nNext Job is ready on **' + characterName + '** in **' + daysDifference + '** days **' + hoursDifference + '** hours **' + minutesDifference + '** minutes **' + secondsDifference + '** seconds.\nOn '+ endDate + '\n\n*Type .list for full job list.*');
}

client.on("ready", () => {
    console.log(`Bot has started, with ${client.users.size} users, in ${client.channels.size} channels of ${client.guilds.size} guilds.`);
    client.user.setPresence({ game: { name: 'with BPOs', type: 0 } });
});

client.on("message", (message) => {
	if(message.author.bot) return;
	if(message.content.indexOf(prefix) !== 0) return;

	const args = message.content.slice(prefix.length).trim().toLowerCase().split(/ +/g);
	const command = args.shift().toLowerCase();

	if(message.author.id !== '120982046817386499') {
		message.reply('Access denied!');
		return;
	}

	if (command  === 'help') {
		message.channel.send('**Dir ist nicht zu helfen**');
	}

	if (command  === 'ping') {
		var now = new Date();
		message.author.send('Replying at ' + now);
		message.channel.send('**I have send you a DM.**');
	}

	if (command === 'test') {
		getJobs('active',activeJobs);
		getJobs('ready',readyJobs);
		getNextJob(nextJob);
	}

});

function start() {
	getJobs('active',activeJobs);
	getJobs('ready',readyJobs);
	getNextJob(nextJob);
	//console.log('executed scheduled job');
}

schedule.scheduleJob(taskSchedule, start);
//console.log('The schdule has been initialzed');

client.login(token);
