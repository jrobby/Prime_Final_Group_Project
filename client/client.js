/**
 * Created by jeremycloutier on 2/16/16.
 */

var app = angular.module('myApp', ['ngRoute']);

app.config(['$routeProvider', '$locationProvider', function($routeProvider, $locationProvider){
    $routeProvider
        .when('/', {
            templateUrl: 'views/pieChart.html',
            controller: 'pieChartController'
        })
        .when('/lineGraph',{
            templateUrl: 'views/lineGraph.html',
            controller: 'lineGraphController'
        });

    $locationProvider.html5Mode(true);
}]);


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
                $scope.placed = incrementRowVals($scope.smartSheetData[i].placedFullTime, $scope.placed);
                $scope.certNetwork = incrementRowVals($scope.smartSheetData[i].networkPlus, $scope.certNetwork);
                $scope.certServer = incrementRowVals($scope.smartSheetData[i].serverPlus, $scope.certServer);
                $scope.certSecurity = incrementRowVals($scope.smartSheetData[i].securityPlus, $scope.certSecurity);
            }
        }
        $scope.avgWageAtPlacement = computeAveragePlacedWage($scope.smartSheetData, Date.parse($scope.startDate), Date.parse($scope.endDate));
        $scope.avgCurrentWage =  computeAverageCurrentWage($scope.smartSheetData, Date.parse($scope.startDate), Date.parse($scope.endDate));
    };


    //[[AVERAGE WAGE AT PLACEMENT]]///////
    function computeAveragePlacedWage(allRows, startDate, endDate){
      var sumOfWages = 0;
      var numPlaced = 0; //numPlaced = $scope.placed (after submitDate is called)
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
      if (isNaN(classStart)) return null;
      if (rowData.employHistory.start){
        if (startDate <= classStart && classStart < endDate && rowData.wages.length > 0) return rowData.wages[0];
      }
      return null;
    }



    //[[AVERAGE CURRENT WAGE ]]///CURRENT //CURRENT //CURRENT //CURRENT //CURRENT //
    function computeAverageCurrentWage(allRows, startDate, endDate){
      var sumOfWages = 0;
      var numPlaced = 0; //numCurrentlyEmployed = ??
      var tempWage = 0;

      for (var i = 0; i < allRows.length; i++){
        tempWage = getCurrentWage(allRows[i], startDate, endDate);
        if (tempWage){
          sumOfWages += tempWage;
          numPlaced++;
        }
      }
      return (sumOfWages / numPlaced).toFixed(2);
    }


    function getCurrentWage(rowData, startDate, endDate){
      var classStart = Date.parse(rowData.classStart);
      if (isNaN(classStart)) return null;
      if (rowData.employHistory.start && rowData.employHistory.end==null){
        if (startDate <= classStart && classStart < endDate && rowData.wages.length > 0) return rowData.wages[rowData.wages.length -1];
      }
      return null;
    }



    function incrementRowVals(smartsheetDataVal, numPercentObject){
        var tempObj = numPercentObject;
        if (smartsheetDataVal){
            tempObj.number++;
            tempObj.percent = Number(Math.round(((tempObj.number / $scope.numServed)*100) + 'e2') + 'e-2');
        }
        return tempObj;
    }

    $scope.demographicList = ['Age', 'Gender', 'Race', 'Veteran Status']; // More here, possibly?
    $scope.progressList = ['Served', 'Completed', 'Certified A+', 'Placed'];

    $scope.tab = 'a';
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



app.controller('pieChartController',['$scope', '$location', function($scope, $location){
    $scope.pie = "this pie chart view is controlled";
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
}]);



app.controller('lineGraphController',['$scope', '$location', function($scope, $location){

    $scope.line = "this line Graph view is controlled";
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
