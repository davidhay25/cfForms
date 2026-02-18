angular.module("pocApp")
    .controller('formManagerQueryCtrl',
        function ($scope,$http,$uibModal,$localStorage) {
            $scope.input = {}

            //$scope.parent = $scope.$parent.parent;
            $localStorage.lastFMIndex = $localStorage.lastFMIndex || 0

            $scope.standardFormServers = []
            $scope.standardFormServers.push({display:"Australian Sparked Server",url:"https://smartforms.csiro.au/api/fhir"})
            $scope.standardFormServers.push({display:"Fhirpath Lab",url:"https://fhir.forms-lab.com"})


            $scope.formServers = []
            $scope.formServers.push(...$scope.standardFormServers)


            //add any locally defined servers
            $localStorage.fmServers = $localStorage.fmServers || []
            $scope.formServers.push(...$localStorage.fmServers)

            $scope.input.formServer = $scope.formServers[$localStorage.lastFMIndex]


            //search parameters. key must be a FHIR query name
            $scope.params = []
            $scope.params.push({key:'title',display:"Title"})
            $scope.params.push({key:'publisher',display:"Publisher"})
            $scope.params.push({key:'url',display:"Url"})

            $scope.formServerChanged = function () {
                delete $scope.allQ
                delete $scope.msg
            }

            $scope.addFMServer = function () {
                $uibModal.open({
                    backdrop: 'static',      //means can't close by clicking on the backdrop.
                    keyboard: false,       //same as above.
                    size : 'lg',
                    templateUrl: 'modalTemplates/addFormManager.html',

                    controller: 'addFormManagerCtrl'

                }).result.then(function () {
                    //update the form servers list
                    $scope.formServers = []
                    $scope.formServers.push(...$scope.standardFormServers)
                    $scope.formServers.push(...$localStorage.fmServers)

                    //$scope.formServers = $localStorage.fmServers


                })
                
            }

            $scope.loadFromExternalFormManager = function (miniQ) {
                let qry = `formManager?server=${$scope.input.formServer.url}&id=${miniQ.id}`

                if (window.umami) {
                    window.umami.track('selectQ',{type:'externalFM',name:Q.name,url:miniQ.url,server:$scope.input.formServer.url});
                }

                console.log(qry)
                $http.get(qry).then(
                    (data) => {
                        console.log(data.data)
                        $scope.$emit("QLoaded",data.data)

                    },
                    (err) => {
                        alert(angular.toJson(err.data))
                    }
                )



            }

            $scope.executeQuery = function()  {
                delete $scope.allQ
                delete $scope.msg
                let qry = `${$scope.input.formServer.url}&_count=50&_summary=true` //
                let displayQry = `${$scope.input.formServer.url}/Questionnaire?_count=50&_summary=true`

                for (const param of $scope.params) {
                    let value = $scope.input[param.key]
                    if (value) {
                        qry += `&${param.key}=${value}`
                        displayQry += `&${param.key}=${value}`
                    }
                }


                //query for display
                $scope.displayQry=displayQry



                qry = `formManagerSearch?server=${qry}` //





                console.log(qry)
                $scope.queryingFS = true
                $http.get(qry).then(
                    (data) => {
                        $scope.allQ = data.data?.allResources
                        $scope.msg = data.data?.msg
                        console.log(data.data)
                    },
                    (err) => {
                        alert(angular.toJson(err.data))
                    }
                ).finally(
                    () => $scope.queryingFS = false
                )


            }


    })