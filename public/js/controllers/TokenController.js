angular.module('BlocksApp').controller('TokenController', function($stateParams, $rootScope, $scope, $http, $location) {
    $scope.$on('$viewContentLoaded', function() {   
        // initialize core components
        App.initAjax();
    });
    var activeTab = $location.url().split('#');
    if (activeTab.length > 1)
      $scope.activeTab = activeTab[1];

    $rootScope.$state.current.data["pageSubTitle"] = $stateParams.hash; //replace with token name
    $scope.addrHash = isAddress($stateParams.hash) ? $stateParams.hash : undefined;
    var address = $scope.addrHash;
    $scope.token = {"balance": 0};
    $scope.settings = $rootScope.setup;

    $scope.loading = true;
    //fetch dao stuff
    $http({
      method: 'POST',
      url: '/tokenrelay',
      data: {"action": "info", "address": address}
    }).then(function(resp) {
      console.log(resp.data)
      $scope.token = resp.data;
      $scope.token.address = address;
      // Normalize token type
      let tokenType = resp.data.type || 'VRC-20';
      if (tokenType === 'ERC20') tokenType = 'VRC-20';
      else if (tokenType === 'ERC721') tokenType = 'VRC-721';
      else if (tokenType === 'VRC721') tokenType = 'VRC-721';
      else if (tokenType === 'ERC1155') tokenType = 'VRC-1155';
      else if (tokenType === 'VRC1155') tokenType = 'VRC-1155';
      $scope.token.type = tokenType;
      $scope.addr = {"bytecode": resp.data.bytecode};
      $scope.loading = false;
      if (resp.data.name)
        $rootScope.$state.current.data["pageTitle"] = resp.data.name;
    });

    $scope.form = {};
    $scope.errors = {};
    $scope.showTokens = false;
    $scope.getBalance = function(a) {
        var addr = a.toLowerCase();

        $scope.form.addrInput="";
        $scope.errors = {};

        $scope.form.tokens.$setPristine();
        $scope.form.tokens.$setUntouched();
        if (isAddress(addr)) {
          $http({
            method: 'POST',
            url: '/tokenrelay',
            data: {"action": "balanceOf", "user": addr, "address": address}
          }).then(function(resp) {
            console.log(resp.data)
            $scope.showTokens = true;
            $scope.userTokens = resp.data.tokens;
          });
        } else 
            $scope.errors.address = "Invalid Address";

    }

    $scope.getVRCType = function(type) {
      if (!type) return 'VRC-20';
      switch (type.toUpperCase()) {
        case 'ERC20': return 'VRC-20';
        case 'VRC-721': return 'VRC-721';
        case 'ERC1155': return 'VRC-1155';
        default: return type;
      }
    };

    $scope.vrc721Tokens = [];

    // VRC-721 TokenIDリスト取得
    $scope.loadVRC721Tokens = function() {
      $scope.vrc721Tokens = [];
      if (!address) return;
      $http.get('/api/account/' + address + '/vrc721').then(function(resp) {
        $scope.vrc721Tokens = resp.data || [];
      });
    };

    // タブ切り替え時にVRC-721取得
    $scope.$watch('activeTab', function(newVal) {
      if (newVal === 'tab_token_vrc721') {
        $scope.loadVRC721Tokens();
      }
    });

})
.directive('contractSource', function($http) {
  return {
    restrict: 'E',
    templateUrl: '/views/contract-source.html',
    scope: false,
    link: function(scope, elem, attrs){
        //fetch contract stuff
        $http({
          method: 'POST',
          url: '/compile',
          data: {"addr": scope.addrHash, "action": "find"}
        }).then(function(resp) {
          console.log('Contract data:', resp.data);
          scope.contract = resp.data;
          
          // Set default compiler version if not present
          if (!scope.contract.compilerVersion || scope.contract.compilerVersion === 'Unknown') {
            scope.contract.compilerVersion = '0.8.28';
          }
        }).catch(function(error) {
          console.error('Failed to fetch contract data:', error);
          scope.contract = {
            valid: false,
            contractName: 'Unknown',
            compilerVersion: '0.8.28',
            optimization: false,
            sourceCode: '',
            abi: ''
          };
        });
      }
  }
})
