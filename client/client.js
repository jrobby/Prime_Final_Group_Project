/**
 * Created by jeremycloutier on 2/16/16.
 */

var app = angular.module('myApp', ['ngRoute']);
console.log('client.js is connected to index.html');

app.config(['$routeProvider', function($routeProvider){
    $routeProvider
        .when('/', {
            templateUrl: 'views/pieChart.html',
            controller: 'pieChartController'
        })
        .when('/lineGraph',{
            templateUrl: 'views/lineGraph.html',
            controller: 'lineGraphController'
        });
}]);


app.controller('MainController', [ '$scope', function($scope){
    $scope.tab = 'a';

    $scope.generateCharts = function(demographics, progress){
        console.log('demographics, progress', demographics, progress);



        //I figure this will be structured thusly:
    //    If (pie){
     //     makePieChart() }
    //    else { makeLineChart()}
    //


    }

}]);

app.controller('pieChartController',['$scope','$http', function($scope,$http){
    $scope.pie = "this pie chart view is controlled";
}])


app.controller('lineGraphController',['$scope','$http', function($scope,$http){
    $scope.line = "this line Graph view is controlled";
}])



