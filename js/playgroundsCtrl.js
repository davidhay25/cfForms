angular.module("pocApp")
    .controller('playgroundsCtrl',
        function ($scope,$http,userMode,playground,utilsSvc,$localForage,user,initialPlayground,playgroundsSvc,
                  $uibModal) {

            $scope.input = {}

            $scope.user = user

            if (userMode == 'library') {
                if (! confirm("Make sure you have saved any updates before switching to Playground mode! Do you wish to continue?")){
                        return
                }
            }

            $scope.differences = playgroundsSvc.currentPlaygroundDiff(playground,initialPlayground)

            //get the summary of VS usage across playgrounds
            $http.get("playgroundAnalysis/valueSets").then(
                function (data) {
                    $scope.vsSummary = data.data
                }, function (err) {
                    alert(angular.toJson(err))
                }
            )


            $scope.canShow = function (filter,row) {
                if (! filter) {
                    return true
                }
                let f = filter.toLowerCase()
                let n = row.name?.toLowerCase() || ""
                let d = row.description?.toLowerCase() || ""



                if (n.indexOf(f) > -1 || d.indexOf(f) > -1) {
                    return true
                }
            }

            $scope.areDifferences = function () {
                if (Object.keys($scope.differences).length > 0) {
                    return true
                }
            }



            //Lock a from so no-one else can update
            $scope.lock = function (row) {
                let vo = {email:user.email,id:row.id}

                $http.post(`playground/lock`,vo).then(
                    function (data) {
                        alert("This form can now only be updated by you!")
                        row.lockedTo = user.email   //just to update the UI
                    }, function (err) {
                        alert(angular.toJson(err.data) )
                    })

            }

            //unlock to allow others to update
            $scope.unlock = function (row) {
                let vo = {id:row.id}

                $http.post(`playground/unlock`,vo).then(
                    function (data) {
                        alert("This form can now locked by someone else")
                        delete row.lockedTo  //just to update the UI
                    }, function (err) {
                        alert(angular.toJson(err.data) )
                    })

            }


            function makeLocalStoreSummary() {
                $scope.localStore = []

                $localForage.iterate(function(value, key, iterationNumber) {


                    let item = {id:value.id,name:value.name,description:value.description,updated:value.updated}
                    item.version = value.version
                    if (value.dataGroups) {
                        item.dgCount = Object.keys(value.dataGroups).length
                    }
                    if (value.compositions) {
                        item.compCount = Object.keys(value.compositions).length
                    }

                    $scope.localStore.push(item)



                }).then(function(data) {
                    // data is the key of the value > 10
                    try {
                        $scope.localStore.sort(function (a,b) {
                            try {
                                if (a.name.toLowerCase() > b.name.toLowerCase()) {
                                    return 1
                                } else {
                                    return -1
                                }
                            } catch (e) {
                                return 0
                            }


                        })
                    } catch (e) {
                        console.error(e)
                    }

                });

            }
            makeLocalStoreSummary()


            function loadPlaygrounds() {
                //Models repository playgrounds
                $http.get('playgroundSummary').then(
                    function (data) {
                        $scope.playgrounds = data.data

                    }, function (err) {
                        alert(angular.toJson(err.data))
                    }
                )

            }
            loadPlaygrounds()




            function convertAdHoc(world) {
               for (let key of  Object.keys(world.dataGroups)) {
                   let dg = world.dataGroups[key]
                   if (dg.adHocExt) {
                       dg.adHocExtension = angular.fromJson(dg.adHocExt)
                   }
                   for (let ed of dg.diff) {
                       if (ed.adHocExt) {
                           ed.adHocExtension = angular.fromJson(ed.adHocExt)
                          // console.log()
                       }
                   }
               }

            }

            //show the detailed diff for a DG
            $scope.showDiff = function (name) {

                let currentDG = playground.dataGroups[name]
                let initialDG = initialPlayground.dataGroups[name]

                    $uibModal.open({
                    templateUrl: 'modalTemplates/dgDiff.html',
                    backdrop: 'static',
                    size : 'xlg',
                    controller: 'dgDiffCtrl',
                    resolve : {
                        localDG : function() {
                            return currentDG
                        },
                        componentDG: function () {
                            //name of 'component' is the original use..
                            return initialDG
                        },
                        otherDisplay: function () {
                            return "Initial"
                        }
                    }
                })




            }

            $scope.load = function (playground,source) {

                let msg = "This action will replace the current working collection. Are you sure you wish to load a new one (It is safe to do so as the current Collection has not been updated)?"
                if (Object.keys($scope.differences).length > 0) {
                    msg = "Warning! There are changes in the current collection which will be lost. Are you sure you wish to load this one?"
                }


                if (confirm(msg)) {
                    if (source == 'repo') {
                        //from the library repository
                        $http.get(`playground/${playground.id}`).then(
                            function (data) {
                                convertAdHoc(data.data)
                                $scope.$close(data.data)
                            }, function (err) {
                                alert(angular.toJson(err.data) )
                            })
                    } else {
                        //from the local store
                        let key = `pg-${playground.id}`
                        $localForage.getItem(key).then(
                            function (data) {
                                if (! data) {
                                    alert("The form wasn't in the local store!")
                                }
                                convertAdHoc(data)
                                $scope.$close(data)
                            }, function (err) {
                                alert(angular.toJson(err))
                            }
                        )
                    }

                }
            }

            $scope.copy = function (playgroundSummary,source) {
                let name = prompt("What name do you want to use for the copy")
                if (name) {
                    if (source == 'repo') {
                        $http.get(`playground/${playgroundSummary.id}`).then(
                            function (data) {
                                let playground = data.data      //the playground being copied
                                playground.name = name
                                playground.id = utilsSvc.getUUID()
                                playground.lockedTo = user.email
                                alert("The copy has been downloaded. You'll need to update the repository for it to be saved there.")
                                $scope.$close(playground)

                            }
                        )
                    } else {
                        //from the local store
                        let key = `pg-${playground.id}`
                        $localForage.getItem(key).then(
                            function (playground) {
                                playground.name = name
                                playground.id = utilsSvc.getUUID()
                                $scope.$close(playground)
                            }
                        )
                    }
                }
            }

            $scope.delete = function (playground,source) {
                if (confirm(`Are you sure you wish to delete the ${playground.name} form?`)) {
                    //todo - not using local store anymore
                    if (source == 'local') {
                        let key = `pg-${playground.id}`
                        $localForage.removeItem(key).then(
                            function (data) {
                                alert("The form has been removed from the localstore.")
                                makeLocalStoreSummary()
                            }
                        )
                    } else {
                        //delete by setting the deleted flag and update
                        playground.deleted = true
                        $http.put(`playground/${playground.id}`,playground).then(
                            function () {
                                loadPlaygrounds()
                                alert("Collection has been marked as deleted and won't appear in the list.")

                            }, function (err) {
                                alert(angular.toJson(err))
                            }
                        )
                        console.log(playground)
                    }



                }
            }

            $scope.createNew = function () {

                //create new just creates the playground locally (with a UUID)
                //the name no longer needs to be unique - 'cause we use the id as the unique identifier
                let pg = {name:$scope.input.name,description:$scope.input.description}
                pg.id = utilsSvc.getUUID()
                pg.dataGroups = {}
                pg.compositions = {}
                pg.lockedTo = user.email


                alert("The form has been created in your browser. It won't be created in the Repository until you update it.")
                $scope.$close(pg)


            }
        }
)