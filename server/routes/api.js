var express = require('express');
var path = require('path');
var bodyParser = require('body-parser');
var https = require('https');
var requestPromise = require('request-promise');
var client = require('smartsheet');

//var TEMP_API_KEY = require('../../key').key;
//var smartsheet = client.createClient({ accessToken: TEMP_API_KEY });

var router = express.Router();
router.use(bodyParser.json());


router.get('/', function(request, response){
  smartsheet.sheets.listSheets()
    .then(function(data){
      var sheetId = data.data[0].id;
      var idObject = { id: sheetId };
      smartsheet.sheets.getSheet(idObject)
        .then(function(sheetData){
          // response.send(fetchCol([['date'], ['start', 'placed']], sheetData.columns));
          response.send(JSON.stringify(sheetData));
        }).catch(function(error){
          console.log(error);
        });
    }).catch(function(error){
      console.log(error);
    });
});

function buildRows(rawData){

}


/*returns the IDs of any columns matching *at least one* string from each
index of testNameArray (an array of String arrays).
Example: say we want to search for a start date column.  testNameArray might be...
  [['date'], ['start', 'placed']]
In this example, any ID of a column matching 'date' && ('start' || 'placed') will
be pushed to the matchingIDs array and returned.*/
function fetchCol(testNameArray, colArray){
  var matchingIDs = [];
  for (var i = 0; i < colArray.length; i++){
    for (var j = 0; j < testNameArray.length; j++){
      if (!colMatch(testNameArray[j], colArray[i])) break;
      if (j >= (testNameArray.length - 1)) matchingIDs.push(colArray[i].id);
    }
  }
  return matchingIDs;
}


//Checks if the name of a column contains one or more of the specified strings
//in an array.
function colMatch(stringArray, colName){
  var lCaseName = colName.title.replace(/ /g, '').toLowerCase();
  console.log(lCaseName);
  for (var i = 0; i < stringArray.length; i++){
    if (lCaseName.includes(stringArray[i].toLowerCase())) return true;
  }
  return false;
}




module.exports = router;





//
