angular.module("pocApp")
    .controller('componentDiffCtrl',
        function ($scope,$http) {

            $scope.componentDG = {} //componentDG

        $scope.selectDG = function (dgName) {
            delete $scope.componentDG
            delete $scope.rowsHash
            delete $scope.dgHashSummary


            $scope.localDG = $scope.hashAllDG[dgName]
        //    $scope.componentDG
            $scope.selectedDiffDGName = dgName

            //The key is the unique identifier for the component. If the local DG has a key, then it was
            //imported from the component store so we can use that.
            //let key = $scope.localDG.key || $scope.localDG.name

            $http.get(`frozen/${$scope.localDG.name}`).then(
                function (data) {
                    $scope.componentDG = data.data
                  //  console.log(data.data)
                    compareDG($scope.localDG,$scope.componentDG)
                    makeElementList($scope.localDG,$scope.componentDG)

                }, function (err) {
                    alert(`No component found: ${angular.toJson(err.data)}`)
                  //  compareDG($scope.localDG,$scope.componentDG)
                  //  makeElementList($scope.localDG,$scope.componentDG)
                }
            )

            }



            

            //construct the list of elements in both local & component
            function makeElementList(local,component) {

                //construct the combined hash = {local:ed, component:el}
                let hash = {}
                local.diff.forEach(function (el) {
                    hash[el.path] = {local:el}
                })

                component.diff.forEach(function (el) {
                    hash[el.path] = hash[el.path] || {}
                    hash[el.path].component = el
                })


                //now compare the diff of the two.
                for (const path of Object.keys(hash)) {

                    let jLocal
                    let jComponent

                    if (hash[path].local) {
                        jLocal = angular.toJson( hash[path].local)
                    }
                    if (hash[path].component) {
                        jComponent = angular.toJson( hash[path].component)
                    }





                    if (jLocal == jComponent) {
                        hash[path].isEqual = true
                    }
                }


                $scope.rowsHash = hash

                
            }
            //makeElementList()

            $scope.selectRow = function (k,v) {
                $scope.selectedPath = k
                $scope.selectedLocalEl = v.local
                $scope.selectedComponentEl = v.component
                compareElement(v.local,v.component)
            }

            //compare the contants of an element definition in both dgs
            //local & component are hashes of the attributes in the selected element
            function compareElement(local,component) {
                //let differences = {}    //true if this attribute is different
                let hash = {}
                if (local) {
                    for (const attr of Object.keys(local)) {
                        hash[attr] = {local:local[attr]}
                    }
                }


                if (component) {
                    for (const attr of Object.keys(component)) {

                        hash[attr] = hash[attr] || {}
                        hash[attr].component = component[attr]

                        let jLocal = angular.toJson( hash[attr].local)
                        let jComponent = angular.toJson( hash[attr].component)


                        if (jLocal == jComponent) {
                            hash[attr].isEqual = true
                        } else {
                            //differences[attr] = true
                        }


                    }

                }



                $scope.elementsHash = hash
                //$scope.elDifferences = differences
                console.log(hash)

                //return differences
            }

            function compareDG(local,component) {

                let hash = {}   //all the elements in the DG apart from the diff
                let differences = []

                //first look at all the elements other than the diff
                //the local DG...
                for (const key of Object.keys(local)) {
                    if (key !== 'diff') {
                        hash[key] = {local:local[key]}
                    }
                }
                //then the component DG...
                for (const key of Object.keys(component)) {
                    if (key !== 'diff') {
                        hash[key] = hash[key] || {}
                        hash[key].component = component[key]
                    }
                }
                //now the check
                for (const key of Object.keys(hash)) {
                    let jLocal = angular.toJson( hash[key].local)
                    let jComponent = angular.toJson( hash[key].component)

                    if (jLocal == jComponent) {
                        hash[key].isEqual = true
                    } else {
                        differences.push(key)
                    }
                }

                $scope.dgHashSummary = hash
               // $scope.dgDi

            }
            //compareDG($scope.localDG,$scope.componentDG )



        })