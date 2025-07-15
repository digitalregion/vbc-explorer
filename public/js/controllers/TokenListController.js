angular.module('BlocksApp').controller('TokenListController', function($stateParams, $rootScope, $scope, $http) {
    $scope.$on('$viewContentLoaded', function() {   
        // initialize core components
        App.initAjax();
    });
    $scope.settings = $rootScope.setup;

    var tokenList = '/' + ($scope.settings.tokenList || 'tokens.json');
    $http.get(tokenList)
      .then(function(res){
        var contentType = res.headers('Content-Type');
        if (contentType.indexOf('/json') > 0) {
          $scope.tokens = res.data;
        } else {
          $scope.tokens = [];
        }
      })

    $scope.goToToken = function(address) {
      window.location.href = '/token/' + address;
    };

    $scope.getVRCType = function(type) {
      if (!type) return 'VRC-20'; // デフォルトERC20
      switch (type.toUpperCase()) {
        case 'ERC20': return 'VRC-20';
        case 'VRC-721': return 'VRC-721';
        case 'ERC1155': return 'VRC-1155';
        default: return type;
      }
    };
})
