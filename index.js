//=====================================
// DESTINATION TABLE
//=====================================
// var table = 'shipyard.tracking';
// var table = 'test.trackingtest';
 var table = 'shipyard.vegatracking';

//=====================================
// REQUIRED MODULES
//=====================================
var express = require('express');
var params = require('express-params');
var mysql = require('mysql');
var fs = require('fs');
var winston = require('winston');
var http = require('http');

var verbose, log;

var pool = mysql.createPool({
      host: process.env['DB_HOST'],
      port: process.env['DB_PORT'],
      database: process.env['DB_NAME'],
      user: process.env['DB_USER'],
      password: process.env['DB_PWD'],
      multipleStatements: true
    });

//=====================================
// Route definitions
//=====================================
var featuresRegEx = '/track/appName/:Name/action/:Action/personId/:PersonId/consultationId/:ConsultationId/cmIds/:CouncilMemberId/features/:Features';
var cmidRegEx = '/track/appName/:Name/action/:Action/personId/:PersonId/consultationId/:ConsultationId/cmIds/:CouncilMemberId';
var similarCmsRegEx = '/track/appName/:Name/action/:Action/personId/:PersonId/consultationId/:ConsultationId/originalcmId/:AdditionalId/cmIds/:CouncilMemberId';
var origCmRegEx = '/track/appName/:Name/action/:Action/personId/:PersonId/consultationId/:ConsultationId/originalcmId/:AdditionalId/personName/:AdditionalComment/cmIds/:CouncilMemberId';
var contactIdRegEx = '/track/appName/:Name/action/:Action/contactId/:ContactId/consultationId/:ConsultationId/cmIds/:CouncilMemberId';
var loginIdRegEx = '/track/appName/:Name/action/:Action/loginId/:LoginId/consultationId/:ConsultationId/cmIds/:CouncilMemberId';
var leadIdRegEx = '/track/appName/:Name/action/:Action/personId/:PersonId/consultationId/:ConsultationId/leadIds/:LeadId';
var emailOpenRegEx = '/track/appName/:Name/action/:Action/rmId/:PersonId/reportId/:LoginId';
var eventRegEx = '/track/appName/:Name/action/:Action/meetingId/:ProductId/productType/:ProductType/cmIds/:CouncilMemberId';
var surveyRegEx = '/track/appName/:Name/action/:Action/surveyId/:ProductId/productType/:ProductType/cmIds/:CouncilMemberId';
var visitRegEx = '/track/appName/:Name/action/:Action/visitId/:ProductId/productType/:ProductType/cmIds/:CouncilMemberId';
var clientAndContactRegEx = '/track/appName/:Name/action/:Action/clientId/:ClientId/contactId/:ContactId/councilMemberId/:CouncilMemberId';
var loginIdActionRegEx = '/track/appName/:Name/action/:Action/loginId/:LoginId';
var loginAndClientIdRegEx = '/track/appName/:Name/action/:Action/loginId/:LoginId/clientId/:ClientId';

//=====================================
// Legacy Route definitions
//=====================================
var legacyFeaturesRegex = /^\/track\/appName\/(([A-Za-z]|[0-9]|[_]|[\-])+)\/action\/((\w)+)\/personId\/((\d)+)\/consultationId\/((\d)+)\/cmIds\/(([0-9]|[\/])+)+\/features\/((\w)+)/
var legacyCmidListRegex = /^\/track\/appName\/(([A-Za-z]|[0-9]|[_]|[\-])+)\/action\/((\w)+)\/personId\/((\d)+)\/consultationId\/((\d)+)\/cmIds\/(([0-9]|[\/])+)+/
var legacyOrigCmidRegex = /^\/track\/appName\/(([A-Za-z]|[0-9]|[_]|[\-])+)\/action\/((\w)+)\/personId\/((\d)+)\/consultationId\/((\d)+)\/originalcmId\/((\d)+)\/cmIds\/(([0-9]|[\/])+)+/
var legacyRmNameRegex = /^\/track\/appName\/(([A-Za-z]|[0-9]|[_]|[\-])+)\/action\/((\w)+)\/personId\/((\d)+)\/consultationId\/((\d)+)\/originalcmId\/((\d)+)\/personName\/(([A-Za-z]|[0-9]|[\+]|[\-]|[%]|[\.])+)+\/cmIds\/(([0-9]|[\/])+)+/
var legacyContactIdRegex = /^\/track\/appName\/(([A-Za-z]|[0-9]|[_]|[\-])+)\/action\/((\w)+)\/contactId\/((\d)+)\/consultationId\/((\d)+)\/cmIds\/(([0-9]|[\/])+)+/
var legacyLoginIdRegex = /^\/track\/appName\/(([A-Za-z]|[0-9]|[_]|[\-])+)\/action\/((\w)+)\/loginId\/((\w)+)\/consultationId\/((\d)+)\/cmIds\/(([0-9]|[\/])+)+/
var legacyLeadIdsRegex = /^\/track\/appName\/(([A-Za-z]|[0-9]|[_]|[\-])+)\/action\/((\w)+)\/personId\/((\d)+)\/consultationId\/((\d)+)\/leadIds\/(([0-9]|[\/])+)+/
var legacyMailOpenRegex = /^\/track\/appName\/(([A-Za-z]|[0-9]|[_]|[\-])+)\/action\/((\w)+)\/rmId\/((\d)+)\/reportId\/(([0-9]|[\-])+)+/


//=====================================
// INITIALIZE LOGGER
//=====================================
function getLogger() {
  winston.setLevels(winston.config.syslog.levels);

  if(process.argv.indexOf('debug') > -1) {
    logLevel = "debug"
  } else {
    logLevel = "info"
  };

  var logger = new winston.Logger(
    {
      transports: [
        new winston.transports.Console({
          level: logLevel,
          timestamp: true
        })
      ]
    })

  return logger;
};

var log = getLogger();

//=====================================
// INITIALIZE EXPRESS
//=====================================
var app = express();
var default_port = 80;


params.extend(app);

//=====================================
// START HTTP AND WS SERVERS
//=====================================
server = http.createServer(app).listen(typeof process.env['PORT'] !== 'undefined' ? process.env['PORT'] : default_port);

process.on('uncaughtException', function(err) {
    log.error("Uncaught exception! ", err);
    log.error(err.stack);
    process.exit();
});

WebSocketServer = require('ws').Server;
wss = new WebSocketServer({
  server: server
});

log.info("HTTP & WS servers listening on port " + (typeof process.env['PORT'] !== 'undefined' ? process.env['PORT'] : default_port) + ".");

//=====================================
// DEFINE QUERY PARAMETERS
//=====================================
// parameter names must match column names in shipyard.tracking

// required REST parameters
app.param('Name', /[A-z0-9_\-]+/ );
app.param('Action', /\w+/ );

// optional single value REST parameters
app.param('PersonId', /\d+/ );
app.param('ContactId', /\d+/ );
app.param('AdditionalId', /\d+/ );
app.param('LoginId', /[A-z0-9_\-]+/ );
app.param('ConsultationId', /\d+/ );
app.param('Features', /\w+/ );
app.param('AdditionalComment', /[A-z0-9\+\-%\.]+/ );
app.param('ClientId', /\d+/ );

// optional multi-value REST parameters
app.param("CouncilMemberId",function(req,res,next,val){
  try {
      if(/\[[0-9\"\',]+\]$/.test(val)) {
        // vega_search sends in values that end in a comma -- this is a bandaid
        if (typeof val === 'undefined') {
          val = 0;
        }
        if (val.indexOf(',]', val.length - 2) !== -1) {
          val = val.substr(0, val.length - 2) + "]";
          log.debug('description="Corrected CouncilMemberId string ending in a comma", cmIds="' + val + '", originalUrl="' + req.originalUrl + '"');
        }
        req.params.CouncilMemberId = JSON.parse(val);
        next();
      } else {
          if (val.indexOf(',') > -1) {
            log.debug('description="CM list without brackets", originalUrl="' + req.originalUrl + '"');
          }
          var foo = '[' + val + ']'; // For single values
          if(/\[[0-9,]+\]$/.test(foo)) {
              req.params.CouncilMemberId = JSON.parse(foo);
              next();
          } else {
              requestResponse("error","cmIds must be an array of ints; e.g., [123,345,456]", res, null);
              log.error('description="not an array of ints", originalUrl="' + req.originalUrl + '"');
          }
      };
  } catch (err) {
      log.error('status="Error parsing CouncilMemberId", originalUrl="' + req.originalUrl + '"');
      requestResponse("error", 'Error parsing CouncilMemberId', res, null);
  }
});

app.param("LeadId",function(req,res,next,val){
  try {
      if(/\[[0-9,]+\]/.test(val)) {
        // vega_search sends in values that end in a comma -- this ia a bandaid
        if (typeof val === 'undefined') {
          val = 0;
        }
        if (val.indexOf(',]', val.length - 2) !== -1) {
            val = val.substr(0, val.length - 2) + "]";
            log.debug('description="Corrected LeadId string ending in a comma", leadIds="' + val + '", originalUrl="' + req.originalUrl + '"');
        }
        req.params.LeadId = JSON.parse(val);
        next();
      } else {
          if (val.indexOf(',') > -1) {
            log.debug('description="Lead list without brackets", originalUrl="' + req.originalUrl + '"');
          }
          var foo = '[' + val + ']'; // For single values
          if(/\[[0-9,]+\]$/.test(foo)) {
              req.params.LeadId = JSON.parse(foo);
              next();
          } else {
              requestResponse("error","leadIds must be an array of ints; e.g., [123,345,456]", res, null);
              log.error('description="not an array of ints", originalUrl="' + req.originalUrl + '"');
          }
      };
  } catch (err) {
      requestResponse("error", 'Error parsing LeadId', res, null);
      log.error('status="Error parsing LeadId", originalUrl="' + req.originalUrl + '"');
  }
});


//=====================================
// DEFINE HELPER FUNCTIONS
//=====================================

function requestResponse(status, description, http_channel, ws_channel) {
  log.debug("requestResponse called.");
  var response = {status: status, description: description};
  var http_code = ((status === 'error') ? 500 : 200);
  if (http_channel !== null) {
    // http
    http_channel.jsonp(http_code, response);
  }
  else if (ws_channel !== null) {
    // ws
    ws_channel.send(JSON.stringify(response));
  }
  else {
    // otherwise error
    response.channel = "unknown";
    log.error('status="' + response.status + '", description:"' + response.description + '", channel="' + response.channel + '"');
  }
}

function sqlExecute(sql, http_channel, ws_channel) {
  log.debug("sqlExecute start ...");
  pool.getConnection(function(error, cnx) {

    if(error !== null && typeof error !== 'undefined') {
        log.error("... getConnection returned an error: " + error);
        log.debug("... Exiting.");
        process.exit();
    }

    var status;
    log.debug("... getConnection called ...");
    if(cnx !== null && typeof cnx !== 'undefined') {
      log.debug("... connection is valid ...");
      try {
          cnx.query(sql, function(err, rows){
            log.debug("... query finished ...");
            if(err !== null && typeof err !== 'undefined') {
              status = "error";
              desc = "failed to execute sql";
              log.error('sql="' + sql + '", description="' + err + '"');
              requestResponse(status, desc, http_channel, ws_channel);
            } else {
              status = "success";
              desc = "tracking event captured";
              log.debug("Executed SQL:  " + sql);
              requestResponse(status, desc, http_channel, ws_channel);
            };
            log.debug("... releasing connection ...")
            cnx.release();
          });
        } catch (err) {
            log.error('description="Caught an exception in sqlExecute: ' + err + '"');
            status = "error";
            desc = "Failed to query database";
            log.error('description="' + desc + ': ' + JSON.stringify(error) + '", sql= "' + sql + '"');
            requestResponse(status, desc, http_channel, ws_channel);
            login.error('Exiting ...');
            process.exit();
        }
    } else {
      status = "error";
      desc = "Failed to connect to database";
      log.error('description="' + desc + ': ' + JSON.stringify(error) + '", sql= "' + sql + '"');
      requestResponse(status, desc, http_channel, ws_channel);
    };
    log.debug("... leaving sqlExecute.")
  });
};

// Punting for now on refactoring code to reconcile
// similarities between findDuplicate and sqlExecute
// TODO: find a more elegant approach

function findDuplicate(sql, http_channel, ws_channel, cb) {
  log.debug("findDuplicate start ...");
  pool.getConnection(function(error, cnx) {
    if(error !== null && typeof error !== 'undefined') {
        log.error('description="getConnection (findDuplicate) returned an error: ' + error + '"');
        log.debug("... Exiting.");
        process.exit();
    }
    var status;

    log.debug("... findDuplicate getConnection called ...");

    if(cnx !== null && typeof cnx !== 'undefined') {
      log.debug("... findDuplicate connection is valid ...");
      try {
        cnx.query(sql, function(err, rows){
          if(err !== null && typeof err !== 'undefined') {
            status = "error";
            desc = "failed to execute sql";
            log.error('sql="' + sql + '", description="' + err + '"');
          } else {
            status = "success";
            desc = "findDuplicate called";
            log.debug("Executed SQL:  " + sql);
            if (typeof rows === 'undefined')  {
               rows = [];
            }
            cb(rows);
          };
          log.debug("... releasing connection ...")
          cnx.release();
        });
      } catch (err) {
          status = "error";
          desc = "Failed to query database for duplicate";
          log.error('description="' + desc + ': ' + JSON.stringify(err) + '", sql="' + sql + '"');
          cb(status, desc, http_channel, ws_channel);
          login.error('Exiting ...');
          process.exit();
      }
    } else {
      status = "error";
      desc = "Failed to connect to database in findDuplicate";
      log.error('description="' + desc + ': ' + JSON.stringify(error) + '", sql="' + sql + '"');
    };
  });
  log.debug("... leaving findDuplicate");
};

function status(http_channel, ws_channel) {
  log.debug("status called.");
  pool.getConnection(function(err, cnx) {
    var status = "";
    if(cnx !== null && typeof cnx !== 'undefined') {
      status = "success";
      desc = "Function status called";
      cnx.release();
    } else {
      status = "error"
      desc = "failed to connect to DB";
      log.error('description="' + desc + ': ' + JSON.stringify(err) + '"');
    };
    requestResponse(status, desc, http_channel, ws_channel);
  });
};

function processMessage(req, http_channel, ws_channel, arrayLabel) {
  log.debug("Inside processMessage");
  var msg = req.params;
  var initSqlStr = "insert into " + table + " (";
  var paramList = []
  var valueList = []
  var idArray = {};
  var sql = "";

  if(typeof arrayLabel !== 'undefined' & arrayLabel.length > 0) {
    idArray.key = arrayLabel;
    idArray.values = msg[arrayLabel]
    log.debug('arrayLabel="' + arrayLabel + '", idArray.values="' + JSON.stringify(idArray.values) + '"');
  } else {
    log.debug("arrayLabel is empty");
    idArray = null;
  }

  for(var p in msg) {
    if(p != arrayLabel && typeof p !== 'undefined' && p !== null) {
      paramList.push(p);
      valueList.push(msg[p]);
    };
  };

   log.debug("paramList='" + paramList.join(',') + "'");
   log.debug("valueList='" + valueList.join(',') + "'");

  if (idArray !== null && typeof idArray !== 'undefined') {
    for (var i = 0 ; i < idArray.values.length; i++) {
      multiSQLStr = new String(initSqlStr);
      paramList.push(idArray.key);
      // ensure that cmIDs and LeadIDs are Ints
      valueList.push(parseInt(idArray.values[i]));
      multiSQLStr += paramList.join(',') + ") values ('" + valueList.join("','") + "');";
      sql += multiSQLStr;
      paramList.pop();
      valueList.pop();
    }
  } else {
    sql = new String(initSqlStr);
    sql += paramList.join(',') + ") values ('" + valueList.join("','") + "');";
  };
  log.debug("Calling sqlExecute for " + sql);
  log.debug("MSG = " + JSON.stringify(msg));
  sqlExecute(sql, http_channel, ws_channel);
};

function defaultMessageHandler(req, res, next, arrayLabel) {
  try {
    processMessage(req, res, null, arrayLabel);
    log.info('status="success", protocol="' + req.protocol + '", path="' + req.originalUrl + '", method="get", legacy="false"');
  }
  catch (err) {
    log.error('description="' + JSON.stringify(err) + '"');
    requestResponse("error", err, res, null);
  };
};

function legacyMessageHandler(req, res, route) {
  var convertedParams = {};
  convertedParams['Name'] = req.params[0];
  convertedParams['Action'] = req.params[2]

  if (route !== 'emailopen') {
      convertedParams['ConsultationId'] = req.params[6];
  } else {
      convertedParams['LoginId'] = req.params[6];
  }

  switch(route) {
      case 'login':
         convertedParams['LoginId'] = req.params[4];
         break;
      case 'contact':
         convertedParams['ContactId'] = req.params[4];
         break;
      default:
         convertedParams['PersonId'] = req.params[4];
  }

  switch(route) {
      case 'leadid':
         arrayLabel = "LeadId";
         break;
      case 'emailopen':
         arrayLabel = '';
         break;
      default:
         arrayLabel = 'CouncilMemberId';
  }

  if (route === 'Features') {
      convertedParams['Features'] = req.params[10];
  }


  switch(route) {
      case 'Features':
      case 'cmidList':
      case 'contact':
      case 'login':
      case 'leadid':
          var IDs = req.params[8].split('/');
          var idArray = [];
          for (var i = 0; i < IDs.length; i++) {
              idArray.push(IDs[i]);
          }
          if (route === 'leadid') {
              convertedParams['LeadId'] = idArray;
          } else {
              convertedParams['CouncilMemberId'] = idArray;
          }
          break;
      case 'similarcms':
      case 'rmname':
          convertedParams['AdditionalId'] = req.params[8];
          if (route === 'similarcms') {
             var IDs = req.params[10].split('/');
          } else {
              convertedParams['AdditionalComment'] = req.params[10];
              var IDs = req.params[12].split('/');
          }

          var idArray = [];
          for (var i = 0; i < IDs.length; i++) {
              idArray.push(IDs[i]);
          }
          convertedParams['CouncilMemberId'] = idArray;
          break;
  }

  try {
    req.params = convertedParams;
    processMessage(req, res, null, arrayLabel);
    log.info('status="success", protocol="' + req.protocol + '", path="' + req.originalUrl + '", method="get", legacy="true"');

  }
  catch (err) {
    log.error('status="error", protocol="' + req.protocol + '", path="' + req.originalUrl + '", method="get", legacy="true", description="' + JSON.stringify(err) + '"');
    requestResponse("error", err, res, null);
  };
};

//=====================================
// EXPRESS REST ROUTES
//=====================================

// serving static content - e.g., redirect.html & jquery.min.js
// curl -g http://localhost:3000/redirect.html?href=http%3A%2F%2Fvega.glgroup.com%2FConsult%2Fmms%2FManageConsultation.aspx%3Frid%3D456&cmid=111&consultationId=456&appName=TESTER&action=add&personId=123
app.use(express.static(__dirname + '/public'));

// health check
app.get(/^\/status/,
  function(req, res) {
    status(res, null);
});

// curl -g http://localhost:3000/track/appName/TESTER/action/add/personId/123/consultationId/456/cmIds/[111,222,333]/features/quince
// curl -g http://localhost:3000/track/appName/TEST_ER/action/add/personId/123/consultationId/456/cmIds/[111,222,333]/features/quince
// curl -g http://localhost:3000/track/appName/TEST-ER/action/add/personId/123/consultationId/456/cmIds/[111,222,333]/features/quince
app.get(featuresRegEx, function(req, res, next) {
    defaultMessageHandler(req, res, next, 'CouncilMemberId');
  }
);

// Legacy
// curl http://localhost:3000/track/appName/TESTER/action/add/personId/123/consultationId/456/cmIds/111/222/333/features/lala
app.get(legacyFeaturesRegex,
        function(req, res) {
            //log.info('*********** Calling legacyMessageHandler **************');
            legacyMessageHandler(req, res, 'Features');
});


// curl -g http://localhost:3000/track/appName/TESTER/action/add/personId/123/consultationId/456/cmIds/[111,222,333]
// TODO: below are not handled properly - i.e., not failing, should change how regex's are utilized
// curl -g http://localhost:3000/track/appName/TESTER/action/add/personId/123-4/consultationId/456/cmIds/[111,222,333]
// curl -g http://localhost:3000/track/appName/TESTER/action/add_up/personId/123/consultationId/456/cmIds/[111,222,333]
// curl -g http://localhost:3000/track/appName/TESTER/action/add-down/personId/123/consultationId/456/cmIds/[111,222,333]
app.get(cmidRegEx, function(req, res, next) {
    defaultMessageHandler(req, res, next, 'CouncilMemberId');
  }
);

// Legacy
// curl http://localhost:3000/track/appName/TESTER/action/add/personId/123/consultationId/456/cmIds/111/222/333
app.get(legacyCmidListRegex,
    function(req, res) {
        legacyMessageHandler(req, res, 'cmidList');
});

// curl -g http://localhost:3000/track/appName/TESTER/action/add/personId/123/consultationId/456/originalcmId/777/cmIds/[111,222,333]
// For Similar CMs only
app.get(similarCmsRegEx, function(req, res, next) {
    defaultMessageHandler(req, res, next, 'CouncilMemberId');
  }
);


// Legacy
//  curl http://localhost:3000/track/appName/TESTER/action/add/personId/123/consultationId/456/originalcmId/777/cmIds/111/222/333
app.get(legacyOrigCmidRegex,
    function(req, res) {
        legacyMessageHandler(req, res, 'similarcms');
});


// curl -g http://localhost:3000/track/appName/TESTER/action/matched/personId/965486/consultationId/456/originalcmId/777/personName/Fred+Smith-Smythe/cmIds/[111,222,333]
// For Similar CMs only
app.get(origCmRegEx, function(req, res, next) {
    defaultMessageHandler(req, res, next, 'CouncilMemberId');
  }
);

// Legacy
// curl http://localhost:3000/track/appName/TESTER/action/add/personId/123/consultationId/456/originalcmId/777/personName/Fred+Smith-Smythe/cmIds/111/222/333
// curl http://localhost:3000/track/appName/TESTER/action/matched/personId/965486/consultationId/1818588/originalcmId/0/personName/Lucy+O%27Sullivan/cmIds/632350
// curl http://localhost:3000/track/appName/TESTER/action/notmatched/personId/819355/consultationId/1823523/originalcmId/0/personName/Lesley+C.+Ornelas/cmIds/13883
app.get(legacyRmNameRegex,
   function(req, res) {
       legacyMessageHandler(req, res, 'rmname');
});



//   curl -g http://localhost:3000/track/appName/TESTER/action/add/contactId/123/consultationId/456/cmIds/[111,222,333]
app.get(contactIdRegEx, function(req, res, next) {
    defaultMessageHandler(req, res, next, 'CouncilMemberId');
  }
);

// Legacy
//   curl http://localhost:3000/track/appName/TESTER/action/add/contactId/123/consultationId/456/cmIds/111/222/333
app.get(legacyContactIdRegex,
    function(req, res) {
        legacyMessageHandler(req, res, 'contact');
});




//   curl -g http://localhost:3000/track/appName/TESTER/action/add/loginId/bwayne/consultationId/456/cmIds/[111,222,333]
app.get(loginIdRegEx, function(req, res, next) {
    defaultMessageHandler(req, res, next, 'CouncilMemberId');
  }
);

// Legacy
//   curl http://localhost:3000/track/appName/TESTER/action/add/loginId/bwayne/consultationId/456/cmIds/111/222/333
app.get(legacyLoginIdRegex,
    function(req, res) {
        legacyMessageHandler(req, res, 'login');
});



//  curl -g http://localhost:3000/track/appName/TESTER/action/add/personId/345/consultationId/456/leadIds/[111,222,333]
app.get(leadIdRegEx, function(req, res, next) {
    defaultMessageHandler(req, res, next, 'LeadId');
  }
);

// Legacy
//  curl http://localhost:3000/track/appName/TESTER/action/add/personId/345/consultationId/456/leadIds/111/222/333
app.get(legacyLeadIdsRegex,
    function(req, res) {
        legacyMessageHandler(req, res, 'leadid');
});


// There should be no legacy clients using the routes containing ProductType.
//  curl -g http://localhost:3000/track/appName/TESTER/action/add/MeetingId/345/ProductType/event/cmIds/[111,222,333]
app.get(eventRegEx, function(req, res, next) {
    defaultMessageHandler(req, res, next, 'CouncilMemberId');
  }
);


//  curl -g http://localhost:3000/track/appName/TESTER/action/add/SurveyId/345/ProductType/survey/cmIds/[111,222,333]
app.get(surveyRegEx, function(req, res, next) {
    defaultMessageHandler(req, res, next, 'CouncilMemberId');
  }
);


//  curl -g http://localhost:3000/track/appName/TESTER/action/add/VisitId/345/ProductType/visit/cmIds/[111,222,333]
app.get(visitRegEx, function(req, res, next) {
    defaultMessageHandler(req, res, next, 'CouncilMemberId');
  }
);


//  curl -g http://localhost:3000/track/appName/TESTER/action/recommend/ClientId/345/ContactId/678/CouncilMemberId/111
app.get(clientAndContactRegEx, function(req, res, next) {
    defaultMessageHandler(req, res, next, '');
  }
);


//  curl -g http://localhost:3000/track/appName/TESTER/action/open/loginId/345
app.get(loginIdActionRegEx, function(req, res, next) {
    defaultMessageHandler(req, res, next, '');
  }
);


//  curl -g http://localhost:3000/track/appName/TESTER/action/query/loginId/123/ClientId/345
app.get(loginAndClientIdRegEx, function(req, res, next) {
    defaultMessageHandler(req, res, next, '');
  }
);

function emailOpenMessageHandler(req, http_channel, ws_channel) {
  log.debug("emailOpenMessageHandler called.");
  var msg = req.params;
  var dup_query = "SELECT * FROM " + table + " WHERE LoginId = '" + msg.LoginId + "';"
  findDuplicate(dup_query, null, null, function(rows) {
    if (typeof rows === 'undefined') {
      rows = [];
    };
    if(rows.length === 0) {
      try {
        processMessage(req, http_channel, ws_channel,'');
      }
      catch (err) {
        log.error('description="Error in emailOpenMessageHandler: ' + err + '", dup_query="' + dup_query + '"');
        requestResponse("error", err, http_channel, ws_channel);
      };
    } else {
      var desc = "Duplicate found: " + msg.LoginId
      log.debug("description=" + desc);
      requestResponse("duplicate", desc, http_channel, ws_channel);
    };
  });
};

function legacyEmailOpenMessageHandler(req, http_channel, ws_channel) {
  log.debug("legacyEmailOpenMessageHandler called.");
  var msg = req.params;
  var loginid = msg[6];
  var dup_query = "SELECT * FROM " + table + " WHERE LoginId = '" + loginid + "';"
  findDuplicate(dup_query, null, null, function(rows) {
    if (typeof rows === 'undefined') {
      rows = [];
    };
    if(rows.length === 0) {
      legacyMessageHandler(req, res, 'emailopen');
    } else {
      var desc = "Duplicate found: " + loginid;
      log.debug("description=" + desc);
      requestResponse("duplicate", desc, http_channel, ws_channel);
    };
  });
};

// Duplicate:  curl -g http://localhost:3000/track/appName/TESTER/action/emailopen/rmId/345/reportId/927090-2014-01-17
// Change year to the future for non-dup.
app.get(emailOpenRegEx, function(req, res, next) {
  try {
    emailOpenMessageHandler(req, res);
    log.info('status="success", protocol="http", method="get", legacy="false", path="' + req.originalUrl + '"');
  }
  catch (error) {
    log.error('status="error", protocol="http", method="get", legacy="false", path="' + req.originalUrl + '"');
  }
});

// Legacy
// Duplicate:  curl http://localhost:3000/track/appName/TESTER/action/emailopen/rmId/345/reportId/927090-2014-01-17
// Change year to the future for non-dup.
//
app.get(legacyMailOpenRegex,
  function(req, res) {
    try {
      legacyEmailOpenMessageHandler(req, res);
      log.info('status="success", protocol="http", method="get", legacy="true", path="' + req.originalUrl + '"');
    }
    catch (error) {
      log.error('status="error", protocol="http", method="get", legacy="true", path="' + req.originalUrl + '"');
    }
});

//=====================================
// Web Sockets
//=====================================

// Test Messages:
// $ npm install -g ws
// $ wscat -c ws://localhost:3000
// {"IdArray":{"key":"CouncilMemberId","values":[111,222,333]},"Name":"TESTER","Action":"add","PersonId":"123","ConsultationId":"456","Features":"lala"}
// {"IdArray":{"key":"CouncilMemberId","values":[111,222,333]},"Name":"TESTER","Action":"add","PersonId":"123","ConsultationId":"456"}
// {"IdArray":{"key":"CouncilMemberId","values":[111,222,333]},"Name":"TESTER","Action":"add","PersonId":"123","ConsultationId":"456","AdditionalId":"777"}
// {"IdArray":{"key":"CouncilMemberId","values":[442916]},"Name":"TESTER","Action":"notmatched","PersonId":"933412","ConsultationId":"1821606","AdditionalId":"0","AdditionalComment":"Liam McNamara"}
// {"IdArray":{"key":"CouncilMemberId","values":[111,222,333]},"Name":"TESTER","Action":"add","PersonId":"123","ConsultationId":"456","AdditionalId":"777","AdditionalComment":"Fred Smith-Smythe"}
// {"IdArray":{"key":"CouncilMemberId","values":[632350]},"Name":"TESTER","Action":"matched","PersonId":"965486","ConsultationId":"1818588","AdditionalId":"0","AdditionalComment":"Lucy O'Sullivan"}
// {"IdArray":{"key":"CouncilMemberId","values":[13883]},"Name":"TESTER","Action":"notmatched","PersonId":"819355","ConsultationId":"1823523","AdditionalId":"0","AdditionalComment":"Lesley C. Ornelas"}
// {"IdArray":{"key":"CouncilMemberId","values":[111,222,333]},"Name":"TESTER","Action":"add","ContactId":"123","ConsultationId":"456"}
// {"IdArray":{"key":"CouncilMemberId","values":[111,222,333]},"Name":"TESTER","Action":"add","LoginId":"bwayne","ConsultationId":"456"}
// {"IdArray":{"key":"LeadId","values":[111,222,333]},"Name":"TESTER","Action":"add","PersonId":"345","ConsultationId":"456"}
// {"IdArray":{},"Name":"TESTER","Action":"emailopen","PersonId":"345","LoginId":"927090-2014-01-17"}
// {"Name":"TESTER","Action":"emailopen","PersonId":"345","LoginId":"927090-2014-01-17"}
// {"Name":"TESTER","Action":"emailopen","PersonId":"345","LoginId":"927090-2015-01-17"}
//
// {"IdArray":{"key":"CouncilMemberId","values":[111,222,333]},"Name":"TESTER","Action":"add","ProductId":"123","ProductType":"event"}
// {"IdArray":{"key":"CouncilMemberId","values":[111,222,333]},"Name":"TESTER","Action":"add","ProductId":"123","ProductType":"survey"}
// {"IdArray":{"key":"CouncilMemberId","values":[111,222,333]},"Name":"TESTER","Action":"add","ProductId":"123","ProductType":"visit"}


wss.setMaxListeners(0);

wss.on('connection', function(ws) {
  log.debug('Socket connection opened');
  ws.setMaxListeners(10);

  ws.on('close', function(m) {
    log.debug('protocol=ws state=closed message=' + JSON.stringify(m));
  });

  return ws.on('message', function(msg) {
    message = {}
    try {
      message = JSON.parse(typeof msg !== 'undefined' && msg !== null ? msg : '{}');
    }
    catch (error) {
      log.error('protocol="ws", msg="' + msg + '", exception="' + error + '"');
      ws.send('{"status":"error", "description":"cannot json parse message >> ' + error + '"}');
    }
    if(typeof error === 'undefined') {
      var m = {};
      var arrayLabel = "";
      m.params = {};
      for (prop in message) {
        if (message.hasOwnProperty(prop)) {
          if (prop === 'IdArray') {
            if(message[prop].hasOwnProperty('key')) {
              arrayLabel = message[prop].key;
              m.params[arrayLabel] = message[prop].values;
            }
          } else {
            m.params[prop] = message[prop];
          }
        }
      }
      // Need to enable custom message processing to allow for dupe check
      if(m.params.hasOwnProperty('Action') && m.params['Action'] === 'emailopen') {
        emailOpenMessageHandler(m, ws);
      } else {
        try {
          processMessage(m, null, ws, arrayLabel);
          log.info('status="success", protocol="ws", message="' + JSON.stringify(m) + '"');
        }
        catch (err) {
          log.error('status="unable to processMessage", description="' + err + '"');
          requestResponse("error", 'unable to processMessage >> ' + err, null, ws);
        };
      };
    };
  });
});
