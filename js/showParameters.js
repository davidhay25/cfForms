angular.module("pocApp")
    .controller('showParametersCtrl',
        function ($scope,parameters,title,system,code,$http) {


            $scope.system = system
            $scope.snomed = "http://snomed.info/sct"

            if (system !== $scope.snomed) {
                //get the other members of this codesystem
                let qry = `CodeSystem?system=${system}&_summary=false`
                let encodedQry = encodeURIComponent(qry)
                $scope.showWaiting = true
                $http.get(`nzhts?qry=${encodedQry}`).then(
                    function (data) {
                        //a bundle of codesystems - should only be 1
                        if (data.data && data.data.entry && data.data.entry.length > 0) {
                            $scope.codeSystem = data.data.entry[0].resource
                        }


                    }, function (err) {

                    }
                )

            }

            function getDisplay(params) {
                for (const param of params.parameter) {
                    if (param.name == 'display') {
                        return param.valueString
                        break
                    }
                }
            }

            $scope.arHx = [{code:code,display:getDisplay(parameters),params:parameters}]

            $scope.parameters = parameters
            $scope.title = title
            $scope.selectParameter = function (param) {
                $scope.selectedParameter = param
            }

            //select a different code
            $scope.selectCode = function (part) {
                let code1
                part.forEach(function (p) {1
                    if (p.name == 'value') {
                        code1 = p.valueCode
                    }
                })

                if (code1) {

                    //system = system || snomed
                    let qry = `CodeSystem/$lookup?system=${system}&code=${code1}`
                    let encodedQry = encodeURIComponent(qry)
                    $scope.showWaiting = true
                    $http.get(`nzhts?qry=${encodedQry}`).then(
                        function (data) {
                            $scope.title = code1
                            $scope.parameters = data.data

                            $scope.arHx.push({code:code1,display:getDisplay(data.data),params:data.data})

                        }, function (err) {

                        }
                    )
                }




            }

        }
    )