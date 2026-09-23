angular.module("pocApp")
    .controller('makeSDCExtensionSetCtrl',
        function ($scope,elements,currentPath,resourceTypeSvc) {
            $scope.input = {}
            $scope.elements = elements      //all the elements in this DG
            //currentPath is the path to the current element in the DG (includes the top)
            $scope.currentPath = currentPath

            $scope.allTypes = resourceTypeSvc.getAllTypes() //all resource types

            $scope.input.vType = "fhirpath"
            $scope.input.calcType = "fhirpath"

            let allocateId = "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-extractAllocateId"
            let defExtract = "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-definitionExtract"
            let defExtractValue = "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-definitionExtractValue"

            $scope.extTypes = []
            $scope.extTypes.push({name: 'extract', display: "Extraction set"})
            //$scope.extTypes.push({name: 'prepop', display: "Pre-pop"})
            $scope.extTypes.push({name: 'prepop-pop', display: "Pre-pop from Population context"})

            $scope.selectType = function (type) {
                $scope.selectedType = type
            }

            $scope.addExtensions = function (type) {
                switch (type) {
                    case 'extract' :
                        let arExt = []
                        let varName = $scope.input.variableName
                        let resourceType = $scope.input.resourceType
                        let fullResourceType = `http://hl7.org/fhir/StructureDefinition/${resourceType}`

                        let referenceSource = resourceTypeSvc.getPatientReference(resourceType)

                        let patientReferencePath = `${fullResourceType}#${resourceType}.${referenceSource}.reference`

                        let ext1 = {url:allocateId,valueString:varName}
                        arExt.push(ext1)
                        let ext2 = {url:defExtract,extension:[]}
                        ext2.extension.push({url:"definition",valueCanonical:fullResourceType})
                        ext2.extension.push({url:"fullUrl",valueString:`%${varName}`})
                        arExt.push(ext2)

                        if (referenceSource) {      //'patient', 'subject' or null
                            let ext3 = {url:defExtractValue,extension:[]}
                            ext3.extension.push({url:'definition',valueUri:patientReferencePath})

                            let child = {}
                            child.expression = '%patientID'
                            child.language = "text/fhirpath"
                            ext3.extension.push({url:"expression",valueExpression:child})
                            arExt.push(ext3)
                        }



                        console.log(arExt)

                        $scope.$close(arExt)







                        break
                }
            }

        })
