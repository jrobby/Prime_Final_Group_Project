/**
 * Created by jeremycloutier on 2/16/16.
 */
var app = angular.module('myApp', ['ngRoute']);
var CALC_ASSIST = 'calcAssist';

app.controller('MainController', [ '$scope', '$location', 'SmartSheetService', function($scope, $location, SmartSheetService){

    $scope.endDate = new Date();
    //sets default start date to 05-07-2012
    $scope.startDate = new Date('2012-05-08');

    $scope.smartSheetData = [];
    //function on page load to do the call to get all the Smartsheet data
    //returns an array of objects with the columns we need
    SmartSheetService.getSmartSheetData().then(function(response){
        $scope.smartSheetData = response.data;
        console.log($scope.smartSheetData);
        $scope.submitDate();
    });

    $scope.genLineGraph = genLineGraph;

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
        $scope.networkPlus = false;
        $scope.securityPlus = false;
        $scope.serverPlus = false;
        $scope.otherCert = false;
        $scope.calculatedSalary = {};

        for(var i=0; i<$scope.smartSheetData.length; i++){
            var tempStartDate = new Date($scope.smartSheetData[i].classStart);

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
        //Set Percentages
        $scope.completed = calcPercent($scope.completed);
        $scope.certified = calcPercent($scope.certified);
        $scope.placed = calcPercent($scope.placed);
        $scope.certNetwork = calcPercent($scope.certNetwork);
        $scope.certServer = calcPercent($scope.certServer);
        $scope.certSecurity = calcPercent($scope.certSecurity);

        var adjStartDate = new Date($scope.startDate);
        adjStartDate.setDate(adjStartDate.getDate() - 1);
        $scope.avgWageAtPlacement = computeAveragePlacedWage($scope.smartSheetData, adjStartDate, Date.parse($scope.endDate));
        $scope.avgCurrentWage =  computeAverageCurrentWage($scope.smartSheetData, adjStartDate, Date.parse($scope.endDate));
        $scope.getTopFive = getTopFiveEmployers($scope.smartSheetData, adjStartDate, Date.parse($scope.endDate));
        $scope.retentionData = allEmployedAtMilestones($scope.smartSheetData, adjStartDate, Date.parse($scope.endDate));
        $scope.generatePieCharts();
        $scope.genLineGraph($scope.smartSheetData, $scope.selectedLineGraph, Date.parse($scope.startDate), Date.parse($scope.endDate));
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
            else {
              for (var j = i; j < keys.length; j++){
                if (daysSincePlaced < milestoneDays[keys[j]]) break;
                milestoneHistory[keys[j]] = false;
              }
              break;
            }
        }
        return milestoneHistory;
    }


    function allEmployedAtMilestones(allRows, startDate, endDate){
        var milestoneDays = { 'threeMonth': 90,  'sixMonth': 180, 'oneYear': 365, 'twoYear': 730, 'threeYear': 1095, 'fourYear': 1460, 'fiveYear': 1825 };
        var allKeys = Object.keys(milestoneDays);
        var milestoneRetentionRates = {};
        var studentCount = {};
        for (var i = 0; i < allKeys.length; i++){
            milestoneRetentionRates[allKeys[i]] = { numRetained: 0, fraction: null, percent: null };
            studentCount[allKeys[i]] = 0;
        }
        var milestoneData = {};
        var keys = {};
        for (i = 0; i < allRows.length; i++){
            milestoneData = employedAtMilestones(allRows[i], startDate, endDate, milestoneDays);
            if (!milestoneData) continue;
            keys = Object.keys(milestoneData);
            for (var j = 0; j < keys.length; j++){
                if (milestoneData[keys[j]]) milestoneRetentionRates[keys[j]].numRetained++;
                studentCount[keys[j]]++;
            }
        }
        for (i = 0; i < allKeys.length; i++){
            if (studentCount[allKeys[i]] <= 0) {
              milestoneRetentionRates[allKeys[i]].fraction = "N/A";
              milestoneRetentionRates[allKeys[i]].percent = "N/A";
            }
            else {
              milestoneRetentionRates[allKeys[i]].fraction = milestoneRetentionRates[allKeys[i]].numRetained + " / " + studentCount[allKeys[i]];
              milestoneRetentionRates[allKeys[i]].percent = (milestoneRetentionRates[allKeys[i]].numRetained / studentCount[allKeys[i]] * 100).toFixed(1) + "%";
            }
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
    var tempCalculatedSalary = {};

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
    tempCalculatedSalary.avgWage = (sumOfWages/count).toFixed(2);
    tempCalculatedSalary.count = count;

    return (tempCalculatedSalary);
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


    //Generate Pie Chart function
    $scope.generatePieCharts = function () {

        d3.select("svg").remove();

        var adjStartDate = new Date($scope.startDate);
        adjStartDate.setDate(adjStartDate.getDate() - 1);

        //for chart heading display
        $scope.selectedDisplay = $scope.selectedProgress;

        // Get all that data, yo

        //var allRows=$scope.smartSheetData;
        var rowsInPie = [];
        var dataset = [];
        $scope.pieHeading = "";

        //get the data depending on drop down selection ("Served", "Completed", "Certified A+", "Placed")
        rowsInPie = getRange($scope.smartSheetData, adjStartDate, Date.parse($scope.endDate), $scope.selectedProgress);

        //SLICE PIE BY SELECTED DEMOGRAPHIC - RACE, GENDER, VETERAN
        if ($scope.selectedDemographic == 'Race') {
            //    Get Race Data
            dataset = slicePieByRace(rowsInPie);
            $scope.pieHeading = "Race"
        } else if ($scope.selectedDemographic=='Age'){
            dataset = slicePieByAge(rowsInPie);
            $scope.pieHeading = "Age";
        } else if ($scope.selectedDemographic == 'Gender') {
            //    Get Gender Data
            dataset = slicePieByGender(rowsInPie);
            $scope.pieHeading = "Gender"
        } else if ($scope.selectedDemographic == 'Veteran Status') {
            //    Get Veteran Status Data
            dataset = slicePieByVeteran(rowsInPie);
            $scope.pieHeading = "Veteran Status"
        }

        $scope.dataset = dataset;
        console.log('$scope.dataset', $scope.dataset);
        var width = 650;
        var height = 400;

        var radius = Math.min(width, height) / 2;
        var legendRectSize = 18;
        var legendSpacing = 4;

        var color = d3.scale.category10();
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
            .value(function (d) {
                return d.count;
            })
            .sort(null);

        var legendpop = d3.select('#chart')
            .append('div')
            .attr('class', 'tooltips');

        legendpop.append('div')
            .attr('class', 'label');

        legendpop.append('div')
            .attr('class', 'count');

        legendpop.append('div')
            .attr('class', 'percent');


        dataset.forEach(function (d) {
            d.count = +d.count;
            d.enabled = true; // NEW
            legendpop.select('.label').html("Mouse over");
            legendpop.select('.count').html("chart to");
            legendpop.select('.percent').html('view percents');
            //legendpop.select('.tooltips').style('display', 'block');
        });

        var path = svg.selectAll('path')
            .data(pie(dataset))
            .enter()
            .append('path')
            .attr('d', arc)
            .attr('fill', function (d, i) {
                return color(d.data.label);
            }) // UPDATED (removed semicolon)
            .each(function (d) {
                this._current = d;
            }); // NEW

        path.on('mouseover', function (d) {
            var total = d3.sum(dataset.map(function (d) {
                return (d.enabled) ? d.count : 0; // UPDATED
            }));
            var percent = Math.round(1000 * d.data.count / total) / 10;
            legendpop.select('.label').html(d.data.label);
            legendpop.select('.count').html(d.data.count);
            legendpop.select('.percent').html(percent + '%');
            legendpop.select('.tooltips').style('text-align', 'center');
        });

        path.on('mouseout', function () {
            legendpop.style('display', 'none');
        });

        var legend = svg.selectAll('.legend')
            .data(color.domain())
            .enter()
            .append('g')
            .attr('class', 'legend')
            .attr('transform', function (d, i) {
                var height = legendRectSize + legendSpacing;
                var offset = height * color.domain().length / 2;
                var horz = -17 * legendRectSize;
                var vert = (i * height - offset) -140;
                return 'translate(' + horz + ',' + vert + ')';
            });

        legend.append('rect')
            .attr('width', legendRectSize)
            .attr('height', legendRectSize)
            .style('fill', color)
            .style('stroke', color)
            .on('click', function (label) {
                var rect = d3.select(this);
                var enabled = true;
                var totalEnabled = d3.sum(dataset.map(function (d) {
                    return (d.enabled) ? 1 : 0;
                }));

                if (rect.attr('class') === 'disabled') {
                    rect.attr('class', '');
                } else {
                    if (totalEnabled < 2) return;
                    rect.attr('class', 'disabled');
                    enabled = false;
                }

                pie.value(function (d) {
                    if (d.label === label) d.enabled = enabled;
                    console.log('d.label, d.enabled', d.label, d.enabled);
                    return (d.enabled) ? d.count : 0;
                });

                path = path.data(pie(dataset));

                path.transition()
                    .duration(750)
                    .attrTween('d', function (d) {
                        var interpolate = d3.interpolate(this._current, d);
                        this._current = interpolate(0);
                        return function (t) {
                            return arc(interpolate(t));
                        };
                    });
            });

        legend.append('text')
            .attr('x', legendRectSize + legendSpacing)
            .attr('y', legendRectSize - legendSpacing)
            .text(function (d) {
                return d;
            });

    }
    //end of generatePieCharts function

    function incrementRowVals(smartsheetDataVal, numPercentObject){
      var tempObj = numPercentObject;
      if (smartsheetDataVal){
          tempObj.number++;
      }
      return tempObj;
    }

    function calcPercent(numPercentObject){
      var tempObj = numPercentObject;
      if (tempObj.number){
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
    $scope.lineGraphList = ['Gender', 'Age', 'Race', 'Veteran Status', 'Wage at Placement','Placement Rates', 'Graduation Rates'];

    $scope.selectedDemographic = 'Gender';
    $scope.selectedProgress = 'Served';
    $scope.selectedLineGraph = 'Gender';

    $scope.tab = 'a';
    $scope.chartTab = 'pie';
    $scope.averageShow = false;

    $scope.showAverageSalary = function(){
        $scope.averageShow = true;
    };

    $scope.hideAverageSalary = function (){
        $scope.averageShow = false;
    };

}]);

// functions for our pie chart maker
function getRange(allRows, startDate, endDate, selected){
    if (isNaN(startDate) || isNaN(endDate)) return null;

    var range = [];
    if(selected == "Served"){
      for (var i = 0; i < allRows.length;i++){
          var classStart = Date.parse(allRows[i].classStart);
          if (isNaN(classStart)) continue;

          if(startDate <= classStart && classStart <= endDate){
            range.push(allRows[i]);
          }
        } return range;
      } else if (selected == "Completed"){
        for (var i = 0; i < allRows.length;i++){
            var classStart = Date.parse(allRows[i].classStart);
            if (isNaN(classStart)) continue;

            if(allRows[i].gradDate && startDate <= classStart && classStart <= endDate){
              range.push(allRows[i]);
            }
          } return range;
      } else if (selected == "Certified A+") {
        for (var i = 0; i < allRows.length;i++){
            var classStart = Date.parse(allRows[i].classStart);
            if (isNaN(classStart)) continue;

            if(allRows[i].certDate && startDate <= classStart && classStart <= endDate){
              range.push(allRows[i]);
            }
          } return range;
      } else if (selected == "Placed"){
        for (var i = 0; i < allRows.length;i++){
            var classStart = Date.parse(allRows[i].classStart);
            if (isNaN(classStart)) continue;

            if(allRows[i].placedFullTime && startDate <= classStart && classStart <= endDate){
              range.push(allRows[i]);
            }
          } return range;
      }
}
//Slice pie by selected demographic
function slicePieByAge(rows){
    var numUnder18 = 0;
    var num18to24 = 0;
    var num24to30 = 0;
    var num30to40 = 0;
    var num40to50 = 0;
    var numOver50 = 0;

    var salarySumUnder18 = 0;
    var salarySum18_24 = 0;
    var salarySum24_30 = 0;
    var salarySum30_40 = 0;
    var salarySum40_50 = 0;
    var salarySum50Up = 0;


    for (var i = 0; i < rows.length;i++){
        var age = rows[i].ageAtStart;

        //var firstWage = rows[i].wages[0];

        if (age<18){
            numUnder18++;
            if (rows[i].employHistory.start && rows[i].wages.length > 0){
                salarySumUnder18+=rows[i].wages[0];
                console.log('salarySumUnder18 update', salarySumUnder18);
            }
        }else if (age<24) {
            num18to24++;
            console.log('count 18 to 24', num18to24);
            if (rows[i].employHistory.start && rows[i].wages.length > 0){
                salarySum18_24+=(rows[i].wages[0]).toFixed(2);
                console.log('salarySum18to24 update', salarySum18_24);
            }
        } else if( age < 30){
            num24to30++;
            if (rows[i].employHistory.start && rows[i].wages.length > 0){
                salarySum24_30+=rows[i].wages[0];
                console.log('salarySum24to30 update', salarySum24_30);
            }
        } else if (age < 40){
            num30to40++;
            if (rows[i].employHistory.start && rows[i].wages.length > 0){
                salarySum30_40+=rows[i].wages[0]
            }
        } else if (age <50) {
            num40to50++;
            if (rows[i].employHistory.start && rows[i].wages.length > 0){
                salarySum40_50+=rows[i].wages[0]
            }
        } else {
            numOver50++;
            if (rows[i].employHistory.start && rows[i].wages.length > 0){
                salarySum50Up+=rows[i].wages[0]
            }
        }



    }

    return [
        {label: 'Under 18', count: numUnder18, averageSalary:(salarySumUnder18/numUnder18).toFixed(2)},
        {label: '18 to 24', count: num18to24, averageSalary:(salarySum18_24/num18to24).toFixed(2)},
        {label: '24 to 30', count: num24to30, averageSalary:(salarySum24_30/num24to30).toFixed(2)},
        {label: '30 to 40', count: num30to40, averageSalary:(salarySum30_40/num30to40).toFixed(2)},
        {label: '40 to 50', count: num40to50, averageSalary:(salarySum40_50/num40to50).toFixed(2)},
        {label: 'Over 50', count: numOver50, averageSalary:(salarySum50Up/numOver50).toFixed(2)}
    ];
}

function slicePieByRace(rows){

    var numberOfBlacks=0;
    var numberOfWhites=0;
    var numberOfLatinos=0;
    var numberOfAsians =0;
    var numberOfOthers=0;

    var totalBlackSalaries = 0;
    var totalWhiteSalaries = 0;
    var totalLatinoSalaries = 0;
    var totalAsianSalaries = 0;
    var totalOtherSalaries = 0;



    for (var i = 0; i < rows.length; i++){
        var ethnicity = rows[i].ethnicity;
        var firstWage = rows[i].wages[0];

        if (ethnicity=="Black / African American"){
            numberOfBlacks++;
            if (rows[i].employHistory.start && rows[i].wages.length > 0){
                totalBlackSalaries+=firstWage;
                console.log('totalBlackSalary update:', totalBlackSalaries)
            }

        }else if(ethnicity=="White"){
            numberOfWhites++;
            if (rows[i].employHistory.start && rows[i].wages.length > 0){
                totalWhiteSalaries+=firstWage;
                console.log('totalWhiteSalary update:', totalWhiteSalaries);
            }
        }else if(ethnicity=="Hispanic / Latino"){
            numberOfLatinos++;
            if (rows[i].employHistory.start && rows[i].wages.length > 0){
                totalLatinoSalaries+=firstWage;
                console.log('totalLatinoSalary update:', totalLatinoSalaries);
            }
        }else if(ethnicity=="Other, Multi-Racial"){
            numberOfOthers++;
            if (rows[i].employHistory.start && rows[i].wages.length > 0){
                totalOtherSalaries+=firstWage;
                console.log('totalOtherSalary update:', totalOtherSalaries);
            }
        }else if(ethnicity=="Asian"){
            numberOfAsians++;
            if (rows[i].employHistory.start && rows[i].wages.length > 0){
                totalAsianSalaries+=firstWage;
                console.log('totalAsianSalary update:', totalAsianSalaries);
            }
        }
    };


    return [
        {label:'Black', count:numberOfBlacks, averageSalary: (totalBlackSalaries/numberOfBlacks).toFixed(2)},
        {label:'White', count:numberOfWhites, averageSalary: (totalWhiteSalaries/numberOfWhites).toFixed(2)},
        {label:'Latino', count:numberOfLatinos, averageSalary: (totalLatinoSalaries/numberOfLatinos).toFixed(2)},
        {label:'Asian', count:numberOfAsians, averageSalary: (totalAsianSalaries/numberOfAsians).toFixed(2)},
        {label:'Other', count:numberOfOthers, averageSalary: (totalOtherSalaries/numberOfOthers).toFixed(2)}
    ];


}

function slicePieByGender(rows){
    var numberOfMales = 0;
    var numberOfFemales=0;
    var totalFemaleSalaries = 0;
    var totalMaleSalaries = 0;

    for (var i = 0; i < rows.length;i++){

        var female = rows[i].female;
        var firstWage = rows[i].wages[0];

        if (female){
            numberOfFemales++;
            if (rows[i].employHistory.start && rows[i].wages.length > 0){
                totalFemaleSalaries+=firstWage;

            }

        } else {
            numberOfMales++;
            if (rows[i].employHistory.start && rows[i].wages.length > 0){
                totalMaleSalaries+=firstWage;

            }
        }
    };
    return [ {label:'Male', count:numberOfMales, averageSalary: (totalMaleSalaries/numberOfMales).toFixed(2)},
        {label:'Female', count:numberOfFemales, averageSalary: (totalFemaleSalaries/numberOfFemales).toFixed(2)}
    ];
}

function slicePieByVeteran(rows){
    var numberOfVeterans = 0;
    var numberOfNonVeterans = 0;
    var totalVetSalary = 0;
    var totalNonVetSalary = 0;

    for (var i = 0; i < rows.length;i++){
        if (rows[i].veteran){
            numberOfVeterans++;
            if (rows[i].employHistory.start && rows[i].wages.length > 0){
                totalVetSalary+=rows[i].wages[0];

            }
        } else {
            numberOfNonVeterans++;
            if (rows[i].employHistory.start && rows[i].wages.length > 0){
                totalNonVetSalary+=rows[i].wages[0];

            }
        }
    }
    return [{label:'Veteran', count:numberOfVeterans, averageSalary: (totalVetSalary/numberOfVeterans).toFixed(2)},
        {label:'Non-veterans', count:numberOfNonVeterans, averageSalary: (totalNonVetSalary/numberOfNonVeterans).toFixed(2)}];
}


// D3 LINE GRAPHS
/*Given the name of the field to be line-graphed: assembles the data for D3
 to use.*/
function buildLineData(allRows, yFieldName, startDate, endDate){
    var dataPoint = null;
    var seriesNames = [];
    var seriesByClassStart = [];

    var countsByClass = [];
    var graphData = [];

    var chartType = 'percentage';
    //Special case: we will display the average wage by class start date...
    if (yFieldName == 'Wage at Placement') chartType = 'average';

    //Assemble list of groupings (to become x-values) by class start date
    for (var iBin = 0; iBin < allRows.length; iBin++){
        if (!allRows[iBin].classStart) continue;
        if (countsByClass.length == 0) {
            countsByClass.push({ 'date': allRows[iBin].classStart, 'sum': 0 });
            continue;
        }
        for (var jBin = 0; jBin < countsByClass.length; jBin++){
            if (countsByClass[jBin].date == allRows[iBin].classStart) break;
            if (jBin >= countsByClass.length - 1){
                countsByClass.push({ 'date': allRows[iBin].classStart, 'sum': 0 });
            }
        }
    }
    //Sort the groupings from earliest to latest class
    countsByClass.sort(function(a, b){
        if (a.date < b.date) return -1;
        if (a.date > b.date) return 1;
        return 0;
    });

    for (var i = 0; i < allRows.length; i++){
        var seriesIndex = -1;
        var classIndex = -1;
        dataPoint = lineGraphData(allRows[i], yFieldName, startDate, endDate);
        if (dataPoint){
            for (var j = 0; j < seriesNames.length; j++){
                if (seriesNames[j] == dataPoint.seriesName){
                    seriesIndex = j;
                    break;
                }
            }
            if (seriesIndex < 0){
                seriesIndex = seriesNames.length;
                seriesNames.push(dataPoint.seriesName);
                seriesByClassStart.push([]);
                for (var l = 0; l < countsByClass.length; l++){
                    seriesByClassStart[seriesByClassStart.length - 1].push({ 'date': countsByClass[l].date, 'sum': 0 });
                }
                graphData.push([]);
            }
            for (var k = 0; k < countsByClass.length; k++){
                if (Date.parse(countsByClass[k].date) == dataPoint.classStart){
                    countsByClass[k].sum++;
                    seriesByClassStart[seriesIndex][k].sum += dataPoint.dataVal;
                }
            }
        }
    }

    for (var s = 0; s < graphData.length; s++){
        for (var g = 0; g < seriesByClassStart[s].length; g++){
            var xVal = Date.parse(seriesByClassStart[s][g].date);
            var yVal = null;
            if (countsByClass[g] && countsByClass[g].sum > 0){
                if (chartType == 'percentage'){
                    yVal = seriesByClassStart[s][g].sum / countsByClass[g].sum * 100;
                }
                else { //wage at placement case: average wage
                    yVal = seriesByClassStart[s][g].sum / countsByClass[g].sum;
                }
            }
            if (xVal && !isNaN(xVal) && yVal){
                graphData[s].push({ 'x': xVal, 'y': yVal });
            }
        }
    }

    //clean up calc-assistive data before publishing to graph
    var delIndex = seriesNames.indexOf(CALC_ASSIST);
    if (delIndex >= 0){
        seriesNames.splice(delIndex, 1);
        graphData.splice(delIndex, 1);
    }
    return { 'chartType': chartType, 'seriesNames': seriesNames, 'graphData': graphData, title: yFieldName + " by Class Start Date" };
}



function lineGraphData(rowData, yFieldName, startDate, endDate){
    /*Convention: if this function returns null, either we do not have data, or the individual falls
     outside the specified date range.  If this function returns false, we *do* have applicable data
     for that individual, and the data value in question is equal to false.*/
    var rowDataVal = null;
    var rowSeriesBin = null; //the series name to which rowDataVal will be added
    var classStart = Date.parse(rowData.classStart);
    if (isNaN(classStart) || isNaN(startDate) || isNaN(endDate)) return null;
    var adjStartDate = new Date(startDate);
    adjStartDate.setDate(adjStartDate.getDate() - 1);
    if (classStart < adjStartDate || classStart > endDate) return null;
    switch (yFieldName){
        case 'Gender':{
            if (rowData.female) rowSeriesBin = 'Female';
            else rowSeriesBin = 'Male';
            rowDataVal = 1;
            break;
        }
        case 'Age':{ //special case...binned number groups
            if (rowData.ageAtStart){
                var age = rowData.ageAtStart;
                rowDataVal = 1;
                if (age < 18) rowSeriesBin = 'Under 18';
                else if (age < 24) rowSeriesBin = '18 to 24';
                else if (age < 30) rowSeriesBin = '24 to 30';
                else if (age < 40) rowSeriesBin = '30 to 40';
                else if (age < 50) rowSeriesBin = '40 to 50';
                else rowSeriesBin = 'Over 50';
            }
            break;
        }
        case 'Race':{ //String
            if (rowData.ethnicity) {
                rowSeriesBin = rowData.ethnicity;
                rowDataVal = 1;
            }
            break;
        }
        case 'Veteran Status':{
            if (rowData.veteran) {
                rowSeriesBin = 'Veteran';
                rowDataVal = 1;
            }
            else {
                rowSeriesBin = CALC_ASSIST;
                rowDataVal = 1;
            }
            break;
        }
        case 'Wage at Placement':{
            if (rowData.wages && rowData.wages.length > 0){
                rowDataVal = rowData.wages[0];
                rowSeriesBin = 'Wage at Placement';
            }
            break;
        }
        case 'Placement Rates':{
            if (rowData.employHistory.start) {
                rowDataVal = 1;
                rowSeriesBin = 'Placement Rate';
            }
            else {
                rowSeriesBin = CALC_ASSIST;
                rowDataVal = 1;
            }
            break;
        }
        case 'Graduation Rates':{
            if (rowData.gradDate) {
                rowDataVal = 1;
                rowSeriesBin = 'Graduation Rate';
            }
            else {
                rowSeriesBin = CALC_ASSIST;
                rowDataVal = 1;
            }
            break;
        }
        default: {}
    }
    if (rowDataVal === null) return null;
    else return { 'seriesName': rowSeriesBin, 'classStart': classStart, 'dataVal': rowDataVal };
}


//$scope.lineGraphList = ['Gender', 'Age', 'Race', 'Veteran Status', 'Wage at Placement','Placement Rates', 'Graduation Rates'];


function genLineGraph(rowData, yFieldName, startDate, endDate){
    console.log('yo, line chart');
    var gWidth = 720;
    var gHeight = 480;
    var pad = 50;
    var allData = buildLineData(rowData, yFieldName, startDate, endDate);
    // var gData = genLineData();
    var gData = allData.graphData;
    var series = allData.seriesNames;
    var title = allData.title;
    var palette = d3.scale.category10();

    var legendInfo = [];
    for (var i = 0; i < series.length; i++){
        legendInfo.push({ 'name': series[i], 'color': palette(i) });
    }

    //var xRange = d3.extent(d3.merge(gData), function(axisData){ return axisData.x; });
    // var yRange = d3.extent(d3.merge(gData), function(axisData){ return axisData.y; });
    var yAxisLabel = 'Percent (%)';
    var yRange = [0, 100];
    console.log('chartType:', allData.chartType);
    if (allData.chartType == 'average'){ //special case: y-scale for wage chart
      yAxisLabel = 'Average Wage ($/hr)';
      yRange = d3.extent(d3.merge(gData), function(axisData){ return axisData.y; });
      yRange[0] /= 1.5;
      yRange[1] *= 1.25;
    }

    var xScale = d3.time.scale()
        .domain([startDate, endDate])
        .range([pad, gWidth - pad * 2]);

    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient("bottom")
        .ticks(d3.time.months, 6)
        .tickSize(12, 12)
        .tickFormat(d3.time.format("%b. '%y"));

    var yScale = d3.scale.linear()
        .domain([yRange[0], yRange[1]])
        .range([gHeight - pad, pad]);

    var yAxis = d3.svg.axis().scale(yScale).orient("left").ticks(8);

    d3.select("#lineSVG").remove(); //clear chart for rebuild
    d3.select("#legendArea").remove(); //clear line graph legend

    var svg = d3.select('.lineControls')
        .append("svg")
        .attr("id", "lineSVG")
        .attr("width", gWidth)
        .attr("height", gHeight)
        .attr("opacity", "1");

    svg.append("text")
        .attr("x", gWidth / 2)
        .attr("y", 40)
        .style("text-anchor", "middle")
        .text(title);

    svg.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(0," + (gHeight - pad) + ")")
        .call(xAxis)
        .append("text")
        .attr("y", 48)
        .attr("x", 400)
        // .attr("dy", "-3em")
        .style("text-anchor", "end")
        .text('Class Start Date');

    svg.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(" + pad + ",0)")
        .call(yAxis)
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("x", -200)
        .attr("dy", "-2.8em")
        .style("text-anchor", "end")
        .text(yAxisLabel);

    var linePath = svg.selectAll("g.line").data(gData);

    linePath.enter().append("g")
        .attr("class", "line").attr("style", function(d) {
        return "stroke: " + palette(gData.indexOf(d));
    });

    linePath.selectAll("path").data(function (d) { return [d]; })
        .enter().append('path').attr("d", d3.svg.line()
        .x(function (d) { return xScale(d.x); })
        .y(function (d) { return yScale(d.y); })
    );
    /////////////////////
    //LEGEND STUFF HERE//
    /////////////////////
    var legendSpace = d3.select('#lineControlPanel').append("svg").attr("id", "legendArea");

    var legend = legendSpace.append("g")
       .attr("class", "legend");
      //  .attr('transform', 'translate(-85,200)');

    legend.selectAll("rect").data(gData).enter()
       .append("rect")
       .attr("x", 5)
       .attr("y", function(d, i){ return i * 24; })
       .attr("width", 15).attr("height", 15)
       .style("fill", function(d) {
           return legendInfo[gData.indexOf(d)].color;
       });

    legend.selectAll("text").data(gData).enter()
       .append("text").attr("x", 25)
       .attr("y", function(d, i){ return i *  24 + 11; })
       .text(function(d) {
           return legendInfo[gData.indexOf(d)].name;
       });
}


//[][][] Factory to get Smartsheet data [][][][[[[[]]]]]
app.factory('SmartSheetService', ['$http', function($http){

    var getSmartSheetData = function(){
        return $http.get('/api');
    };

    return {
        getSmartSheetData: getSmartSheetData,
    };
}]);
