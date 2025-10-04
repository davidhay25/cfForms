angular.module("pocApp")
    .controller('xqueryCtrl',
        function ($scope,query,$http) {


            $scope.query = query  // expression is in query.contents {expression: }
            $scope.input = {}

            $scope.input.expression = query.contents

            //get the resource type - assume a structure like AllergyIntolerance?patient={{%patient.id}}
            let ar = query.contents.split('?')
            let resourceType = ar[0]

            $scope.input.fhirPath = `%${query.itemName}`

            $scope.input.patientId = 45086382
            //let patientId = 45086382      //todo - pass in as a param


            getResourceType = function (expression) {
                let ar=expression.split('?')
                $scope.resourceType = ar[0]
                $scope.linkToSpec=`https://hl7.org/fhir/R4B/${$scope.resourceType}.html`
            }
            getResourceType($scope.input.expression)

            let server = "https://hapi.fhir.org/baseR4/"

            let replacement = {}        //parameter replacement.
            replacement["{{%patient.id}}"] = $scope.input.patientId


            let replaceParams = function (expression) {
                for (const placeHolder of Object.keys(replacement)) {
                    let repl = replacement[placeHolder]
                    expression = expression.replace(placeHolder,repl)
                }
                return expression
            }

            $scope.expChanged = function () {
                $scope.input.dirty=true
                getResourceType($scope.input.expression)
            }

            $scope.save = function () {
                $scope.$close({expression:$scope.input.expression})

            }

            $scope.selectResource = function (resource) {
                $scope.selectedResource = resource
                delete $scope.fhirPathResult
            }

            //assume an xquery expression
            $scope.execute = function (expression) {
                let repl = replaceParams(expression)
                let qry = `${server}${repl}`
                console.log(qry)
                $http.get(qry).then(
                    function (data) {
                        console.log(data.data)
                        $scope.response = data.data
                    }, function (err) {
                        alert(angular.toJson(err.data.issue))
                    }
                )
            }


            $scope.executeFhirPathOnBundle = function (fp) {
                try {
                    let result = fhirpath.evaluate($scope.response, fp, null, fhirpath_r4_model)
                    $scope.fhirPathResultBundle = result
                } catch (ex) {
                    alert(angular.toJson(ex))
                }
            }


            $scope.executeFhirPath = function (fp,resource) {
                fp = fp.replace(`%${query.itemName}`,resourceType)
                    try {
                        let result = fhirpath.evaluate(resource, fp, null, fhirpath_r4_model)
                        $scope.fhirPathResult = result
                    } catch (ex) {
                        alert(angular.toJson(ex))
                    }

            }

        })