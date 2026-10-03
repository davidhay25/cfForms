angular.module("pocApp")
    .controller('prePopConfigCtrl',
        function ($scope,$http,prePopConfig,canSave,$localStorage) {


            $scope.canSave = canSave

            //make a copy of the config and use that for editing. Save returns the edited copy. Cancel abandons changes.
            $scope.prePopConfig = angular.copy(prePopConfig)

            $scope.prePopConfig = $scope.prePopConfig || {}

            $scope.input = {}
            $scope.input.prepopType = $scope.prePopConfig.source || 'query'



            $scope.setSelectedBundle = function() {
                for (let lst of $scope.lists) {
                    if (lst.name == $scope.prePopConfig.listName) {
                        $scope.selectedList = lst

                        //now set the selected bundle entry
                        for (let bundleEntry of lst.entries) {
                            if (bundleEntry.bundleId == $scope.prePopConfig.bundleEntry?.bundleId) {
                                $scope.selectedBundleEntry = bundleEntry
                                break
                            }
                        }

                        //$scope.selectedBundleEntry


                        break
                    }
                }
            }

            //retrieve all the curated lists. These do not have the actual bundles - only their Id (actually a bundle item)
            let listsSource = "https://clinfhir.com/bqry/lists"
            $http.get(listsSource).then(
                function (data) {
                    $scope.lists = data.data
                    console.log(data.data)
                    $scope.setSelectedBundle()



                }
            )


            //load the bundle in the Bundle Viewer
            $scope.viewBundle = function (entry) {
                //console.log(entry)
                let url = `https://clinfhir.com/clinfhir/bundleViewer.html?bundleid=${entry.bundleId}`
                const features = 'noopener,noreferrer'
                window.open(url, '_blank', features)
            }

            //retrieve the bundle of resources being used for prepop
            //note that the bundleId is actually to a 'meta' bundle object that has the bundle and other data (name, description etc)
            function getBundle(bundleId) {

                let qry = `https://clinfhir.com/clinfhir/api/Bundle/${bundleId}`
                $http.get(qry).then(
                    function (data) {
                        console.log(data.data)
                        $scope.dataBundle = data.data   //this is an actual bundle
                        $scope.dataBundle.entry.sort(function (a,b) {
                            if (a.resource?.resourceType > b.resource?.resourceType) {
                                return 1
                            } else {
                                return -1
                            }
                        })

                        //find the QR (if any)
                        delete $scope.qr
                        let ar = $scope.dataBundle.entry.filter(entry => entry.resource?.resourceType == 'QuestionnaireResponse')
                        if (ar.length == 1) {
                            $scope.qr = ar[0].resource
                        }


                    }
                )
            }

            //load the current bundle if the prepop source is currently 'bundle'
            if ($scope.prePopConfig.source == 'bundle' ) {
                let bundleId = $scope.prePopConfig.bundleEntry?.bundleId
                if (bundleId) {
                    getBundle(bundleId)
                }
            }


            $scope.save = function () {

                if ($scope.prePopConfig.source == 'bundle') {
                    $scope.prePopConfig.listName = $scope.selectedList.name
                }



                $scope.$close($scope.prePopConfig)


            }



            //select one of the curated lists. Will update the display of the list contents
            $scope.selectList = function (list) {
                $scope.selectedList = list
            }


            //when a bundle from a list is selected.

            $scope.selectBundleEntry = function (bundleEntry) {
                console.log(bundleEntry)
                $scope.selectedBundleEntry = bundleEntry
                $scope.prePopConfig.bundleEntry = bundleEntry




                //retrieve the bundle
                setPatient(bundleEntry,$scope.prePopConfig,function (vo) {
                    //vo is {bundle: patient: author:}
                    $scope.dataBundle = vo.bundle       //so it can be viewed in the UI. It isn't saved locally
                    $scope.dataBundle.entry.sort(function (a,b) {
                        if (a.resource?.resourceType > b.resource?.resourceType) {
                            return 1
                        } else {
                            return -1
                        }
                    })

                    if (vo.patient) {
                        $scope.prePopConfig.bundlePatientId = vo.patient //this is a {reference: } object
                        $scope.prePopConfig.bundlePatientId.fullUrl = vo.patientFullUrl

                    }

                    if (vo.author) {
                        $scope.prePopConfig.bundleAuthorId = vo.author //this is a {reference: } object
                        $scope.prePopConfig.bundleAuthorId.fullUrl = vo.authorFullUrl
                    } else {
                        $scope.prePopConfig.bundleAuthorId = {}  //todo - not sure about this
                    }


                })

                //the extract the Patient (required) and Practitioner (if any) from the bundle



            }

            $scope.doQuery = function (inQry) {
                delete $scope.qryError
                delete $scope.responseJson
                let qry = `${$scope.prePopConfig.dataServer}/${inQry}`
                $scope.displayQuery = qry
                $http.get(qry).then(
                    function (data) {
                        let response = data.data
                        $scope.responseJson = response
                        if (response.resourceType == 'Bundle') {

                        } else {

                        }

                    }, function (err) {
                        $scope.qryError = err.data

                    }
                )

            }

            $scope.upload= function () {
                delete $scope.qryError
                let json
                try {
                    json = angular.fromJson($scope.input.resource)
                } catch (ex) {
                    alert("invalid Json")
                    return
                }

                let id = json.id
                if (! id) {
                    alert("must have Id")
                    return
                }

                let type = json.resourceType
                if (! type) {
                    alert("must have resource type")
                    return
                }


                let qry = `${$scope.prePopConfig.dataServer}/${type}/${id}`
                if (confirm(`Are you sure you want to upload ${qry}`)) {
                    $http.put(qry,json).then(
                        function () {
                            alert("Upload complete")
                        }, function (err) {
                            alert(angular.toJson(err.data))
                        }
                    )
                }


            }

            //set the patent and pracitioner from the bundle
            function setPatient(bundleEntry,ppConfig,cb) {
                //https://clinfhir.com/clinfhir/api/Bundle/bv1763405323821

                let response = {}   //will contain the patient an

                if (! bundleEntry) {
                    return
                }

                //set the List and eentry
                //ppConfig.bundleEntry = $scope.selectedBundleEntry


                let qry = `https://clinfhir.com/clinfhir/api/Bundle/${bundleEntry.bundleId}`
                $http.get(qry).then(
                    function (data) {
                        let bundle = data.data
                        response.bundle = bundle    //the actual bundle

                       // delete  ppConfig.bundlePatientId
                        //let patientId   //Patient/{}
                        let ar = bundle.entry.filter(entry => entry.resource?.resourceType == 'Patient')
                        switch (ar.length) {
                            case 0:
                                alert("There are no Patients in this bundle. Pre-pop doesn't seem to work if there isn't a subject.")
                                response.patient = {reference:{}}
                                response.patientFullUrl = ""
                                //return
                                break
                            case 1:
                                let patientEntry = ar[0]

                                //ppConfig.bundlePatientId = {reference:`Patient/${patientEntry.resource.id}`}
                                let id = patientEntry.resource.id || patientEntry.fullUrl?.replace("urn:uuid:", "") //in case the Patient has no id


                                response.patient = {reference:`Patient/${id}`}
                                response.patientFullUrl = patientEntry.fullUrl      //this is the identity within the bundle
                                break
                            default:
                                //todo - maybe a 'select the patient to use' dialog
                                alert(`There were ${ar.length} patients in this Bundle. Only 1 is allowed.`)
                                //return
                                break


                        }

                        //for now - just find a Practitioner. todo - there must be a better way
                      //  delete ppConfig.authorId
                        let ar1 = bundle.entry.filter(entry => entry.resource?.resourceType == 'Practitioner')
                        if (ar1.length > 0) {
                            //ppConfig.bundleAuthorId = {reference:`Practitioner/${ar1[0].resource.id}`}
                            response.author = {reference:`Practitioner/${ar1[0].resource.id}`}
                            response.authorFullUrl = ar1[0].fullUrl
                        }

                        cb(response)


                    }, function (err) {
                        console.log(err)
                        alert("Unable to retrieve Bundle")

                        cb({})
                       // return false

                    }
                )

                //cb(response)


            }

        })