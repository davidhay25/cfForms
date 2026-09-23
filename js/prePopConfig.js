angular.module("pocApp")
    .controller('prePopConfigCtrl',
        function ($scope,$http,prePopConfig,$localStorage) {


        //delete prePopConfig.authorId
           // delete prePopConfig.patientId

            $scope.prePopConfig = prePopConfig

            $scope.input = {}

            let listsSource = "https://clinfhir.com/bqry/lists"
            $http.get(listsSource).then(
                function (data) {
                    $scope.lists = data.data
                    console.log(data.data)
                }
            )




            $scope.input.prepopType = prePopConfig.source || 'query'

            $scope.save = function () {

                $scope.prePopConfig.source = $scope.input.prepopType
                $scope.bundleEntry = $scope.selectedBundleEntry

                if ($scope.input.prepopType == 'bundle') {
                    //need to get the Patient and Practitioner from the bundle

                    setPatient($scope.selectedBundleEntry,$scope.prePopConfig,function (ok) {
                        if (ok) {
                            $scope.$close($scope.prePopConfig)
                        } else {
                            alert("Unable to save these settings")
                        }
                    })




                } else {
                    $scope.$close($scope.prePopConfig)
                }

            }

            $scope.localBundles = []
            $scope.hashLocalBundles = {}



            //make the local bundle entry active. ie it will be the pre-pop source
            $scope.makeActive = function (bundleEntry) {

            }



            $scope.selectList = function (list) {
                $scope.selectedList = list

            }

            $scope.selectBundleEntry = function (bundleEntry) {
                console.log(bundleEntry)
                $scope.selectedBundleEntry = bundleEntry

                $localStorage.selectedBundleEntry = bundleEntry
            }

            $scope.doQuery = function (inQry) {
                delete $scope.qryError
                delete $scope.responseJson
                let qry = `${prePopConfig.dataServer}/${inQry}`
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


                let qry = `${prePopConfig.dataServer}/${type}/${id}`
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

                //set the List and eentry
                ppConfig.bundleEntry = $scope.selectedBundleEntry


                let qry = `https://clinfhir.com/clinfhir/api/Bundle/${bundleEntry.bundleId}`
                $http.get(qry).then(
                    function (data) {
                        let bundle = data.data

                        delete  ppConfig.bundlePatientId
                        //let patientId   //Patient/{}
                        let ar = bundle.entry.filter(entry => entry.resource?.resourceType == 'Patient')
                        switch (ar.length) {
                            case 0:
                                alert("There are no Patients in this bundle. Cannot be used for pre-pop")
                                return
                                break
                            case 1:
                                let patientEntry = ar[0]

                                ppConfig.bundlePatientId = {reference:`Patient/${patientEntry.resource.id}`}

                                break
                            default:
                                //todo - maybe a 'select the patient to use' dialog
                                alert(`There were ${ar.length} patients in this Bundle. Only 1 is allowed.`)
                                return
                                break


                        }

                        //for now - just find a Practitioner. todo - there must be a better way
                        delete ppConfig.authorId
                        let ar1 = bundle.entry.filter(entry => entry.resource?.resourceType == 'Practitioner')
                        if (ar1.length > 0) {
                            ppConfig.bundleAuthorId = {reference:`Practitioner/${ar1[0].resource.id}`}
                        }

                        cb(true)


                    }, function (err) {
                        alert("Unable to retrieve Bundle")
                        return false

                    }
                )


            }

        })