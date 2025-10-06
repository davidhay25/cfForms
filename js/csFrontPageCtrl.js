/*
 The front page for the CanShare suite
 Note that the collections are called palygrounds for historical reasons
*/
angular.module("pocApp")
    .controller('csFrontPageCtrl',
        function ($scope,$http,playgroundsSvc,$uibModal,$filter) {

            $scope.input = {}
            $scope.input.versions = {}


            //get all published Q
            $http.get('q/all').then(
                function (data) {



                    $scope.allQ = data.data
                    try {
                        $scope.allQ.sort(function (a,b) {
                            if (a.name.toLowerCase() > b.name.toLowerCase()) {
                                return 1
                            } else {
                                return -1
                            }

                        })

                    } catch (ex) {

                    }



                    console.log($scope.allQ)

                }, function (err) {
                    alert(angular.toJson(err.data))
                }
            )

            $scope.viewQ = function (pg) {



                if ($scope.selectedQVersion) {
                    let qry = `pub-${$scope.selectedQVersion.name}|${$scope.selectedQVersion.version}`

                    const url = `modelReview.html?${qry}`
                    const features = 'noopener,noreferrer'
                    window.open(url, '_blank', features)

                }



            }

            $scope.makeQDownload = function (Q) {
                $scope.downloadLinkJson = window.URL.createObjectURL(new Blob([angular.toJson(Q,true) ],{type:"application/json"}))
                $scope.downloadLinkJsonName = `${Q.name}-${Q.version}.json`

                console.log($scope.downloadLinkJsonName)

                $scope.selectedQVersion = Q

            }


            $scope.selectQ = function (Q) {
                $scope.selectedQ = Q
                let qry = `q/${Q.name}/versions`
                $http.get(qry).then(
                    function (data) {
                        console.log(data.data)


                        $scope.ddVersions = []
                        let first = true
                        for (const v of data.data) {
                            let date = $filter('date')(v.date)
                            let display = `${v.version} ${date}`
                            if (first) {
                                display += ' (current)'
                                first = false
                            }
                            $scope.ddVersions.push({Q:v,version:v.version,display:display})
                        }

                        $scope.input.ddSelectedVersion = $scope.ddVersions[0]
                        $scope.makeQDownload($scope.ddVersions[0].Q)


                    }, function (err) {

                    }
                )
            }


            $scope.selectPGDEP = function (pg) {

                $scope.selectedPG = pg
                $scope.input.versions = {}


                    playgroundsSvc.getVersions(pg.id).then(
                        function (data) {
                            $scope.versions = data  //sorted by publishedDate descending
                            console.log($scope.versions)

                            $scope.input.versions[pg.id] = data

                            //$scope.ddVersions = [{version:'latest',display:"Latest"}]
                            $scope.ddVersions = []
                            let first = true
                            for (const v of data) {
                                let date = $filter('date')(v.publishedDate)
                                let display = `${v.publishedVersion} ${date}`
                                if (first) {
                                    display += ' (current)'
                                    first = false
                                }
                                $scope.ddVersions.push({version:v.publishedVersion,display:display})
                            }

                            $scope.input.ddSelectedVersion = $scope.ddVersions[0]


                        }, function (err) {
                            alert(angular.toJson(err.data))
                        }
                    )

            }

            //--------- login stuff
            //called whenever the auth state changes - eg login/out, initial load, create user etc.
            firebase.auth().onAuthStateChanged(function(user) {

                if (user) {
                    $scope.user = {email:user.email,displayName : user.displayName}
                    $scope.$digest()
                } else {
                    delete $scope.user
                    $scope.$digest()
                }

            });

            $scope.login=function(){
                $uibModal.open({
                    backdrop: 'static',      //means can't close by clicking on the backdrop.
                    keyboard: false,       //same as above.
                    templateUrl: 'modalTemplates/login.html',
                    controller: 'loginCtrl'
                })
            };

            $scope.logout=function(){
                firebase.auth().signOut().then(function() {
                    delete $scope.user;

                    alert('You have been logged out')


                }, function(error) {
                    alert('Sorry, there was an error logging out - please try again')
                });

            };


        })
