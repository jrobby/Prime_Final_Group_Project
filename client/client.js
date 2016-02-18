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
        .when('/pie')
        .when('/lineGraph',{
            templateUrl: 'views/lineGraph.html',
            controller: 'lineGraphController'
        });
}]);


app.controller('MainController', [ '$scope', function($scope){
    $scope.thing = 'blah';
    $scope.genCharts = function(demographics, progress){
        console.log('demographics, progress', demographics, progress);
    }

}]);

app.controller('pieChartController',['$scope','$http', function($scope,$http){
    $scope.pie = "this pie chart view is controlled";
}])


app.controller('lineGraphController',['$scope','$http', function($scope,$http){
    $scope.line = "this line Graph view is controlled";
}])


//
//app.controller('TabController', function () {
//    this.tab = 1;
//
//    this.setTab = function (tabId) {
//        this.tab = tabId;
//    };
//
//    this.isSet = function (tabId) {
//        return this.tab === tabId;
//    };
//});

//app.factory('SomeService', ['$http', '$scope', function($http, $scope){
//
//
//    $http.get('/SomeService').then(function(res){
//            $scope.SomeServiceProduct = res;
//
//        });
//}]);

