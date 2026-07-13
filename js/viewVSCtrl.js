angular.module("pocApp")
    .controller('viewVSCtrl',
        function ($scope,url,termServer,$http,$uibModal) {





            $scope.url = url
            $scope.input = {}



            let snomed = "http://snomed.info/sct"

            $scope.languages = []       //languages that can be used for the expansion
            $scope.languages.push({display:"Default",code:""})      //todo find nz expansion
            $scope.languages.push({display:"CanShare",code:"en-x-sctlang-23162100-0210105"})

            $scope.input.selectedLanguage = $scope.languages[1]


            //if the url does not start with 'http' then assume it is a canshare url and convert
            if (url.substring(0,4) !== 'http') {
                $scope.url = `https://nzhts.digital.health.nz/fhir/ValueSet/${url}`

            }





            $scope.expandVSInTS = function (url) {

                //If there is no termSvr, or there is and it contains 'canshare.co.nz' then use the
                //proxy to the NZHTS. Otherwise call the server directly
                //Could be tidied - eg use a server side proxy, or allow



                delete $scope.expandedVS
                let qry = `ValueSet/$expand?url=${url}&_summary=false`

                if ($scope.input.selectedLanguage && $scope.input.selectedLanguage.code) {
                    qry += `&displayLanguage=${$scope.input.selectedLanguage.code} `
                }

                if ($scope.input.filter) {
                    qry += `&filter=${$scope.input.filter}`
                }
                $scope.expandQry = qry





                if (! termServer || termServer.indexOf("canshare.co.nz") > -1) {
                    //this tries to go to the NZ term server using a local proxy.
                    //in canshare it works fine as the config is set correctly - in clinfhir it will fail.
                    // I think that's correct as clinfhir shouldn't be going to the NZ server
                    // so in clinfhir it should be set to a ts like ontoserver
                    //note that the actual value of the TS is used by the Questionnaire renderer
                    let encodedQry = encodeURIComponent(qry)
                    $scope.showWaiting = true
                    $http.get(`nzhts?qry=${encodedQry}`).then(
                        function (data) {
                            $scope.expandedVS = data.data
                        }, function (err) {
                            alert(`There was no ValueSet with the url:${url}`)
                        }
                    ).finally(
                        function () {
                            $scope.showWaiting = false
                        }
                    )

                } else {
                    //call the specified term server directly
                    //ensure trailing slash
                    let ts = termServer
                    if (!ts.endsWith('/')) {
                        ts += '/';
                    }

                    let fullQry = `${ts}${qry}`
                    $http.get(fullQry).then(
                        function (data) {
                            $scope.expandedVS = data.data
                        }, function (err) {
                            alert(`There was no ValueSet with the url:${url}`)
                        }
                    ).finally(
                        function () {
                            $scope.showWaiting = false
                        }
                    )

                }






            }

            //expand by default. Can always change later
            $scope.expandVSInTS($scope.url)

            $scope.lookup = function (concept) {


                let code = concept.code
                let system = concept.system || snomed

                let qry = `CodeSystem/$lookup?system=${system}&code=${code}`


                let encodedQry = encodeURIComponent(qry)
                $scope.showWaiting = true

                $http.get(`nzhts?qry=${encodedQry}`).then(

                    //$http.get(url).then(
                    function (data) {
                        //console.log(data.data)
                        //alert(data.data)
                        $scope.showWaiting = false
                        $uibModal.open({
                            templateUrl: 'modalTemplates/showParameters.html',
                            //backdrop: 'static',
                            //size : 'lg',
                            controller : "showParametersCtrl",

                            resolve: {
                                parameters: function () {
                                    return data.data
                                },
                                title : function () {
                                    return `Concept lookup (${code})`
                                },
                                code: function () {
                                    return code
                                },
                                system : function () {
                                    return snomed
                                }
                            }

                        })


                    }, function (err) {
                        alert(angular.toJson(err.data))
                    }
                )
            }




        }
    )