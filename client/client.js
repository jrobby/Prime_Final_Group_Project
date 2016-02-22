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


app.controller('MainController', [ '$scope', '$location', function($scope, $location){

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

}]);

app.controller('pieChartController',['$scope', '$location', function($scope, $location){
    $scope.pie = "this pie chart view is controlled";
}]);


app.controller('lineGraphController',['$scope', '$location', function($scope, $location){

    $scope.line = "this line Graph view is controlled";
}]);
