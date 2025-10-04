/*
 The front page for the CanShare suite
 Note that the collections are called palygrounds for historical reasons
*/
angular.module("pocApp")
    .controller('qrVisualizerAdHocCtrl',
        function ($scope,$http,$localStorage,$sce,$uibModal,qrVisualizerSvc,makeQHelperSvc,utilsSvc) {
            $scope.input = {}

            // switch to using db$scope.input.qrCsv =  $localStorage.qrCsv //dev
            let snomed = "http://snomed.info/sct"
            $scope.serverbase = "https://fhir.forms-lab.com/"    //use for validation
            $scope.formManager = $localStorage.formManager || "https://fhir.forms-lab.com/"      //used for retrieving the Q

            $scope.input.changingFormManager = false

            $scope.input.adHocQR =  $localStorage.adHocQR

            $scope.setFormManager = function (url) {
                $localStorage.formManager = url
                alert("The Form Manager url has been updated.")
            }

            $scope.copyQRToClipboard = function () {

                let qr = $scope.selectedQR
                utilsSvc.copyToClipboard(angular.toJson(qr,true))
                alert("QR on clipboard")
            }

            //open the modelReview app with this Q
            $scope.openQReviewDEP = function () {
                //in canshare, the Q name is the last segment of the Q url
                let qUrl = $scope.selectedItem.qr.questionnaire
                //let ar = qUrl.split('/')
                //let qName = ar[ar.length -1]

                const url = `modelReview.html?url-${qUrl}`
                const features = 'noopener,noreferrer'
                window.open(url, '_blank', features)
            }

            //'thing.item' is the item from the Q
            $scope.checkAllCodes = function (things) {
                //$scope.codedItems
                for (let thing of things) {


                    if (thing.item.answerValueSet && thing.answerCoding) {
                        let qry = `ValueSet/$validate-code?url=${thing.item.answerValueSet}`
                        qry += `&code=${thing.answerCoding.code}`
                        qry += `&system=${thing.answerCoding.system}`


                        $scope.expandQry = qry
                        let lookupQry = encodeURIComponent(qry)


                        $http.get(`nzhts?qry=${lookupQry}`).then(
                            function (data) {

                                let parameters = data.data //returns a parameters resource
                                for (const param of parameters.parameter) {

                                    thing.validatedConcept = {}
                                    switch (param.name) {
                                        case "result" :
                                            thing.inVS = param.valueBoolean
                                            break
                                        case "code" :
                                            thing.validatedConcept.code = param.valueCode
                                            break
                                        case "system" :
                                            thing.validatedConcept.system = param.valueUri
                                            break
                                        case "display" :
                                            thing.validatedConcept.display = param.valueString
                                            break
                                        case "version" :
                                            thing.validatedConcept.version = param.valueString
                                            break
                                    }
                                }

                            }, function (err) {
                                console.log(err)
                            }
                        ).finally(
                            function () {
                                $scope.showWaiting = false
                            }
                        )

                    } else if (thing.item.answerOption && thing.answerCoding) {
                        //this uses options in the Q rather than a VS
                        for (const option of thing.item.answerOption) {
                            let concept = option.valueCoding
                            if (concept.code == thing.answerCoding.code && concept.system == thing.answerCoding.system) {
                                //it's not really in a VS, but this drives the display
                                thing.inVS = true
                            }
                        }

                    }

                }
            }

            $scope.itemDetails = function (item) {

                makeQHelperSvc.showItemDetailsDlg(item,$scope.selectedQ)

            }

            $scope.validate = function (QR) {
                delete $scope.oo
                $scope.errorCount = 0
                $scope.warningCount = 0
                $scope.validating = true
                let url = `${$scope.serverbase}QuestionnaireResponse/$validate`
                $http.post(url,QR).then(
                    function (data) {
                        $scope.validating = false
                        $scope.oo = data.data

                        $scope.oo.issue.forEach(function (iss) {
                            if (iss.severity == 'error') {
                                $scope.errorCount ++
                            } else {
                                $scope.warningCount ++
                            }
                        })

                    },function (err) {
                        $scope.validating = false
                        $scope.oo = err.data

                        if (! $scope.oo) {
                            $scope.oo = {issue:[{severity:'error',diagnostics:"There was an error in the Validator"}]}
                        }

                    }
                )
            }

            $scope.parseAdHocQR = function (txt) {
                $scope.selectedQR = angular.fromJson(txt)

                $localStorage.adHocQR = txt     //just for debug

                parseQR($scope.selectedQR)
            }

            //parse a QR item from the file list - ie {qr: }
           let parseQR = function (QR) {

                delete $scope.selectedQ

                $scope.codedItems = []

                $scope.hashLinkId = {}  //a hash of all items from the Q
                $scope.lstQRItem = []   //a list of items from the QR for the report

                let qUrl = QR.questionnaire

               let formManager = $scope.formManager.endsWith('/') ? $scope.formManager : $scope.formManager + '/';

                let qry = `${formManager}Questionnaire?url=${qUrl}`
                let config = {headers:{'content-type':'application/fhir+json'}}

                $http.get(qry,config).then(
                    function (data) {

                        if (data.data.entry && data.data.entry.length > 0) {

                            //get the definition of the items from the Q
                            //note - assumes a single response
                            let Q = data.data.entry[0].resource
                            $scope.selectedQ = Q
                            let vo = qrVisualizerSvc.makeReport(Q,QR)
                            $scope.qBasedReport = vo.report
                            $scope.codedItems = vo.codedItems
                            $scope.textReport = vo.textReport


                            $scope.checkAllCodes($scope.codedItems)


                        } else {
                            alert(`The Q with the url ${qUrl} was not found`)
                            //todo we could do a diminished report - that only had the info in the QR
                        }

                    },function (err) {

                        alert(`The server ${formManager} was not found`)
                    }
                )

            }

            //lookup a single concept
            $scope.lookup = function (code,system) {
                system = system || snomed
                let qry = `CodeSystem/$lookup?system=${system}&code=${code}`
                let encodedQry = encodeURIComponent(qry)
                $scope.showWaiting = true
                $http.get(`nzhts?qry=${encodedQry}`).then(
                    function (data) {

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
                                    return system
                                }
                            }
                        })


                    }, function (err) {
                        alert(angular.toJson(err.data))
                    }
                ).finally(function () {
                    $scope.showWaiting = false
                })
            }

            $scope.viewVS = function (url) {
                //display the contents of a single VS
                $uibModal.open({
                    templateUrl: 'modalTemplates/viewVS.html',
                    backdrop: 'static',
                    size: 'lg',
                    controller: 'viewVSCtrl',

                    resolve: {
                        url: function () {
                            return url
                        }, refsetId: function () {
                            return ""
                        }
                    }

                })
            }

            $scope.to_trusted = function(html_code) {
                return $sce.trustAsHtml(html_code);
            }


            $scope.handlePaste = function () {
                    setTimeout(function () {
                            var textarea = document.getElementById('pastetextbox');
                            textarea.scrollTop = 0;  // Scroll to the top
                    }, 0);  // Wait for the paste to complete before updating the model


            }


        })
