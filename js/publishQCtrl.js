angular.module("pocApp")
    .controller('publishQCtrl',
        function ($scope,Q,$http) {
        $scope.Q = Q

            $scope.publish = function () {
                //Q.qVersion ++

                Q.date = new Date().toISOString()
                $http.post(`q/publish`,Q).then(
                    function () {
                        alert(`Questionnaire published with version ${Q.version}`)
                        $scope.$close(Q)
                    },function (err) {
                        $scope.$dismiss()
                        alert(angular.toJson(err.data))

                    }
                )


            }

    })