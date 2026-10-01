angular.module("pocApp")
    .controller('qViewerCtrl',
        function ($scope,$uibModal,$localStorage,$http,utilsSvc) {

            //this controller is designed to be a child of a parent that establishes the interaction context
            //$scope.sendMessage() is created by the parent controller

            let serverbase = "https://fhir.forms-lab.com"      //where the API to save a Q is
            let labUI = "https://dev.fhirpath-lab.com"         //to load the lab UI

            $scope.showRenderOptions = true     //todo - can remove - possibly

            //prepopconfig has config for both query and bundle sources
            $scope.prePopConfig = $localStorage['ppConfig']


            $scope.openInFPLab = function () {

                let Q = $scope.fullQ        //from the parent. todo set this is formviewer as well
                // Open the tab synchronously, inside the click — this is what keeps
                // Brave/Chrome from blocking it. Leave it blank until the save confirms.
                let newTab = window.open('', '_blank')
                if (newTab)  {
                    newTab.document.write("Saving Questionnaire to the Lab. Please wait, the UI will open once that's done…")
                    newTab.document.write("If there's a validation error that the save will fail and the Lab won't load.")
                }


                let qry = `${serverbase}/Questionnaire/${Q.id}`

                $scope.redirectUrl = `${labUI}/Questionnaire/tester?tab=csiro+renderer&id=${qry}` //redirectUrl
                $scope.redirectUrl += `&subject=${$scope.prePopConfig.patient.reference}`
                $scope.redirectUrl += `&author=${$scope.prePopConfig.practitioner.reference}`
                $scope.redirectUrl += `&dataserver=${$scope.prePopConfig.dataServer}`


                console.log(qry)
                let config = {headers: {'content-type': 'application/fhir+json'}}

                $scope.savingQ = true
                $http.put(qry, Q, config).then(
                    function (data) {
                        $scope.savingQ = false
                        $scope.pathToQ = qry

                        if (newTab) {
                            newTab.location = $scope.redirectUrl
                        } else {
                            // popup was blocked or newTab creation failed —
                            // fall back to a same-tab-visible link the user can click
                            alert(`Saved. Popup was blocked — copy this link: ${$scope.redirectUrl}`)
                        }
                    },
                    function (err) {
                        $scope.savingQ = false
                        if (newTab) newTab.close()
                        alert(angular.toJson(err))
                    }
                )


            }

            $scope.viewQR = function () {
                //the parent will create $scope.questionnaireResponse as part of the message handling
                console.log($scope.questionnaireResponse)   //created by parent

                $scope.sendMessage('sdc.requestCurrentQuestionnaireResponse',{},function (msg) {
                    console.log(msg)
                    let QR = msg?.payload?.questionnaireResponse

                    $uibModal.open({
                        templateUrl: 'modalTemplates/viewQR.html',
                        backdrop: 'static',
                        size : 'xlg',
                        controller : function ($scope,QR,Q) {
                            $scope.QR = QR
                            $scope.Q = Q


                            $scope.copyToClipboard = function (obj) {
                                navigator.clipboard.writeText(angular.toJson(obj))
                            }


                        },
                        resolve: {
                            QR: function () {
                                return QR
                            }, Q: function () {
                                return $scope.fullQ
                            }
                        }
                    })

                })



            }



            $scope.expressionEditorDEP = function () {
                //the parent will create $scope.questionnaireResponse as part of the message handling
                console.log($scope.questionnaireResponse)   //created by parent

                $uibModal.open({
                    templateUrl: 'modalTemplates/expressionEditor.html',
                    backdrop: 'static',
                    size : 'xlg',
                    controller : function ($scope,QR,Q) {
                        $scope.QR = QR
                        $scope.Q = Q


                        $scope.copyToClipboard = function (obj) {
                            navigator.clipboard.writeText(angular.toJson(obj))
                        }


                    },
                    resolve: {
                        QR: function () {
                            return $scope.questionnaireResponse
                        }, Q: function () {
                            return $scope.fullQ
                        }
                    }
                })

            }

            //parameters are set in the sdc.configureContext() and sdc.configure() calls
            //they are stored in $localStorage['ppConfig']

            $scope.setPrepop = function () {

                //let ppConfig = $localStorage['ppConfig']
               // $scope.ppConfig = ppConfig
                //let serverRoot = `https://clinfhir.com/bqry/${ppConfig.bundleEntry.bundleId}`

                if ($scope.prePopConfig.source == 'bundle') {
                    if (! $scope.prePopConfig?.bundleEntry?.bundleId) {
                        return //no bundle pre-pop set
                    }

                    //set the server root so that it will only operate against the specified bundle

                    let serverRoot = `https://clinfhir.com/bqry/${$scope.prePopConfig.bundleEntry.bundleId}`
                    let configureObj = {
                        terminologyServer: $scope.prePopConfig.termServer,
                        formsServer: $scope.prePopConfig.formServer,
                        dataServer:   serverRoot        //queries will be fulfilled by the bundle
                    }


                    let testResource = {resourceType:'Patient',birthDate:"2000-02-02"}
                    let configureContextObj = {
                        context: {
                            subject: $scope.prePopConfig.bundlePatientId,
                            //temp author: $scope.prePopConfig.bundleAuthorId,
                            launchContext: [
                                {
                                    name: 'myObservation',
                                    contentReference: $scope.prePopConfig.practitioner
                                }, {
                                    name: 'testobservation',
                                    contentResource: testResource
                                }
                            ]

                        }
                    }


                console.log(configureObj,configureContextObj)

                    let questionnaire = $scope.fullQ        //this is defined in the parent controller (forms). Need to check for use in QV


                    //set up the pyramid of doom
                    // note that sendMessage is defined in parent - eg modelCtrl
                    $scope.sendMessage('sdc.configure',configureObj ,function () {
                        $scope.sendMessage('sdc.configureContext', configureContextObj,function () {
                            $scope.sendMessage('sdc.displayQuestionnaire', {questionnaire:questionnaire},function () {
                                $scope.sendMessage('sdc.requestPrepopulate',{},function () {
                                    $scope.sendMessage('sdc.requestCurrentQuestionnaireResponse',{},function (msg) {
                                        console.log(msg)
                                    })
                                })
                            })
                        })
                    })

                } else {
                    //this is the general x-query
                    setContext()

                    delete $scope.input.renderIssues

                    let responseFn = function (outcome) {
                        $scope.sendMessage('sdc.requestCurrentQuestionnaireResponse',{})
                        console.log(outcome)
                        if (outcome?.payload?.outcome?.issue) {
                            $scope.input.renderIssues = outcome?.payload?.outcome?.issue
                            $scope.$digest()
                        }
                    }





                    $scope.sendMessage('sdc.requestPrepopulate',{},responseFn)
                }













            }

            //get the extract bundle from the currently rendered form
            $scope.getExtractBundle = function () {

                delete $scope.input.renderIssues

                $scope.sendMessage('sdc.requestCurrentQuestionnaireResponse',{},function (msg) {
                    console.log(msg)
                    let QR = msg?.payload?.questionnaireResponse
                    $scope.sendMessage('sdc.requestExtract', {},function (outcome) {

                        console.log(outcome)

                        if (outcome?.payload?.outcome?.issue) {
                            $scope.input.renderIssues = outcome?.payload?.outcome?.issue
                            $scope.$digest()
                        }

                        console.log("outcome of extraction",outcome)

                        /* not sure
                        let cntResources = outcome?.payload?.extractedResources?.entry?.length
                        if (! cntResources || cntResources < 1) {
                            alert("There were no resources extracted")
                            return
                        }
*/


                        //add the QR to the extract bundle. Even if there are no extracted resources we want to see and save the QR
                        let bundle = outcome?.payload?.extractedResources || {resourceType:'Bundle'}
                        bundle.entry = bundle.entry || []

                        //todo - add patient reference
                        let uuid = utilsSvc.getUUID()


                        let ar = bundle.entry.filter(entry => entry.resource?.resourceType == 'Patient')

                        if (ar.length > 0) {
                            let patientId = ar[0].fullUrl
                            QR.subject = {reference:patientId}
                        } else {
                            alert("There is no Patient. This bundle will not be suitable for pre-population as a Patient seems to be required")
                        }


                        //QR.id = uuid

                        let qrEntry = {fullUrl:`urn:uuid:${uuid}`,resource:QR}
                        //qrEntry.fullUrl = `urn:uuid:${uuid}`
                        qrEntry.request = {method:"POST",url:"QuestionnaireResponse"}
                        bundle.entry.push(qrEntry)







                        $uibModal.open({
                            backdrop: 'static',      //means can't close by clicking on the backdrop.
                            keyboard: false,       //same as above.
                            size : 'xlg',
                            templateUrl: 'modalTemplates/miniBundleViewer.html',

                            controller: "miniBundleViewerCtrl",

                            resolve: {
                                bundle: function () {

                                    return bundle
                                }, renderIssues : function () {
                                    return $scope.input.renderIssues
                                }, QR : function () {
                                    return QR
                                }
                            }

                        }).result.then(function (config) {
                          //  $localStorage['ppConfig'] = config
                            //getAllAdHoc()   //update the list

                        })

                    })

                })


            }


            $scope.prePopDetails = function () {
                $uibModal.open({
                    backdrop: 'static',      //means can't close by clicking on the backdrop.
                    keyboard: false,       //same as above.
                    size : 'lg',
                    templateUrl: 'modalTemplates/prePopConfig.html',

                    controller: 'prePopConfigCtrl',

                    resolve: {
                        prePopConfig: function () {
                            return $scope.prePopConfig
                        },
                        canSave:function () {
                            return true
                        }
                    }

                }).result.then(function (config) {
                    $localStorage['ppConfig'] = config
                    $scope.prePopConfig = config

                    console.log(config)

                })
            }

            let setContext = function () {

                //return //<<< temp

                let testResource = {resourceType:'Observation',valueString:"test data"}

                //tod can the context be a resource
                $scope.sendMessage('sdc.configureContext', {
                    context: {
                        subject: $scope.prePopConfig.patient,
                        author: $scope.prePopConfig.practitioner,

                        launchContext: [
                            {
                                name: 'source',
                                contentReference: $scope.prePopConfig.practitioner
                            },{
                                name: 'testObservation',
                                contentResource: testResource
                            }
                        ]
                    }
                })

                $scope.sendMessage('sdc.configure', {
                    terminologyServer: $scope.prePopConfig.termServer,// 'https://tx.fhir.org/r4',
                    dataServer: $scope.prePopConfig.dataServer, //'https://hapi.fhir.org/baseR4',
                    formsServer: $scope.prePopConfig.formServer //'https://hapi.fhir.org/baseR4'
                });
            }



        })