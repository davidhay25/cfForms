angular.module("pocApp")
    .controller('addFormManagerCtrl',
        function ($scope,$localStorage,$http) {

            $scope.input = {}

            $localStorage.fmServers = $localStorage.fmServers || []

            $scope.fmServers = $localStorage.fmServers

            $scope.addServer = function () {

                let qry = `formManagerSearch?server=${$scope.input.url}&url=dummy` //

                $http.get(qry).then(
                    (data) => {
                        //Expecting an empty result (url=dummy after all) but if it succeeds at all, it's a valid server
                        let newServer = {url:$scope.input.url,display:$scope.input.display}
                        $localStorage.fmServers.push(newServer)

                        delete $scope.input.url
                        delete $scope.input.display

                    },
                    (err) => {
                        alert("That does not appear to be a valid FHIR server")
                    }
                ).finally(
                    () => $scope.queryingFS = false
                )

            }

            $scope.close = function () {
                $scope.$close()
            }

            $scope.deleteServer = function (inx) {
                $localStorage.fmServers.splice(inx,1)

            }



        }
    )