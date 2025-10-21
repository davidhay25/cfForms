angular.module("pocApp")
    .controller('adminCtrl',
        function ($scope,$http,utilsSvc) {

            utilsSvc.getConfig().then(
                function (config) {
                    $scope.systemConfig = config
                    //console.log($scope.systemConfig)
                }
            )


        }
    )