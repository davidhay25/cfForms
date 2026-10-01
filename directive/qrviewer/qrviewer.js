angular.module('pocApp')
    .directive('qrviewer', function () {
        return {
            restrict: 'EA',
            scope: {
                qr: '<'
            },
//https://www.npmjs.com/package/fhirpath
            templateUrl: 'directive/qrviewer/qrviewer.html',
            controller: function($scope,$http){

                $scope.input = {};

                $scope.$watch(
                    function() {return $scope.qr},
                    function() {

                        delete $scope.FHIRPathResult;
                        delete $scope.input.JSONPath;

                        $scope.allLinkIds = fhirpath.evaluate(
                            $scope.qr, "QuestionnaireResponse.descendants().linkId.distinct()",null,fhirpath_r4_model)
                        console.log($scope.allLinkIds)
                    }
                );

                $scope.findAnswers = function (linkId) {
                    $scope.selectedLinkId = linkId
                    $scope.expression = `QuestionnaireResponse.repeat(item).where(linkId='${linkId}')`
                    $scope.answers = fhirpath.evaluate($scope.qr, $scope.expression,null,fhirpath_r4_model)

                }

                $scope.executeJSONPath = function(path) {
                    delete $scope.FHIRPathResult;
                    delete $scope.FHIRPathError;
                    try {

                        let vo =  { base: 'QuestionnaireResponse', expression: path }

                        $scope.FHIRPathResult = fhirpath.evaluate($scope.qr, vo,null,fhirpath_r4_model)
                       // $scope.FHIRPathResult = fhirpath.evaluate($scope.resource, path);
                    } catch (ex) {
                        $scope.FHIRPathError = ex.message;
                    }


                }

                $scope.copyToClipboard = function (expression) {
                    navigator.clipboard.writeText(expression)
                    alert(`Copied ${expression} to clipboard`)
                }
            }
        }
    });