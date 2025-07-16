angular.module('BlocksApp').controller('ContractController', function($stateParams, $rootScope, $scope, $http) {
    $rootScope.$state.current.data["pageSubTitle"] = $stateParams.addr;

    //fetch compiler options
    $scope.compilerVersions = [];

    // Fallback compiler versions if external API fails
    const fallbackVersions = [
      { name: 'Latest (0.8.30)', value: 'latest' },
      { name: '0.8.30', value: '0.8.30' },
      { name: '0.8.29', value: '0.8.29' },
      { name: '0.8.28', value: '0.8.28' },
      { name: '0.8.27', value: '0.8.27' },
      { name: '0.8.26', value: '0.8.26' },
      { name: '0.8.25', value: '0.8.25' },
      { name: '0.8.24', value: '0.8.24' },
      { name: '0.8.23', value: '0.8.23' },
      { name: '0.8.22', value: '0.8.22' },
      { name: '0.8.21', value: '0.8.21' },
      { name: '0.8.20', value: '0.8.20' },
      { name: '0.8.19', value: '0.8.19' },
      { name: '0.8.18', value: '0.8.18' },
      { name: '0.8.17', value: '0.8.17' },
      { name: '0.8.16', value: '0.8.16' },
      { name: '0.8.15', value: '0.8.15' }
    ];

    $http.get('https://ethereum.github.io/solc-bin/bin/list.json').then(function (resp) {
      function buildVersion (build) {
        if (build.prerelease && build.prerelease.length > 0) {
          return build.version + '-' + build.prerelease
        } else {
          return build.version
        }
      }

      // populate version dropdown with all available compiler versions (descending order)
      $.each(resp.data.builds.slice().reverse(), function (i, build) {
        $scope.compilerVersions.push({'name': buildVersion(build), 'value': 'v' + build.longVersion})
      })

    }).catch(function (resp) {
      // loading failed for some reason, fall back to local compiler versions
      console.log('Failed to fetch compiler versions from external API, using fallback versions');
      $scope.compilerVersions = fallbackVersions;
    })

    $scope.form = {};
    $scope.contract = {"address": $stateParams.addr, "optimization": true};
    $scope.errors = {};
    $scope.settings = $rootScope.setup;
    
    $scope.submitCode = function() {
      console.log($scope.contract)
      $scope.errors = {};
      $("#submitCodeBtn").button("loading");

      // validate
      
      if (!isAddress($scope.contract.address)) 
        $scope.errors.address = "Invalid Address";
      if (typeof $scope.contract.name == "undefined")          
        $scope.errors.name = "Contract Name Required";
      if (typeof $scope.contract.version == "undefined")
        $scope.errors.version = "Compiler Version Required"
      if (typeof $scope.contract.code == "undefined")
        $scope.errors.code = "Invalid Contract Code"

      if (Object.keys($scope.errors) < 1) {
        var contractReq = $scope.contract;
        contractReq.action = "compile";

        // send to web3 for validation
        $http({
          method: 'POST',
          url: '/compile',
          data: contractReq
        }).then(function(resp) {
          $("#submitCodeBtn").button("reset");
          console.log(resp.data);
          $scope.contract = resp.data;
          $scope.contract.compiled = true;
        });
      } else {
        $("#submitCodeBtn").button("reset");
        return;
      }
    }

    $scope.resetCode = function() {
      $scope.form.contract.$setPristine();
      $scope.form.contract.$setUntouched();
      $scope.contract = {"address": $stateParams.addr, "optimization": true};
      $scope.errors = {};
    }
    $scope.startOver = function() {
      $scope.contract.compiled = false;
      $scope.form.contract.$setPristine();
      $scope.form.contract.$setUntouched();
      $scope.contract = {"address": $stateParams.addr, "optimization": true};
      $scope.errors = {};
    }

})