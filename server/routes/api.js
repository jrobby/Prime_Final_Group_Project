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
      var IdObject = { id: sheetId };
      smartsheet.sheets.getSheet(IdObject)
        .then(function(sheetData){
          response.send(assembleRows(sheetData));
          // response.send(buildRow(sheetData.rows[0], fetchAllCols(sheetData)));
          // response.send(JSON.stringify(sheetData));
        }).catch(function(error){
          console.log(error);
        });
    }).catch(function(error){
      console.log(error);
    });
});



//might switch this back and forth between "condensed" and "verbose" rows during testing...
function assembleRows(worksheetData){
  var rowList = [];
  for (var i = 0; i < worksheetData.rows.length; i++){
    // rowList.push(buildRowVerbose(worksheetData.rows[i], fetchAllCols(worksheetData)));
    rowList.push(condenseRow(buildRowVerbose(worksheetData.rows[i], fetchAllCols(worksheetData))));
  }
  return rowList;
}



/*Creates an array property fieldName in condensedRow, to match an existing such property in verboseRow.
Pushes the entries from verboseRow to condensedRow, but stops doing this as soon as a false-y value is found.*/
function condenseArrayField(condensedRow, verboseRow, fieldName){
  condensedRow[fieldName] = [];
  var temp;
  for (var i = 0; i < verboseRow[fieldName].length; i++){
    temp = verboseRow[fieldName][i];
    if (temp) condensedRow[fieldName].push(temp);
    else return;
  }
}


/*Creates a matching date property [fieldName] in condensedRow from verboseRow,
but sets the value equal to null if the entry in verboseRow cannot be parsed into
a date.  Note that "verbose" value is in an array, "condensed" is not.*/
function setEqualIfDate(condensedRow, verboseRow, fieldName){
  if (isNaN(Date.parse(verboseRow[fieldName][0]))){
    condensedRow[fieldName] = null;
  }
  else condensedRow[fieldName] = verboseRow[fieldName][0];
}



/*Starting with a "verbose" Row object, condenses the information into final form to be graphed,
performing date/null validation and calculations as necessary.*/
function condenseRow(verboseRow){
  var condensedRow = {};
  var keys = Object.keys(verboseRow);
  setEqualIfDate(condensedRow, verboseRow, "classStart");
  setEqualIfDate(condensedRow, verboseRow, "gradDate");
  setEqualIfDate(condensedRow, verboseRow, "certDate");

  var sex = verboseRow.female.toString();
  if (sex.toLowerCase().includes('f') || sex.toLowerCase().includes('w')) condensedRow.female = true;
  else condensedRow.female = false;

  var veteran = verboseRow.veteran.toString();
  if (veteran.toLowerCase().includes('t')) condensedRow.veteran = true;
  else condensedRow.veteran = false;

  condensedRow.ethnicity = verboseRow.ethnicity[0];

  var fullTime = verboseRow.FTYesNo.toString();
  if (fullTime.toLowerCase().includes('ft') || fullTime.toLowerCase().includes('full')) condensedRow.placedFullTime = true;
  else condensedRow.placedFullTime = false;

  condenseArrayField(condensedRow, verboseRow, "employType");
  condenseArrayField(condensedRow, verboseRow, "wages");
  condenseArrayField(condensedRow, verboseRow, "ITYesNo");
  // condenseArrayField(condensedRow, verboseRow, "otherCerts");

  var tempHistory = {};
  //clear null values in array before summarizing employment history
  condenseArrayField(tempHistory, verboseRow, "employStart");
  condenseArrayField(tempHistory, verboseRow, "employEnd");
  condensedRow.employHistory = employmentHistory(tempHistory.employStart, tempHistory.employEnd);
  //assemble *DISTINCT* employers/contract agencies into one property

  /*
  distinct-employers: [string],
  certifications: [date *or* null] - define order convention...
  age @start date: number

  //****still need to use retention milestone data??
  */

  return condensedRow;
}



/*Translates a row object from the smartsheet API into meaningful, named key/data pairs
(to be condensed into final row form by condenseRow()).*/
function buildRowVerbose(rowData, colIds){
  var verboseRow = { };
  var keys = Object.keys(colIds);
  for (var i = 0; i < keys.length; i++){
    verboseRow[keys[i]] = [];
    for (var j = 0; j < colIds[keys[i]].length; j++){
      var temp = getRowVal(rowData, colIds[keys[i]][j]);
      if (temp) verboseRow[keys[i]].push(temp);
      else verboseRow[keys[i]].push(null);
    }
  }
  return verboseRow;
}


/*Given a single row object from the "rows" array in the Smartsheet data, returns the value
corresponding to the column ID being sought.  Returns null if no such value exists.*/
function getRowVal(oneSmartsheetRow, colId){
  var cells = oneSmartsheetRow.cells;
  for (var i = 0; i < cells.length; i++){
    if (cells[i].columnId == colId) return cells[i].value;
  }
  return null;
}


/*Returns an object representing a single person's estimated employment timeline.
If 'start' is null, the individual has not been placed.
If 'start' has a date value, and 'end' is null, the individual continues to be employed.
If both fields have date values, the individual was placed, but is not currently employed.*/
function employmentHistory(startDatesArray, endDatesArray){
  var employStartEnd = { 'start': null, 'end': null };
  if (startDatesArray && startDatesArray.length > 0){
    if (!isNaN(Date.parse(startDatesArray[0]))){
      employStartEnd.start = startDatesArray[0];
    }
    if (endDatesArray && endDatesArray.length >= startDatesArray.length){
      if (!isNaN(Date.parse(endDatesArray[endDatesArray.length - 1]))){
        employStartEnd.end = endDatesArray[endDatesArray.length - 1];
      }
    }
  }
  return employStartEnd;
}


/*Collect all column IDs of interest for the application, based upon sets of strings
to search for, and strings to exclude, when determining a match for each case.*/
function fetchAllCols(worksheetData){
  //***IMPORTANT: THIS FUNCTION WILL BREAK IF THE THREE OBJECTS BELOW (colIDs, searchStrings, and searchExclusions)
  //DO NOT HAVE THE SAME KEYS!!***
  var colIds = {'classStart': [], 'gradDate': [], 'certDate': [], 'wages': [],
                'employType': [], 'ITYesNo': [], 'employers': [], 'staffingFirms': [],
                'FTYesNo': [], 'otherCerts': [], 'veteran': [], 'female': [],
                'ethnicity': [], 'DOB': [], 'employStart': [], 'employEnd': [], 'retainedYesNo': []};

  var searchStrings = {'classStart':[['class'],['start'],['date']], 'gradDate':[['grad'],['date']], 'certDate':[['cert'],['date']], 'wages':[['wage']],
                'employType':[['employ'],['type']], 'ITYesNo':[['IT', 'industry'],['position', 'job']], 'employers':[['employer']], 'staffingFirms':[['staffing']],
                'FTYesNo':[['FT', 'full'], ['PT', 'part']], 'otherCerts':[['date', '+'], ['Network', 'Server', 'Security', 'Other']], 'veteran':[['vet']], 'female':[['M/F', 'gender', 'sex']],
                'ethnicity':[['race', 'ethnic']], 'DOB':[['DOB', 'birth']], 'employStart': [['date'], ['start', 'placed']], 'employEnd': [['date'], ['end']],
                'retainedYesNo': [['1', '2', '3', '4', '5', '6'], ['mo', 'yr', 'month', 'year']]};

  var searchExclusions = {'classStart':'', 'gradDate':'', 'certDate':'other', 'wages':'',
                'employType':'', 'ITYesNo':'', 'employers':'date', 'staffingFirms':'date',
                'FTYesNo':'', 'otherCerts':'', 'veteran':'', 'female':'',
                'ethnicity':'', 'DOB':'', 'employStart':'class', 'employEnd':'class', 'retainedYesNo':'date'};

  var keys = Object.keys(colIds);
  for (var i = 0; i < keys.length; i++){
    colIds[keys[i]] = (fetchCols(searchStrings[keys[i]], searchExclusions[keys[i]], worksheetData.columns));
  }

  return colIds;
}


/*Returns the IDs of any columns matching at least one string from each
index of testNameArray (an array of String arrays).
Example: say we want to search for a start date column.  testNameArray might be...
  [['date'], ['start', 'placed']] //NEED TO EXCLUDE 'CLASS'
In this example, any ID of a column matching 'date' && ('start' || 'placed') will
be pushed to the matchingIds array and returned.*/
function fetchCols(testNameArray, nameToExclude, colArray){
  var matchingIds = [];
  for (var i = 0; i < colArray.length; i++){
    for (var j = 0; j < testNameArray.length; j++){
      if (!colMatch(testNameArray[j], nameToExclude, colArray[i])) break;
      if (j >= (testNameArray.length - 1)) matchingIds.push(colArray[i].id);
    }
  }
  return matchingIds;
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
