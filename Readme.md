# TrackingExpress
Dashboard APIs using HTTP/REST and Web Sockets.

## Installation

Clone TrackingExpress. All required modules should be present.
You can ensure you have everything by performing an install:
`$ npm install`

## Quick Start

HTTP and Web Sockets both listen on port 80 by default. On Mac OS X,
running on ports under 1024 require sudo, otherwise sudo should not be
required.

Start the HTTP and Web Socket listeners:
`$ [sudo] node index.js`
    
## Features

Provides HTTP and Web Socket APIs to enter tracking data into the Data Warehouse.
Events are recorded in the "tracking" table of the shipyard database.

# API
TrackingExpress listens for messages using HTTP and web sockets.

## HTTP
TrackingExpress supports the legacy HTTP interface used by the old TrackingService.
The service accepts URLs that match specific formats. These formats correspond to routes 
accepted by the old TrackingService. The URLs must match one of the following patterns 
to be recognized. In each pattern, the items beginning with a colon indicate values 
that you insert. So, the following pattern:

`/track/appName/:Name/action/:Action/personId/:PersonId/consultationId/:ConsultationId/cmIds/:CouncilMemberId/features/:Features`

could be hit using a URL like this:

`http://localhost/track/appName/TESTER/action/add/personId/123/consultationId/456/cmIds/[111,222,333]/features/lala`

Note that the CouncilMemberId item is replaced with an array of three values. This means that three entries will be made
in the tracking table, one for each of the three values. Both the CouncilMemberId and the LeadId items take an array of values.
No other items take an array.

The recognized patterns are:
```
/track/appName/:Name/action/:Action/personId/:PersonId/consultationId/:ConsultationId/cmIds/:CouncilMemberId/features/:Features

/track/appName/:Name/action/:Action/personId/:PersonId/consultationId/:ConsultationId/cmIds/:CouncilMemberId

/track/appName/:Name/action/:Action/personId/:PersonId/consultationId/:ConsultationId/originalcmId/:AdditionalId/cmIds/:CouncilMemberId

/track/appName/:Name/action/:Action/personId/:PersonId/consultationId/:ConsultationId/originalcmId/:AdditionalId/personName/:AdditionalComment/cmIds/:CouncilMemberId

/track/appName/:Name/action/:Action/contactId/:ContactId/consultationId/:ConsultationId/cmIds/:CouncilMemberId

/track/appName/:Name/action/:Action/loginId/:LoginId/consultationId/:ConsultationId/cmIds/:CouncilMemberId

/track/appName/:Name/action/:Action/personId/:PersonId/consultationId/:ConsultationId/leadIds/:LeadId

/track/appName/:Name/action/:Action/rmId/:PersonId/reportId/:LoginId

/track/appName/:Name/action/:Action/meetingId/:ProductId/productType/:ProductType/cmIds/:CouncilMemberId

/track/appName/:Name/action/:Action/surveyId/:ProductId/productType/:ProductType/cmIds/:CouncilMemberId

/track/appName/:Name/action/:Action/visitId/:ProductId/productType/:ProductType/cmIds/:CouncilMemberId
```

The service converts the information in the URL into a JSON message like the ones shown in the section on Web Sockets.

## Web Sockets
TrackingExpress can receive JSON formatted messages over web sockets. Most of the properties 
in the message correspond to columns in the shipyard.tracking table. The general form is:

``` 
 {
  "IdArray": {
     "key": "Column Name = CouncilMemberId or LeadId",
     "values": [<One or more integer values>]
   },
   "Column 1 Name": "Column 1 Value",
   "Column 2 Name": "Column 2 Value",
   ...
   "Column n Name": "Column n Value"
 } 
```

Here is an example:
```
 {
   "IdArray":{
       "key":"CouncilMemberId",
	   "values":[111,222,333]
	},
	"Name":"TESTER",
	"Action":"add",
	"PersonId":"123",
	"ConsultationId":"456"
 } 
```
 
### IdArray
The IdArray allows the sender to record multiple entries for either the CouncilMemberId or the LeadId columns
in the tracking table. The "key" property is the column name and must be either "CouncilMemberId" or "LeadId"; no other column names are allowed.
The "values" property is an array of integer values, each of which will result in a new entry in the tracking  table, with the value going
into the column designated by "key". In the example above, three rows will be added, one with CouncilMemberId set to 111, a second with
CouncilMemberId set to 222, and a third with CouncilMemberId set to 333. 

### Column Name and Column Value
The remaining properties of the message must correspond to column name/column value pairs. The column name must be
one of the columns in the tracking table; these are listed below. In the example above, the three new rows will each have 
the Name, Action, PersonId, and ConsultationId shown.

### Columns in the tracking table
The following are the columns that may be used in the JSON message. None of the columns are required, but you should always use "Name" to hold the
name of the application sending the tracking message, and use "Action" to describe what the application did. You may fill or omit the other
columns as needed. The meaning of each column may be different for each application.

* **Name** - The application sending the tracking message.

* **ActionAction** - The action performed by the application.

* **ActionActionTime** - A datetime stamp.

* **ActionPersonId** - Usually a CM ID or an RM ID.

* **ActionConsultationId** - A consultation ID.

* **ActionCouncilmemberId** - If used, "CouncilMemberId" should be the "key" in "IdArray". One or more CM IDs should be in the "values" property of "IdArray".

* **ActionContactId** - Usually a CM ID.

* **ActionLoginId** - A login name.

* **ActionFeatures** - Application dependent.

* **ActionLeadId** - Usually a CM ID.

* **ActionAdditionalId** - Application dependent.

* **ActionAdditionalComment** - Application dependent.

* **ActionProductId** - Application dependent.

* **ActionProductType** - Application dependent.


## Running Tests

Start the HTTP and Web Socket listeners, as above.

### HTTP
To test the HTTP routes, start a local copy of the service:

`$ node index.js`

Then use the test URLs documented in the comments of index.js. For example:

`$ curl -g http://localhost/track/appName/TESTER/action/add/loginId/bwayne/consultationId/456/cmIds/[111,222,333]`

Use TESTER as the appName so that test entries can be easily identified and deleted.

If you have any questions, please contact rsimon@glgroup.com or squince@glgroup.com.

### Web Sockets
To test the Web Socket API, first install npm ws:

`$ npm install -g ws`
	
Then run a local copy of the service:

`$ node index.js`

Then use wscat to send one of the test messages documented in the Web Sockets section of index.js. For example:
	
```
$ wscat -c ws://localhost/
>  {"IdArray":{"key":"CouncilMemberId","values":[111,222,333]},"Name":"TESTER","Action":"add","PersonId":"123","ConsultationId":"456","AdditionalId":"777","AdditionalComment":"Fred Smith-Smythe"}
```

## Contributors
Rich Simon, Steve Quince
