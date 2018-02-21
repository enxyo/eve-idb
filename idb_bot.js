const config = require('./cfg/config');
const qs = require('querystring');
const request = require('request');
const schedule = require('node-schedule');

const q = require('q');

/*******************************************
** TASK SCHEDULE setup
*******************************************/

var taskSchedule = new schedule.RecurrenceRule();
taskSchedule.minute = 0;
taskSchedule.hour = 16;


/*******************************************
** DISCORD setup
*******************************************/

const discord = require("discord.js");
const client = new discord.Client();
const token = config.discord.token;

// Set the prefix
const prefix = ".";


/*******************************************
** EVE setup
*******************************************/

const client_id = config.eve.client_id;
const client_secret = config.eve.client_secret;
const esi_url = config.eve.url;
const datasource = config.eve.datasource;
const scope =  config.auth.scopes;


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
** EXPRESS
*******************************************/

const express = require('express');
var app = express();

app.get('/', (req, res) => {

    login({client_id, client_secret, redirect_uri, scope}, res);

});

app.get('/callback', (req, res) => {

	console.log(req.query.code);
	code = req.query.code;
	//authInit(code,getTokens);
	res.send('Done');

});

app.listen(config.auth.port);
console.log('Server started! At http://localhost: ' + config.auth.port);

/*******************************************
**  FUNCTIONS
*******************************************/

// Get all active jobs for given corp from database.
function getActiveJobs(corp) {
    var deferred = q.defer();

    var sql_query = 'SELECT * FROM eveJobs WHERE eveJobs.end_date > now() AND eveJobs.status=? AND eveJobs.corporationID=?';
    var query = connection.query(sql_query, ['active',corp], function (error, results, fields)
    {
        if (error) {
            deferred.reject(error);
        }
        else {
            deferred.resolve(results);
        }
    });
    //console.log(query.sql);
    return deferred.promise;
}

// Get all ready jobs for given corp from database.
function getReadyJobs(corp) {
    var deferred = q.defer();

    var sql_query = 'SELECT * FROM eveJobs WHERE eveJobs.end_date < now() AND eveJobs.status=? AND eveJobs.corporationID=?';
    var query = connection.query(sql_query, ['active',corp], function (error, results, fields)
    {
        if (error) {
            deferred.reject(error);
        }
        else {
            deferred.resolve(results);
        }
    });
    //console.log(query.sql);
    return deferred.promise;
}

// Get all active jobs for given corp from database ordered by end date first. Used for getting the next ready job(s).
function getNextJobs(corp) {
    var deferred = q.defer();

    var sql_query = 'SELECT * FROM eveJobs WHERE eveJobs.end_date > now() AND eveJobs.status = ? AND eveJobs.corporationID=? ORDER BY eveJobs.end_date';
    var query = connection.query(sql_query, ['active',corp], function (error, results, fields)
    {
        if (error) {
            deferred.reject(error);
        }
        else {
            deferred.resolve(results);
        }
    });
    //console.log(query.sql);
    return deferred.promise;
}

// Get number of ready jobs per installer for given corporation.
function getReadyJobsCount(corp) {
    var deferred = q.defer();

    var sql_query = 'SELECT COUNT(eveJobs.job_id) AS jobCount, eveJobs.installer_id, eveJobs.characterName FROM eveJobs WHERE eveJobs.end_date < now() AND eveJobs.status=? AND eveJobs.corporationID=? GROUP BY eveJobs.installer_id ORDER BY COUNT(eveJobs.job_id) DESC';
    var query = connection.query(sql_query, ['active',corp], function (error, results, fields)
    {
        if (error) {
            deferred.reject(error);
        }
        else {
            deferred.resolve(results);
        }
    });
    //console.log(query.sql);
    return deferred.promise;
}

// Get all active jobs for given corp from database ordered by end date first. Used for list all active job(s).
function getActiveJobsList(corp) {
    var deferred = q.defer();

    var sql_query = 'SELECT * FROM eveJobs WHERE eveJobs.end_date > now() AND eveJobs.status = ? AND eveJobs.corporationID=? ORDER BY eveJobs.end_date';
    var query = connection.query(sql_query, ['active',corp], function (error, results, fields)
    {
        if (error) {
            deferred.reject(error);
        }
        else {
            deferred.resolve(results);
        }
    });
    //console.log(query.sql);
    return deferred.promise;
}

// Check for discord user in database and use it for getting associated corp id.
function getUser(discordUser) {
    var deferred = q.defer();

    var sql_query = 'SELECT * FROM users WHERE users.discordID=?';
    var query = connection.query(sql_query, [discordUser], function (error, results, fields)
    {
        if (error) {
            deferred.reject(error);
        }
        else {
            deferred.resolve(results);
        }
    });
    //console.log(query.sql);
    return deferred.promise;
}

// Get corp name from database for given corp id.
function getCorpName(corporationID) {
    var deferred = q.defer();

    var sql_query = 'SELECT * FROM corporations WHERE corporations.corporationID=?';
    var query = connection.query(sql_query, [corporationID], function (error, results, fields)
    {
        if (error) {
            deferred.reject(error);
        }
        else {
            deferred.resolve(results);
        }
    });
    //console.log(query.sql);
    return deferred.promise;
}


/*******************************************
** DISCORD
*******************************************/

client.on("ready", () => {
    console.log(`Bot has started, with ${client.users.size} users, in ${client.channels.size} channels of ${client.guilds.size} guilds.`);
    client.user.setPresence({ game: { name: 'with BPOs', type: 0 } });
});

client.on("message", (message) => {
	if(message.author.bot) return;
	if(message.content.indexOf(prefix) !== 0) return;

	const args = message.content.slice(prefix.length).trim().toLowerCase().split(/ +/g);
	const command = args.shift().toLowerCase();

    /*
        aniles 122341111460003840
        infy 150742643486228480
	if(message.author.id !== '120982046817386499') {
		message.reply('Access denied!');
		return;
	}
    */

	if (command  === 'help') {
		message.channel.send('**Dir ist nicht zu helfen**');
	}

	if (command  === 'ping') {
        var now = new Date();
        message.author.send('Replying at ' + now);
        message.channel.send('**I have send you a DM.**');

	}

    if (command  === 'list') {
        q.all([getUser(message.author.id)]).spread(function(user) {
            if (user.length != 0) {
                for(var i=0;i<user.length;i++) {
                    q.all([getActiveJobs(user[i].corporationID),getReadyJobs(user[i].corporationID),getNextJobs(user[i].corporationID),getReadyJobsCount(user[i].corporationID),getActiveJobsList(user[i].corporationID),getCorpName(user[i].corporationID)]).spread(function(active,ready,next,count,list,corp) {
                        var msg = '**Job list for ' + corp[0].corporationName + '**\nThere are **' + active.length + '** active jobs and **' + ready.length + '** jobs ready.';
                        if(count.length != 0) {
                            msg += ' *(';
                            for (var i = 0;i < count.length; i++) {
                                msg += ' ' + count[0].jobCount + ' - ' + count[0].characterName + ' ';
                            }
                            msg +=')*\n\n';
                        }
                        message.reply(msg);

                        var jobList = '**List of active jobs:**\n';

                        for(var i=0; i<list.length; i++) {
                            if((i != 0) && ((i%10) == 0)) {
                                //console.log(jobList);
                                message.reply(jobList);
                                jobList = '**List of active jobs:**\n';
                            }
                            var currentDate = new Date();
                            var difference = list[i].end_date.getTime() - currentDate.getTime();
                            var daysDifference = Math.floor(difference/1000/60/60/24);
                            difference -= daysDifference*1000*60*60*24;
                            var hoursDifference = Math.floor(difference/1000/60/60);
                            difference -= hoursDifference*1000*60*60;
                            var minutesDifference = Math.floor(difference/1000/60);
                            difference -= minutesDifference*1000*60;
                            var secondsDifference = Math.floor(difference/1000);

                            jobList += '**' + list[i].runs + '**x **' + list[i].typeName + '** on *' + list[i].characterName + '* finishes in **' + daysDifference + 'd-' + hoursDifference + 'h:' + minutesDifference + 'm:' + secondsDifference + 's**\n';

                        }

                        if((list.length%10) != 0) {
                            message.reply(jobList);
                        }

                    }).done();
                }
            } else {
                message.reply('I do not know you.');
            }
        }).done();
	}

    if (command  === 'info') {
        q.all([getUser(message.author.id)]).spread(function(user) {
            if (user.length != 0) {
                for(var i=0;i<user.length;i++) {
                    q.all([getActiveJobs(user[i].corporationID),getReadyJobs(user[i].corporationID),getNextJobs(user[i].corporationID),getCorpName(user[i].corporationID)]).spread(function(active,ready,next,corp) {
                        if (next.length != 0) {
                            var currentDate = new Date();
                            var difference = next[0].end_date.getTime() - currentDate.getTime();
                            var daysDifference = Math.floor(difference/1000/60/60/24);
                            difference -= daysDifference*1000*60*60*24;
                            var hoursDifference = Math.floor(difference/1000/60/60);
                            difference -= hoursDifference*1000*60*60;
                            var minutesDifference = Math.floor(difference/1000/60);
                            difference -= minutesDifference*1000*60;
                            var secondsDifference = Math.floor(difference/1000);

                            message.reply('**Industry Report - ' + corp[0].corporationName + '**\nThere are **' + active.length + '** active jobs and **' + ready.length + '** jobs ready.\n\nNext Job is ready on **' + next[0].characterName + '** in **' + daysDifference + '** days **' + hoursDifference + '** hours **' + minutesDifference + '** minutes **' + secondsDifference + '** seconds.\nOn '+ next[0].end_date + '\n\n*Type .list for full job list.*');
                        }
                        else {
                            message.reply('**Industry Report - ' + corp[0].corporationName + '**\nThere are **' + active.length + '** active jobs and **' + ready.length + '** jobs ready.');
                        }

                    }).done();
                }
            } else {
                message.reply('I do not know you.');
            }
        }).done();
    }

	if (command === 'rm') {
        if (args.length != 4) {
            return message.channel.send(`Invalid input use: *.rm [0...\∞] [0...23] [0...60] <comment>*, ${message.author}!`);
        }

        var rm_d = parseInt(args[0]);
        var rm_h = parseInt(args[1]);
        var rm_m = parseInt(args[2]);
        var rm_c = args[3];

        if (isNaN(rm_d)) {
            return message.reply('1 Invalid input use: *.rm [0...\∞] [0...23] [0...60] <comment>*');
        }
        else if (isNaN(rm_h)) {
            return message.reply('2 Invalid input use: *.rm [0...\∞] [0...23] [0...60] <comment>*');
        }
        else if (rm_h < -1 || rm_h > 24 ) {
            return message.reply('3 Invalid input use: *.rm [0...\∞] [0...23] [0...60] <comment>*');
        }
        else if (isNaN(rm_m)) {
            return message.reply('4 Invalid input use: *.rm [0...\∞] [0...23] [0...60] <comment>*');
        }
        else if (rm_m < -1 || rm_m > 60 ) {
            return message.reply('5 Invalid input use: *.rm [0...\∞] [0...23] [0...60] <comment>*');
        }
        else {
            message.reply(rm_d + ' ' + rm_h + '' + rm_m + ' ' + rm_c);
        }

	}

});

function start() {
    var dmUser = client.users.get('120982046817386499');


    q.all([getUser('120982046817386499')]).spread(function(user) {
        for(var i=0;i<user.length;i++) {
            q.all([getActiveJobs(user[i].corporationID),getReadyJobs(user[i].corporationID),getNextJobs(user[i].corporationID),getCorpName(user[i].corporationID)]).spread(function(active,ready,next,corp) {
                if (next.length != 0) {
                    var currentDate = new Date();
                    var difference = next[0].end_date.getTime() - currentDate.getTime();
                    var daysDifference = Math.floor(difference/1000/60/60/24);
                    difference -= daysDifference*1000*60*60*24;
                    var hoursDifference = Math.floor(difference/1000/60/60);
                    difference -= hoursDifference*1000*60*60;
                    var minutesDifference = Math.floor(difference/1000/60);
                    difference -= minutesDifference*1000*60;
                    var secondsDifference = Math.floor(difference/1000);
                    dmUser.send('<@120982046817386499> **Industry Report - ' + corp[0].corporationName + '**\nThere are **' + active.length + '** active jobs and **' + ready.length + '** jobs ready.\n\nNext Job is ready on **' + next[0].characterName + '** in **' + daysDifference + '** days **' + hoursDifference + '** hours **' + minutesDifference + '** minutes **' + secondsDifference + '** seconds.\nOn '+ next[0].end_date + '\n\n*Type .list for full job list.*');
                }
                else {
                    dmUser.send('<@120982046817386499> **Industry Report - ' + corp[0].corporationName + '**\nThere are **' + active.length + '** active jobs and **' + ready.length + '** jobs ready.');
                }
            }).done();
        }
    }).done();
	//console.log('executed scheduled job');
}

function dm() {
    var duser = client.users.get('120982046817386499');
    duser.send('<content>');
}


schedule.scheduleJob(taskSchedule, start);
//console.log('The schdule has been initialzed');

client.login(token);
