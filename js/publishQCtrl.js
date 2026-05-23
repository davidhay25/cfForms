angular.module("pocApp")
    .controller('publishQCtrl',
        function ($scope,Q,$http,makeQHelperSvc,utilsSvc,DG) {
            $scope.Q = Q
            $scope.DG = DG


            //app.get('/q/:name/versions', asy
            let qry = `q/${Q.name}/versions`
            $http.get(qry).then(
                function (data) {
                    console.log(data)
                    $scope.history = data.data
                }
            )


            $scope.input = {}
            let extensionUrls = makeQHelperSvc.getExtensionUrls()

            $scope.currentVersion = String(Q.version )      //{major}.{minor} needs to be treated as a string

            let ar = $scope.currentVersion?.split('.') || [0,0]

            // the versions prior to release
            $scope.currentMajorVersion = ar[0]
            $scope.currentMinorVersion = ar[1] || 0     //the older versioning has only a single number

            // the new version. Will be updated if the
            $scope.majorVersion = ar[0]
            $scope.minorVersion = parseInt($scope.currentMinorVersion)  +1  //increment the minor - default is a simple release

            //don't change the order!
            $scope.states = ['draft','active','retired']
            //$scope.input.selectedStatus = $scope.states[0]     //default state

            if (Q.status) {
                $scope.input.selectedStatus = Q.status

            }

            utilsSvc.getConfig().then(
                function (config) {
                    $scope.systemConfig = config
                    //console.log($scope.systemConfig)
                }
            )

            //default the release type to a release (rather than a publication)
            $scope.input.releaseType = "release"
            $scope.input.selectedStatus = $scope.states[0]  //set the default state to draft

            $scope.setReleaseType = function (type) {
                switch (type) {
                    case 'release' :
                        $scope.input.releaseType = "release"
                        $scope.input.selectedStatus = $scope.states[0]  //set the default state to draft


                        $scope.majorVersion =  $scope.currentMajorVersion
                        $scope.minorVersion = parseInt( $scope.currentMinorVersion) +1

                        break

                    case 'publish' :
                        $scope.input.releaseType = "publish"
                        $scope.input.selectedStatus = $scope.states[1]  //set the default state to active

                        $scope.majorVersion = parseInt($scope.majorVersion) +1
                        $scope.minorVersion = 0

                        break

                }

                //alert(type)
            }


            $scope.publish = function () {
                //Q.qVersion ++
                if (confirm(`Are you sure you wish to ${$scope.input.releaseType}`)) {
                    Q.date = new Date().toISOString()
                    Q.status = $scope.input.selectedStatus
                    Q.version = `${$scope.majorVersion}.${$scope.minorVersion}`
                    if ($scope.input.releaseNotes) {
                        Q.extension = Q.extension || []
                        let ext = {url:extensionUrls.releaseNotes}
                        ext.valueMarkdown = $scope.input.releaseNotes
                        Q.extension.push(ext)
                    }


                    $http.post(`q/publish`,Q).then(
                        function () {
                            alert(`Questionnaire published with version ${Q.version}`)

                            if ($scope.systemConfig.environment == 'clinfhir') {
                                let qry = `adhocq/publish`
                                $http.post(qry,Q).then(
                                    function (data) {
                                        alert("Questionnaire was also saved in the Library")
                                        $scope.$close(Q)
                                    }, function (err) {
                                        if (err.status == 422) {
                                            alert("There is already a Questionnaire with this name and version in the Library. The combination or Url & version must be unique.")
                                        } else {
                                            alert(`Unable to save to the Library. ${angular.toJson(err.data)}`)
                                            console.log(err)
                                        }

                                        $scope.$close(Q)

                                    }
                                )

                            } else {
                                $scope.$close(Q)
                            }



                        },function (err) {
                            $scope.$dismiss()
                            alert(angular.toJson(err.data))

                        }
                    )
                }







            }

    })