angular.module("pocApp")
    .controller('enterConceptsCtrl',
        function ($scope,vo,$q,$http) {
            //propDef is the property definition - $scope.cmProperties[key]

            let hashExisting = {}
            if (vo.existing) {
                for (const concept of vo.existing) {
                    hashExisting[concept.code] = concept
                }
            }

            //unpublished codes system. These do not need valiating as they will be added to the CS when saving
            let unPublishedSystem = "http://canshare.co.nz/fhir/CodeSystem/snomed-unpublished"

            $scope.url = vo.system    //if url passed in...
            //$scope.url = 'http://snomed.info/sct' //testing

            //create a hash

            $scope.import = function () {
                for (let concept of $scope.concepts) {
                    concept.system = $scope.url
                }
                $scope.$close($scope.concepts)
            }


            function validateCodesDEP(lstConcepts) {
                let calls = []
                for (const concept of lstConcepts) {
                    let qry = `CodeSystem/$lookup?system=${concept.system}&code=${concept.code}`
                    let encodedQry = encodeURIComponent(qry)
                    calls.push($http.get(`nzhts?qry=${encodedQry}`))
                }

                return $q.all(calls)
                    .then(function() {
                        // All succeeded
                        console.log('All calls succeeded');
                        return true;
                    })
                    .catch(function() {
                        // At least one failed
                        console.error('One or more calls failed');
                        return false;
                    });

            }




            $scope.parseConceptList = function (file) {
                $scope.concepts = []

                $scope.msg = []
                let missing = 0
                let dups = []
                let added = 0
                let arLines = file.split('\n')
                console.log(arLines)
                for (const lne of arLines) {
                    let ar = lne.split('\t')
                    if (ar[0] && ar[1]) {
                        let concept = {code:ar[0],display:ar[1]}
                        if (hashExisting[concept.code]) {
                            //a duplicate code...
                            dups.push(concept.code)
                        } else {

                            if ($scope.url == unPublishedSystem) {
                                //don't need to validate unpublished codes - they will be added to the CS if missing
                                $scope.concepts.push(concept)

                            } else {
                                let qry = `CodeSystem/$lookup?system=${$scope.url}&code=${concept.code}`
                                let encodedQry = encodeURIComponent(qry)
                                $http.get(`nzhts?qry=${encodedQry}`).then(
                                    function (data) {
                                        $scope.concepts.push(concept)
                                    }, function (err) {
                                        $scope.msg.push(`Code: ${concept.code}  not in this CodeSystem.`)
                                    }
                                )
                            }




                        }

                    } else {
                        missing++

                    }
                    console.log(ar)
                }

                if (missing > 0) {
                    $scope.msg.push(`There were ${missing} lines missing the code or display. `)
                }

                if (dups.length > 0) {
                    $scope.msg.push("The following codes already exist and were not added: ")
                    for (const code of dups) {
                        $scope.msg.push(code)
                    }
                }

                if (added > 0 ) {
                    $scope.msg.push(`There were ${added} codes added.`)
                }


            }

        }
    )