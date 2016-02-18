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
          response.send(JSON.stringify(sheetData));
        }).catch(function(error){
          console.log(error);
        });
    }).catch(function(error){
      console.log(error);
    });
});


module.exports = router;
