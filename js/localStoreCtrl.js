angular.module("pocApp")
    .controller('localStoreCtrl',
        function ($scope,$localForage,collection) {

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



            $scope.load = function (playground) {

                let msg = "This action will replace the current form. Are you sure you wish to load a new one (It is safe to do so as the current Collection has not been updated)?"
/*
                if (Object.keys($scope.differences).length > 0) {
                    msg = "Warning! There are changes in the current collection which will be lost. Are you sure you wish to load this one?"
                }
*/

                if (confirm(msg)) {

                        let key = `pg-${playground.id}`
                        $localForage.getItem(key).then(
                            function (data) {
                                if (! data) {
                                    alert("The form wasn't in the local store!")
                                }

                                $scope.$close(data)
                            }, function (err) {
                                alert(angular.toJson(err))
                            }
                        )
                    }


            }


            $scope.delete = function (playground) {
                if (confirm(`Are you sure you wish to delete the ${playground.name} form?`)) {


                    let key = `pg-${playground.id}`
                    $localForage.removeItem(key).then(
                        function (data) {
                            alert("The form has been removed from the localstore.")
                            makeLocalStoreSummary()
                        }
                    )




                }
            }



        })