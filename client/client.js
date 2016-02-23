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
        $scope.numCompleted = 0;
        $scope.numCertified = 0;
        $scope.numPlaced = 0;
        $scope.numCertNetwork = 0;
        $scope.numCertServer = 0;
        $scope.numCertSecurity = 0;

        $scope.completedPercent = 0;



          for(var i=0; i<$scope.smartSheetData.length; i++){
            var tempStartDate = new Date($scope.smartSheetData[i].classStart);
              console.log("object number" + i + " " + $scope.smartSheetData[i]);

            //inelegant way to account for new Date() reading date as one day prior
            //add a day to the result
            var classStart = tempStartDate.setDate(tempStartDate.getDate() + 1);
            //check classStart is in the date range selected
            if(classStart >= $scope.startDate && classStart <= $scope.endDate){
              //count total number served
              $scope.numServed++;

              //count how many graduated (gradDate is not null)
              if($scope.smartSheetData[i].gradDate){
                $scope.numCompleted++;
                $scope.completedPercent = Number(Math.round((($scope.numCompleted / $scope.numServed)*100) + 'e2') + 'e-2');
              }

                //count number certified, calculate percentage certified
                if($scope.smartSheetData[i].certDate){
                $scope.numCertified++;
                $scope.percentCertified = Number(Math.round((($scope.numCertified / $scope.numServed)*100) + 'e2') + 'e-2');
              }

                //count number Network Plus certified, calculate percentage
                if($scope.smartSheetData[i].networkPlus){
                $scope.numCertNetwork++;
                $scope.percentCertNetwork = Number(Math.round((($scope.numCertNetwork / $scope.numServed)*100) + 'e2') + 'e-2');
              }


                //count number Server Plus certified, calculate percentage
                if($scope.smartSheetData[i].serverPlus){
                $scope.numCertServer++;
                $scope.percentCertServer = Number(Math.round((($scope.numCertServer / $scope.numServed)*100) + 'e2') + 'e-2');
              }

                //count number Security Plus certified, calculate percentage
                if($scope.smartSheetData[i].securityPlus){
                $scope.numCertSecurity++;
                $scope.percentCertSecurity = Number(Math.round((($scope.numCertSecurity / $scope.numServed)*100) + 'e2') + 'e-2');
              }
                //count number Placed, calculate percentage
                if($scope.smartSheetData[i].placedFullTime){
                $scope.numPlaced++;
                $scope.percentPlaced = Number(Math.round((($scope.numPlaced / $scope.numServed)*100) + 'e2') + 'e-2');
              }


            }
          }
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
