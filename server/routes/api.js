var express = require('express');
var path = require('path');
var bodyParser = require('body-parser');
var https = require('https');
var requestPromise = require('request-promise');
var client = require('smartsheet');

var TEMP_API_KEY = require('../../key').key;
var smartsheet = client.createClient({ accessToken: TEMP_API_KEY });

var router = express.Router();
router.use(bodyParser.json());


router.get('/', function(request, response){
  smartsheet.sheets.listSheets()
    .then(function(data){
      var sheetId = data.data[0].id;
      var idObject = { id: sheetId };
      smartsheet.sheets.getSheet(idObject)
        .then(function(sheetData){
          response.send(fetchAllCols(sheetData));
          // console.log('class start:', fetchCols([['class'],['start'],['date']], [null], sheetData.columns));
          // response.send('blah');
          // response.send(fetchCols([['date'], ['start', 'placed']], 'class', sheetData.columns));
          // response.send(JSON.stringify(sheetData));
        }).catch(function(error){
          console.log(error);
        });
    }).catch(function(error){
      console.log(error);
    });
});

function buildRows(rawData){

}


/*Collect all column IDs of interest for the application, based upon sets of strings
to search for, and strings to exclude, when determining a match for each case.*/
function fetchAllCols(worksheetData){
  //***IMPORTANT: THIS FUNCTION WILL BREAK IF THE THREE OBJECTS BELOW (colIDs, searchStrings, and searchExclusions)
  //DO NOT HAVE THE SAME KEYS!!***
  var colIDs = {'classStart': [], 'gradDate': [], 'certDate': [], 'wages': [],
                'employType': [], 'ITYesNo': [], 'employers': [], 'staffingFirms': [],
                'FTYesNo': [], 'otherCerts': [], 'veteran': [], 'female': [],
                'ethnicity': [], 'DOB': [], 'employStart': [], 'employEnd': [], 'retainedYesNo': []};

  var searchStrings = {'classStart':[['class'],['start'],['date']], 'gradDate':[['grad'],['date']], 'certDate':[['cert'],['date']], 'wages':[['wage']],
                'employType':[['employ'],['type']], 'ITYesNo':[['IT', 'industry'],['position', 'job']], 'employers':[['employer']], 'staffingFirms':[['staffing']],
                'FTYesNo':[['FT', 'full'], ['PT', 'part']], 'otherCerts':[['date', '+'], ['Network', 'Security', 'Other']], 'veteran':[['vet']], 'female':[['M/F', 'gender', 'sex']],
                'ethnicity':[['race', 'ethnic']], 'DOB':[['DOB', 'birth']], 'employStart': [['date'], ['start', 'placed']], 'employEnd': [['date'], ['end']],
                'retainedYesNo': [['1', '2', '3', '4', '5', '6'], ['mo', 'yr', 'month', 'year']]};

  var searchExclusions = {'classStart':'', 'gradDate':'', 'certDate':'other', 'wages':'',
                'employType':'', 'ITYesNo':'', 'employers':'date', 'staffingFirms':'date',
                'FTYesNo':'', 'otherCerts':'', 'veteran':'', 'female':'',
                'ethnicity':'', 'DOB':'', 'employStart':'class', 'employEnd':'class', 'retainedYesNo':'date'};

  var keys = Object.keys(colIDs);
  for (var i = 0; i < keys.length; i++){
    colIDs[keys[i]].push(fetchCols(searchStrings[keys[i]], searchExclusions[keys[i]], worksheetData.columns));
  }

  return colIDs;
}


/*Returns the IDs of any columns matching at least one string from each
index of testNameArray (an array of String arrays).
Example: say we want to search for a start date column.  testNameArray might be...
  [['date'], ['start', 'placed']] //NEED TO EXCLUDE 'CLASS'
In this example, any ID of a column matching 'date' && ('start' || 'placed') will
be pushed to the matchingIDs array and returned.*/
function fetchCols(testNameArray, nameToExclude, colArray){
  var matchingIDs = [];
  for (var i = 0; i < colArray.length; i++){
    for (var j = 0; j < testNameArray.length; j++){
      if (!colMatch(testNameArray[j], nameToExclude, colArray[i])) break;
      if (j >= (testNameArray.length - 1)) matchingIDs.push(colArray[i].id);
    }
  }
  return matchingIDs;
}


/*Checks if the name of a column contains one or more of the specified strings
in an array.  Returns true if at least one string is a match.*/
function colMatch(stringArrayToMatch, stringToExclude, colName){
  var lCaseName = colName.title.replace(/ /g, '').toLowerCase();
  for (var i = 0; i < stringArrayToMatch.length; i++){
    if (stringToExclude.length > 0 && lCaseName.includes(stringToExclude)) continue;
    if (lCaseName.includes(stringArrayToMatch[i].toLowerCase())) return true;
  }
  return false;
}



module.exports = router;





//
