angular.module("pocApp")
    .controller('adHocExtensionCtrl',
        function ($scope,currentExt,$uibModal,fullElementList,currentPath,canEdit) {

            $scope.currentExt = angular.copy(currentExt)
            $scope.currentPath = currentPath
            $scope.canEdit = canEdit

            $scope.selectExt = function (ext) {
                $scope.selectedExt = ext
            }

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