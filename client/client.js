/**
 * Created by jeremycloutier on 2/16/16.
 */

var app = angular.module('myApp', ['ngRoute']);

app.controller('MainController', [ '$scope', '$location', 'SmartSheetService', function($scope, $location, SmartSheetService){

    $scope.endDate = new Date();
    //sets default start date to 05-07-2012
    $scope.startDate = new Date('2012-05-08');

    $scope.smartSheetData = [];
    //function on page load to do the call to get all the Smartsheet data
    //returns an array of objects with the columns we need
    SmartSheetService.getSmartSheetData().then(function(response){
        $scope.smartSheetData = response.data;
        $scope.submitDate();
    });

    //function that kicks off after date range is selected
    $scope.submitDate = function(){
        $scope.numServed = 0;
        $scope.completed = { number: 0, percent: 0 };
        $scope.certified = { number: 0, percent: 0 };
        $scope.placed = { number: 0, percent: 0 };
        $scope.certNetwork = { number: 0, percent: 0 };
        $scope.certServer = { number: 0, percent: 0 };
        $scope.certSecurity = { number: 0, percent: 0 };
        //set the default for the salary calculator checkboxes
       //resets them to unchecked if the date range is changed
       $scope.certDate = false;
       $scope.networkPlus = false;
       $scope.securityPlus = false;
       $scope.serverPlus = false;
       $scope.otherCert = false;
       $scope.calculatedSalary = 0;

        for(var i=0; i<$scope.smartSheetData.length; i++){
            var tempStartDate = new Date($scope.smartSheetData[i].classStart);
            // console.log("object number" + i + " " + $scope.smartSheetData[i]);

            //inelegant way to account for new Date() reading date as one day prior
            //add a day to the result
            var classStart = tempStartDate.setDate(tempStartDate.getDate() + 1);
            //check classStart is in the date range selected
            if(classStart >= $scope.startDate && classStart <= $scope.endDate){
                //count total number served
                $scope.numServed++;

                $scope.completed = incrementRowVals($scope.smartSheetData[i].gradDate, $scope.completed);
                $scope.certified = incrementRowVals($scope.smartSheetData[i].certDate, $scope.certified);
                $scope.placed = incrementRowVals($scope.smartSheetData[i].employHistory.start, $scope.placed);
                $scope.certNetwork = incrementRowVals($scope.smartSheetData[i].networkPlus, $scope.certNetwork);
                $scope.certServer = incrementRowVals($scope.smartSheetData[i].serverPlus, $scope.certServer);
                $scope.certSecurity = incrementRowVals($scope.smartSheetData[i].securityPlus, $scope.certSecurity);
            }
        }
        var adjStartDate = new Date($scope.startDate);
        adjStartDate.setDate(adjStartDate.getDate() - 1);
        $scope.avgWageAtPlacement = computeAveragePlacedWage($scope.smartSheetData, adjStartDate, Date.parse($scope.endDate));
        $scope.avgCurrentWage =  computeAverageCurrentWage($scope.smartSheetData, adjStartDate, Date.parse($scope.endDate));
        $scope.getTopFive = getTopFiveEmployers($scope.smartSheetData, adjStartDate, Date.parse($scope.endDate));
        $scope.retentionData = allEmployedAtMilestones($scope.smartSheetData, adjStartDate, Date.parse($scope.endDate));
    };



    function employedAtMilestones(rowData, startDate, endDate, milestoneDays){
        var milestoneHistory = { };
        //how to check against start/end date?  Need to say "no data available" or "-" if not enough time has elapsed to calculate?
        var classStart = Date.parse(rowData.classStart);
        if (isNaN(classStart) || isNaN(startDate) || isNaN(endDate)) return null;
        if (classStart > endDate || classStart < startDate) return null;
        var daysEmployed = 0; /*convention: 0 means never employed, -1 means employed through present,
         positive integer means employed for that number of days*/
        var daysSincePlaced = 0; //we can't judge employment for a milestone that hasn't occurred yet (in time).
        var startWork = Date.parse(rowData.employHistory.start);
        var endWork = Date.parse(rowData.employHistory.end);

        if (startWork && !isNaN(startWork)){
            daysSincePlaced = ((new Date() - startWork) / 1000 / 3600 / 24).toFixed(0);
            if (endWork && !isNaN(endWork)){
                daysEmployed = (endWork - startWork) / 1000 / 3600 / 24;
            }
            else {
                daysEmployed = -1; //using this value to represent continuous employment through present
            }
        }

        var keys = Object.keys(milestoneDays);
        for (var i = 0; i < keys.length; i++){
            if (daysSincePlaced < milestoneDays[keys[i]]) break;
            if (daysEmployed < 0 || daysEmployed >= milestoneDays[keys[i]]){
                milestoneHistory[keys[i]] = true;
            }
            else milestoneHistory[keys[i]] = false;
        }
        return milestoneHistory;
    }


    function allEmployedAtMilestones(allRows, startDate, endDate){
        var milestoneDays = { '3mo': 90,  '6mo': 180, '1yr': 365, '2yr': 730, '3yr': 1095, '4yr': 1460, '5yr': 1825 };
        var allKeys = Object.keys(milestoneDays);
        var milestoneRetentionRates = {};
        for (var i = 0; i < allKeys.length; i++){
            milestoneRetentionRates[allKeys[i]] = { number: null, percent: null };
        }
        var studentCount = 0;
        var milestoneData = {};
        var keys = {};
        for (i = 0; i < allRows.length; i++){
            milestoneData = employedAtMilestones(allRows[i], startDate, endDate, milestoneDays);
            if (!milestoneData) continue;
            keys = Object.keys(milestoneData);
            if (keys.length > 0){
                studentCount++;
                for (var j = 0; j < keys.length; j++){
                    milestoneRetentionRates[keys[j]].number++;
                }
            }//need to set percentages...
        }
        for (i = 0; i < allKeys.length; i++){
            milestoneRetentionRates[allKeys[i]].percent = (milestoneRetentionRates[allKeys[i]].number / studentCount * 100).toFixed(1);
        }
        return milestoneRetentionRates;
    }


    //[[AVERAGE WAGE AT PLACEMENT]]///////
    function computeAveragePlacedWage(allRows, startDate, endDate){
        var sumOfWages = 0;
        var numPlaced = 0;
        var tempWage = 0;

        for (var i = 0; i < allRows.length; i++){
            tempWage = getWageAtPlacement(allRows[i], startDate, endDate);
            if (tempWage){
                sumOfWages += tempWage;
                numPlaced++;
            }
        }
        return (sumOfWages / numPlaced).toFixed(2);
    }


    function getWageAtPlacement(rowData, startDate, endDate){
        var classStart = Date.parse(rowData.classStart);
        if (isNaN(classStart) || isNaN(startDate) || isNaN(endDate)) return null;
        if (rowData.employHistory.start){
            if (startDate <= classStart && classStart <= endDate && rowData.wages.length > 0) return rowData.wages[0];
        }
        return null;
    }



    //[[AVERAGE CURRENT WAGE ]]///CURRENT //CURRENT //CURRENT //CURRENT //CURRENT //
    function computeAverageCurrentWage(allRows, startDate, endDate){
        var sumOfWages = 0;
        var numEmployed = 0;
        var tempWage = 0;

        for (var i = 0; i < allRows.length; i++){
            tempWage = getCurrentWage(allRows[i], startDate, endDate);
            if (tempWage){
                sumOfWages += tempWage;
                numEmployed++;
            }
        }
        return (sumOfWages / numEmployed).toFixed(2);
    }


    function getCurrentWage(rowData, startDate, endDate){
        var classStart = Date.parse(rowData.classStart);
        if (isNaN(classStart) || isNaN(startDate) || isNaN(endDate)) return null;
        if (rowData.employHistory.start && !rowData.employHistory.end){
            if (startDate <= classStart && classStart <= endDate && rowData.wages.length > 0) return rowData.wages[rowData.wages.length -1];
        }
        return null;
    }

    //[][][][] Average Salary Calculator [][][][][][][]
    $scope.calcAvgSalary = function(){
        //array to hold checkboxes selected
        $scope.tempCertArray = [];
        //push checkbox names to array. checkbox names set to match column names
        if ($scope.certDate){$scope.tempCertArray.push("certDate");}
        if ($scope.networkPlus){$scope.tempCertArray.push("networkPlus");}
        if ($scope.serverPlus){$scope.tempCertArray.push("serverPlus");}
        if ($scope.securityPlus){$scope.tempCertArray.push("securityPlus");}
        if ($scope.otherCert){$scope.tempCertArray.push("otherCert");}

        // $scope.getAverageSalary = getAvgSalary($scope.tempCertArry, $scope.smartSheetData, adjStartDate, Date.parse($scope.endDate));
        var adjStartDate = new Date($scope.startDate);
        adjStartDate.setDate(adjStartDate.getDate() - 1);
        $scope.calculatedSalary = getAvgSalary($scope.tempCertArray, $scope.smartSheetData, adjStartDate, Date.parse($scope.endDate));
    };

    function getAvgSalary(tempCert, allRows, startDate, endDate){
        var sumOfWages = 0;
        var tempWage = 0;
        var count = 0;

        if (isNaN(startDate) || isNaN(endDate)) return null;

        for (var i = 0; i < allRows.length;i++){
            var classStart = Date.parse(allRows[i].classStart);
            if (isNaN(classStart)) continue;
            //check to stay within time range selected
            if (startDate <= classStart && classStart <= endDate){
                for(var j=0; j< tempCert.length; j++){
                  var cert = tempCert[j];
                  //check that each checkbox selected is not null on smartsheet
                  if(!allRows[i][cert]) break;
                  //if we've reached the last checkbox in array
                  if(j== tempCert.length-1){
                    tempWage = getCurrentWage(allRows[i], startDate, endDate);
                    if (tempWage){
                        sumOfWages += tempWage;
                        count++;
                    }
                  }
                }
            }
        }
        return (sumOfWages/count).toFixed(2);
    }

//Top Five Employers
    function getTopFiveEmployers (allRows, startDate, endDate){
        if (isNaN(startDate) || isNaN(endDate)) return null;
        var employers = {};
        $scope.topFive = [];

        for (var i = 0; i < allRows.length;i++){
            var classStart = Date.parse(allRows[i].classStart);
            if (isNaN(classStart)) continue;
            if (startDate <= classStart && classStart <= endDate){
                for (var j = 0; j< allRows[i].distinctEmployers.length; j++){
                    var tempString = allRows[i].distinctEmployers[j];
                    if (!employers.hasOwnProperty(tempString)){
                        employers[tempString] = 0;
                    }
                    employers[tempString]++;
                }
            }

        }

        $scope.sortedEmployers = sortObject(employers);

        for (var n = 0; n < 5; n++){
            $scope.topFive.push($scope.sortedEmployers.pop());
        }
        return $scope.topFive;
    }

    //PIE CHART
    (function(d3) {
        'use strict';
        var dataset = [
            //{ label: 'Abulia', count: 25 },
            //{ label: 'Betelgeuse', count: 25 },
            { label: 'White', count: 15 },
            { label: 'Black', count: 10 },
            {label:'Latino', count: 5},
            {label:'Asian', count: 8}
        ];
        var width = 360;
        var height = 360;
        var radius = Math.min(width, height) / 2;
        var color = d3.scale.ordinal()
            .range(['pink', 'blue', 'yellow', 'green']);
        //var color = d3.scale.category20b();
        var svg = d3.select('#chart')
            .append('svg')
            .attr('width', width)
            .attr('height', height)
            .append('g')
            .attr('transform', 'translate(' + (width / 2) +
                ',' + (height / 2) + ')');
        var arc = d3.svg.arc()
            .outerRadius(radius);
        var pie = d3.layout.pie()
            .value(function(d) { return d.count; })
            .sort(null);
        var path = svg.selectAll('path')
            .data(pie(dataset))
            .enter()
            .append('path')
            .attr('d', arc)
            .attr('fill', function(d, i) {
                return color(d.data.label);
            });
    })(window.d3);

    function incrementRowVals(smartsheetDataVal, numPercentObject){
        var tempObj = numPercentObject;
        if (smartsheetDataVal){
            tempObj.number++;
            tempObj.percent = Number(Math.round(((tempObj.number / $scope.numServed)*100) + 'e2') + 'e-2');
        }
        return tempObj;
    }

    function sortObject(obj) {
        var arr = [];
        var prop;
        for (prop in obj) {
            if (obj.hasOwnProperty(prop)) {
                arr.push({
                    'key': prop,
                    'value': obj[prop]
                });
            }
        }
        arr.sort(function(a, b) {
            return a.value - b.value;
        });
        return arr; // returns array
    }

    $scope.demographicList = ['Gender', 'Age', 'Race', 'Veteran Status']; // More here, possibly?
    $scope.progressList = ['Served', 'Completed', 'Certified A+', 'Placed'];
    $scope.selectedDemographic = 'Gender';
    $scope.selectedProgress = 'Served';
    $scope.tab = 'a';
    $scope.chartTab = 'pie';
    $scope.averageShow = false;

    $scope.generateCharts = function(demographics, progress){
        console.log('demographics, progress', demographics, progress);
    };

    $scope.showAverageSalary = function(){
        $scope.averageShow = true;
    };

    $scope.hideAverageSalary = function (){
        $scope.averageShow = false;
    };

}]);

//[][][] Factory to get Smartsheet data [][][][[[[[]]]]]
app.factory('SmartSheetService', ['$http', function($http){

    var getSmartSheetData = function(){
        return $http.get('/api');
    };

    return {
        getSmartSheetData: getSmartSheetData,
    };
}]);
