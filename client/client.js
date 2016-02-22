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

    //display the dates selected
    $scope.submitDate = function(){
      console.log('start date selected', $scope.startDate);
      console.log('end date selected', $scope.endDate);

      //Test function to do the call to get all the Smartsheet data
      //returns an array of objects with the columns we need
        SmartSheetService.getSmartSheetData().then(function(response){
          $scope.smartSheetData = response.data;
          console.log($scope.smartSheetData);

          //count the number served over the selected date range
          //the count doesn't quite work because the new Date() reads the date as one day
          //earlier than it actually is on the spreadsheet
          $scope.numServed = 0;
          for(var i=0; i<response.data.length; i++){
            var classStart = new Date(response.data[i].classStart);
            console.log(classStart);
            if(classStart >= $scope.startDate && classStart <= $scope.endDate){
              $scope.numServed++;
            }
          }
          console.log('number served', $scope.numServed);
        });
    };

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
