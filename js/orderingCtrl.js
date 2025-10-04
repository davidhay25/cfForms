angular.module("pocApp")
    .controller('orderingCtrl',
        function ($scope,orderingSvc,$timeout) {

            $scope.local = {}


            $scope.addReferencedMove = function (move) {
                //console.log(toMove,insertAfter)
                $scope.selectedModel.ordering = $scope.selectedModel.ordering || []
                $scope.selectedModel.ordering.push({toMove:move.adjToMove,insertAfter:move.adjInsertAfter})



                $scope.$emit('redrawTree')
            }

            $scope.removeReferencedMove = function (move) {
                if ($scope.selectedModel.ordering) {
                    let toDelete = -1
                     $scope.selectedModel.ordering.forEach(function(mo,inx) {
                        if (mo.toMove == move.adjToMove && mo.insertAfter == move.adjInsertAfter) {
                            toDelete = inx
                        }
                    })
                    if (toDelete > -1) {
                        $scope.selectedModel.ordering.splice(toDelete,1)
                        $scope.$emit('redrawTree')
                    }
                }


            }

            $scope.applyMoveFromReferencesDEP = function () {

                orderingSvc.createMoveFromReferences($scope.fullElementList,$scope.selectedModel,$scope.hashAllDG)
            }

            //add the move instruction from a referenced dg
            $scope.addToDG = function (ord,inx) {
                let pathInDg = ord.path

              //  let toMove = pathInDg + "." + $filter('dropFirstInPath')(ord.toMove)
               // let insertAfter = pathInDg + "." + $filter('dropFirstInPath')(ord.insertAfter)

                $scope.selectedModel.ordering = $scope.selectedModel.ordering || []
                $scope.selectedModel.ordering.push({toMove:ord.toMove,insertAfter:ord.insertAfter})

                $scope.$emit('redrawTree')

                //remove the instruction from the list.
                $scope.dgReferencesOrdering.splice(inx,1)

            }

            $scope.lookupParents = function (){

                //the DG has no ordering defined directly.
                //walk up the inheritance chain until we find a parent with ordering (if any)
                let tmpDG = angular.copy($scope.selectedModel)
                let keepGoing = true
                let lstOrdering = []
                let ctr = 0         // a counter to trap any infinite recursion error. probably unneeded
                while (tmpDG.parent && keepGoing) {
                    let dgTitle = tmpDG.title
                    tmpDG = $scope.hashAllDG[tmpDG.parent]
                    if (! tmpDG) {
                        alert(`DG ${tmpDG.parent} was not found. Referenced in ${dgTitle}`)
                        return
                    }

                    if (tmpDG.ordering && tmpDG.ordering.length > 0) {
                        lstOrdering = tmpDG.ordering
                        keepGoing = false       //to stop the recursion
                    }

                    ctr++
                    if (ctr > 100) {
                        keepGoing = false
                        alert(`Error finding ultimate parent of ${dg.name} - recursion issue most likely`)
                        return
                    }
                }
                if (lstOrdering.length > 0) {
                    //need to replace the first path segment with the current dg name
                    $scope.selectedModel.ordering = []
                    lstOrdering.forEach(function (item) {
                        let newItem = {toMove: updatePath(item.toMove), insertAfter: updatePath(item.insertAfter)}
                        $scope.selectedModel.ordering.push(newItem)
                    })
                } else {
                    alert("No parents with ordering defined were found.")
                }

                function updatePath(path) {
                    let ar = path.split('.')
                    ar[0] = $scope.selectedModel.name
                    return ar.join('.')
                }


            }

            //get the ed that corresponds to the path. Not that efficient but saves creating another hash...
            $scope.getElementEd = function (path) {
                for (const item of $scope.fullElementList) {
                    if (path == item.ed.path) {
                        return item.ed || {title:'Root'}
                        break
                    }
                }
            }

            $scope.moveUp = function (inx) {
                let ar = $scope.selectedModel.ordering.splice(inx,1)
                $scope.selectedModel.ordering.splice(inx-1,0,ar[0])
            }

            $scope.moveDn = function (inx) {
                let ar = $scope.selectedModel.ordering.splice(inx,1)
                $scope.selectedModel.ordering.splice(inx+1,0,ar[0])
            }

            $scope.addInsertAfter = function (toMove,insertAfter) {
                console.log(toMove,insertAfter)
                $scope.selectedModel.ordering = $scope.selectedModel.ordering || []
                $scope.selectedModel.ordering.push({toMove:toMove,insertAfter:insertAfter})
                delete $scope.local.toMove
                delete $scope.local.insertAfter

                $scope.$emit('redrawTree')



            }

            $scope.removeInsertAfter = function (index) {
                $scope.selectedModel.ordering.splice(index,1)

                $timeout(function(){
                    $scope.$emit('redrawTree')
                },500)


            }


    })