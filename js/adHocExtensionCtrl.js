angular.module("pocApp")
    .controller('adHocExtensionCtrl',
        function ($scope,currentExt,$uibModal,fullElementList,currentPath,canEdit,snapshotSvc) {

            $scope.currentExt = angular.copy(currentExt)
            $scope.currentPath = currentPath
            $scope.canEdit = canEdit

            $scope.selectExt = function (ext) {
                $scope.selectedExt = ext
            }
/* still not sure
            //determine all the active variables at this point
            let hash = {}
            for (const thing of fullElementList) {
                hash[thing.ed.path] = thing.ed
            }

console.log(hash)
            let hashVariables = {}
            let ar = currentPath.split('.')
            while (ar.length > 0) {
                let p = ar.join('.')
                console.log(p)
                let ed = hash[p]
                //these are extensions directly defined on this ed
                for (const ext of ed.adHocExtension || []) {
                    if (ext.url.indexOf('sdc-questionnaire-extractAllocateId')> -1) {
                        let variable = ext.valueString
                        //use an array in case a variable is re-declared
                        hashVariables[variable] = hashVariables[variable] || []
                        hashVariables[variable].push({path:p})
                    } else if (ext.url.indexOf('sdc-questionnaire-definitionExtract')> -1) {
                        if (ext.extension) {
                            for (const child of ext.extension) {
                                if (child.url == 'fullUrl') {
                                    hashVariables[child.valueString] = hashVariables[child.valueString] || []
                                    hashVariables[child.valueString].push({path:p})
                                }
                            }
                        }

                    }
                }

                //If the ed is a contained model, then it may define a variable as part of the extraction
                //instructions (extractId)
                if (ed.type) {
                    let type = ed.type[0]
                    let dg = snapshotSvc.getDG(type)
                    if (dg && dg.extractId) {
                        hashVariables[dg.extractId] = hashVariables[dg.extractId] || []
                        hashVariables[dg.extractId].push({path:p})
                    }
                }


                ar.pop()

            }
            console.log(hashVariables)


*/


            //select the first one
            if ($scope.currentExt && $scope.currentExt.length > 0) {
                $scope.selectExt($scope.currentExt[0])
            }

            $scope.save = function () {
                $scope.$close($scope.currentExt)
            }

            $scope.addExt = function () {
                $uibModal.open({
                    templateUrl: 'modalTemplates/makeSDCExtension.html',
                    backdrop: 'static',
                    size : 'lg',
                    controller: 'makeSDCExtensionCtrl',
                    resolve: {
                        elements: function () {
                            return fullElementList
                            //return []
                        },currentPath : function () {
                            return currentPath
                            //return item.ed.path
                        }
                    }
                }).result.then(function (ext) {

                    if (ext) {
                        $scope.currentExt = currentExt || []
                        $scope.currentExt.push(ext)
                        $scope.selectExt($scope.currentExt[$scope.currentExt.length -1])
                    }
                })
            }

            $scope.deleteExt = function (inx) {
                $scope.currentExt.splice(inx,1)
                delete $scope.selectedExt

            }

        }
    )