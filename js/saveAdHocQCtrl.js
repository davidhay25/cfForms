angular.module("pocApp")
    .controller('saveAdHocQCtrl',
        function ($scope,Q,$http) {

            $scope.Q = Q

            $scope.input = {}
            $scope.input.url = Q.url || ""
            $scope.input.version = Q.version || ""
            $scope.input.publisher = Q.publisher || ""
            $scope.input.description = Q.description || ""
            $scope.input.title = Q.title || ""
            $scope.input.name = Q.name || ""

            $scope.publish = function () {

                //update any fields that may have been altered
                for (const key of ['url','version','publisher','description','title','name']) {
                    updateQ($scope.Q,key)
                }


                let qry = `adhocq/publish`
                $http.post(qry,$scope.Q).then(
                    function (data) {
                        alert("Questionnaire was saved in the Form Manager")
                        $scope.$close()
                    }, function (err) {
                        if (err.status == 422) {
                            alert("There is already a Questionnaire with this name and version on this Server. The combination or Url & version must be unique.")
                        } else {
                            alert(err)
                            console.log(err)
                        }

                    }
                )

                function updateQ(Q,key) {
                    if ($scope.input[key]) {
                        Q[key] = $scope.input[key]
                    } else {
                        delete Q[key]
                    }

                }



            }

        }
    )