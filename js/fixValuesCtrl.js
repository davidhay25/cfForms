angular.module("pocApp")
    .controller('fixValuesCtrl',
        function ($scope,type,$http,kind,current) {
            //'type' is the datatype
            //'kind' is 'fixed' or 'default'
            //'current' is the current value (of type 'type') - if any
            $scope.type = type
            $scope.kind = kind

            $scope.input = {}
            $scope.input.system = "http://snomed.info/sct"
            if (current) {
                //there is a current value that is being edited
                switch (type) {
                    case 'code' :
                        $scope.input.code = current
                        break
                    case 'Coding' :
                        $scope.input.code = current.code
                        $scope.input.display = current.display
                        $scope.input.fsn = current.fsn
                        $scope.input.system = current.system
                        break
                    case 'Quantity' :
                        $scope.input.unit = current.unit
                        $scope.input.fixedValue = current.value
                        break
                    case 'Ratio' :
                        $scope.input.numeratorUnit = current.numerator.unit
                        $scope.input.denominatorUnit = current.denominator.unit
                        $scope.input.denominatorValue = current.denominator.value
                        break
                }

            }

            //lookup from the TS
            $scope.lookupFSN = function () {

                delete $scope.input.display
                delete $scope.input.fsn



                //let qry = `CodeSystem/$lookup?system=${snomed}&code=${code}&displayLanguage=en-x-sctlang-23162100-0210105`

                let qry = `CodeSystem/$lookup?system=${$scope.input.system}&code=${$scope.input.code}&displayLanguage=en-x-sctlang-23162100-0210105`
                $scope.tsQuery = qry

                let encodedQry = encodeURIComponent(qry)
                $scope.showWaiting = true
                $http.get(`nzhts?qry=${encodedQry}`).then(
                    function (data) {
                        console.log(data)
                        let parameters = data.data



                        for (const param of parameters.parameter) {

                            if (param.name == 'display') {
                                $scope.input.display = param.valueString
                            }

                            if (param.part) {
                                let parsedPart = {}

                                param.part.forEach(function (part) {
                                    parsedPart[part.name] = part.valueCoding || part.valueString
                                })

                                console.log(parsedPart)
                               // if (parsedPart.name == 'use' && parsedPart.valueCoding) {
                                    if (parsedPart.use && parsedPart.use.code == '900000000000003001') {
                                        //this is the FSN
                                        if (parsedPart['value']) {
                                            $scope.input.fsn = parsedPart['value']
                                        }

                                    }
                             //   }

                            }
                        }

                        //find the FSN. I really don't like parameters!




                    },function (err) {
                        alert("This Concept was not found on the National Terminology Server")
                        console.log(err)
                    }
                )


                   // let concept = {system:$scope.input.system,code:$scope.input.code}

            }

            $scope.canSave = function () {

                let canSave = false
                switch (type) {
                    case 'code' :
                        if ($scope.input.code) {
                            canSave = true
                        }
                        break
                    case 'Coding' :
                        if ($scope.input.system) {
                            canSave = true
                        }
                        break
                    case 'Quantity' :
                        if ($scope.input.unit || $scope.input.fixedValue) {
                            canSave = true
                        }
                        break
                    case 'Ratio' :

                        if ( $scope.input.numeratorUnit ||
                             $scope.input.denominatorUnit ||
                            $scope.input.denominatorValue) {
                            canSave = true
                        }
                        /*
                        if (($scope.input.numerator && $scope.input.numerator.unit) ||
                            ($scope.input.denominator && $scope.input.denominator.unit) ||
                            ($scope.input.denominator && $scope.input.denominator.value)) {
                            canSave = true
                        }
                        */
                        break
                }

                return canSave
            }

            $scope.save = function () {
                let v
                switch (type) {
                    case "code" :
                        v = $scope.input.code
                        break
                    case "Coding" :
                        v = {system:$scope.input.system,code:$scope.input.code}
                        if ($scope.input.display) {
                            v.display = $scope.input.display
                        }
                        if ($scope.input.fsn) {
                            v.fsn = $scope.input.fsn
                        }
                        break
                    case "Quantity" :
                        v = {unit:$scope.input.unit,value:$scope.input.fixedValue}
                        break

                    case "Ratio" :
                        v = {numerator:{},denominator:{}}
                        v.numerator = {unit:$scope.input.numeratorUnit}
                        v.denominator = {unit:$scope.input.denominatorUnit,value:$scope.input.denominatorValue}
                        break


                }
                $scope.$close(v)

            }

        }
    )