angular.module("pocApp")
    .controller('publishQCtrl',
        function ($scope,Q,$http,makeQHelperSvc) {
            $scope.Q = Q

            $scope.input = {}
            let extensionUrls = makeQHelperSvc.getExtensionUrls()


            $scope.publish = function () {
                //Q.qVersion ++
                if (confirm("Are you sure you wish to Publish")) {
                    Q.date = new Date().toISOString()

                    if ($scope.input.releaseNotes) {
                        Q.extension = Q.extension || []
                        let ext = {url:extensionUrls.releaseNotes}
                        ext.valueMarkdown = $scope.input.releaseNotes
                        Q.extension.push(ext)
                    }


                    $http.post(`q/publish`,Q).then(
                        function () {
                            alert(`Questionnaire published with version ${Q.version}`)
                            $scope.$close(Q)
                        },function (err) {
                            $scope.$dismiss()
                            alert(angular.toJson(err.data))

                        }
                    )
                }







            }

    })