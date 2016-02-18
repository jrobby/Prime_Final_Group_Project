/**
 * Created by jeremycloutier on 2/16/16.
 */

var app = angular.module('myApp', []);

app.controller('MainController', [ '$scope', 'SomeService', function($scope, SomeService){

}]);

app.factory('SomeService', ['$http', function($http){

}])