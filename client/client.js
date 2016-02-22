/**
 * Created by jeremycloutier on 2/16/16.
 */

var app = angular.module('myApp', ['ngRoute']);
console.log('client.js is connected to index.html');

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

    $scope.demographicList = ['Age', 'Gender', 'Race', 'Veteran Status']; // More here, possibly?
    $scope.progressList = ['3mo', '6mo', '1yr', '2yr', '3yr', '4yr', '5yr'];

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

    //Test function to do the call to get all the Smartsheet data
    //returns an array of objects with the columns we need
    $scope.getSmartSheetData = function(){
      SmartSheetService.getSmartSheetData().then(function(response){
        $scope.smartSheetData = response.data;
        console.log($scope.smartSheetData);
      });
    };


}]);


app.controller('pieChartController',['$scope', '$location', function($scope, $location){
    $scope.pie = "this pie chart view is controlled";
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
