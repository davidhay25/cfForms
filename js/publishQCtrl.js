angular.module("pocApp")
    .controller('publishQCtrl',
        function ($scope,Q,$http,makeQHelperSvc,utilsSvc) {
            $scope.Q = Q

            $scope.input = {}
            let extensionUrls = makeQHelperSvc.getExtensionUrls()

            $scope.states = ['draft','active','retired']
            $scope.input.selectedStatus = $scope.states[0]     //default state

            if (Q.status) {
                $scope.input.selectedStatus = Q.status

            }

            utilsSvc.getConfig().then(
                function (config) {
                    $scope.systemConfig = config
                    //console.log($scope.systemConfig)
                }
            )


            $scope.publish = function () {
                //Q.qVersion ++
                if (confirm("Are you sure you wish to Publish")) {
                    Q.date = new Date().toISOString()
                    Q.status = $scope.input.selectedStatus
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