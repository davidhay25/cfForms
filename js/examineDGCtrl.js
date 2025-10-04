angular.module("pocApp")
    .controller('examineDGCtrl',
        function ($scope,$http,snapshotSvc,$localStorage) {

            $scope.input = {};


            $scope.world = $localStorage.world

            //create a separate object for the DG - evel though still referenced by world. Will assist split between DG & comp
            $scope.hashAllDG = $localStorage.world.dataGroups
            $scope.lstAllDG = []
            Object.keys($scope.hashAllDG).forEach(function (key) {
                $scope.lstAllDG.push(key)
            })
            $scope.lstAllDG.sort()

            //check that all elements in the list have a parent
            $scope.checkParents = function (dgName) {
                let dg = snapshotSvc.getDG(dgName)
                let hash = {}

                let lst = snapshotSvc.getFullListOfElements(dgName)

                console.log(dg.snapshot)
                lst.forEach(function (item) {
                    hash[item.ed.path] = item.ed
                })

                //now look for parent
                lst.forEach(function (item) {
                    let path = item.ed.path
                    let ar = path.split('.')
                    if (ar.length > 1) {
                        ar.pop()
                        let parentPath = ar.join('.')
                        if (! hash[parentPath]) {
                            console.log(`${path} has no parent`)
                        }
                    }
                })



                console.log(hash)

            }


            $scope.makeSnapshots = function() {
                console.log('-------->   building snapshots...')
                let voSs = snapshotSvc.makeSnapshots($scope.hashAllDG,$scope.focusDGName)
                $scope.snapshotLog = voSs.log
                $scope.ssErrorTypes = ['All']
                for (let log of voSs.log) {
                    if (log.isError) {
                        if ($scope.ssErrorTypes.indexOf(log.isError) == -1) {
                            $scope.ssErrorTypes.push(log.isError)
                        }
                    }
                }


            }

            //$scope.focusDGName = 'BreastHistoPreviousBiopsyResult'
            $scope.focusDGName = 'BreastHistoReportLymphNodes'
            $scope.makeSnapshots()
            $scope.checkParents( $scope.focusDGName)



            $scope.selectDG = function(name) {
                $scope.input.selectedDGName = name
                $scope.selectedRawDG = $scope.hashAllDG[name]
            }



        }
    )